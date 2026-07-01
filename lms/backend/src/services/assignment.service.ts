import { v4 as uuidv4 } from 'uuid';
import { collections } from '../database/adapter';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { getEnrollments } from './course.service';
import { createBulkNotifications, createNotification } from './notification.service';
import type { AssignmentCollection } from '../database/interfaces/collections';

let _assignmentCollection: AssignmentCollection | null = null;
export function setAssignmentCollection(col: AssignmentCollection): void { _assignmentCollection = col; }
function assignmentCol() { return _assignmentCollection ?? (collections.assignments() as unknown as AssignmentCollection); }

/** Create a new assignment and notify enrolled students. */
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
  schoolId?: string;
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
    const notifications = enrollments.map((e: { id?: string; studentId: string }) => ({
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

/** Update assignment fields. Throws NotFoundError if missing. */
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

/** Delete an assignment by id. Throws NotFoundError if missing. */
export async function deleteAssignment(assignmentId: string) {
  const ref = collections.assignments().doc(assignmentId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Assignment not found');
  }

  await ref.delete();
  logger.info('Assignment deleted', { assignmentId });
}

/** Fetch a single assignment by id. Throws NotFoundError if missing. */
export async function getAssignmentById(assignmentId: string) {
  const ref = collections.assignments().doc(assignmentId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Assignment not found');
  }

  return { ...doc.data() };
}

/** List all assignments with optional courseId filter, paginated by createdAt desc. */
export async function listAllAssignments(query: { page?: string; limit?: string; courseId?: string; schoolId?: string }) {
  const { page, limit } = parsePagination(query);
  let baseQuery: any = collections.assignments();

  if (query.schoolId) {
    baseQuery = baseQuery.where('schoolId', '==', query.schoolId);
  }
  baseQuery = baseQuery.orderBy('createdAt', 'desc');

  if (query.courseId) {
    baseQuery = baseQuery.where('courseId', '==', query.courseId);
  }

  const countSnapshot = await baseQuery.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;
  const snapshot = await baseQuery.offset(offset).limit(limit).get();

  const items = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id }));

  return { items, total, page, limit };
}

/** List assignments for a specific course, paginated. */
export async function listAssignmentsByCourse(courseId: string, query: { page?: string; limit?: string; schoolId?: string }) {
  const { page, limit } = parsePagination(query);
  const offset = (page - 1) * limit;

  let baseQuery: any = collections.assignments()
    .where('courseId', '==', courseId);

  if (query.schoolId) {
    baseQuery = baseQuery.where('schoolId', '==', query.schoolId);
  }

  baseQuery = baseQuery.orderBy('createdAt', 'desc');

  const countSnap = await baseQuery.count().get();
  const total = countSnap.data().count;

  const snapshot = await baseQuery.offset(offset).limit(limit).get();
  const items = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id }));

  return { items, total, page, limit };
}

/** Submit a student's assignment. Increments attemptCount if resubmitting, enforces maxAttempts. */
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

  const currentAssignment = await assignmentRef.get();
  const currentCount = (currentAssignment.data()?.submissionCount as number) || 0;
  await assignmentRef.update({
    submissionCount: currentCount + 1,
    updatedAt: now,
  });

  logger.info('Assignment submitted', { assignmentId, studentId, isLate });

  return { ...submission };
}

/** Grade a submission and notify the student. */
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

/** List submissions for an assignment with optional status filter. */
export async function listSubmissions(assignmentId: string, query: {
  page?: string;
  limit?: string;
  status?: string;
}) {
  const { page, limit } = parsePagination(query);
  const offset = (page - 1) * limit;

  let queryRef = collections.submissions()
    .where('assignmentId', '==', assignmentId)
    .orderBy('submittedAt', 'desc');

  if (query.status) {
    queryRef = queryRef.where('status', '==', query.status);
  }

  const countSnap = await queryRef.count().get();
  const total = countSnap.data().count;

  const snapshot = await queryRef.offset(offset).limit(limit).get();
  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

  return { items, total, page, limit };
}
