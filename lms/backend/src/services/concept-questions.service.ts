import { getSupabaseAdmin } from './supabase';

/**
 * Fetch all questions for a given concept from Supabase.
 */
export async function fetchConceptQuestions(
  textbookId: string,
  chapterId: string,
  conceptId: string,
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('concept_questions')
    .select('*')
    .eq('textbook_id', textbookId)
    .eq('chapter_id', chapterId)
    .eq('concept_id', conceptId);
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

/**
 * Upsert an array of question rows into the `concept_questions` table.
 * The rows must use the Supabase column naming convention.
 */
export async function upsertConceptQuestions(rows: any[]) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('concept_questions').upsert(rows);
  if (error) throw error;
}

/**
 * Get question type breakdown with counts and difficulty distribution for a textbook chapter.
 */
export async function getQuestionTypeBreakdown(textbookId: string, chapterId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { types: [], difficulties: [], total: 0 };

  let query: any = supabase
    .from('concept_questions')
    .select('type, difficulty, bloom_level, hots')
    .eq('textbook_id', textbookId);

  if (chapterId) {
    query = query.eq('chapter_id', chapterId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to get question breakdown', error);
    return { types: [], difficulties: [], total: 0 };
  }

  const questions = data || [];

  const typeCounts: Record<string, number> = {};
  const difficultyCounts: Record<string, number> = {};
  let total = 0;
  let hotsCount = 0;

  for (const q of questions) {
    const t = q.type || 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;

    const d = q.difficulty || 'medium';
    difficultyCounts[d] = (difficultyCounts[d] || 0) + 1;

    if (q.hots === true || q.hots === 'true') {
      hotsCount++;
    }

    total++;
  }

  return {
    types: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
    difficulties: Object.entries(difficultyCounts).map(([difficulty, count]) => ({ difficulty, count })),
    total,
    hotsCount,
  };
}
