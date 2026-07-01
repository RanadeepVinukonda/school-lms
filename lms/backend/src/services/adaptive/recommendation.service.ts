import { getSupabaseAdmin } from '../supabase';

export async function getRecommendations(studentId: string, schoolId: string): Promise<Array<{ conceptId: string; reason: string }>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: lowMastery } = await supabase
    .from('concept_mastery')
    .select('concept_id, mastery_score')
    .eq('student_id', studentId)
    .lt('mastery_score', 0.7)
    .order('mastery_score')
    .limit(3);

  if (!lowMastery || lowMastery.length === 0) {
    const { data: unreviewed } = await supabase
      .from('concepts')
      .select('id')
      .eq('school_id', schoolId)
      .limit(3);

    return (unreviewed || []).map(c => ({ conceptId: c.id, reason: 'New concept to explore' }));
  }

  return (lowMastery || []).map(c => ({
    conceptId: c.concept_id as string,
    reason: `Needs practice (mastery: ${Math.round((c.mastery_score as number) * 100)}%)`,
  }));
}
