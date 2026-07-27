import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { computeLevel, computeComplexityHandled, type Difficulty } from './ai-level.service';
import { nosqlGet, nosqlSet, nosqlUpdate, nosqlQuery } from './nosql.service';

const ASSIGNMENT_V2 = 'assignmentV2';
const ASSIGNMENT_SUB_V2 = 'assignmentSubmissionV2';

export async function createAssignment(data: {
  title: string;
  description?: string;
  classId: string;
  textbookId: string;
  chapterId: string;
  conceptId: string;
  teacherId: string;
  timeLimitMinutes: number;
  questions: Array<{
    questionText: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
    points: number;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
  }>;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  dueDate?: string;
  schoolId?: string;
  publishedTo?: 'class' | 'students';
  targetStudentIds?: string[];
}) {
  const assignmentId = uuidv4();
  const now = new Date().toISOString();

  const totalPoints = data.questions.reduce((sum, q) => sum + q.points, 0);
  const questionsWithIds = data.questions.map((q, i) => ({ ...q, id: `q_${assignmentId}_${i}` }));

  const assignmentData: Record<string, unknown> = {
    ...data,
    id: assignmentId,
    questions: questionsWithIds,
    totalPoints,
    passingScore: data.passingScore ?? 50,
    maxAttempts: data.maxAttempts ?? 1,
    shuffleQuestions: data.shuffleQuestions ?? true,
    showResults: data.showResults ?? false,
    releasedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await nosqlSet(ASSIGNMENT_V2, assignmentId, assignmentData);

  logger.info('Assignment V2 created', { assignmentId, classId: data.classId, title: data.title });

  return { ...assignmentData };
}

export async function getAssignmentById(assignmentId: string) {
  const { exists, data } = await nosqlGet(ASSIGNMENT_V2, assignmentId);
  if (!exists || !data) {
    throw new NotFoundError('Assignment not found');
  }

  return { id: assignmentId, ...data };
}

export async function releaseAssignment(assignmentId: string) {
  const { exists, data } = await nosqlGet(ASSIGNMENT_V2, assignmentId);
  if (!exists || !data) throw new NotFoundError('Assignment not found');

  const now = new Date().toISOString();
  await nosqlUpdate(ASSIGNMENT_V2, assignmentId, { releasedAt: now, updatedAt: now });

  const updated = await nosqlGet(ASSIGNMENT_V2, assignmentId);
  logger.info('Assignment V2 released', { assignmentId });

  return { id: assignmentId, ...updated.data };
}

export async function startAssignment(assignmentId: string, studentId: string) {
  const assignment = await nosqlGet(ASSIGNMENT_V2, assignmentId);
  if (!assignment.exists || !assignment.data) throw new NotFoundError('Assignment not found');
  const assignmentData = assignment.data;

  if (!assignmentData.releasedAt) {
    throw new ForbiddenError('Assignment has not been released yet');
  }

  const attempts = await nosqlQuery(ASSIGNMENT_SUB_V2, [
    { field: 'assignmentId', value: assignmentId },
    { field: 'studentId', value: studentId },
  ]);

  if (assignmentData.maxAttempts && attempts.length >= (assignmentData.maxAttempts as number)) {
    throw new ForbiddenError('Maximum attempts reached');
  }

  const attemptId = uuidv4();
  const now = new Date().toISOString();

  const attempt: Record<string, unknown> = {
    id: attemptId,
    assignmentId,
    studentId,
    startedAt: now,
    submittedAt: null,
    answers: [],
    score: null,
    totalPoints: assignmentData.totalPoints,
    percentage: null,
    passed: null,
    timeSpent: 0,
    status: 'in_progress',
    level: null,
  };

  await nosqlSet(ASSIGNMENT_SUB_V2, attemptId, attempt);
  const currentCount = ((assignmentData.attemptCount as number) || 0) + 1;
  await nosqlUpdate(ASSIGNMENT_V2, assignmentId, { attemptCount: currentCount, updatedAt: now });

  logger.info('Assignment V2 attempt started', { assignmentId, studentId, attemptId });

  const questionsWithoutAnswers = (assignmentData.questions as Array<{ correctAnswer?: string; explanation?: string; [key: string]: unknown }>).map(
    (q) => {
      const { correctAnswer, explanation, ...rest } = q;
      return rest;
    }
  );

  return { ...attempt, questions: questionsWithoutAnswers };
}

export async function submitAssignment(attemptId: string, studentId: string, data: {
  answers: Array<{
    questionId: string;
    answer: string | string[];
    timeSpent?: number;
  }>;
  startedAt: string;
  submittedAt: string;
}) {
  const attempt = await nosqlGet(ASSIGNMENT_SUB_V2, attemptId);
  if (!attempt.exists || !attempt.data) throw new NotFoundError('Attempt not found');
  const attemptData = attempt.data;

  if (attemptData.studentId !== studentId) throw new ForbiddenError('Not your attempt');
  if (attemptData.status !== 'in_progress') throw new ForbiddenError('Attempt already submitted');

  const assignment = await nosqlGet(ASSIGNMENT_V2, attemptData.assignmentId as string);
  if (!assignment.exists || !assignment.data) throw new NotFoundError('Assignment not found');
  const assignmentData = assignment.data;

  const questions = (assignmentData.questions || []) as Array<{ id: string; type: string; correctAnswer?: string; points: number; difficulty?: string }>;
  let score = 0;
  const gradedAnswers = data.answers.map((answer) => {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) return { questionId: answer.questionId, answer: answer.answer, isCorrect: false, pointsEarned: 0, timeSpent: answer.timeSpent || 0 };

    let isCorrect = false;
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      isCorrect = answer.answer === question.correctAnswer;
    } else if (question.type === 'short_answer') {
      isCorrect = answer.answer.toString().toLowerCase().trim() === question.correctAnswer?.toString().toLowerCase().trim();
    }

    const pointsEarned = isCorrect ? question.points : 0;
    if (isCorrect) score += pointsEarned;
    return { questionId: question.id, answer: answer.answer, isCorrect, pointsEarned, timeSpent: answer.timeSpent || 0 };
  });

  const timeSpent = data.answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  const percentage = Math.round((score / (assignmentData.totalPoints as number)) * 100);
  const passingScore = (assignmentData.passingScore as number) || 50;
  const passed = percentage >= passingScore;
  const accuracy = (assignmentData.totalPoints as number) > 0 ? score / (assignmentData.totalPoints as number) : 0;
  const avgReactionTimeSec = data.answers.length > 0 ? timeSpent / data.answers.length : 0;

  const difficultyMap: Record<string, Difficulty> = {};
  for (const q of questions) difficultyMap[q.id] = (q.difficulty as Difficulty) || 'medium';
  const correctMap = gradedAnswers.map((a) => ({ questionId: a.questionId, correct: a.isCorrect }));
  const complexityHandled = computeComplexityHandled(correctMap, difficultyMap);
  const level = computeLevel(accuracy, avgReactionTimeSec, complexityHandled);

  const now = new Date().toISOString();
  const result: Record<string, unknown> = { answers: gradedAnswers, score, totalPoints: assignmentData.totalPoints, percentage, passed, timeSpent, submittedAt: now, status: 'completed', level };
  await nosqlUpdate(ASSIGNMENT_SUB_V2, attemptId, result);
  const gradeId = uuidv4();
  const { error: gradeErr } = await getSupabaseAdmin().from('firestore_docs').insert({
    collection: 'grades',
    doc_id: gradeId,
    data: {
      studentId,
      courseId: assignmentData.courseId,
      subjectId: assignmentData.subjectId,
      classId: assignmentData.classId,
      itemName: assignmentData.title,
      score,
      totalPoints: assignmentData.totalPoints,
      percentage,
      gradedBy: 'auto',
      createdAt: now,
      updatedAt: now,
    },
  });
  if (gradeErr) logger.warn('Failed to create assignment grade record', { error: gradeErr.message });

  logger.info('Assignment V2 attempt submitted', { attemptId, studentId, score, percentage, level });
  return { id: attemptId, ...attemptData, ...result };
}

