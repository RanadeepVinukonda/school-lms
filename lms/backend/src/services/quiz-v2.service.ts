import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTeacherAssignment } from './teacher-class-subject.service';
import { computeLevel, computeComplexityHandled } from './ai-level.service';
import type { Difficulty, StudentLevel } from './ai-level.service';

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

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
  // optional fields that might be sent by client but are not used for generation
  subjectId?: string;
  questions?: any[];
}) {
  const assignment = await getTeacherAssignment(data.teacherId, data.classId);
  if (!assignment) {
    throw new ForbiddenError('You are not assigned to this class');
  }

  const conceptRef = collections.textbooks()
    .doc(data.textbookId)
    .collection('chapters')
    .doc(data.chapterId)
    .collection('concepts')
    .doc(data.conceptId);

  const conceptDoc = await conceptRef.get();
  if (!conceptDoc.exists) {
    throw new NotFoundError('Concept not found');
  }

  const conceptData = conceptDoc.data()!;
  // Ensure questionBank is an array; Firestore may store it as undefined or an object.
  const rawBank = conceptData.questionBank;
  const questionBank = Array.isArray(rawBank) ? (rawBank as Array<{ points: number }>) : [];
  const totalPoints = questionBank.reduce((sum: number, q: { points: number }) => sum + (q.points || 0), 0);

  const quizId = uuidv4();
  const now = new Date().toISOString();

  // Ensure optional fields are defined to avoid Firestore "undefined" errors.
  const selectedModels = data.selectedModels ?? [];
  const questionCount = data.questionCount ?? 0;

  const quizData = {
    id: quizId,
    title: data.title,
    description: data.description || '',
    classId: data.classId,
    textbookId: data.textbookId,
    chapterId: data.chapterId,
    conceptId: data.conceptId,
    teacherId: data.teacherId,
    timeLimitMinutes: data.timeLimitMinutes,
    selectedModels,
    questionCount,
    totalPoints,
    passingScore: data.passingScore ?? 50,
    maxAttempts: data.maxAttempts ?? 3,
    shuffleQuestions: data.shuffleQuestions ?? true,
    showResults: data.showResults ?? false,
    releasedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await collections.quizV2().doc(quizId).set(quizData);

  logger.info('Quiz V2 created', { quizId, classId: data.classId, title: data.title });

  return quizData;
}

export async function releaseQuiz(quizId: string, teacherId: string) {
  const ref = collections.quizV2().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  const quizData = doc.data()!;
  if (quizData.teacherId !== teacherId) {
    throw new ForbiddenError('You do not own this quiz');
  }

  const now = new Date().toISOString();
  await ref.update({ releasedAt: now, updatedAt: now });

  const updated = await ref.get();
  logger.info('Quiz V2 released', { quizId, teacherId });

  return { ...updated.data() };
}

export async function startQuizAttempt(quizId: string, studentId: string, selectedModels: string[]) {
  const quizRef = collections.quizV2().doc(quizId);
  const quizDoc = await quizRef.get();

  if (!quizDoc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  const quizData = quizDoc.data()!;

  if (!quizData.releasedAt) {
    throw new ForbiddenError('Quiz is not yet released');
  }

  const attemptsSnapshot = await collections.quizAttemptV2()
    .where('quizId', '==', quizId)
    .where('studentId', '==', studentId)
    .get();

  const maxAttempts = quizData.maxAttempts || 3;
  if (attemptsSnapshot.size >= maxAttempts) {
    throw new ForbiddenError('Maximum attempts reached');
  }

  const userDoc = await collections.users().doc(studentId).get();
  const userData = userDoc.data() || {};
  const studentLevel: StudentLevel = (userData.level as StudentLevel) || 'beginner';

  const conceptRef = collections.textbooks()
    .doc(quizData.textbookId)
    .collection('chapters')
    .doc(quizData.chapterId)
    .collection('concepts')
    .doc(quizData.conceptId);

  const conceptDoc = await conceptRef.get();
  if (!conceptDoc.exists) {
    throw new NotFoundError('Concept not found');
  }

  const conceptData = conceptDoc.data()!;
  // Ensure questionBank is an array; fallback to empty array if missing or malformed.
  const rawBank = conceptData.questionBank;
  const questionBank = Array.isArray(rawBank) ? (rawBank as Array<{
    id: string;
    type: string;
    difficulty?: Difficulty;
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
    points: number;
  }>) : [];

  let available = questionBank.filter((q) => selectedModels.includes(q.type));

  available = available.filter((q) => {
    const qRank = q.difficulty ? DIFFICULTY_RANK[q.difficulty] : 0;
    if (studentLevel === 'advanced') return qRank >= 1;
    if (studentLevel === 'intermediate') return qRank >= 0;
    return qRank <= 0;
  });

  if (quizData.shuffleQuestions !== false) {
    available = [...available].sort(() => Math.random() - 0.5);
  }

  const selected = available.slice(0, Math.min(quizData.questionCount, available.length));

  const questionsForStudent = selected.map((q) => {
    const { correctAnswer, ...rest } = q;
    return rest;
  });

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
    totalPoints: selected.reduce((sum: number, q) => sum + (q.points || 0), 0),
    percentage: null,
    passed: null,
    timeSpent: 0,
    status: 'in_progress',
    selectedModels,
    level: studentLevel,
  };

  await collections.quizAttemptV2().doc(attemptId).set(attempt);
  await quizRef.update({ attemptCount: FieldValue.increment(1) });

  logger.info('Quiz V2 attempt started', { quizId, studentId, attemptId });

  return { ...attempt, questions: questionsForStudent };
}

export async function submitQuizAttempt(attemptId: string, studentId: string, data: {
  answers: Array<{
    questionId: string;
    answer: string | string[];
    timeSpent?: number;
  }>;
  startedAt: string;
  submittedAt: string;
}) {
  const attemptRef = collections.quizAttemptV2().doc(attemptId);
  const attemptDoc = await attemptRef.get();

  if (!attemptDoc.exists) {
    throw new NotFoundError('Attempt not found');
  }

  const attemptData = attemptDoc.data()!;

  if (attemptData.studentId !== studentId) {
    throw new ForbiddenError('Not your attempt');
  }

  if (attemptData.status !== 'in_progress') {
    throw new ForbiddenError('Attempt already submitted');
  }

  const quizRef = collections.quizV2().doc(attemptData.quizId);
  const quizDoc = await quizRef.get();
  if (!quizDoc.exists) throw new NotFoundError('Quiz not found');
  const quizData = quizDoc.data()!;

  const startedAt = new Date(data.startedAt).getTime();
  const submittedAtTime = new Date(data.submittedAt).getTime();
  const elapsedMinutes = (submittedAtTime - startedAt) / 60000;
  if (elapsedMinutes > quizData.timeLimitMinutes) {
    throw new ForbiddenError('Time limit exceeded');
  }

  const conceptRef = collections.textbooks()
    .doc(quizData.textbookId)
    .collection('chapters')
    .doc(quizData.chapterId)
    .collection('concepts')
    .doc(quizData.conceptId);

  const conceptDoc = await conceptRef.get();
  if (!conceptDoc.exists) throw new NotFoundError('Concept not found');
  const conceptData = conceptDoc.data()!;
  // Ensure questionBank is an array; fallback to empty array.
  const rawBank = conceptData.questionBank;
  const questionBank = Array.isArray(rawBank) ? (rawBank as Array<{
    id: string;
    type: string;
    difficulty?: Difficulty;
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
    points: number;
  }>) : [];

  let score = 0;
  const gradedAnswers = data.answers.map((answer) => {
    const question = questionBank.find((q) => q.id === answer.questionId);

    if (!question) {
      return { questionId: answer.questionId, answer: answer.answer, isCorrect: false, pointsEarned: 0, timeSpent: answer.timeSpent || 0 };
    }

    let isCorrect = false;
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      isCorrect = answer.answer === question.correctAnswer;
    } else if (question.type === 'short_answer' || question.type === 'fill_blank') {
      isCorrect = answer.answer.toString().toLowerCase().trim() ===
        question.correctAnswer?.toString().toLowerCase().trim();
    }

    const pointsEarned = isCorrect ? question.points : 0;
    if (isCorrect) score += pointsEarned;

    return {
      questionId: answer.questionId,
      answer: answer.answer,
      isCorrect,
      pointsEarned,
      timeSpent: answer.timeSpent || 0,
    };
  });

  const timeSpent = data.answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  const percentage = attemptData.totalPoints > 0 ? Math.round((score / attemptData.totalPoints) * 100) : 0;
  const passingScore = quizData.passingScore || 50;
  const passed = percentage >= passingScore;

  const accuracy = attemptData.totalPoints > 0 ? score / attemptData.totalPoints : 0;
  const avgReactionTime = gradedAnswers.length > 0
    ? gradedAnswers.reduce((sum: number, a: { timeSpent: number }) => sum + a.timeSpent, 0) / gradedAnswers.length
    : 0;

  const difficultyMap: Record<string, Difficulty> = {};
  for (const q of questionBank) {
    difficultyMap[q.id] = q.difficulty || 'easy';
  }

  const complexityHandled = computeComplexityHandled(
    gradedAnswers.map((a: { questionId: string; isCorrect: boolean }) => ({ questionId: a.questionId, correct: a.isCorrect })),
    difficultyMap,
  );

  const newLevel = computeLevel(accuracy, avgReactionTime, complexityHandled);

  await collections.users().doc(studentId).update({ level: newLevel });

  const result = {
    answers: gradedAnswers,
    score,
    totalPoints: attemptData.totalPoints,
    percentage,
    passed,
    timeSpent,
    submittedAt: data.submittedAt,
    status: 'completed',
  };

  await attemptRef.update(result);

  logger.info('Quiz V2 attempt submitted', { attemptId, studentId, score, percentage, newLevel });

  return { id: attemptId, ...attemptData, ...result, level: newLevel };
}

