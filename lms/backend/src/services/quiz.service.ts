import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

import { parsePagination } from '../utils/pagination';

export async function listAllQuizzes(query: { page?: string; limit?: string; courseId?: string }) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.quizzes()
    .orderBy('createdAt', 'desc');

  if (query.courseId) {
    baseQuery = baseQuery.where('courseId', '==', query.courseId);
  }

  const countSnapshot = await baseQuery.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;
  const snapshot = await baseQuery.offset(offset).limit(limit).get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

  return { items, total, page, limit };
}

export async function createQuiz(data: {
  title: string;
  description?: string;
  courseId: string;
  questions: Array<{
    questionText: string;
    type: string;
    points: number;
    options?: string[];
    correctAnswer?: string;
    correctAnswers?: string[];
    explanation?: string;
  }>;
  timeLimit?: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  isPublished?: boolean;
  dueDate?: string;
  instructions?: string;
}) {
  const quizId = uuidv4();
  const now = new Date().toISOString();

  const totalPoints = data.questions.reduce((sum, q) => sum + q.points, 0);

  const quizData = {
    ...data,
    id: quizId,
    totalPoints,
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await collections.quizzes().doc(quizId).set(quizData);

  logger.info('Quiz created', { quizId, courseId: data.courseId, title: data.title });

  return { ...quizData };
}

export async function updateQuiz(quizId: string, data: Record<string, unknown>) {
  const ref = collections.quizzes().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  const updateData = { ...data, updatedAt: new Date().toISOString() };
  await ref.update(updateData);

  const updated = await ref.get();
  logger.info('Quiz updated', { quizId });

  return { ...updated.data() };
}

export async function deleteQuiz(quizId: string) {
  const ref = collections.quizzes().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  await ref.delete();
  logger.info('Quiz deleted', { quizId });
}

export async function getQuizById(quizId: string) {
  const ref = collections.quizzes().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  return { ...doc.data() };
}

export async function startAttempt(quizId: string, studentId: string) {
  const quizRef = collections.quizzes().doc(quizId);
  const quiz = await quizRef.get();

  if (!quiz.exists) {
    throw new NotFoundError('Quiz not found');
  }

  const quizData = quiz.data()!;

  const attemptsSnapshot = await collections.quizAttempts()
    .where('quizId', '==', quizId)
    .where('studentId', '==', studentId)
    .get();

  if (quizData.maxAttempts && attemptsSnapshot.size >= quizData.maxAttempts) {
    throw new ForbiddenError('Maximum attempts reached');
  }

  const attemptId = uuidv4();
  const now = new Date().toISOString();

  const attempt = {
    id: attemptId,
    quizId,
    studentId,
    startedAt: now,
    submittedAt: null,
    answers: [],
    score: null,
    totalPoints: quizData.totalPoints,
    percentage: null,
    passed: null,
    timeSpent: 0,
    status: 'in_progress',
  };

  await collections.quizAttempts().doc(attemptId).set(attempt);
  await quizRef.update({ attemptCount: 1 });

  logger.info('Quiz attempt started', { quizId, studentId, attemptId });

  return { ...attempt, questions: quizData.questions };
}

export async function submitAttempt(attemptId: string, studentId: string, data: {
  answers: Array<{
    questionId: string;
    answer: string | string[];
    timeSpent?: number;
  }>;
  startedAt: string;
  submittedAt: string;
}) {
  const attemptRef = collections.quizAttempts().doc(attemptId);
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

  const quizRef = collections.quizzes().doc(attemptData.quizId);
  const quiz = await quizRef.get();
  const quizData = quiz.data()!;

  let score = 0;
  const gradedAnswers = data.answers.map((answer) => {
    const question = quizData.questions.find(
      (q: any) => q.questionText === answer.questionId || q.questionText === answer.questionId
    );

    if (!question) {
      return { ...answer, isCorrect: false, pointsEarned: 0 };
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
      questionId: question.questionText,
      answer: answer.answer,
      isCorrect,
      pointsEarned,
      timeSpent: answer.timeSpent || 0,
    };
  });

  const timeSpent = data.answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  const percentage = Math.round((score / quizData.totalPoints) * 100);
  const passingScore = quizData.passingScore || 50;
  const passed = percentage >= passingScore;

  const result = {
    answers: gradedAnswers,
    score,
    totalPoints: quizData.totalPoints,
    percentage,
    passed,
    timeSpent,
    submittedAt: data.submittedAt,
    status: 'completed',
  };

  await attemptRef.update(result);

  logger.info('Quiz attempt submitted', { attemptId, studentId, score, percentage });

  return { id: attemptId, ...attemptData, ...result };
}

export async function getQuizResults(quizId: string, studentId: string) {
  const snapshot = await collections.quizAttempts()
    .where('quizId', '==', quizId)
    .where('studentId', '==', studentId)
    .orderBy('startedAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
}


