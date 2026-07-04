import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

async function nosqlDoc(collection: string, docId: string) {
  const supabase = getSupabaseClient()!;
  const { data } = await supabase.from('nosql_docs').select('doc_id, data').eq('collection', collection).eq('doc_id', docId).maybeSingle();
  return data || null;
}

async function setNosqlDoc(collection: string, docId: string, docData: Record<string, unknown>) {
  const supabase = getSupabaseClient()!;
  const now = new Date().toISOString();
  await supabase.from('nosql_docs').upsert({ collection, doc_id: docId, data: docData, updated_at: now }, { onConflict: 'collection,doc_id' });
}

/** Create a new course with draft status and zero enrollment/lesson counts. */
export async function createCourse(data: {
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  thumbnail?: string;
  syllabus?: string;
  prerequisites?: string[];
  learningObjectives?: string[];
  maxStudents?: number;
  startDate?: string;
  endDate?: string;
}) {
  const courseId = uuidv4();
  const now = new Date().toISOString();

  const courseData = {
    ...data,
    id: courseId,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    enrollmentCount: 0,
    lessonCount: 0,
  };

  await setNosqlDoc('courses', courseId, courseData);

  logger.info('Course created', { courseId, title: data.title, teacherId: data.teacherId });

  return { ...courseData };
}

/** Update course fields. Throws NotFoundError if missing. */
export async function updateCourse(courseId: string, data: Record<string, unknown>) {
  const existing = await nosqlDoc('courses', courseId);
  if (!existing) throw new NotFoundError('Course not found');

  const merged = { ...existing.data as Record<string, unknown>, ...data, updatedAt: new Date().toISOString() };
  await setNosqlDoc('courses', courseId, merged);

  logger.info('Course updated', { courseId });

  return merged;
}

/** Delete a course by id. Throws NotFoundError if missing. */
export async function deleteCourse(courseId: string) {
  const supabase = getSupabaseClient()!;
  const existing = await nosqlDoc('courses', courseId);
  if (!existing) throw new NotFoundError('Course not found');

  await supabase.from('nosql_docs').delete().eq('collection', 'courses').eq('doc_id', courseId);
  logger.info('Course deleted', { courseId });
}

/** Fetch a single course by id. Throws NotFoundError if missing. */
export async function getCourseById(courseId: string) {
  const existing = await nosqlDoc('courses', courseId);
  if (!existing) throw new NotFoundError('Course not found');

  return { id: existing.doc_id, ...existing.data as Record<string, unknown> };
}

/** List courses with optional filters (status, subjectId, classId, teacherId, search, schoolId), paginated. */
export async function listCourses(query: {
  page?: string;
  limit?: string;
  status?: string;
  subjectId?: string;
  classId?: string;
  teacherId?: string;
  search?: string;
  schoolId?: string;
}) {
  const { page, limit } = parsePagination(query);
  const supabase = getSupabaseClient()!;

  let dbQuery = supabase.from('nosql_docs').select('doc_id, data').eq('collection', 'courses');
  if (query.schoolId) dbQuery = dbQuery.contains('data', { schoolId: query.schoolId });
  if (query.status) dbQuery = dbQuery.contains('data', { status: query.status });
  if (query.subjectId) dbQuery = dbQuery.contains('data', { subjectId: query.subjectId });
  if (query.classId) dbQuery = dbQuery.contains('data', { classId: query.classId });
  if (query.teacherId) dbQuery = dbQuery.contains('data', { teacherId: query.teacherId });

  const { data: rows } = await dbQuery;
  let items = (rows || []).map((row) => ({
    id: row.doc_id,
    ...row.data as Record<string, unknown>,
  }));

  items = items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (query.search) {
    const search = query.search.toLowerCase();
    items = items.filter(
      (item: any) =>
        item.title?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
    );
  }

  const total = items.length;
  const offset = (page - 1) * limit;
  const paged = items.slice(offset, offset + limit);

  return { items: paged, total, page, limit };
}

/** Enroll a student in a course. Checks for capacity and duplicate enrollment. */
export async function enrollStudent(courseId: string, studentId: string) {
  const existing = await nosqlDoc('courses', courseId);
  if (!existing) throw new NotFoundError('Course not found');

  const courseData = existing.data as Record<string, unknown>;
  if (courseData.maxStudents && (courseData.enrollmentCount as number) >= (courseData.maxStudents as number)) {
    throw new ForbiddenError('Course is full');
  }

  const enrollmentId = `${courseId}_${studentId}`;
  const existingEnrollment = await nosqlDoc('enrollment', enrollmentId);
  if (existingEnrollment) {
    throw new ForbiddenError('Already enrolled in this course');
  }

  await setNosqlDoc('enrollment', enrollmentId, {
    courseId, studentId, enrolledAt: new Date().toISOString(), status: 'active', progress: 0,
  });

  courseData.enrollmentCount = ((courseData.enrollmentCount as number) || 0) + 1;
  courseData.updatedAt = new Date().toISOString();
  await setNosqlDoc('courses', courseId, courseData as Record<string, unknown>);

  logger.info('Student enrolled in course', { courseId, studentId });
}

/** Unenroll a student from a course and decrement enrollmentCount. */
export async function unenrollStudent(courseId: string, studentId: string) {
  const supabase = getSupabaseClient()!;
  const enrollmentId = `${courseId}_${studentId}`;
  const enrollment = await nosqlDoc('enrollment', enrollmentId);
  if (!enrollment) throw new NotFoundError('Enrollment not found');

  await supabase.from('nosql_docs').delete().eq('collection', 'enrollment').eq('doc_id', enrollmentId);

  const existing = await nosqlDoc('courses', courseId);
  if (existing) {
    const courseData = existing.data as Record<string, unknown>;
    courseData.enrollmentCount = Math.max(0, ((courseData.enrollmentCount as number) || 0) - 1);
    courseData.updatedAt = new Date().toISOString();
    await setNosqlDoc('courses', courseId, courseData as Record<string, unknown>);
  }

  logger.info('Student unenrolled from course', { courseId, studentId });
}

/** Get all active enrollments for a given course. */
export async function getEnrollments(courseId: string) {
  const supabase = getSupabaseClient()!;
  const { data: rows } = await supabase.from('nosql_docs').select('doc_id, data')
    .eq('collection', 'enrollment')
    .contains('data', { courseId, status: 'active' });

  return (rows || []).map((row) => ({
    id: row.doc_id,
    ...row.data as Record<string, unknown>,
  })) as Array<{ id: string; studentId: string; courseId: string; status: string; progress: number; enrolledAt: string }>;
}
