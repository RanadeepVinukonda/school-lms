import { getSupabaseAdmin } from './supabase';

export async function registerToken(userId: string, schoolId: string | undefined, token: string, platform: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase.from('device_tokens').upsert(
    { user_id: userId, school_id: schoolId, token, platform, updated_at: new Date().toISOString() },
    { onConflict: 'token' }
  );
  if (error) throw new Error(`Failed to register device token: ${error.message}`);
}

export async function getTokensForUser(userId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data, error } = await supabase.from('device_tokens').select('token, platform').eq('user_id', userId);
  if (error) throw new Error('Failed to fetch device tokens: ' + error.message);
  return data || [];
}
