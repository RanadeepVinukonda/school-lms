import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from '../database/adapter';
import { collections } from '../database/adapter';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTeacherAssignment } from './teacher-class-subject.service';
import { computeLevel, computeComplexityHandled } from './ai-level.service';
import type { Difficulty, StudentLevel } from './ai-level.service';
import * as gamificationService from './gamification.service';

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
const POINTS_BY_DIFFICULTY: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

export async function createExam(data: {
  title: string;
  description?: string;
  classId: string;
  textbookId: string;
  chapterId: string;
  teacherId: string;
  timeLimitMinutes: number;
  selectedModels: string[];
  questionCountPerConcept: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  startDate?: string;
  endDate?: string;
  schoolId?: string;
}) {
  const assignment = await getTeacherAssignment(data.teacherId, data.classId);
  if (!assignment) {
    throw new ForbiddenError('You are not assigned to this class');
  }

  const conceptsSnapshot = await collections.textbooks()
    .doc(data.textbookId)
    .collection('chapters')
    .doc(data.chapterId)
    .collection('concepts')
    .get();

  if (conceptsSnapshot.empty) {
    throw new NotFoundError('No concepts found in this chapter');
  }

  let totalPoints = 0;
  for (const doc of conceptsSnapshot.docs) {
    const questionsSnapshot = await doc.ref.collection('questions').get();
    const questionBank = questionsSnapshot.docs.map(qDoc => qDoc.data()) as Array<{ type: string; points: number; difficulty?: string }>;

    const filtered = questionBank.filter((q) => data.selectedModels.includes(q.type));
    const selected = filtered.slice(0, Math.min(data.questionCountPerConcept, filtered.length));
    totalPoints += selected.reduce((sum, q) => sum + (POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1), 0);
  }

  const examId = uuidv4();
  const now = new Date().toISOString();

  const examData = {
    id: examId,
    title: data.title,
    description: data.description || '',
    classId: data.classId,
    textbookId: data.textbookId,
    chapterId: data.chapterId,
    teacherId: data.teacherId,
    timeLimitMinutes: data.timeLimitMinutes,
    selectedModels: data.selectedModels,
    questionCountPerConcept: data.questionCountPerConcept,
    totalPoints,
    passingScore: data.passingScore ?? 50,
    maxAttempts: data.maxAttempts ?? 1,
    shuffleQuestions: data.shuffleQuestions ?? true,
    showResults: data.showResults ?? false,
    attemptCount: 0,
    releasedAt: null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    schoolId: data.schoolId || '',
    createdAt: now,
    updatedAt: now,
  };

  await collections.examV2().doc(examId).set(examData);

  logger.info('Exam V2 created', { examId, classId: data.classId, title: data.title });

  return examData;
}

export async function releaseExam(examId: string, teacherId: string) {
  const ref = collections.examV2().doc(examId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Exam not found');
  }

  const examData = doc.data()!;
  if (examData.teacherId !== teacherId) {
    throw new ForbiddenError('You do not own this exam');
  }

  const now = new Date().toISOString();
  await ref.update({ releasedAt: now, updatedAt: now });

  const updated = await ref.get();
  logger.info('Exam V2 released', { examId, teacherId });

  return { ...updated.data() };
}

