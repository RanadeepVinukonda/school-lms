import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { getEnrollments } from './course.service';
import { createBulkNotifications, createNotification } from './notification.service';

export async function listAllExams(query: { page?: string; limit?: string; courseId?: string }) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.exams()
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

export async function createExam(data: {
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
  timeLimit: number;
  passingScore?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  isPublished?: boolean;
  instructions?: string;
  proctored?: boolean;
}) {
  const examId = uuidv4();
  const now = new Date().toISOString();

  const totalPoints = data.questions.reduce((sum, q) => sum + q.points, 0);
  const questionsWithIds = data.questions.map((q, i) => ({ ...q, id: `q_${examId}_${i}` }));

  const examData = {
    ...data,
    questions: questionsWithIds,
    id: examId,
    totalPoints,
    attemptCount: 0,
    scheduledClasses: [],
    createdAt: now,
    updatedAt: now,
  };

  await collections.exams().doc(examId).set(examData);

  // Notify enrolled students
  try {
    const enrollments = await getEnrollments(data.courseId);
    const notifications = enrollments.map((e: any) => ({
      userId: e.studentId,
      type: 'exam',
      title: 'New Exam Created',
      body: `${data.title} has been created (${data.timeLimit} min, ${totalPoints} pts)`,
      data: { examId, courseId: data.courseId, link: `/exams/${examId}` },
    }));
    if (notifications.length > 0) await createBulkNotifications(notifications);
  } catch (err) {
    logger.warn('Failed to send exam notifications', { error: err });
  }

  logger.info('Exam created', { examId, courseId: data.courseId, title: data.title });

  return { ...examData };
}

export async function updateExam(examId: string, data: Record<string, unknown>) {
  const ref = collections.exams().doc(examId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Exam not found');
  }

  const updateData = { ...data, updatedAt: new Date().toISOString() };
  await ref.update(updateData);

  const updated = await ref.get();
  logger.info('Exam updated', { examId });

  return { ...updated.data() };
}

export async function deleteExam(examId: string) {
  const ref = collections.exams().doc(examId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Exam not found');
  }

  await ref.delete();
  logger.info('Exam deleted', { examId });
}

export async function getExamById(examId: string) {
  const ref = collections.exams().doc(examId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Exam not found');
  }

  return { ...doc.data() };
}

export async function scheduleExam(examId: string, data: {
  startDate: string;
  endDate: string;
  classIds: string[];
  proctorIds?: string[];
}) {
  const ref = collections.exams().doc(examId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Exam not found');
  }

  const updateData = {
    scheduledClasses: data.classIds,
    startDate: data.startDate,
    endDate: data.endDate,
    proctorIds: data.proctorIds || [],
    status: 'scheduled',
    updatedAt: new Date().toISOString(),
  };

  await ref.update(updateData);

  // Notify students in scheduled classes
  try {
    const examData = doc.data()!;
    for (const classId of data.classIds) {
      const classDoc = await collections.classes().doc(classId).get();
      if (classDoc.exists) {
        const classData = classDoc.data()!;
        const studentIds = (classData.studentIds as string[]) || [];
        const notifications = studentIds.map((studentId: string) => ({
          userId: studentId,
          type: 'exam',
          title: 'Exam Scheduled',
          body: `${examData.title} is scheduled from ${new Date(data.startDate).toLocaleDateString()} to ${new Date(data.endDate).toLocaleDateString()}`,
          data: { examId, link: `/exams/${examId}` },
        }));
        if (notifications.length > 0) await createBulkNotifications(notifications);
      }
    }
  } catch (err) {
    logger.warn('Failed to send exam schedule notifications', { error: err });
  }

  logger.info('Exam scheduled', { examId, classIds: data.classIds });

  const updated = await ref.get();
  return { ...updated.data() };
}

export async function startExamAttempt(examId: string, studentId: string) {
  const examRef = collections.exams().doc(examId);
  const exam = await examRef.get();

  if (!exam.exists) {
    throw new NotFoundError('Exam not found');
  }

  const examData = exam.data()!;

  const attemptsSnapshot = await collections.examAttempts()
    .where('examId', '==', examId)
    .where('studentId', '==', studentId)
    .get();

  if (examData.maxAttempts && attemptsSnapshot.size >= examData.maxAttempts) {
    throw new ForbiddenError('Maximum attempts reached');
  }

  const attemptId = uuidv4();
  const now = new Date().toISOString();

  const attempt = {
    id: attemptId,
    examId,
    studentId,
    startedAt: now,
    submittedAt: null,
    answers: [],
    score: null,
    totalPoints: examData.totalPoints,
    percentage: null,
    passed: null,
    timeSpent: 0,
    status: 'in_progress',
  };

  await collections.examAttempts().doc(attemptId).set(attempt);
  const currentAttemptCount = (examData.attemptCount as number) || 0;
  await examRef.update({ attemptCount: currentAttemptCount + 1 });

  logger.info('Exam attempt started', { examId, studentId, attemptId });

  return { ...attempt, questions: examData.questions };
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
  const attemptRef = collections.examAttempts().doc(attemptId);
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

  const examRef = collections.exams().doc(attemptData.examId);
  const exam = await examRef.get();
  const examData = exam.data()!;

  let score = 0;
  const gradedAnswers = data.answers.map((answer) => {
    const question = examData.questions.find(
      (q: any) => q.id === answer.questionId
    );

    if (!question) {
      return { questionId: answer.questionId, isCorrect: false, pointsEarned: 0 };
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
  const percentage = Math.round((score / examData.totalPoints) * 100);
  const passingScore = examData.passingScore || 50;
  const passed = percentage >= passingScore;

  const result = {
    answers: gradedAnswers,
    score,
    totalPoints: examData.totalPoints,
    percentage,
    passed,
    timeSpent,
    submittedAt: data.submittedAt,
    status: 'completed',
  };

  await attemptRef.update(result);

  logger.info('Exam attempt submitted', { attemptId, studentId, score, percentage });

  return { id: attemptId, ...attemptData, ...result };
}

export async function gradeExamAttempt(attemptId: string, graderId: string, data: {
  score: number;
  feedback?: string;
}) {
  const attemptRef = collections.examAttempts().doc(attemptId);
  const attempt = await attemptRef.get();

  if (!attempt.exists) {
    throw new NotFoundError('Attempt not found');
  }

  const updateData = {
    score: data.score,
    feedback: data.feedback || '',
    gradedBy: graderId,
    gradedAt: new Date().toISOString(),
    status: 'graded',
  };

  await attemptRef.update(updateData);

  // Notify student of exam grade
  try {
    const attemptData = attempt.data()!;
    await createNotification({
      userId: attemptData.studentId as string,
      type: 'grade',
      title: 'Exam Graded',
      body: `Your exam has been graded: ${data.score} points${data.feedback ? ' - ' + data.feedback : ''}`,
      data: { attemptId, examId: attemptData.examId as string, link: `/exams/${attemptData.examId}` },
    });
  } catch (err) {
    logger.warn('Failed to send exam grade notification', { error: err });
  }

  logger.info('Exam attempt graded', { attemptId, graderId });

  const updated = await attemptRef.get();
  return { ...updated.data() };
}

export async function getExamResults(examId: string, studentId: string) {
  const snapshot = await collections.examAttempts()
    .where('examId', '==', examId)
    .where('studentId', '==', studentId)
    .orderBy('startedAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
}


