import { getSupabaseAdmin } from './supabase';

export async function getCurriculum(board: string, grade: string, subject: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: boardRow, error: boardErr } = await supabase.from('boards').select('id').eq('code', board).maybeSingle();
  if (boardErr) throw new Error('Failed to fetch board: ' + boardErr.message);
  if (!boardRow) return [];

  const { data, error } = await supabase
    .from('curriculum_hierarchy')
    .select('*')
    .eq('board_id', boardRow.id)
    .eq('grade', grade)
    .eq('subject', subject)
    .order('chapter');
  if (error) throw new Error('Failed to fetch curriculum: ' + error.message);

  return data || [];
}

export async function getBoards() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase.from('boards').select('*').order('name');
  if (error) throw new Error('Failed to fetch boards: ' + error.message);
  return data || [];
}
