import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { getEnrollments } from './course.service';
import { createBulkNotifications, createNotification } from './notification.service';

/** List all exams with optional courseId filter, paginated by createdAt desc. */
export async function listAllExams(query: { page?: string; limit?: string; courseId?: string }) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.exams();
  if (query.courseId) {
    baseQuery = baseQuery.where('courseId', '==', query.courseId);
  }
  const snapshot = await baseQuery.get();
  const all = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  const sorted = all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = sorted.length;
  const offset = (page - 1) * limit;
  const items = sorted.slice(offset, offset + limit);
  return { items, total, page, limit };
}

/** Create a new exam, assign IDs to each question, and notify enrolled students. */
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
    const notifications = enrollments.map((e: { id?: string; studentId: string }) => ({
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

/** Update exam fields. Throws NotFoundError if missing. */
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

/** Delete an exam by id. Throws NotFoundError if missing. */
export async function deleteExam(examId: string) {
  const ref = collections.exams().doc(examId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Exam not found');
  }

  await ref.delete();
  logger.info('Exam deleted', { examId });
}

/** Fetch a single exam by id. Throws NotFoundError if missing. */
export async function getExamById(examId: string) {
  const ref = collections.exams().doc(examId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Exam not found');
  }

  return { ...doc.data() };
}

/** Schedule an exam for specific classes and notify affected students. */
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

/** Start an exam attempt for a student. Enforces maxAttempts, increments attemptCount. */
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
  await examRef.update({ attemptCount: FieldValue.increment(1) });

  logger.info('Exam attempt started', { examId, studentId, attemptId });

  return { ...attempt, questions: examData.questions };
}

/** Submit an exam attempt, auto-grade multiple-choice / true-false / short-answer questions. */
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
      (q: { id: string; questionText: string; type: string; points: number; correctAnswer?: string }) => q.id === answer.questionId
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

/** Grade an exam attempt manually and notify the student. */
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

/** Toggle whether exam grades are visible to students. */
export async function releaseExamGrades(examId: string, gradesReleased: boolean) {
  const ref = collections.exams().doc(examId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Exam not found');
  }

  await ref.update({ gradesReleased, updatedAt: new Date().toISOString() });
  logger.info('Exam grades release toggled', { examId, gradesReleased });

  const updated = await ref.get();
  return { ...updated.data() };
}

/** Get all exam results for a specific student, ordered by startedAt desc. */
export async function getExamResults(examId: string, studentId: string) {
  const examRef = collections.exams().doc(examId);
  const exam = await examRef.get();
  if (!exam.exists) throw new NotFoundError('Exam not found');

  const examData = exam.data()!;
  const resultsGated = !examData.gradesReleased;

  const snapshot = await collections.examAttempts()
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
        answers: data.answers?.map((a: { questionId: string; pointsEarned: number }) => ({
          questionId: a.questionId,
          pointsEarned: a.pointsEarned,
        })) ?? [],
      };
    }
    return data;
  });
}
