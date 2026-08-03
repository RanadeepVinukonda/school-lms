import { getSupabaseAdmin } from '../supabase';

export interface AdaptiveRecommendation {
  conceptId: string;
  conceptTitle: string;
  masteryScore: number;
  priorityScore: number;
  textbookId: string;
  subjectName?: string;
  reason: string;
  priority: number;
}

async function resolveSubjectNames(textbookIds: string[]): Promise<Map<string, string>> {
  const supabase = getSupabaseAdmin();
  const map = new Map<string, string>();
  if (!supabase || textbookIds.length === 0) return map;
  const { data: textbooks } = await supabase
    .from('textbooks')
    .select('id, subject_id')
    .in('id', textbookIds);
  const subjectIds = [...new Set((textbooks || []).map((t: any) => t.subject_id).filter(Boolean))];
  if (subjectIds.length === 0) return map;
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .in('id', subjectIds);
  const nameById = new Map((subjects || []).map((s: any) => [s.id, s.name]));
  for (const t of textbooks || []) map.set(t.id, nameById.get(t.subject_id) || '');
  return map;
}

export async function getRecommendations(studentId: string, schoolId: string): Promise<AdaptiveRecommendation[]> {
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
      .select('id, title, textbook_id')
      .eq('school_id', schoolId)
      .limit(3);
    if (unreviewedErr) throw new Error(unreviewedErr.message);

    const subjectNameByTextbook = await resolveSubjectNames(
      [...new Set((unreviewed || []).map((c: any) => (c.textbook_id as string) || '').filter(Boolean))],
    );

    return (unreviewed || []).map(c => ({
      conceptId: c.id as string,
      conceptTitle: (c.title as string) || 'Concept',
      masteryScore: 0,
      priorityScore: 0,
      textbookId: (c.textbook_id as string) || '',
      subjectName: subjectNameByTextbook.get((c.textbook_id as string) || '') || '',
      reason: 'New concept to explore',
      priority: 0,
    }));
  }

  const conceptIds = lowMastery.map((c: any) => c.concept_id as string);
  const { data: conceptRows, error: conceptErr } = await supabase
    .from('concepts')
    .select('id, title, textbook_id')
    .in('id', conceptIds);
  if (conceptErr) throw new Error(conceptErr.message);

  const byId = new Map<string, { title: string; textbookId: string }>();
  for (const row of conceptRows || []) {
    byId.set(row.id as string, {
      title: (row.title as string) || 'Concept',
      textbookId: (row.textbook_id as string) || '',
    });
  }

  const subjectNameByTextbook = await resolveSubjectNames(
    [...new Set((conceptRows || []).map((r: any) => (r.textbook_id as string) || '').filter(Boolean))],
  );

  const scored = lowMastery.map((c: any) => {
    const mastery = (c.mastery_score as number) || 0;
    const daysSinceReview = c.last_reviewed_at
      ? (now - new Date(c.last_reviewed_at as string).getTime()) / DAY_MS
      : 30;
    const attempts = (c.attempt_count as number) || 0;
    const priority = Math.round((1 - mastery) * 50 + Math.min(daysSinceReview, 30) + Math.min(attempts, 10));
    const meta = byId.get(c.concept_id as string);
    return {
      conceptId: c.concept_id as string,
      conceptTitle: meta?.title || 'Concept',
      masteryScore: mastery,
      priorityScore: priority,
      textbookId: meta?.textbookId || '',
      subjectName: subjectNameByTextbook.get(meta?.textbookId || '') || '',
      reason: `Needs practice (mastery: ${Math.round(mastery * 100)}%, ${Math.round(daysSinceReview)}d ago)`,
      priority,
    };
  });

  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, 3);
}
