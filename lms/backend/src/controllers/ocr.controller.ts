import { Request, Response } from 'express';
import * as ocrService from '../services/ocr.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { logger } from '../utils/logger';
import { AppError, ValidationError } from '../utils/errors';

export async function scanImage(req: Request, res: Response) {
  let imageBuffer: Buffer | null = null;

  if (req.file) {
    imageBuffer = req.file.buffer;
  } else if (req.body.image && typeof req.body.image === 'string') {
    const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
    imageBuffer = Buffer.from(base64Data, 'base64');
  }

  if (!imageBuffer || imageBuffer.length === 0) {
    throw new ValidationError('No image provided. Send a base64 image in the body or upload a file.');
  }

  if (imageBuffer.length > 10 * 1024 * 1024) {
    throw new AppError(400, 'Image too large. Maximum size is 10MB.');
  }

  const result = await ocrService.extractText(imageBuffer);
  sendSuccess(res, result);
}

export async function scanMultipleImages(req: Request, res: Response) {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    throw new ValidationError('No images provided. Upload at least one image.');
  }
  if (files.length > 10) {
    throw new ValidationError('Too many images. Maximum is 10 per batch.');
  }
  for (const f of files) {
    if (f.buffer.length > 10 * 1024 * 1024) {
      throw new AppError(400, `Image ${f.originalname} is too large. Maximum size is 10MB.`);
    }
  }
  const results = await Promise.all(files.map((f) => ocrService.extractText(f.buffer)));
  const combinedText = results.map((r) => r.text).filter(Boolean).join('\n\n');
  const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / results.length;
  sendSuccess(res, {
    text: combinedText,
    confidence: avgConfidence,
    pages: results.map((r) => ({ text: r.text, confidence: r.confidence })),
  });
}

export async function mapToConcept(req: Request, res: Response) {
  const { text, textbookId, count, type } = req.body;

  if (!text || typeof text !== 'string') {
    throw new ValidationError('Text is required');
  }

  const questionCount = Math.min(Math.max(parseInt(count) || 5, 1), 20);
  const generationType = type === 'assignment' ? 'assignment' : 'quiz';

  if (!textbookId || textbookId === 'auto') {
    if (generationType === 'assignment') {
      const assignment = await ocrService.generateAssignmentFromText(text, 'Detected Content', questionCount);
      sendCreated(res, { conceptId: null, conceptName: 'Detected Content', assignment, type: 'assignment' });
    } else {
      const questions = await ocrService.generateQuestionsFromText(text, 'Detected Content', questionCount);
      sendCreated(res, { conceptId: null, conceptName: 'Detected Content', questions, type: 'quiz' });
    }
    return;
  }

  const chapters = await ocrService.getChaptersByTextbook(textbookId);
  const chapterIds = chapters.map((c) => c.id);
  const conceptRows = chapterIds.length > 0
    ? await ocrService.getConceptsByChapterIds(chapterIds)
    : [];
  const concepts = conceptRows.map((c) => ({
    id: c.id, title: c.title || 'Untitled', summary: c.summary || '',
  }));

  const mapping = await ocrService.mapTextToConcept(text, concepts);

  if (!mapping) {
    sendSuccess(res, {
      conceptId: null,
      conceptName: null,
      questions: [],
      message: 'Could not automatically map to a concept. Please select manually.',
    });
    return;
  }

  if (generationType === 'assignment') {
    const assignment = await ocrService.generateAssignmentFromText(text, mapping.conceptName, questionCount);
    sendCreated(res, { conceptId: mapping.conceptId, conceptName: mapping.conceptName, assignment, type: 'assignment' });
  } else {
    const questions = await ocrService.generateQuestionsFromText(text, mapping.conceptName, questionCount);
    sendCreated(res, { conceptId: mapping.conceptId, conceptName: mapping.conceptName, questions, type: 'quiz' });
  }
}

export async function chat(req: Request, res: Response) {
  const raw = req.body.messages;
  const files = req.files as Express.Multer.File[] | undefined;
  const imageBuffers = files ? files.map((f) => f.buffer) : [];

  let messages: Array<{ role: string; content: string }>;
  try {
    messages = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new ValidationError('Messages must be a valid JSON array');
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ValidationError('Messages array is required');
  }

  const result = await ocrService.processChatMessage(messages, imageBuffers);
  sendSuccess(res, result);
}

