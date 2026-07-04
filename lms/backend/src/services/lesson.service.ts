import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabase';
import { buildDocData } from '../database/schema';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { TransactionManager } from '../database/transaction-manager';

async function lessonById(supabase: ReturnType<typeof getSupabaseClient>, lessonId: string) {
  const { data } = await supabase!.from('lessons').select('*').eq('id', lessonId).maybeSingle();
  if (!data) return null;
  return { id: data.id, ...buildDocData(data as Record<string, unknown>, 'lessons') } as any;
}

async function getNosqlDoc(collection: string, docId: string) {
  const supabase = getSupabaseClient()!;
  const { data } = await supabase.from('nosql_docs').select('data').eq('collection', collection).eq('doc_id', docId).maybeSingle();
  return data?.data as Record<string, unknown> | undefined;
}

async function setNosqlDoc(collection: string, docId: string, docData: Record<string, unknown>) {
  const supabase = getSupabaseClient()!;
  const now = new Date().toISOString();
  await supabase.from('nosql_docs').upsert({
    collection, doc_id: docId, data: docData, updated_at: now,
  }, { onConflict: 'collection,doc_id' });
}

/** Create a new lesson, auto-assign order based on existing lesson count, and increment course lessonCount. */
export async function createLesson(data: {
  title: string;
  description: string;
  courseId: string;
  content?: string;
  contentType?: string;
  videoUrl?: string;
  duration?: number;
  isPublished?: boolean;
  schoolId?: string;
}) {
  const supabase = getSupabaseClient()!;
  const lessonId = uuidv4();
  const now = new Date().toISOString();

  const course = await getNosqlDoc('courses', data.courseId);
  if (!course) throw new NotFoundError('Course not found');

  const { count } = await supabase.from('lessons')
    .select('*', { count: 'exact', head: true })
    .contains('data', { courseId: data.courseId });

  const order = count || 0;

  const lessonData: Record<string, unknown> = {
    ...data, id: lessonId, order, completedBy: [], createdAt: now, updatedAt: now,
  };

  const { error } = await supabase.from('lessons').insert({
    id: lessonId,
    title: data.title,
    content: data.content || null,
    contentType: data.contentType || null,
    videoUrl: data.videoUrl || null,
    duration: data.duration || null,
    order,
    data: lessonData,
    schoolId: data.schoolId || null,
  });
  if (error) throw error;

  course.lessonCount = ((course.lessonCount as number) || 0) + 1;
  course.updatedAt = now;
  await setNosqlDoc('courses', data.courseId, course);

  logger.info('Lesson created', { lessonId, courseId: data.courseId, title: data.title });
  return { ...lessonData };
}

/** Update lesson fields. Throws NotFoundError if missing. */
export async function updateLesson(lessonId: string, data: Record<string, unknown>) {
  const supabase = getSupabaseClient()!;
  const existing = await lessonById(supabase, lessonId);
  if (!existing) throw new NotFoundError('Lesson not found');

  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  const { error } = await supabase.from('lessons').update({ data: merged }).eq('id', lessonId);
  if (error) throw error;

  logger.info('Lesson updated', { lessonId });
  return merged;
}

/** Delete a lesson by id and decrement the parent course's lessonCount. */
export async function deleteLesson(lessonId: string) {
  const supabase = getSupabaseClient()!;
  const existing = await lessonById(supabase, lessonId);
  if (!existing) throw new NotFoundError('Lesson not found');

  await supabase.from('lessons').delete().eq('id', lessonId);

  if (existing.courseId) {
    const course = await getNosqlDoc('courses', existing.courseId as string);
    if (course) {
      course.lessonCount = Math.max(0, ((course.lessonCount as number) || 0) - 1);
      course.updatedAt = new Date().toISOString();
      await setNosqlDoc('courses', existing.courseId as string, course);
    }
  }

  logger.info('Lesson deleted', { lessonId });
}

/** Fetch a single lesson by id. Throws NotFoundError if missing. */
export async function getLessonById(lessonId: string) {
  const supabase = getSupabaseClient()!;
  const lesson = await lessonById(supabase, lessonId);
  if (!lesson) throw new NotFoundError('Lesson not found');
  return lesson;
}

/** List lessons for a course ordered by their `order` field ascending. */
export async function listLessonsByCourse(courseId: string, schoolId?: string) {
  const supabase = getSupabaseClient()!;
  let query = supabase.from('lessons').select('*').contains('data', { courseId });
  if (schoolId) query = query.contains('data', { schoolId });

  const { data: rows } = await query.order('order', { ascending: true });
  return (rows || []).map((row) => {
    const fields = buildDocData(row as Record<string, unknown>, 'lessons');
    return { id: row.id, ...fields };
  });
}

/** Reorder lessons by setting a new order index for each lesson id in the array. */
export async function reorderLessons(lessonIds: string[]) {
  const now = new Date().toISOString();
  const tm = new TransactionManager();
  await tm.runTransaction(async (tx) => {
    lessonIds.forEach((id, index) => {
      tx.update('lessons', id, { order: index, updatedAt: now });
    });
  });
  logger.info('Lessons reordered');
}

/** Mark a lesson as complete for a student. Updates course enrollment progress. */
export async function markLessonComplete(lessonId: string, studentId: string) {
  const supabase = getSupabaseClient()!;
  const existing = await lessonById(supabase, lessonId);
  if (!existing) throw new NotFoundError('Lesson not found');

  const completedBy: string[] = existing.completedBy || [];
  if (!completedBy.includes(studentId)) {
    completedBy.push(studentId);
    const merged = { ...existing, completedBy, updatedAt: new Date().toISOString() };
    await supabase.from('lessons').update({ data: merged }).eq('id', lessonId);
  }

  if (existing.courseId) {
    const enrollmentId = `${existing.courseId}_${studentId}`;
    const enrollment = await getNosqlDoc('enrollment', enrollmentId);
    if (enrollment) {
      const { count } = await supabase.from('lessons')
        .select('*', { count: 'exact', head: true })
        .contains('data', { courseId: existing.courseId as string });
      const total = count || 0;
      enrollment.progress = total > 0 ? Math.round((completedBy.length / total) * 100) : 0;
      await setNosqlDoc('enrollment', enrollmentId, enrollment);
    }
  }

  logger.info('Lesson marked complete', { lessonId, studentId });
}
