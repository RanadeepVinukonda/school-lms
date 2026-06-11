import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { computeLevel, computeComplexityHandled, type Difficulty, type StudentLevel } from './ai-level.service';

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
}) {
  const assignmentId = uuidv4();
  const now = new Date().toISOString();

  const totalPoints = data.questions.reduce((sum, q) => sum + q.points, 0);
  const questionsWithIds = data.questions.map((q, i) => ({ ...q, id: `q_${assignmentId}_${i}` }));

  const assignmentData = {
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

  await collections.assignmentV2().doc(assignmentId).set(assignmentData);

  logger.info('Assignment V2 created', { assignmentId, classId: data.classId, title: data.title });

  return { ...assignmentData };
}

export async function getAssignmentById(assignmentId: string) {
  const ref = collections.assignmentV2().doc(assignmentId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Assignment not found');
  }

  return { ...doc.data() };
}

export async function releaseAssignment(assignmentId: string) {
  const ref = collections.assignmentV2().doc(assignmentId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Assignment not found');
  }

  const now = new Date().toISOString();
  await ref.update({ releasedAt: now, updatedAt: now });

  const updated = await ref.get();
  logger.info('Assignment V2 released', { assignmentId });

  return { ...updated.data() };
}

export async function startAssignment(assignmentId: string, studentId: string) {
  const assignmentRef = collections.assignmentV2().doc(assignmentId);
  const assignment = await assignmentRef.get();

  if (!assignment.exists) {
    throw new NotFoundError('Assignment not found');
  }

  const assignmentData = assignment.data()!;

  if (!assignmentData.releasedAt) {
    throw new ForbiddenError('Assignment has not been released yet');
  }

  const attemptsSnapshot = await collections.assignmentSubmissionV2()
    .where('assignmentId', '==', assignmentId)
    .where('studentId', '==', studentId)
    .get();

  if (assignmentData.maxAttempts && attemptsSnapshot.size >= assignmentData.maxAttempts) {
    throw new ForbiddenError('Maximum attempts reached');
  }

  const attemptId = uuidv4();
  const now = new Date().toISOString();

  const attempt = {
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

  await collections.assignmentSubmissionV2().doc(attemptId).set(attempt);
  await assignmentRef.update({ attemptCount: FieldValue.increment(1) });

  logger.info('Assignment V2 attempt started', { assignmentId, studentId, attemptId });

  const questionsWithoutAnswers = assignmentData.questions.map(
    (q: { correctAnswer?: string; explanation?: string; [key: string]: unknown }) => {
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
  const attemptRef = collections.assignmentSubmissionV2().doc(attemptId);
  const attempt = await attemptRef.get();

  if (!attempt.exists) {
    throw new NotFoundError('Attempt not found');
  }

  const attemptData = attempt.data()!;
  if (attemptData.studentId !== studentId) {
    throw new ForbiddenError('Not your attempt');
  }

  if (attemptData.status !== 'in_progress') {
    throw new ForbiddenError('Attempt already submitted');
  }

  const assignmentRef = collections.assignmentV2().doc(attemptData.assignmentId);
  const assignment = await assignmentRef.get();
  const assignmentData = assignment.data()!;

  let score = 0;
  const gradedAnswers = data.answers.map((answer) => {
    const question = assignmentData.questions.find(
      (q: { id: string }) => q.id === answer.questionId
    );

    if (!question) {
      return { questionId: answer.questionId, answer: answer.answer, isCorrect: false, pointsEarned: 0, timeSpent: answer.timeSpent || 0 };
    }

    let isCorrect = false;
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      isCorrect = answer.answer === question.correctAnswer;
    } else if (question.type === 'short_answer') {
      isCorrect = answer.answer.toString().toLowerCase().trim() ===
        question.correctAnswer?.toString().toLowerCase().trim();
    }

    const pointsEarned = isCorrect ? question.points : 0;
    if (isCorrect) score += pointsEarned;

    return {
      questionId: question.id,
      answer: answer.answer,
      isCorrect,
      pointsEarned,
      timeSpent: answer.timeSpent || 0,
    };
  });

  const timeSpent = data.answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  const percentage = Math.round((score / assignmentData.totalPoints) * 100);
  const passingScore = assignmentData.passingScore || 50;
  const passed = percentage >= passingScore;

  const accuracy = assignmentData.totalPoints > 0 ? score / assignmentData.totalPoints : 0;
  const avgReactionTimeSec = data.answers.length > 0 ? timeSpent / data.answers.length : 0;

  const difficultyMap: Record<string, Difficulty> = {};
  for (const q of assignmentData.questions) {
    difficultyMap[q.id] = q.difficulty || 'medium';
  }

  const correctMap = gradedAnswers.map((a) => ({
    questionId: a.questionId,
    correct: a.isCorrect,
  }));
  const complexityHandled = computeComplexityHandled(correctMap, difficultyMap);
  const level = computeLevel(accuracy, avgReactionTimeSec, complexityHandled);

  const result = {
    answers: gradedAnswers,
    score,
    totalPoints: assignmentData.totalPoints,
    percentage,
    passed,
    timeSpent,
    submittedAt: data.submittedAt,
    status: 'completed',
    level,
  };

  await attemptRef.update(result);

  logger.info('Assignment V2 attempt submitted', { attemptId, studentId, score, percentage, level });

  return { id: attemptId, ...attemptData, ...result };
}

export async function releaseAssignmentGrades(assignmentId: string, showResults: boolean) {
  const ref = collections.assignmentV2().doc(assignmentId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Assignment not found');
  }

  await ref.update({ showResults, updatedAt: new Date().toISOString() });
  logger.info('Assignment V2 grades release toggled', { assignmentId, showResults });

  const updated = await ref.get();
  return { ...updated.data() };
}

export async function getResults(assignmentId: string, studentId: string) {
  const assignmentRef = collections.assignmentV2().doc(assignmentId);
  const assignment = await assignmentRef.get();
  if (!assignment.exists) throw new NotFoundError('Assignment not found');

  const assignmentData = assignment.data()!;
  const resultsGated = !assignmentData.showResults;

  const snapshot = await collections.assignmentSubmissionV2()
    .where('assignmentId', '==', assignmentId)
    .where('studentId', '==', studentId)

    .get();

  const items = snapshot.docs.map((doc) => {
    const data = doc.data();

    if (resultsGated && data.status === 'completed') {
      return {
        id: doc.id,
        assignmentId: data.assignmentId,
        studentId: data.studentId,
        score: data.score,
        totalPoints: data.totalPoints,
        percentage: data.percentage,
        passed: data.passed,
        timeSpent: data.timeSpent,
        startedAt: data.startedAt,
        submittedAt: data.submittedAt,
        status: data.status,
        level: data.level,
        answers: data.answers?.map((a: { questionId: string; pointsEarned: number }) => ({
          questionId: a.questionId,
          pointsEarned: a.pointsEarned,
        })) ?? [],
      };
    }

    return { ...data, id: doc.id };
  });

  return items;
}

export async function listAssignmentsForClass(classId: string, query: { page?: string; limit?: string }) {
  const { page, limit } = parsePagination(query);
  const snapshot = await collections.assignmentV2()
    .where('classId', '==', classId)
    .get();

  const all: any[] = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = all.length;
  const offset = (page - 1) * limit;
  const items = all.slice(offset, offset + limit);

  return { items, total, page, limit };
}

export async function listAssignmentsForTeacher(teacherId: string, query: { page?: string; limit?: string }) {
  const { page, limit } = parsePagination(query);
  const snapshot = await collections.assignmentV2()
    .where('teacherId', '==', teacherId)
    .get();

  const all: any[] = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = all.length;
  const offset = (page - 1) * limit;
  const items = all.slice(offset, offset + limit);

  return { items, total, page, limit };
}
