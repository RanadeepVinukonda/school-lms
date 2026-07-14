import { getSupabaseAdmin } from '../supabase';
import { logger } from '../../utils/logger';

interface LearningVelocity {
  studentId: string;
  attemptsThisWeek: number;
  attemptsLastWeek: number;
  velocity: number; // positive = improving, negative = declining
  conceptsAttempted: number;
  averageMasteryGain: number;
}

export async function getLearningVelocity(studentId: string): Promise<LearningVelocity> {
  const now = new Date();
  const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const supabase = getSupabaseAdmin(); if (!supabase) return { studentId, attemptsThisWeek: 0, attemptsLastWeek: 0, velocity: 0, conceptsAttempted: 0, averageMasteryGain: 0 };

  const { data: thisWeek, error: thisWeekErr } = await supabase
    .from('concept_mastery')
    .select('attempt_count, mastery_score, created_at')
    .eq('student_id', studentId)
    .gte('created_at', thisWeekStart);
  if (thisWeekErr) throw new Error(thisWeekErr.message);

  const { data: lastWeek, error: lastWeekErr } = await supabase
    .from('concept_mastery')
    .select('attempt_count, mastery_score')
    .eq('student_id', studentId)
    .gte('created_at', lastWeekStart)
    .lt('created_at', thisWeekStart);
  if (lastWeekErr) throw new Error(lastWeekErr.message);

  const attemptsThisWeek = (thisWeek || []).reduce((sum, r: any) => sum + (r.attempt_count || 0), 0);
  const attemptsLastWeek = (lastWeek || []).reduce((sum, r: any) => sum + (r.attempt_count || 0), 0);
  const velocity = attemptsLastWeek > 0
    ? Math.round(((attemptsThisWeek - attemptsLastWeek) / attemptsLastWeek) * 100)
    : attemptsThisWeek > 0 ? 100 : 0;

  logger.info('Learning velocity computed', { studentId, velocity, attemptsThisWeek, attemptsLastWeek });

  return {
    studentId,
    attemptsThisWeek,
    attemptsLastWeek,
    velocity,
    conceptsAttempted: thisWeek?.length || 0,
    averageMasteryGain: 0,
  };
}
