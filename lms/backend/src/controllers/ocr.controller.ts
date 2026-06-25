import { Request, Response } from 'express';
import * as ocrService from '../services/ocr.service';
import { sendSuccess, sendError } from '../utils/response';
import { sendCreated } from '../utils/response';
import { logger } from '../utils/logger';
import { getCollection } from '../firebase/firestore';
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

  const chaptersSnap = await getCollection('textbooks').doc(textbookId).collection('chapters').get();
  const concepts: Array<{ id: string; title: string; summary: string }> = [];

  for (const chapterDoc of chaptersSnap.docs) {
    const conceptsSnap = await chapterDoc.ref.collection('concepts').get();
    conceptsSnap.docs.forEach((doc) => {
      const data = doc.data();
      concepts.push({
        id: doc.id,
        title: data.title || 'Untitled',
        summary: data.summary || '',
      });
    });
  }

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
  const { data: quizData, classId, subjectId } = req.body;
  const userId = (req as any).user?.id || 'unknown';

  if (!quizData?.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
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

  const questions = quizData.questions.map((q: any) => {
    const mapped: Record<string, unknown> = {
      id: q.id || require('uuid').v4(),
      text: q.question || q.questionText,
      type: normalizeType(q.type),
      points: q.points || 1,
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
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
  const uniqueTypes = [...new Set(questions.map((q: any) => q.type))];

  const doc = {
    id,
    title: quizData.title || `Quiz from OCR - ${new Date().toLocaleDateString()}`,
    description: quizData.description || '',
    classId,
    subjectId: subjectId || null,
    teacherId: userId,
    questions,  // embed questions directly for OCR-generated quizzes
    totalPoints,
    timeLimitMinutes: quizData.timeLimitMinutes || 30,
    selectedModels: uniqueTypes,
    questionCount: questions.length,
    passingScore: 50,
    maxAttempts: 3,
    shuffleQuestions: true,
    showResults: true,  // students see correct answers after submitting
    attemptCount: 0,
    releasedAt: now,  // auto-release so students see it
    ocrGenerated: true,
    createdAt: now,
    updatedAt: now,
  };

  await getCollection('quizV2').doc(id).set(doc);
  logger.info('OCR quiz pushed to quizV2', { quizId: id, classId, questionCount: questions.length });
  sendCreated(res, doc);
}

export async function pushAssignment(req: Request, res: Response) {
  const { data: assignmentData, classId, subjectId } = req.body;
  const userId = (req as any).user?.id || 'unknown';

  if (!assignmentData?.title) {
    throw new ValidationError('Assignment data must contain a title');
  }
  if (!classId) {
    throw new ValidationError('classId is required');
  }

  const id = require('uuid').v4();
  const now = new Date().toISOString();

  const doc = {
    id,
    title: assignmentData.title,
    description: assignmentData.description || assignmentData.instructions || '',
    instructions: assignmentData.instructions || '',
    questions: assignmentData.questions || [],
    totalPoints: assignmentData.totalPoints || assignmentData.questions?.length * 10 || 0,
    rubric: assignmentData.rubric || '',
    classId,
    subjectId: subjectId || null,
    teacherId: userId,
    submissionCount: 0,
    releasedAt: now,  // auto-release so students see it
    ocrGenerated: true,
    createdAt: now,
    updatedAt: now,
  };

  await getCollection('assignmentV2').doc(id).set(doc);
  logger.info('OCR assignment pushed to assignmentV2', { assignmentId: id, classId });
  sendCreated(res, doc);
}

export async function getConceptsForTextbook(req: Request, res: Response) {
  const { textbookId } = req.params;

  if (!textbookId) {
    throw new ValidationError('textbookId parameter is required');
  }

  const chaptersSnap = await getCollection('textbooks').doc(textbookId).collection('chapters').get();
  const allConcepts: Array<{ id: string; chapterId: string; chapterTitle: string; title: string; summary: string }> = [];

  for (const chapterDoc of chaptersSnap.docs) {
    const chapterData = chapterDoc.data();
    const conceptsSnap = await chapterDoc.ref.collection('concepts').get();
    conceptsSnap.docs.forEach((doc) => {
      const data = doc.data();
      allConcepts.push({
        id: doc.id,
        chapterId: chapterDoc.id,
        chapterTitle: chapterData.title || 'Untitled Chapter',
        title: data.title || 'Untitled',
        summary: data.summary || '',
      });
    });
  }

  sendSuccess(res, allConcepts);
}
