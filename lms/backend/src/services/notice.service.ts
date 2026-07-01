import { getSupabaseAdmin } from './supabase';

export async function createNotice(schoolId: string, userId: string, data: { title: string; content: string; priority?: string; expires_at?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('notice_board').insert({ school_id: schoolId, created_by: userId, ...data }).select().single();
  return result;
}

export async function getNotices(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase.from('notice_board').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
  return data || [];
}

export async function deleteNotice(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  await supabase.from('notice_board').delete().eq('id', id);
}
