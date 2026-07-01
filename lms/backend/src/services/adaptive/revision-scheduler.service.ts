import { getSupabaseAdmin } from '../supabase';

export async function getOverdueConcepts(studentId: string): Promise<Array<{ conceptId: string; daysSinceReview: number }>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from('concept_mastery')
    .select('concept_id, last_reviewed_at, mastery_score')
    .eq('student_id', studentId);

  if (!data) return [];

  const now = Date.now();
  return data
    .filter((c: Record<string, unknown>) => {
      const lastReview = c.last_reviewed_at ? new Date(c.last_reviewed_at as string).getTime() : 0;
      const daysSinceReview = (now - lastReview) / 86400000;
      const mastery = (c.mastery_score as number) || 0;
      const interval = mastery < 0.5 ? 1 : mastery < 0.8 ? 3 : 7;
      return daysSinceReview > interval;
    })
    .map((c: Record<string, unknown>) => ({
      conceptId: c.concept_id as string,
      daysSinceReview: Math.floor((now - new Date((c.last_reviewed_at as string) || now).getTime()) / 86400000),
    }));
}
