import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from '../firebase/firestore';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

/** List all quizzes with optional courseId filter, paginated by createdAt desc. */
export async function listAllQuizzes(query: { page?: string; limit?: string; courseId?: string }) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.quizzes();

  if (query.courseId) {
    baseQuery = baseQuery.where('courseId', '==', query.courseId);
  }

  const offset = (page - 1) * limit;
  const snapshot = await baseQuery.get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  const sorted = items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = sorted.length;
  const paged = sorted.slice(offset, offset + limit);

  return { items: paged, total, page, limit };
}

/** Create a new quiz with calculated totalPoints. */
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

/** Update quiz fields. Throws NotFoundError if missing. */
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

/** Delete a quiz by id. Throws NotFoundError if missing. */
export async function deleteQuiz(quizId: string) {
  const ref = collections.quizzes().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  await ref.delete();
  logger.info('Quiz deleted', { quizId });
}

/** Fetch a single quiz by id. Throws NotFoundError if missing. */
export async function getQuizById(quizId: string) {
  const ref = collections.quizzes().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  return { ...doc.data() };
}

/** Start a quiz attempt for a student. Enforces maxAttempts. */
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
  await quizRef.update({ attemptCount: FieldValue.increment(1) });

  logger.info('Quiz attempt started', { quizId, studentId, attemptId });

  return { ...attempt, questions: quizData.questions };
}

/** Submit a quiz attempt, auto-grade MC / true-false / short-answer questions. */
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
      (q: { questionText: string; type: string; points: number; correctAnswer?: string }) => q.questionText === answer.questionId
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

/** Toggle whether quiz results (correct answers) are visible to students. */
export async function releaseQuizGrades(quizId: string, showResults: boolean) {
  const ref = collections.quizzes().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  await ref.update({ showResults, updatedAt: new Date().toISOString() });
  logger.info('Quiz grades release toggled', { quizId, showResults });

  const updated = await ref.get();
  return { ...updated.data() };
}

/** Get all quiz results for a student, ordered by startedAt desc. */
export async function getQuizResults(quizId: string, studentId: string) {
  const quizRef = collections.quizzes().doc(quizId);
  const quiz = await quizRef.get();
  if (!quiz.exists) throw new NotFoundError('Quiz not found');

  const quizData = quiz.data()!;
  const resultsGated = !quizData.showResults;

  const snapshot = await collections.quizAttempts()
    .where('quizId', '==', quizId)
    .where('studentId', '==', studentId)
    .get();

  const attempts = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  const sorted = attempts.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return sorted.map((data: any) => {
    if (resultsGated && data.status === 'completed') {
      return {
        id: data.id,
        quizId: data.quizId,
        studentId: data.studentId,
        score: data.score,
        totalPoints: data.totalPoints,
        percentage: data.percentage,
        passed: data.passed,
        timeSpent: data.timeSpent,
        startedAt: data.startedAt,
        submittedAt: data.submittedAt,
        status: data.status,
        answers: data.answers?.map((a: { questionId: string; pointsEarned: number }) => ({
          questionId: a.questionId,
          pointsEarned: a.pointsEarned,
        })) ?? [],
      };
    }
    return data;
  });
}
