import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { deleteDocument } from './document.service';
import { parsePagination } from '../utils/pagination';

async function nosqlDoc(collection: string, docId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('firestore_docs').select('doc_id, data').eq('collection', collection).eq('doc_id', docId).maybeSingle();
  if (error) throw new Error('Failed to fetch document: ' + error.message);
  return data || null;
}

async function setNosqlDoc(collection: string, docId: string, docData: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase.from('firestore_docs').upsert({ collection, doc_id: docId, data: docData, updated_at: now }, { onConflict: 'collection,doc_id' });
  if (error) throw new Error('Failed to upsert document: ' + error.message);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecord = Record<string, any>;

/** Create a new course with draft status. */
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
  const courseData: AnyRecord = {
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

/** Update course fields. */
export async function updateCourse(courseId: string, data: Record<string, unknown>) {
  const existing = await nosqlDoc('courses', courseId);
  if (!existing) throw new NotFoundError('Course not found');
  const merged: AnyRecord = { ...(existing.data as AnyRecord), ...data, updatedAt: new Date().toISOString() };
  await setNosqlDoc('courses', courseId, merged);
  logger.info('Course updated', { courseId });
  return merged;
}

/** Delete a course by id. */
export async function deleteCourse(courseId: string) {
  const supabase = getSupabaseAdmin();
  const existing = await nosqlDoc('courses', courseId);
  if (!existing) throw new NotFoundError('Course not found');
  await deleteDocument('courses', courseId);
  logger.info('Course deleted', { courseId });
}

/** Fetch a single course by id. */
export async function getCourseById(courseId: string) {
  const existing = await nosqlDoc('courses', courseId);
  if (!existing) throw new NotFoundError('Course not found');
  return { id: existing.doc_id, ...(existing.data as AnyRecord) };
}

/** List courses with optional filters, paginated. */
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
  const supabase = getSupabaseAdmin();

  let dbQuery = supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'courses');
  if (query.schoolId) dbQuery = dbQuery.filter('data->>schoolId', 'eq', query.schoolId);
  if (query.status) dbQuery = dbQuery.filter('data->>status', 'eq', query.status);
  if (query.subjectId) dbQuery = dbQuery.filter('data->>subjectId', 'eq', query.subjectId);
  if (query.classId) dbQuery = dbQuery.filter('data->>classId', 'eq', query.classId);
  if (query.teacherId) dbQuery = dbQuery.filter('data->>teacherId', 'eq', query.teacherId);

  const { data: rows, error } = await dbQuery;
  if (error) throw new Error('Failed to fetch courses: ' + error.message);
  let items = (rows || []).map((row) => ({
    id: row.doc_id,
    ...(row.data as AnyRecord),
  }));

  items = items.sort((a: AnyRecord, b: AnyRecord) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (query.search) {
    const search = query.search.toLowerCase();
    items = items.filter(
      (item: AnyRecord) =>
        item.title?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
    );
  }

  const total = items.length;
  const offset = (page - 1) * limit;
  const paged = items.slice(offset, offset + limit);

  return { items: paged, total, page, limit };
}

/** Enroll a student in a course. */
export async function enrollStudent(courseId: string, studentId: string) {
  const existing = await nosqlDoc('courses', courseId);
  if (!existing) throw new NotFoundError('Course not found');
  const courseData = existing.data as AnyRecord;
  if (courseData.maxStudents && (courseData.enrollmentCount as number) >= (courseData.maxStudents as number)) {
    throw new ForbiddenError('Course is full');
  }
  const enrollmentId = `${courseId}_${studentId}`;
  const existingEnrollment = await nosqlDoc('enrollment', enrollmentId);
  if (existingEnrollment) throw new ForbiddenError('Already enrolled in this course');

  await setNosqlDoc('enrollment', enrollmentId, {
    courseId, studentId, enrolledAt: new Date().toISOString(), status: 'active', progress: 0,
  });
  courseData.enrollmentCount = ((courseData.enrollmentCount as number) || 0) + 1;
  courseData.updatedAt = new Date().toISOString();
  await setNosqlDoc('courses', courseId, courseData);
  logger.info('Student enrolled in course', { courseId, studentId });
}

/** Unenroll a student from a course. */
export async function unenrollStudent(courseId: string, studentId: string) {
  const supabase = getSupabaseAdmin();
  const enrollmentId = `${courseId}_${studentId}`;
  const enrollment = await nosqlDoc('enrollment', enrollmentId);
  if (!enrollment) throw new NotFoundError('Enrollment not found');

  await deleteDocument('enrollment', enrollmentId);

  const existing = await nosqlDoc('courses', courseId);
  if (existing) {
    const courseData = existing.data as AnyRecord;
    courseData.enrollmentCount = Math.max(0, ((courseData.enrollmentCount as number) || 0) - 1);
    courseData.updatedAt = new Date().toISOString();
    await setNosqlDoc('courses', courseId, courseData);
  }
  logger.info('Student unenrolled from course', { courseId, studentId });
}

/** Get all active enrollments for a given course. */
export async function getEnrollments(courseId: string) {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data')
    .eq('collection', 'enrollment')
    .filter('data->>courseId', 'eq', courseId)
    .filter('data->>status', 'eq', 'active');
  if (error) throw new Error('Failed to fetch enrollments: ' + error.message);
  return (rows || []).map((row) => ({
    id: row.doc_id,
    ...(row.data as AnyRecord),
  })) as Array<{ id: string; studentId: string; courseId: string; status: string; progress: number; enrolledAt: string }>;
}
