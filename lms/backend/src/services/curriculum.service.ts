import { getSupabaseAdmin } from './supabase';

export async function getCurriculum(board: string, grade: string, subject: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: boardRow } = await supabase.from('boards').select('id').eq('code', board).maybeSingle();
  if (!boardRow) return [];

  const { data } = await supabase
    .from('curriculum_hierarchy')
    .select('*')
    .eq('board_id', boardRow.id)
    .eq('grade', grade)
    .eq('subject', subject)
    .order('chapter');

  return data || [];
}

export async function getBoards() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase.from('boards').select('*').order('name');
  return data || [];
}
