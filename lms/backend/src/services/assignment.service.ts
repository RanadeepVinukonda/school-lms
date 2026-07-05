import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { getEnrollments } from './course.service';
import { createBulkNotifications, createNotification } from './notification.service';

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

  const assignmentData: Record<string, unknown> = {
    id: assignmentId,
    title: data.title,
    description: data.description,
    courseId: data.courseId,
    dueDate: data.dueDate,
    points: data.points,
    submissionCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  if (data.passingGrade !== undefined) assignmentData.passingGrade = data.passingGrade;
  if (data.maxAttempts !== undefined) assignmentData.maxAttempts = data.maxAttempts;
  if (data.allowLateSubmission !== undefined) assignmentData.allowLateSubmission = data.allowLateSubmission;
  if (data.latePenaltyPercent !== undefined) assignmentData.latePenaltyPercent = data.latePenaltyPercent;
  if (data.isPublished !== undefined) assignmentData.isPublished = data.isPublished;
  if (data.schoolId !== undefined) assignmentData.schoolId = data.schoolId;

  const supabase = getSupabaseAdmin()!;
  const dbData: Record<string, unknown> = { id: assignmentId };
  for (const [k, v] of Object.entries(assignmentData)) {
    dbData[k === 'schoolId' ? 'school_id' : k] = v;
  }
  const { error } = await supabase.from('assignments').upsert(dbData);
  if (error) throw error;

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

function rowToAssignment(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    chapterId: row.chapterId,
    textbookId: row.textbookId,
    lessonId: row.lessonId,
    courseId: row.courseId,
    dueDate: row.dueDate,
    points: row.points,
    maxAttempts: row.maxAttempts,
    allowLateSubmission: row.allowLateSubmission,
    latePenaltyPercent: row.latePenaltyPercent,
    passingGrade: row.passingGrade,
    status: row.status,
    submissionCount: row.submissionCount,
    isPublished: row.isPublished,
    schoolId: (row as any).school_id ?? row.schoolId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Update assignment fields. Throws NotFoundError if missing. */
export async function updateAssignment(assignmentId: string, data: Record<string, unknown>) {
  const supabase = getSupabaseAdmin()!;
  const { data: existing, error: fetchErr } = await supabase.from('assignments').select('*').eq('id', assignmentId).maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!existing) throw new NotFoundError('Assignment not found');

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(data)) {
    updateData[k === 'schoolId' ? 'school_id' : k] = v;
  }
  const { error } = await supabase.from('assignments').update(updateData).eq('id', assignmentId);
  if (error) throw error;

  const { data: updated, error: fetchErr2 } = await supabase.from('assignments').select('*').eq('id', assignmentId).single();
  if (fetchErr2) throw fetchErr2;
  logger.info('Assignment updated', { assignmentId });

  return rowToAssignment(updated || existing);
}

/** Delete an assignment by id. Throws NotFoundError if missing. */
export async function deleteAssignment(assignmentId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: existing, error: fetchErr } = await supabase.from('assignments').select('id').eq('id', assignmentId).maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!existing) throw new NotFoundError('Assignment not found');

  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  if (error) throw error;
  logger.info('Assignment deleted', { assignmentId });
}

/** Fetch a single assignment by id. Throws NotFoundError if missing. */
export async function getAssignmentById(assignmentId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: row, error } = await supabase.from('assignments').select('*').eq('id', assignmentId).maybeSingle();
  if (error) throw error;
  if (!row) throw new NotFoundError('Assignment not found');

  return rowToAssignment(row as Record<string, unknown>);
}

/** List all assignments with optional courseId filter, paginated by createdAt desc. */
export async function listAllAssignments(query: { page?: string; limit?: string; courseId?: string; schoolId?: string }) {
  const { page, limit } = parsePagination(query);
  const supabase = getSupabaseAdmin()!;

  let countQ: any = supabase.from('assignments').select('*', { count: 'exact', head: true });
  let listQ: any = supabase.from('assignments').select('*').order('createdAt', { ascending: false });

  if (query.schoolId) { countQ = countQ.eq('school_id', query.schoolId); listQ = listQ.eq('school_id', query.schoolId); }
  if (query.courseId) { countQ = countQ.eq('courseId', query.courseId); listQ = listQ.eq('courseId', query.courseId); }

  const { count, error: countErr } = await countQ;
  if (countErr) throw countErr;
  const total = count || 0;

  const offset = (page - 1) * limit;
  const { data: rows, error } = await listQ.range(offset, offset + limit - 1);
  if (error) throw error;

  const items = (rows || []).map((r: any) => rowToAssignment(r));
  return { items, total, page, limit };
}