export async function releaseAssignmentGrades(assignmentId: string, showResults: boolean) {
  const { exists, data } = await nosqlGet(ASSIGNMENT_V2, assignmentId);
  if (!exists || !data) throw new NotFoundError('Assignment not found');

  await nosqlUpdate(ASSIGNMENT_V2, assignmentId, { showResults, updatedAt: new Date().toISOString() });
  logger.info('Assignment V2 grades release toggled', { assignmentId, showResults });

  const updated = await nosqlGet(ASSIGNMENT_V2, assignmentId);
  return { id: assignmentId, ...updated.data };
}

export async function getResults(assignmentId: string, studentId: string) {
  const assignment = await nosqlGet(ASSIGNMENT_V2, assignmentId);
  if (!assignment.exists || !assignment.data) throw new NotFoundError('Assignment not found');
  const resultsGated = !assignment.data.showResults;

  const items = await nosqlQuery(ASSIGNMENT_SUB_V2, [
    { field: 'assignmentId', value: assignmentId },
    { field: 'studentId', value: studentId },
  ]);

  return items.map((item: any) => {
    if (resultsGated && item.status === 'completed') {
      return { id: item.id, assignmentId: item.assignmentId, studentId: item.studentId, score: item.score, totalPoints: item.totalPoints, percentage: item.percentage, passed: item.passed, timeSpent: item.timeSpent, startedAt: item.startedAt, submittedAt: item.submittedAt, status: item.status, level: item.level, answers: (item.answers || []).map((a: { questionId: string; pointsEarned: number }) => ({ questionId: a.questionId, pointsEarned: a.pointsEarned })) };
    }
    return item;
  });
}

