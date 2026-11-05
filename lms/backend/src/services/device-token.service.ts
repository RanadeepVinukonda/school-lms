import { getSupabaseAdmin } from './supabase';

export async function registerToken(userId: string, schoolId: string | undefined, token: string, platform: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase.from('device_tokens').upsert(
    {
      user_id: userId,
      school_id: schoolId,
      token,
      platform,
      updated_at: new Date().toISOString(),
      // Re-registering a previously soft-deleted token revives it
      deleted_at: null,
    },
    { onConflict: 'token' }
  );
  if (error) throw new Error(`Failed to register device token: ${error.message}`);
}

export async function getTokensForUser(userId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data, error } = await supabase.from('device_tokens').select('token, platform, created_at').eq('user_id', userId).is('deleted_at', null);
  if (error) throw new Error('Failed to fetch device tokens: ' + error.message);
  return data || [];
}

/** Soft-delete (deregister) a device token owned by the given user. */
export async function deleteToken(userId: string, token: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase
    .from('device_tokens')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('token', token);
  if (error) throw new Error(`Failed to delete device token: ${error.message}`);
}