/** List assignments for a specific course, paginated. */
export async function listAssignmentsByCourse(courseId: string, query: { page?: string; limit?: string; schoolId?: string }) {
  const { page, limit } = parsePagination(query);
  const supabase = getSupabaseAdmin()!;

  let countQ: any = supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('courseId', courseId);
  let listQ: any = supabase.from('assignments').select('*').eq('courseId', courseId).order('createdAt', { ascending: false });

  if (query.schoolId) { countQ = countQ.eq('school_id', query.schoolId); listQ = listQ.eq('school_id', query.schoolId); }

  const { count, error: countErr } = await countQ;
  if (countErr) throw countErr;
  const total = count || 0;

  const offset = (page - 1) * limit;
  const { data: rows, error } = await listQ.range(offset, offset + limit - 1);
  if (error) throw error;

  const items = (rows || []).map((r: any) => rowToAssignment(r));
  return { items, total, page, limit };
}

/** Submit a student's assignment. Increments attemptCount if resubmitting, enforces maxAttempts. */
export async function submitAssignment(assignmentId: string, studentId: string, data: {
  content?: string;
  attachments?: Array<{ name: string; url: string; type: string; size: number }>;
}) {
  const supabase = getSupabaseAdmin()!;
  const { data: assignRow, error } = await supabase.from('assignments').select('*').eq('id', assignmentId).maybeSingle();
  if (error) throw error;
  if (!assignRow) throw new NotFoundError('Assignment not found');
  const assignmentData = assignRow as Record<string, unknown>;

  const submissionId = `${assignmentId}_${studentId}`;
  const { data: existingRow, error: fetchErr } = await supabase.from('submissions').select('*').eq('id', submissionId).maybeSingle();
  if (fetchErr) throw fetchErr;
  const existing = existingRow as Record<string, unknown> | null;

  if (existing) {
    const attemptCount = ((existing.attemptCount as number) || 1) + 1;
    if (assignmentData.maxAttempts && attemptCount > (assignmentData.maxAttempts as number)) {
      throw new ForbiddenError('Maximum attempts exceeded');
    }
  }

  const now = new Date().toISOString();
  const dueDate = new Date(assignmentData.dueDate as string);
  const isLate = now > dueDate.toISOString();
  const attemptCount = existing ? ((existing.attemptCount as number) || 1) + 1 : 1;

  const submission: Record<string, unknown> = {
    id: submissionId,
    assignmentId,
    studentId,
    content: data.content || '',
    attachments: data.attachments || [],
    submittedAt: now,
    status: isLate ? 'late' : 'submitted',
    isLate,
    attemptNumber: attemptCount,
    grade: null,
    feedback: '',
    gradedBy: null,
    gradedAt: null,
  };

  const { error: subErr } = await supabase.from('submissions').upsert(submission);
  if (subErr) throw subErr;

  const currentCount = ((assignmentData.submissionCount as number) || 0) + 1;
  const { error: updErr } = await supabase.from('assignments').update({ submissionCount: currentCount, updatedAt: now }).eq('id', assignmentId);
  if (updErr) throw updErr;

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
  const supabase = getSupabaseAdmin()!;
  const { data: existing, error: fetchErr } = await supabase.from('submissions').select('*').eq('id', submissionId).maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!existing) throw new NotFoundError('Submission not found');

  const now = new Date().toISOString();
  const gradeData: Record<string, unknown> = {
    score: data.score,
    gradedBy: graderId,
    gradedAt: now,
    status: data.status || 'graded',
  };
  if (data.feedback !== undefined) gradeData.feedback = data.feedback;

  const { error } = await supabase.from('submissions').update(gradeData).eq('id', submissionId);
  if (error) throw error;

  // Notify student of grade
  try {
    await createNotification({
      userId: existing.studentId as string,
      type: 'grade',
      title: 'Assignment Graded',
      body: `Your submission has been graded: ${data.score}/${data.totalPoints}${data.feedback ? ' - ' + data.feedback : ''}`,
      data: { submissionId, assignmentId: existing.assignmentId as string, link: `/assignments/${existing.assignmentId}` },
    });
  } catch (err) {
    logger.warn('Failed to send grade notification', { error: err });
  }

  const { data: updated, error: fetchErr2 } = await supabase.from('submissions').select('*').eq('id', submissionId).single();
  if (fetchErr2) throw fetchErr2;
  logger.info('Submission graded', { submissionId, graderId });

  return { ...(updated || gradeData) };
}

/** List submissions for an assignment with optional status filter. */
export async function listSubmissions(assignmentId: string, query: {
  page?: string;
  limit?: string;
  status?: string;
}) {
  const { page, limit } = parsePagination(query);
  const offset = (page - 1) * limit;
  const supabase = getSupabaseAdmin()!;

  let countQ: any = supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('assignmentId', assignmentId);
  let listQ: any = supabase.from('submissions').select('*').eq('assignmentId', assignmentId).order('submittedAt', { ascending: false });

  if (query.status) { countQ = countQ.eq('status', query.status); listQ = listQ.eq('status', query.status); }

  const { count, error: countErr } = await countQ;
  if (countErr) throw countErr;
  const total = count || 0;

  const { data: rows, error } = await listQ.range(offset, offset + limit - 1);
  if (error) throw error;

  const items = (rows || []).map((r: any) => ({ ...r }));
  return { items, total, page, limit };
}
