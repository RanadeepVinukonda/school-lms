import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

export async function createNotice(schoolId: string, userId: string, data: { title: string; content: string; priority?: string; expires_at?: string; target_class_id?: string | null }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { target_class_id, ...rest } = data;
  const insertData: Record<string, unknown> = { school_id: schoolId, created_by: userId, ...rest };
  if (target_class_id) insertData.target_class_id = target_class_id;
  const { data: result, error } = await supabase.from('notice_board').insert(insertData).select().single();
  if (error) {
    logger.error('Failed to create notice', { error: error.message, data: insertData });
    return null;
  }
  return result;
}

export async function getNotices(schoolId: string, classId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  let query = supabase.from('notice_board').select('*').eq('school_id', schoolId);
  if (classId) {
    query = query.or(`target_class_id.is.null,target_class_id.eq.${classId}`);
  }
  const { data } = await query.order('created_at', { ascending: false });
  return data || [];
}

export async function deleteNotice(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  await supabase.from('notice_board').delete().eq('id', id);
}