export async function releaseQuizGrades(quizId: string, showResults: boolean) {
  const ref = collections.quizV2().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  await ref.update({ showResults, updatedAt: new Date().toISOString() });
  logger.info('Quiz V2 grades release toggled', { quizId, showResults });

  const updated = await ref.get();
  return { ...updated.data() };
}

export async function getQuizResults(quizId: string, studentId: string) {
  const quizDoc = await collections.quizV2().doc(quizId).get();
  if (!quizDoc.exists) throw new NotFoundError('Quiz not found');

  const quizData = quizDoc.data()!;
  const resultsGated = !quizData.showResults;

  const snapshot = await collections.quizAttemptV2()
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
        selectedModels: data.selectedModels,
        level: data.level,
        answers: data.answers?.map((a: { questionId: string; pointsEarned: number }) => ({
          questionId: a.questionId,
          pointsEarned: a.pointsEarned,
        })) ?? [],
      };
    }
    return data;
  });
}

export async function getQuizById(quizId: string) {
  const ref = collections.quizV2().doc(quizId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Quiz not found');
  }

  return { ...doc.data() };
}

export async function listQuizzesForClass(classId: string): Promise<any[]> {
  const snapshot = await collections.quizV2()
    .where('classId', '==', classId)
    .get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listQuizzesForTeacher(teacherId: string): Promise<any[]> {
  const snapshot = await collections.quizV2()
    .where('teacherId', '==', teacherId)
    .get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Get a quiz for a specific concept (first matching). */
export async function getQuizForConcept(conceptId: string) {
  const snapshot = await collections.quizV2()
    .where('conceptId', '==', conceptId)
    .limit(1)
    .get();
  if (snapshot.empty) {
    throw new NotFoundError('Quiz not found for concept');
  }
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