export async function startExamAttempt(examId: string, studentId: string, selectedModels: string[]) {
  const examRef = collections.examV2().doc(examId);
  const examDoc = await examRef.get();

  if (!examDoc.exists) {
    throw new NotFoundError('Exam not found');
  }

  const examData = examDoc.data()!;

  if (!examData.releasedAt) {
    throw new ForbiddenError('Exam is not yet released');
  }

  const now = new Date();
  if (examData.startDate && now < new Date(examData.startDate)) {
    throw new ForbiddenError('Exam has not started yet');
  }
  if (examData.endDate && now > new Date(examData.endDate)) {
    throw new ForbiddenError('Exam has already ended');
  }

  const attemptsSnapshot = await collections.examAttemptV2()
    .where('examId', '==', examId)
    .where('studentId', '==', studentId)
    .get();

  const maxAttempts = examData.maxAttempts || 1;
  if (attemptsSnapshot.size >= maxAttempts) {
    throw new ForbiddenError('Maximum attempts reached');
  }

  const userDoc = await collections.users().doc(studentId).get();
  const userData = userDoc.data() || {};
  const studentLevel: StudentLevel = (userData.level as StudentLevel) || 'beginner';

  const conceptsSnapshot = await collections.textbooks()
    .doc(examData.textbookId)
    .collection('chapters')
    .doc(examData.chapterId)
    .collection('concepts')
    .get();

  if (conceptsSnapshot.empty) {
    throw new NotFoundError('No concepts found in this chapter');
  }

  const effectiveModels = selectedModels.length > 0 ? selectedModels : (examData.selectedModels || []);
  let allSelected: Array<{
    id: string;
    conceptId: string;
    type: string;
    difficulty?: Difficulty;
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
    points: number;
  }> = [];

  for (const doc of conceptsSnapshot.docs) {
    const questionsSnapshot = await doc.ref.collection('questions').get();
    const questionBank = questionsSnapshot.docs.map(qDoc => qDoc.data()) as Array<{
      id: string;
      type: string;
      difficulty?: Difficulty;
      text: string;
      options?: string[];
      correctAnswer: string;
      explanation?: string;
      points: number;
    }>;

    let available = questionBank.filter((q) => effectiveModels.includes(q.type));

    const levelRank = studentLevel === 'beginner' ? 0 : studentLevel === 'intermediate' ? 1 : 2;
    available = available.filter((q) => {
      const qRank = q.difficulty ? DIFFICULTY_RANK[q.difficulty] : 0;
      if (studentLevel === 'advanced') return qRank >= 1;
      if (studentLevel === 'intermediate') return qRank >= 0;
      return qRank <= 0;
    });

    available = [...available].sort(() => Math.random() - 0.5);

    const selected = available.slice(0, Math.min(examData.questionCountPerConcept, available.length));

    for (const q of selected) {
      allSelected.push({ ...q, conceptId: doc.id });
    }
  }

  if (examData.shuffleQuestions !== false) {
    allSelected = [...allSelected].sort(() => Math.random() - 0.5);
  }

  const totalPoints = allSelected.reduce((sum, q) => sum + (POINTS_BY_DIFFICULTY[q.difficulty || 'medium'] || 1), 0);

  const questionsForStudent = allSelected.map((q) => {
    const { correctAnswer, ...rest } = q;
    return rest;
  });

  const attemptId = uuidv4();
  const startedAt = new Date().toISOString();

  const attempt = {
    id: attemptId,
    examId,
    studentId,
    startedAt,
    submittedAt: null,
    answers: [],
    score: null,
    totalPoints,
    percentage: null,
    passed: null,
    timeSpent: 0,
    status: 'in_progress',
    selectedModels: effectiveModels,
    level: studentLevel,
  };

  await collections.examAttemptV2().doc(attemptId).set(attempt);
  await examRef.update({ attemptCount: FieldValue.increment(1) });

  logger.info('Exam V2 attempt started', { examId, studentId, attemptId });

  return { ...attempt, questions: questionsForStudent };
}

