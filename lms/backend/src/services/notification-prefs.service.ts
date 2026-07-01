import { getSupabaseAdmin } from './supabase';

const CATEGORIES = ['assignments', 'grades', 'attendance', 'ai_tutor', 'challenges', 'announcements'];

export async function getPreferences(userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return CATEGORIES.map(c => ({ category: c, push_enabled: true, in_app_enabled: true }));
  const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', userId);
  const existing = (data || []) as Array<{ category: string; push_enabled: boolean; in_app_enabled: boolean }>;
  const existingMap = new Map(existing.map(p => [p.category, p]));
  return CATEGORIES.map(c => existingMap.get(c) || { category: c, push_enabled: true, in_app_enabled: true });
}

export async function updatePreference(userId: string, category: string, push_enabled: boolean, in_app_enabled: boolean) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from('notification_preferences').upsert(
    { user_id: userId, category, push_enabled, in_app_enabled, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,category' }
  );
}
