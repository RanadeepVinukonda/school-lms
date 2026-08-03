import { getSupabaseAdmin } from '../supabase';

export interface OverdueConcept {
  conceptId: string;
  conceptTitle: string;
  masteryScore: number;
  daysSinceReview: number;
  textbookId: string;
  subjectName?: string;
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

export async function getOverdueConcepts(studentId: string): Promise<OverdueConcept[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error: dataErr } = await supabase
    .from('concept_mastery')
    .select('concept_id, last_reviewed_at, mastery_score')
    .eq('student_id', studentId);
  if (dataErr) throw new Error(dataErr.message);

  if (!data) return [];

  const now = Date.now();
  const DAY_MS = 86400000;

  const overdue = data.filter((c: Record<string, unknown>) => {
    const lastReview = c.last_reviewed_at ? new Date(c.last_reviewed_at as string).getTime() : 0;
    const daysSinceReview = (now - lastReview) / DAY_MS;
    const mastery = (c.mastery_score as number) || 0;
    const interval = mastery < 0.5 ? 1 : mastery < 0.8 ? 3 : 7;
    return daysSinceReview > interval;
  });

  if (overdue.length === 0) return [];

  const conceptIds = overdue.map((c: Record<string, unknown>) => c.concept_id as string);
  const { data: conceptRows, error: conceptErr } = await supabase
    .from('concepts')
    .select('id, title, textbook_id')
    .in('id', conceptIds);
  if (conceptErr) throw new Error(conceptErr.message);

  const titleById = new Map<string, { title: string; textbookId: string }>();
  for (const row of conceptRows || []) {
    titleById.set(row.id as string, {
      title: (row.title as string) || 'Concept',
      textbookId: (row.textbook_id as string) || '',
    });
  }

  const subjectNameByTextbook = await resolveSubjectNames(
    [...new Set((conceptRows || []).map((r: any) => (r.textbook_id as string) || '').filter(Boolean))],
  );

  return overdue.map((c: Record<string, unknown>) => {
    const conceptId = c.concept_id as string;
    const lastReviewTime = c.last_reviewed_at ? new Date(c.last_reviewed_at as string).getTime() : now;
    const meta = titleById.get(conceptId);
    return {
      conceptId,
      conceptTitle: meta?.title || 'Concept',
      masteryScore: (c.mastery_score as number) || 0,
      daysSinceReview: Math.max(0, Math.floor((now - lastReviewTime) / DAY_MS)),
      textbookId: meta?.textbookId || '',
      subjectName: subjectNameByTextbook.get(meta?.textbookId || '') || '',
    };
  });
}
