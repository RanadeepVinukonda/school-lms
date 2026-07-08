import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

export async function createNotice(schoolId: string, userId: string, data: { title: string; content: string; priority?: string; expires_at?: string; target_class_id?: string | null }) {
  const supabase = getSupabaseAdmin(); if (!supabase) throw new Error('Supabase not initialized');
  const { target_class_id, ...rest } = data;
  const insertData: Record<string, unknown> = { school_id: schoolId, created_by: userId, ...rest };
  if (target_class_id) insertData.target_class_id = target_class_id;
  const { data: result, error } = await supabase.from('notice_board').insert(insertData).select().single();
  if (error) {
    logger.error('Failed to create notice', { error: error.message, data: insertData });
    throw new Error(`Failed to create notice: ${error.message}`);
  }
  return result;
}

export async function getNotices(schoolId: string, classIds?: string | string[]) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const now = new Date().toISOString();
  let query = supabase.from('notice_board').select('*').eq('school_id', schoolId);
  if (classIds && classIds.length > 0) {
    const ids = Array.isArray(classIds) ? classIds : [classIds];
    const filters = ids.map((id) => `target_class_id.eq.${id}`).join(',');
    query = query.or(`target_class_id.is.null,${filters}`);
  }
  const { data: rawNotices, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to get notices: ${error.message}`);
  if (!rawNotices || rawNotices.length === 0) return [];
  // ponytail: client-side filter for expired — add DB-level filter when expires_at is indexed
  const notices = rawNotices.filter(n => {
    if (!n.expires_at) return true;
    const expiresAt = new Date(n.expires_at).getTime();
    const nowMs = new Date(now).getTime();
    return isNaN(expiresAt) || expiresAt >= nowMs;
  });

  const userIds = [...new Set(notices.map(n => n.created_by).filter(Boolean))];
  if (userIds.length > 0) {
    const { data: users, error: userErr } = await supabase.from('users').select('id, display_name, role').in('id', userIds);
    if (userErr) throw new Error(`Failed to get notice creators: ${userErr.message}`);
    const userMap = Object.fromEntries((users || []).map(u => [u.id, { name: u.display_name, role: u.role }]));
    return notices.map(n => ({
      ...n,
      created_by_name: userMap[n.created_by]?.name || 'Unknown',
      created_by_role: userMap[n.created_by]?.role || '',
    }));
  }
  return notices.map(n => ({ ...n, created_by_name: 'Unknown', created_by_role: '' }));
}

export async function deleteNotice(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase.from('notice_board').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete notice: ${error.message}`);
}
