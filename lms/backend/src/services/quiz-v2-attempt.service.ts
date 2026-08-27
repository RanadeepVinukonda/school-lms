import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError, AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { StudentLevel } from './ai-level.service';
import { nosqlGet, nosqlQuery } from './nosql.service';
import { TransactionManager } from '../database/transaction-manager';
import {
  QV2, QAV2, POINTS_BY_DIFFICULTY,
  fallbackText, resolveTypes, getConcept, getConceptQuestions,
} from './quiz-v2.service';

interface QuestionBankItem {
  id: string;
  type: string;
  difficulty: import('./ai-level.service').Difficulty;
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

export { submitQuizAttempt } from './quiz-v2-submit.service';

export async function startQuizAttempt(quizId: string, studentId: string, selectedModels: string[]) {
  const supabase = getSupabaseAdmin()!;
  const { exists: quizExists, data: quizData } = await nosqlGet(QV2, quizId);
  if (!quizExists || !quizData) throw new NotFoundError('Quiz not found');
  if (!quizData.releasedAt) throw new ForbiddenError('Quiz is not yet released');
  if (quizData.publishedTo === 'students') {
    const targetStudentIds = (quizData.targetStudentIds as string[]) || [];
    if (!targetStudentIds.includes(studentId)) {
      throw new ForbiddenError('This quiz was assigned to specific students only');
    }
  }

  const attempts = await nosqlQuery(QAV2, { quizId, studentId });
  const totalAttempts = attempts.length;
  const maxAttempts = (quizData.maxAttempts as number) || 3;
  if (!quizData.isRepublished && totalAttempts >= maxAttempts) throw new ForbiddenError('Maximum attempts reached');

  const { data: userRow } = await supabase.from('users').select('data').eq('id', studentId).maybeSingle();
  const userData = (userRow?.data ?? {}) as Record<string, unknown>;
  const studentLevel: StudentLevel = (userData.level as StudentLevel) || 'beginner';

  let questionBank: QuestionBankItem[];

  const storedQuestions = quizData.questions as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(storedQuestions) && storedQuestions.length > 0) {
    questionBank = storedQuestions.map((q) => ({
      id: (q.id as string) || uuidv4(), type: (q.type as string) || 'short_answer',
      difficulty: (q.difficulty as import('./ai-level.service').Difficulty) || 'medium',
      text: ((q.text || q.question) as string) || fallbackText(q.type as string, q.options as string[]), options: q.options as string[] | undefined,
      correctAnswer: (q.correctAnswer as string) || '', explanation: (q.explanation as string) || '',
      points: (q.points as number) || 1,
    }));
  } else if (quizData.textbookId && quizData.chapterId && quizData.conceptId) {
    const c = await getConcept(quizData.textbookId as string, quizData.chapterId as string, quizData.conceptId as string);
    if (!c) throw new NotFoundError('Concept not found');
    const rows = await getConceptQuestions(quizData.conceptId as string);
    questionBank = rows.map((r) => ({
      id: r.id, type: r.type || 'short_answer',
      difficulty: (r.difficulty as import('./ai-level.service').Difficulty) || 'medium',
      text: (r.text || r.question || fallbackText(r.type, r.options)) as string, options: r.options as string[] | undefined,
      correctAnswer: (r.correct_answer || r.correctAnswer || r.answer || '') as string, explanation: (r.explanation || '') as string,
      points: r.points || 1,
    }));
  } else {
    questionBank = [];
  }

  const targetTypes = resolveTypes(selectedModels);
  let available: QuestionBankItem[] = targetTypes.length > 0
    ? questionBank.filter((q) => targetTypes.includes(q.type))
    : [...questionBank];
  if (available.length === 0) available = [...questionBank];

  if (quizData.shuffleQuestions !== false) {
    available = [...available].sort(() => Math.random() - 0.5);
  }

  const selected = available.slice(0, Math.min((quizData.questionCount as number) || 0, available.length));
  if (selected.length === 0) throw new AppError(400, 'No questions match the selected formats. Please contact your teacher.');

  const questionsForStudent = selected.map((q) => {
    if (quizData.isRepublished) return q;
    const { correctAnswer: _, ...rest } = q;
    return rest;
  });

  const attemptId = uuidv4();
  const now = new Date().toISOString();

  const attempt: Record<string, unknown> = {
    id: attemptId, quizId, studentId, startedAt: now, submittedAt: null,
    answers: [], score: null,
    totalPoints: selected.reduce((sum, q) => sum + (POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1), 0),
    percentage: null, passed: null, timeSpent: 0,
    status: 'in_progress', selectedModels, level: studentLevel,
  };

  const tm = new TransactionManager();
  await tm.runTransaction(async (tx) => {
    await tx.db().query(
      `INSERT INTO firestore_docs (collection, doc_id, data, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (collection, doc_id) DO UPDATE SET data = $3, updated_at = NOW()`,
      [QAV2, attemptId, JSON.stringify(attempt)],
    );

    if (!quizData.isRepublished) {
      const curCount = (quizData.attemptCount as number) || 0;
      const existingQuiz = await tx.db().query(
        'SELECT data FROM firestore_docs WHERE collection = $1 AND doc_id = $2',
        [QV2, quizId],
      );
      const quizDataExisting = (existingQuiz.rows[0]?.data as Record<string, unknown>) || {};
      const mergedQuiz = { ...quizDataExisting, attemptCount: curCount + 1, updatedAt: now };
      await tx.db().query(
        `INSERT INTO firestore_docs (collection, doc_id, data, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (collection, doc_id) DO UPDATE SET data = $3, updated_at = NOW()`,
        [QV2, quizId, JSON.stringify(mergedQuiz)],
      );
    }
  });

  logger.info('Quiz V2 attempt started', { quizId, studentId, attemptId });
  return { ...attempt, questions: questionsForStudent };
}

export async function getQuizAttemptsForStudent(studentId: string) {
  const items = await nosqlQuery(QAV2, { studentId });
  return items;
}
