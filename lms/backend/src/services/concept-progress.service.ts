import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

export interface ConceptProgress {
  id: string;
  conceptId: string;
  textbookId: string;
  chapterId: string;
  classId: string;
  teacherId: string;
  completed: boolean;
  updatedAt: string;
}

/** Toggle concept completion status for a teacher-class combination. */
export async function toggleConceptCompletion(data: {
  conceptId: string;
  textbookId: string;
  chapterId: string;
  classId: string;
  teacherId: string;
}): Promise<ConceptProgress> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { conceptId, textbookId, chapterId, classId, teacherId } = data;

  const { data: existing, error: fetchErr } = await supabase
    .from('concept_releases')
    .select('*')
    .eq('concept_id', conceptId)
    .eq('class_id', classId)
    .eq('teacher_id', teacherId);
  if (fetchErr) throw fetchErr;

  const now = new Date().toISOString();

  if (existing && existing.length > 0) {
    const doc = existing[0];
    const newCompleted = !doc.completed;
    const { error } = await supabase.from('concept_releases').update({ completed: newCompleted, updated_at: now }).eq('id', doc.id);
    if (error) throw new Error('Failed to update concept release: ' + error.message);
    logger.info('Concept completion toggled', { conceptId, classId, teacherId, completed: newCompleted });
    return {
      id: doc.id,
      conceptId,
      textbookId,
      chapterId,
      classId,
      teacherId,
      completed: newCompleted,
      updatedAt: now,
    };
  }

  const id = `${conceptId}_${classId}_${teacherId}`;
  const { error } = await supabase.from('concept_releases').upsert({
    id,
    concept_id: conceptId,
    textbook_id: textbookId,
    chapter_id: chapterId,
    class_id: classId,
    teacher_id: teacherId,
    completed: true,
    updated_at: now,
  });
  if (error) throw new Error('Failed to upsert concept release: ' + error.message);
  logger.info('Concept completion created', { conceptId, classId, teacherId, completed: true });
  return {
    id,
    conceptId,
    textbookId,
    chapterId,
    classId,
    teacherId,
    completed: true,
    updatedAt: now,
  };
}

/** Get completion status for a concept in a class. */
export async function getConceptCompletionStatus(
  conceptId: string,
  classId: string,
  teacherId: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { data: existing, error } = await supabase
    .from('concept_releases')
    .select('completed')
    .eq('concept_id', conceptId)
    .eq('class_id', classId)
    .eq('teacher_id', teacherId);
  if (error) throw error;

  if (!existing || existing.length === 0) return false;
  return existing[0].completed === true;
}

/** Get all concept completion statuses for a class and teacher. */
export async function getClassCompletionStatus(
  classId: string,
  teacherId: string,
): Promise<Record<string, boolean>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return {};
  const { data: docs, error } = await supabase
    .from('concept_releases')
    .select('concept_id, completed')
    .eq('class_id', classId)
    .eq('teacher_id', teacherId);
  if (error) throw error;

  const result: Record<string, boolean> = {};
  for (const doc of docs || []) {
    result[doc.concept_id] = doc.completed === true;
  }
  return result;
}

/** Get completion progress for a subject (completed / total concepts). */
export async function getSubjectProgress(
  subjectId: string,
  classId: string,
  teacherId: string,
): Promise<{ completed: number; total: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { completed: 0, total: 0 };

  const { data: textbooks, error: tbErr } = await supabase
    .from('textbooks')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('class_id', classId);
  if (tbErr) throw tbErr;

  let totalConcepts = 0;
  for (const textbook of textbooks || []) {
    const { data: chapters, error: chErr } = await supabase
      .from('chapters')
      .select('id')
      .eq('textbook_id', textbook.id);
    if (chErr) throw chErr;
    for (const chapter of chapters || []) {
      const { count } = await supabase
        .from('concepts')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapter.id);
      totalConcepts += count || 0;
    }
  }

  const completionStatus = await getClassCompletionStatus(classId, teacherId);
  const completed = Object.values(completionStatus).filter(Boolean).length;

  return { completed, total: totalConcepts };
}

/** Get student-facing progress (shows completion without content). */
export async function getStudentProgress(
  classId: string,
): Promise<Record<string, { completed: boolean; teacherId: string }[]>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return {};
  const { data: docs, error } = await supabase
    .from('concept_releases')
    .select('concept_id, completed, teacher_id')
    .eq('class_id', classId);
  if (error) throw error;

  const result: Record<string, { completed: boolean; teacherId: string }[]> = {};
  for (const doc of docs || []) {
    if (!result[doc.concept_id]) result[doc.concept_id] = [];
    result[doc.concept_id].push({
      completed: doc.completed === true,
      teacherId: doc.teacher_id,
    });
  }
  return result;
}