export async function submitExamAttempt(attemptId: string, studentId: string, data: {
  answers: Array<{
    questionId: string;
    answer: string | string[];
    timeSpent?: number;
  }>;
  startedAt: string;
  submittedAt: string;
}) {
  const attemptRef = collections.examAttemptV2().doc(attemptId);
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

  const examRef = collections.examV2().doc(attemptData.examId);
  const examDoc = await examRef.get();
  if (!examDoc.exists) throw new NotFoundError('Exam not found');
  const examData = examDoc.data()!;

  const startedAt = new Date(data.startedAt).getTime();
  const submittedAtTime = new Date(data.submittedAt).getTime();
  const elapsedMinutes = (submittedAtTime - startedAt) / 60000;
  if (elapsedMinutes > examData.timeLimitMinutes) {
    throw new ForbiddenError('Time limit exceeded');
  }

  const conceptsSnapshot = await collections.textbooks()
    .doc(examData.textbookId)
    .collection('chapters')
    .doc(examData.chapterId)
    .collection('concepts')
    .get();

  const allQuestionBank: Array<{
    id: string;
    type: string;
    difficulty?: Difficulty;
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
    points: number;
  }> = [];

  for (const doc of conceptsSnapshot.docs) {
    const questionsSnapshot = await doc.ref.collection('questions').get();
    const questionBank = questionsSnapshot.docs.map(qDoc => qDoc.data()) as Array<{
      id: string;
      type: string;
      difficulty?: Difficulty;
      text: string;
      options?: string[];
      correctAnswer: string;
      explanation?: string;
      points: number;
    }>;
    allQuestionBank.push(...questionBank);
  }

  let score = 0;
  const gradedAnswers = data.answers.map((answer) => {
    const question = allQuestionBank.find((q) => q.id === answer.questionId);

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

    const pointsEarned = isCorrect ? (POINTS_BY_DIFFICULTY[question.difficulty || 'medium'] || 1) : 0;
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
  const passingScore = examData.passingScore || 50;
  const passed = percentage >= passingScore;

  const accuracy = attemptData.totalPoints > 0 ? score / attemptData.totalPoints : 0;
  const avgReactionTime = gradedAnswers.length > 0
    ? gradedAnswers.reduce((sum: number, a: { timeSpent: number }) => sum + a.timeSpent, 0) / gradedAnswers.length
    : 0;

  const difficultyMap: Record<string, Difficulty> = {};
  for (const q of allQuestionBank) {
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

  logger.info('Exam V2 attempt submitted', { attemptId, studentId, score, percentage, newLevel });

  try {
    await gamificationService.recordAssessmentResult(studentId, percentage);
    await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.assessmentComplete, `Completed exam: ${examData.title}`);
    await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.assessmentComplete, `Completed exam: ${examData.title}`);
    if (percentage >= 80) {
      await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${examData.title}`);
      await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.highAccuracy, `High accuracy (${percentage}%) on ${examData.title}`);
    }
    if (percentage === 100) {
      await gamificationService.awardXp(studentId, gamificationService.XP_REWARDS.perfectScore, `Perfect score on ${examData.title}`);
      await gamificationService.awardCoins(studentId, gamificationService.COIN_REWARDS.perfectScore, `Perfect score on ${examData.title}`);
    }
    await gamificationService.updateStreak(studentId);
  } catch (gamErr) {
    logger.error('Gamification reward failed', { studentId, examId: attemptData.examId, error: gamErr });
  }

  return { id: attemptId, ...attemptData, ...result, level: newLevel };
}

export async function releaseExamGrades(examId: string, showResults: boolean) {
  const ref = collections.examV2().doc(examId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Exam not found');
  }

  await ref.update({ showResults, updatedAt: new Date().toISOString() });
  logger.info('Exam V2 grades release toggled', { examId, showResults });

  const updated = await ref.get();
  return { ...updated.data() };
}

export async function getExamResults(examId: string, studentId: string) {
  const examDoc = await collections.examV2().doc(examId).get();
  if (!examDoc.exists) throw new NotFoundError('Exam not found');

  const examData = examDoc.data()!;
  const resultsGated = !examData.showResults;

  const snapshot = await collections.examAttemptV2()
    .where('examId', '==', examId)
    .where('studentId', '==', studentId)

    .get();

  const attempts = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  const sorted = attempts.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return sorted.map((data: any) => {
    if (resultsGated && data.status === 'completed') {
      return {
        id: data.id,
        examId: data.examId,
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

export async function getExamById(examId: string) {
  const ref = collections.examV2().doc(examId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Exam not found');
  }

  return { ...doc.data() };
}

export async function listExamsForClass(classId: string, schoolId?: string): Promise<any[]> {
  let baseQuery = collections.examV2()
    .where('classId', '==', classId);
  if (schoolId) {
    baseQuery = baseQuery.where('schoolId', '==', schoolId);
  }
  const snapshot = await baseQuery.get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listExamsForTeacher(teacherId: string, schoolId?: string): Promise<any[]> {
  let baseQuery = collections.examV2()
    .where('teacherId', '==', teacherId);
  if (schoolId) {
    baseQuery = baseQuery.where('schoolId', '==', schoolId);
  }
  const snapshot = await baseQuery.get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function logProctoringEvent(attemptId: string, studentId: string, eventData: { event: string; timestamp?: string }) {
  const attemptRef = collections.examAttemptV2().doc(attemptId);
  const attemptDoc = await attemptRef.get();
  if (!attemptDoc.exists) {
    throw new NotFoundError('Attempt not found');
  }
  const attempt = attemptDoc.data()!;
  if (attempt.studentId !== studentId) {
    throw new ForbiddenError('Not your attempt');
  }

  const logId = uuidv4();
  const timestamp = eventData.timestamp || new Date().toISOString();
  const logRef = attemptRef.collection('proctoringLogs').doc(logId);
  const payload = {
    id: logId,
    event: eventData.event,
    timestamp,
  };
  await logRef.set(payload);
  return payload;
}

export async function getStudentAttempt(examId: string, studentId: string) {
  const snapshot = await collections.examAttemptV2()
    .where('examId', '==', examId)
    .where('studentId', '==', studentId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

export async function getProctoringLogs(attemptId: string) {
  const attemptRef = collections.examAttemptV2().doc(attemptId);
  const logsSnapshot = await attemptRef.collection('proctoringLogs')
    .orderBy('timestamp', 'asc')
    .get();

  return logsSnapshot.docs.map((doc) => doc.data());
}
