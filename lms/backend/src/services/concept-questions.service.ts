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
  return data as any[];
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
