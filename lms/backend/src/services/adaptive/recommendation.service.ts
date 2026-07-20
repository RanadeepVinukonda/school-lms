import { getSupabaseAdmin } from '../supabase';

export async function getRecommendations(studentId: string, schoolId: string): Promise<Array<{ conceptId: string; reason: string; priority: number }>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const now = Date.now();
  const DAY_MS = 86400000;

  const { data: lowMastery, error: lowMasteryErr } = await supabase
    .from('concept_mastery')
    .select('concept_id, mastery_score, last_reviewed_at, attempt_count')
    .eq('student_id', studentId)
    .lt('mastery_score', 0.7)
    .limit(10);
  if (lowMasteryErr) throw new Error(lowMasteryErr.message);

  if (!lowMastery || lowMastery.length === 0) {
    const { data: unreviewed, error: unreviewedErr } = await supabase
      .from('concepts')
      .select('id')
      .eq('school_id', schoolId)
      .limit(3);
    if (unreviewedErr) throw new Error(unreviewedErr.message);

    return (unreviewed || []).map(c => ({
      conceptId: c.id as string,
      reason: 'New concept to explore',
      priority: 0,
    }));
  }

  const scored = lowMastery.map((c: any) => {
    const mastery = (c.mastery_score as number) || 0;
    const daysSinceReview = c.last_reviewed_at
      ? (now - new Date(c.last_reviewed_at as string).getTime()) / DAY_MS
      : 30;
    const attempts = (c.attempt_count as number) || 0;
    const priority = Math.round((1 - mastery) * 50 + Math.min(daysSinceReview, 30) + Math.min(attempts, 10));
    return {
      conceptId: c.concept_id as string,
      reason: `Needs practice (mastery: ${Math.round(mastery * 100)}%, ${Math.round(daysSinceReview)}d ago)`,
      priority,
    };
  });

  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, 3);
}