export async function listAssignmentsForClass(classId: string, studentId?: string): Promise<any[]> {
  const supabase = getSupabaseAdmin()!;
  const items = await nosqlQuery(ASSIGNMENT_V2, [{ field: 'classId', value: classId }]);

  let filtered = items;
  if (studentId) {
    filtered = items.filter((a: any) => {
      if (!a.publishedTo || a.publishedTo === 'class') return true;
      if (a.publishedTo === 'students') return (a.targetStudentIds || []).includes(studentId);
      return true;
    });
  }

  const chapterIds = [...new Set((filtered as any[]).map((a: any) => a.chapterId).filter(Boolean))];
  const conceptIds = [...new Set((filtered as any[]).map((a: any) => a.conceptId).filter(Boolean))];
  const chapterMap = new Map<string, string>();
  const conceptMap = new Map<string, string>();

  if (chapterIds.length > 0) {
    const { data } = await supabase.from('chapters').select('id, title').in('id', chapterIds);
    (data || []).forEach((r: any) => chapterMap.set(r.id, r.title));
  }
  if (conceptIds.length > 0) {
    const { data } = await supabase.from('concepts').select('id, title').in('id', conceptIds);
    (data || []).forEach((r: any) => conceptMap.set(r.id, r.title));
  }

  for (const a of filtered as any[]) {
    if (a.chapterId && chapterMap.has(a.chapterId)) a.chapterTitle = chapterMap.get(a.chapterId);
    if (a.conceptId && conceptMap.has(a.conceptId)) a.conceptTitle = conceptMap.get(a.conceptId);
  }

  return filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listAssignmentsForTeacher(teacherId: string, query: { page?: string; limit?: string; schoolId?: string }) {
  const { page, limit } = parsePagination(query);
  const all = await nosqlQuery(ASSIGNMENT_V2, [{ field: 'teacherId', value: teacherId }]);
  all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = all.length;
  const offset = (page - 1) * limit;
  const items = all.slice(offset, offset + limit);

  return { items, total, page, limit };
}
