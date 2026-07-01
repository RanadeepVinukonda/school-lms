import { getSupabaseAdmin } from '../supabase';

export async function computeMastery(studentId: string, conceptId: string, accuracy: number): Promise<number> {
  try {
    const { addMasteryJob } = require('../../jobs/queue');
    const queued = await addMasteryJob(studentId, conceptId, accuracy);
    if (queued) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: existing } = await supabase
          .from('concept_mastery')
          .select('mastery_score, attempt_count')
          .eq('student_id', studentId)
          .eq('concept_id', conceptId)
          .maybeSingle();

        const prevScore = (existing?.mastery_score as number) || 0;
        const attemptCount = (existing?.attempt_count as number) || 0;
        const newScore = attemptCount === 0
          ? accuracy
          : (prevScore * attemptCount + accuracy) / (attemptCount + 1);
        return Math.round(newScore * 100) / 100;
      }
      return accuracy;
    }
  } catch (err) {
    // fallback to inline if pg-boss or dynamic require fails
  }
  return computeMasteryInline(studentId, conceptId, accuracy);
}

export async function computeMasteryInline(studentId: string, conceptId: string, accuracy: number): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { data: existing } = await supabase
    .from('concept_mastery')
    .select('mastery_score, attempt_count')
    .eq('student_id', studentId)
    .eq('concept_id', conceptId)
    .maybeSingle();

  const prevScore = (existing?.mastery_score as number) || 0;
  const attemptCount = (existing?.attempt_count as number) || 0;

  const newScore = attemptCount === 0
    ? accuracy
    : (prevScore * attemptCount + accuracy) / (attemptCount + 1);

  await supabase.from('concept_mastery').upsert({
    student_id: studentId,
    concept_id: conceptId,
    accuracy,
    attempt_count: attemptCount + 1,
    mastery_score: Math.round(newScore * 100) / 100,
    last_reviewed_at: new Date().toISOString(),
  }, { onConflict: 'student_id,concept_id' });

  return newScore;
}

export async function getMastery(studentId: string, conceptId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { data } = await supabase
    .from('concept_mastery')
    .select('mastery_score')
    .eq('student_id', studentId)
    .eq('concept_id', conceptId)
    .maybeSingle();

  return (data?.mastery_score as number) || 0;
}
