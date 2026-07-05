import speakeasy from 'speakeasy';
import { getSupabaseAdmin } from './supabase';

export interface MfaSetup {
  secret: string;
  qrCodeUrl: string;
}

export async function setupMfa(userId: string): Promise<MfaSetup> {
  const secret = speakeasy.generateSecret({ name: `SchoolLMS:${userId}` });
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase.from('user_mfa').upsert({
    user_id: userId,
    secret: secret.base32!,
    verified: false,
    created_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (error) throw error;

  return {
    secret: secret.base32!,
    qrCodeUrl: secret.otpauth_url!,
  };
}

export async function verifyMfa(userId: string, token: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const { data: mfa } = await supabase
    .from('user_mfa')
    .select('secret')
    .eq('user_id', userId)
    .maybeSingle();

  if (!mfa) return false;

  const verified = speakeasy.totp.verify({
    secret: mfa.secret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (verified) {
    const { error: updateError } = await supabase.from('user_mfa').update({ verified: true }).eq('user_id', userId);
    if (updateError) throw new Error(`Failed to update MFA: ${updateError.message}`);
  }

  return verified;
}

export async function isMfaVerified(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data: mfa } = await supabase
    .from('user_mfa')
    .select('verified')
    .eq('user_id', userId)
    .maybeSingle();

  return mfa?.verified ?? false;
}
