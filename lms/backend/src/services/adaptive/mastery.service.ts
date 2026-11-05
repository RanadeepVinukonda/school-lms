import { getSupabaseAdmin } from '../supabase';
import { logger } from '../../utils/logger';

// ponytail: removed addMasteryJob call — always returned false, was dead code.
export async function computeMastery(studentId: string, conceptId: string, accuracy: number): Promise<number> {
  return computeMasteryInline(studentId, conceptId, accuracy);
}

export async function computeMasteryInline(studentId: string, conceptId: string, accuracy: number): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { data: existing, error: existingErr } = await supabase
    .from('concept_mastery')
    .select('mastery_score, attempt_count, school_id')
    .eq('student_id', studentId)
    .eq('concept_id', conceptId)
    .maybeSingle();
  if (existingErr) throw new Error(existingErr.message);

  // Resolve school_id from the existing row, then the student's profile, then the
  // concept itself (legacy concepts are sometimes missing one of these). A null
  // school_id used to hit the NOT NULL column and silently kill the whole upsert.
  let schoolId = (existing?.school_id as string | null | undefined) || null;
  if (!schoolId) {
    const { data: student } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', studentId)
      .maybeSingle();
    schoolId = (student?.school_id as string | null) || null;
  }
  if (!schoolId) {
    const { data: concept } = await supabase
      .from('concepts')
      .select('school_id')
      .eq('id', conceptId)
      .maybeSingle();
    schoolId = (concept?.school_id as string | null) || null;
  }

  const prevScore = (existing?.mastery_score as number) || 0;
  const attemptCount = (existing?.attempt_count as number) || 0;

  const newScore = attemptCount === 0
    ? accuracy
    : (prevScore * attemptCount + accuracy) / (attemptCount + 1);

  const payload: Record<string, unknown> = {
    student_id: studentId,
    concept_id: conceptId,
    accuracy,
    attempt_count: attemptCount + 1,
    mastery_score: Math.round(newScore * 100) / 100,
    last_reviewed_at: new Date().toISOString(),
  };
  if (schoolId) payload.school_id = schoolId;

  const { error } = await supabase.from('concept_mastery').upsert(payload, { onConflict: 'student_id,concept_id' });
  if (error) {
    if (!schoolId) {
      logger.warn('Mastery upsert without school_id failed', { studentId, conceptId, error: error.message });
    }
    throw new Error(`Failed to upsert concept mastery: ${error.message}`);
  }

  return newScore;
}

export async function getMastery(studentId: string, conceptId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { data, error: dataErr } = await supabase
    .from('concept_mastery')
    .select('mastery_score')
    .eq('student_id', studentId)
    .eq('concept_id', conceptId)
    .maybeSingle();
  if (dataErr) throw new Error(dataErr.message);

  return (data?.mastery_score as number) || 0;
}
