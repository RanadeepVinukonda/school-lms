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
  const now = new Date().toISOString();
  let query = supabase.from('notice_board').select('*').eq('school_id', schoolId);
  if (classId) {
    query = query.or(`target_class_id.is.null,target_class_id.eq.${classId}`);
  }
  const { data: rawNotices } = await query.order('created_at', { ascending: false });
  if (!rawNotices || rawNotices.length === 0) return [];
  // ponytail: client-side filter for expired — add DB-level filter when expires_at is indexed
  const notices = rawNotices.filter(n => !n.expires_at || n.expires_at >= now);

  const userIds = [...new Set(notices.map(n => n.created_by).filter(Boolean))];
  if (userIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, display_name, role').in('id', userIds);
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
  await supabase.from('notice_board').delete().eq('id', id);
}
