import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { getEnrollments } from './course.service';
import { createBulkNotifications, createNotification } from './notification.service';

export async function createAssignment(data: {
  title: string;
  description: string;
  courseId: string;
  dueDate: string;
  points: number;
  passingGrade?: number;
  maxAttempts?: number;
  allowLateSubmission?: boolean;
  latePenaltyPercent?: number;
  isPublished?: boolean;
}) {
  const assignmentId = uuidv4();
  const now = new Date().toISOString();

  const assignmentData = {
    ...data,
    id: assignmentId,
    submissionCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await collections.assignments().doc(assignmentId).set(assignmentData);

  // Notify enrolled students
  try {
    const enrollments = await getEnrollments(data.courseId);
    const notifications = enrollments.map((e: any) => ({
      userId: e.studentId,
      type: 'assignment',
      title: 'New Assignment Posted',
      body: `${data.title} has been posted. Due: ${new Date(data.dueDate).toLocaleDateString()}`,
      data: { assignmentId, courseId: data.courseId, link: `/assignments/${assignmentId}` },
    }));
    if (notifications.length > 0) await createBulkNotifications(notifications);
  } catch (err) {
    logger.warn('Failed to send assignment notifications', { error: err });
  }

  logger.info('Assignment created', { assignmentId, courseId: data.courseId, title: data.title });

  return { ...assignmentData };
}

export async function updateAssignment(assignmentId: string, data: Record<string, unknown>) {
  const ref = collections.assignments().doc(assignmentId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Assignment not found');
  }

  const updateData = { ...data, updatedAt: new Date().toISOString() };
  await ref.update(updateData);

  const updated = await ref.get();
  logger.info('Assignment updated', { assignmentId });

  return { ...updated.data() };
}

export async function deleteAssignment(assignmentId: string) {
  const ref = collections.assignments().doc(assignmentId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Assignment not found');
  }

  await ref.delete();
  logger.info('Assignment deleted', { assignmentId });
}

export async function getAssignmentById(assignmentId: string) {
  const ref = collections.assignments().doc(assignmentId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Assignment not found');
  }

  return { ...doc.data() };
}

export async function listAllAssignments(query: { page?: string; limit?: string; courseId?: string }) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.assignments()
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

export async function listAssignmentsByCourse(courseId: string, query: { page?: string; limit?: string }) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.assignments()
    .where('courseId', '==', courseId)
    .orderBy('createdAt', 'desc');

  const countSnapshot = await baseQuery.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;
  const snapshot = await baseQuery.offset(offset).limit(limit).get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

  return { items, total, page, limit };
}

export async function submitAssignment(assignmentId: string, studentId: string, data: {
  content?: string;
  attachments?: Array<{ name: string; url: string; type: string; size: number }>;
}) {
  const assignmentRef = collections.assignments().doc(assignmentId);
  const assignment = await assignmentRef.get();

  if (!assignment.exists) {
    throw new NotFoundError('Assignment not found');
  }

  const assignmentData = assignment.data()!;
  const submissionId = `${assignmentId}_${studentId}`;
  const submissionRef = collections.submissions().doc(submissionId);

  const existing = await submissionRef.get();
  if (existing.exists) {
    const attemptCount = (existing.data()!.attemptCount || 1) + 1;
    if (assignmentData.maxAttempts && attemptCount > assignmentData.maxAttempts) {
      throw new ForbiddenError('Maximum attempts exceeded');
    }
  }

  const now = new Date().toISOString();
  const dueDate = new Date(assignmentData.dueDate);
  const isLate = now > dueDate.toISOString();
  const attemptCount = existing.exists ? (existing.data()!.attemptCount || 1) + 1 : 1;

  const submission = {
    assignmentId,
    studentId,
    content: data.content || '',
    attachments: data.attachments || [],
    submittedAt: now,
    status: isLate ? 'late' : 'submitted',
    isLate,
    attemptCount,
    grade: null,
    feedback: '',
    gradedAt: null,
    gradedBy: null,
  };

  await submissionRef.set(submission, { merge: true });

  await assignmentRef.update({
    submissionCount: 1,
    updatedAt: now,
  });

  logger.info('Assignment submitted', { assignmentId, studentId, isLate });

  return { ...submission };
}

export async function gradeSubmission(submissionId: string, graderId: string, data: {
  score: number;
  totalPoints: number;
  feedback?: string;
  status?: string;
}) {
  const submissionRef = collections.submissions().doc(submissionId);
  const submission = await submissionRef.get();

  if (!submission.exists) {
    throw new NotFoundError('Submission not found');
  }

  const now = new Date().toISOString();
  const gradeData = {
    ...data,
    gradedBy: graderId,
    gradedAt: now,
    status: data.status || 'graded',
  };

  await submissionRef.update(gradeData);

  // Notify student of grade
  try {
    const subData = submission.data()!;
    await createNotification({
      userId: subData.studentId as string,
      type: 'grade',
      title: 'Assignment Graded',
      body: `Your submission has been graded: ${data.score}/${data.totalPoints}${data.feedback ? ' - ' + data.feedback : ''}`,
      data: { submissionId, assignmentId: subData.assignmentId as string, link: `/assignments/${subData.assignmentId}` },
    });
  } catch (err) {
    logger.warn('Failed to send grade notification', { error: err });
  }

  const updated = await submissionRef.get();
  logger.info('Submission graded', { submissionId, graderId });

  return { ...updated.data() };
}

export async function listSubmissions(assignmentId: string, query: {
  page?: string;
  limit?: string;
  status?: string;
}) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.submissions()
    .where('assignmentId', '==', assignmentId);

  if (query.status) {
    baseQuery = baseQuery.where('status', '==', query.status);
  }

  baseQuery = baseQuery.orderBy('submittedAt', 'desc');

  const countSnapshot = await baseQuery.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;
  const snapshot = await baseQuery.offset(offset).limit(limit).get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

  return { items, total, page, limit };
}


