import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

export async function checkChapterMastery(chapterId: string, classId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data: concepts } = await supabase
    .from('concepts')
    .select('id')
    .eq('chapter_id', chapterId);

  if (!concepts || concepts.length === 0) return false;

  const conceptIds = concepts.map(c => c.id);

  const { data: students } = await supabase
    .from('users')
    .select('id')
    .eq('class_ids', classId);

  if (!students || students.length === 0) return false;

  const studentIds = students.map(s => s.id);

  const { data: mastery } = await supabase
    .from('concept_mastery')
    .select('student_id, mastery_score')
    .in('concept_id', conceptIds)
    .in('student_id', studentIds);

  if (!mastery || mastery.length === 0) return false;

  const scores = mastery.map(m => m.mastery_score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  logger.info('Chapter mastery check', { chapterId, classId, avgMastery: avg, studentCount: studentIds.length });

  return avg >= 0.7;
}

export async function updateChapterCompletion(chapterId: string, classId: string, teacherId: string): Promise<boolean> {
  const isComplete = await checkChapterMastery(chapterId, classId);
  if (!isComplete) return false;

  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const existing = await supabase
    .from('concept_progress')
    .select('id')
    .eq('chapter_id', chapterId)
    .eq('class_id', classId)
    .maybeSingle();

  if (existing?.data) return true;

  await supabase.from('concept_progress').insert({
    chapter_id: chapterId,
    class_id: classId,
    teacher_id: teacherId,
    completed: true,
  });

  logger.info('Chapter auto-completed', { chapterId, classId });
  return true;
}
