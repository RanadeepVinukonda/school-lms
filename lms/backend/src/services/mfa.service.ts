import speakeasy from 'speakeasy';
import crypto from 'crypto';
import { getSupabaseAdmin } from './supabase';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw) throw new Error('MFA_ENCRYPTION_KEY not set');
  return Buffer.from(raw, 'hex');
}

function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

function decryptSecret(ciphertext: string): string {
  const key = getKey();
  const [ivHex, encHex, tagHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}

export interface MfaSetup {
  secret: string;
  qrCodeUrl: string;
}

export async function setupMfa(userId: string): Promise<MfaSetup> {
  const secret = speakeasy.generateSecret({ name: `SchoolLMS:${userId}` });
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const encryptedSecret = encryptSecret(secret.base32!);
  const { error } = await supabase.from('user_mfa').upsert({
    user_id: userId,
    secret: encryptedSecret,
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

  const decrypted = mfa.secret.includes(':') ? decryptSecret(mfa.secret) : mfa.secret;
  const verified = speakeasy.totp.verify({
    secret: decrypted,
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