export async function pushQuiz(req: Request, res: Response) {
  const { classId, subjectId, questions: reqQuestions } = req.body;
  const questionsRaw = reqQuestions || req.body.data?.questions;
  const userId = (req as unknown as { user?: { uid?: string } }).user?.uid || 'unknown';
  const studentIds = Array.isArray(req.body.studentIds) ? req.body.studentIds : [];

  if (!questionsRaw || !Array.isArray(questionsRaw) || questionsRaw.length === 0) {
    throw new ValidationError('Quiz data must contain a questions array');
  }
  if (!classId) {
    throw new ValidationError('classId is required');
  }

  const normalizeType = (t: string): string => {
    const raw = (t || '').toLowerCase().replace(/[\s-]/g, '_');
    if (raw === 'mcq') return 'multiple_choice';
    if (raw === 'fill_blank' || raw === 'fill_in_the_blanks') return 'short_answer';
    if (['multiple_choice', 'true_false', 'short_answer', 'matching', 'numerical', 'descriptive', 'passage'].includes(raw)) return raw;
    return 'short_answer';
  };

  const questions = questionsRaw.map((q: Record<string, unknown>) => {
    const mapped: Record<string, unknown> = {
      id: q.id || require('uuid').v4(),
      text: q.question || q.questionText,
      type: normalizeType(q.type as string),
      points: (q.points as number) || 1,
      correctAnswer: (q.correctAnswer as string) || '',
      explanation: (q.explanation as string) || '',
      difficulty: (q.difficulty as string) || 'medium',
    };
    if (Array.isArray(q.options) && q.options.length > 0) {
      mapped.options = q.options;
    }
    return mapped;
  });

  const id = require('uuid').v4();
  const now = new Date().toISOString();
  const totalPoints = questions.reduce((s: number, q: any) => s + q.points, 0);

  // Collect unique question types for selectedModels
  const uniqueTypes = [...new Set(questions.map((q: Record<string, unknown>) => q.type as string))];

  const doc = {
    id,
    title: req.body.title || req.body.data?.title || `Quiz from OCR - ${new Date().toLocaleDateString()}`,
    description: req.body.description || req.body.data?.description || '',
    classId,
    subjectId: subjectId || null,
    teacherId: userId,
    questions,  // embed questions directly for OCR-generated quizzes
    totalPoints,
    timeLimitMinutes: req.body.timeLimitMinutes || req.body.data?.timeLimitMinutes || 30,
    selectedModels: uniqueTypes,
    questionCount: questions.length,
    passingScore: 50,
    maxAttempts: 3,
    shuffleQuestions: true,
    showResults: true,  // students see correct answers after submitting
    attemptCount: 0,
    publishedTo: studentIds.length > 0 ? 'students' : 'class',
    targetStudentIds: studentIds.length > 0 ? studentIds : [],
    releasedAt: now,  // auto-release so students see it
    ocrGenerated: true,
    createdAt: now,
    updatedAt: now,
  };

  await ocrService.upsertFirestoreDoc('quizV2', id, doc);
  logger.info('OCR quiz pushed to quizV2', { quizId: id, classId, questionCount: questions.length });
  sendCreated(res, doc);
}

export async function pushAssignment(req: Request, res: Response) {
  const { classId, subjectId, title, instructions, questions: reqQuestions, description: reqDesc } = req.body;
  const assignmentTitle = title || req.body.data?.title;
  const assignmentInstructions = instructions || req.body.data?.instructions;
  const assignmentQuestions = reqQuestions || req.body.data?.questions || [];
  const assignmentDescription = reqDesc || req.body.data?.description || '';
  const userId = (req as unknown as { user?: { uid?: string } }).user?.uid || 'unknown';

  if (!assignmentTitle) {
    throw new ValidationError('Assignment data must contain a title');
  }
  if (!classId) {
    throw new ValidationError('classId is required');
  }

  const id = require('uuid').v4();
  const now = new Date().toISOString();

  const doc = {
    id,
    title: assignmentTitle,
    description: assignmentDescription || assignmentInstructions || '',
    instructions: assignmentInstructions || '',
    questions: assignmentQuestions,
    totalPoints: req.body.totalPoints || req.body.data?.totalPoints || assignmentQuestions.length * 10 || 0,
    rubric: req.body.rubric || req.body.data?.rubric || '',
    classId,
    subjectId: subjectId || null,
    teacherId: userId,
    submissionCount: 0,
    releasedAt: now,  // auto-release so students see it
    ocrGenerated: true,
    createdAt: now,
    updatedAt: now,
  };

  await ocrService.upsertFirestoreDoc('assignmentV2', id, doc);
  logger.info('OCR assignment pushed to assignmentV2', { assignmentId: id, classId });
  sendCreated(res, doc);
}

export async function getConceptsForTextbook(req: Request, res: Response) {
  const { textbookId } = req.params;

  if (!textbookId) {
    throw new ValidationError('textbookId parameter is required');
  }

  const chapters = await ocrService.getChaptersByTextbook(textbookId);
  const chapterIds = chapters.map((c) => c.id);
  const conceptRows = chapterIds.length > 0
    ? await ocrService.getConceptsByChapterIds(chapterIds)
    : [];

  const chapterMap = Object.fromEntries(chapters.map((c) => [c.id, c.title]));
  const allConcepts = conceptRows.map((c) => ({
    id: c.id,
    chapterId: c.chapter_id,
    chapterTitle: chapterMap[c.chapter_id] || 'Untitled Chapter',
    title: c.title || 'Untitled',
    summary: c.summary || '',
  }));

  sendSuccess(res, allConcepts);
}
