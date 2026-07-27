import { v4 as uuidv4 } from 'uuid';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTeacherAssignment } from './teacher-class-subject.service';
import { createNotification } from './notification.service';
import { nosqlSet } from './nosql.service';
import { fallbackText, resolveTypes, getConcept, getConceptQuestions, upsertQuestions } from './quiz-v2-question.service';
import { gatherQuizQuestions } from './quiz-v2-ai-picker.service';

const QV2 = 'quizV2';

export async function createQuiz(data: {
  title: string;
  description?: string;
  classId: string;
  textbookId: string;
  chapterId: string;
  conceptId: string;
  teacherId: string;
  timeLimitMinutes: number;
  selectedModels?: string[];
  questionCount?: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  subjectId?: string;
  questions?: any[];
  preview?: boolean;
  schoolId?: string;
  publishedTo?: 'class' | 'students';
  targetStudentIds?: string[];
  difficultyDistribution?: Record<string, Record<string, number>>;
}) {
  const assignment = await getTeacherAssignment(data.teacherId, data.classId);
  if (!assignment) {
    throw new ForbiddenError('You are not assigned to this class');
  }

  const conceptData = await getConcept(data.textbookId, data.chapterId, data.conceptId);
  if (!conceptData) {
    throw new NotFoundError('Concept not found');
  }
  const conceptName = conceptData.title || conceptData.name || 'Untitled Concept';

  const selectedModels = data.selectedModels ?? [];
  const questionCount = data.questionCount ?? 0;
  const targetTypes = resolveTypes(selectedModels);

  const result = await gatherQuizQuestions({
    conceptId: data.conceptId,
    conceptName,
    questionCount,
    selectedModels,
    targetTypes,
    difficultyDistribution: data.difficultyDistribution,
    manualQuestions: data.questions,
  });

  const { questions: matchingQuestions, aiGeneratedCount, aiErrorMessage, requestedTotal } = result;

  if (data.preview) {
    const previewQuestions = matchingQuestions.map((q: any) => {
      const rawQuestion = q.question;
      const rawText = q.text;
      const dataQuestion = (typeof q.data === 'object' && q.data) ? (q.data.question || q.data.text) : '';
      const finalText = rawQuestion || rawText || dataQuestion || fallbackText(q.type, q.options);
      logger.info('[QuizV2 Preview]', { qId: q.id, type: q.type, rawQuestion: rawQuestion?.substring(0, 50), rawText: rawText?.substring(0, 50), dataQuestion: dataQuestion?.substring(0, 50), finalText: finalText?.substring(0, 50) });
      const correctAnswer = q.answer || q.correctAnswer || (typeof q.data === 'object' && q.data ? (q.data.answer || q.data.correctAnswer) : '') || '';
      return {
        id: q.id, type: q.type, text: finalText, options: q.options,
        correctAnswer, explanation: q.explanation,
        difficulty: q.difficulty, points: q.points,
      };
    });
    return {
      preview: true,
      questionCount: matchingQuestions.length,
      questions: previewQuestions,
      existingCount: matchingQuestions.length - aiGeneratedCount,
      aiGeneratedCount,
      aiErrorMessage: aiErrorMessage || undefined,
      _debug: {
        requestedTotal,
        matchingQuestionsLength: matchingQuestions.length,
        perDifficultyTotal: data.difficultyDistribution,
        targetTypes,
        selectedModels,
      },
    };
  }

  let toSave: any[] | null = null;
  if (!data.questions) {
    const existing = await getConceptQuestions(data.conceptId);
    const existingIds = new Set(existing.map((q: any) => q.id));
    toSave = matchingQuestions.filter((q: any) => !existingIds.has(q.id));
  } else {
    toSave = matchingQuestions;
  }

  const quizId = uuidv4();
  const now = new Date().toISOString();

  const quizData: Record<string, unknown> = {
    id: quizId,
    title: data.title,
    description: data.description || '',
    classId: data.classId,
    subjectId: data.subjectId || null,
    textbookId: data.textbookId,
    chapterId: data.chapterId,
    conceptId: data.conceptId,
    teacherId: data.teacherId,
    timeLimitMinutes: data.timeLimitMinutes,
    selectedModels,
    questionCount,
    totalPoints: matchingQuestions.reduce((sum: number, q: any) => sum + (q.points || 0), 0),
    questions: matchingQuestions.map((q: any) => {
      const questionText = q.question || q.text || (typeof q.data === 'object' && q.data ? (q.data.question || q.data.text) : '') || fallbackText(q.type, q.options);
      const correctAnswer = q.answer || q.correctAnswer || (typeof q.data === 'object' && q.data ? (q.data.answer || q.data.correctAnswer) : '') || '';
      return {
        id: q.id, type: q.type, text: questionText, options: q.options || undefined,
        correctAnswer, explanation: q.explanation || '',
        difficulty: q.difficulty || 'medium', points: q.points || 1,
      };
    }),
    passingScore: data.passingScore ?? 50,
    maxAttempts: data.maxAttempts ?? 3,
    shuffleQuestions: data.shuffleQuestions ?? true,
    showResults: data.showResults ?? false,
    attemptCount: 0,
    releasedAt: null,
    publishedTo: data.publishedTo || 'class',
    targetStudentIds: data.targetStudentIds || [],
    schoolId: data.schoolId || '',
    createdAt: now,
    updatedAt: now,
  };

  await nosqlSet(QV2, quizId, quizData);

  if (toSave && toSave.length > 0) {
    try {
      await upsertQuestions(toSave, data.conceptId, data.textbookId, data.chapterId);
      logger.info('Questions saved to concept bank', { conceptId: data.conceptId, count: toSave.length });
    } catch (err) {
      logger.warn('Failed to save questions to concept bank, but quiz was created', { conceptId: data.conceptId, error: err });
    }
  }

  if (!data.preview) {
    try {
      await createNotification({
        userId: data.teacherId, type: 'quiz', title: 'Quiz Created',
        body: `Quiz '${data.title}' was created successfully with ${matchingQuestions.length} questions.`,
        data: { quizId, classId: data.classId, link: `/quizzes/${quizId}` },
      });
    } catch (err) {
      logger.warn('Failed to send quiz creation notification', { quizId, error: err });
    }
  }

  logger.info('Quiz V2 created', { quizId, classId: data.classId, title: data.title, totalQuestions: matchingQuestions.length });

  return { ...quizData, totalQuestions: matchingQuestions.length, questions: matchingQuestions.map((q: any) => ({ id: q.id, type: q.type, text: q.text || q.question || fallbackText(q.type, q.options), options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation, difficulty: q.difficulty, points: q.points })) };
}
