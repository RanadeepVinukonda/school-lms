import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabase';
import { updateUser } from '../database/auth';
import { validatePassword } from '../utils/passwordValidation';
import { NotFoundError, UnauthorizedError, ValidationError, AppError, RateLimitError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export async function forgotPassword(email: string) {
  const redirectTo = `${env.FRONTEND_URL}/reset-password`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
  };

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: email.toLowerCase(), redirect_to: redirectTo }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error('Failed to send password reset email', { email, status: res.status, body });
    if (res.status === 429) throw new RateLimitError('Too many requests. Please wait at least 60 seconds and try again.');
    throw new AppError(502, 'Failed to send reset email. Please try again later.');
  }

  logger.info('Password reset email sent via Supabase', { email });
  return { message: 'If the email exists, a reset link has been sent' };
}

export async function resetWithToken(accessToken: string, newPassword: string): Promise<void> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    apikey: env.SUPABASE_ANON_KEY,
  };

  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers });
  if (!userRes.ok) {
    const body = await userRes.text();
    logger.error('Invalid or expired access token', { status: userRes.status, body });
    throw new UnauthorizedError('Invalid or expired reset link. Please request a new one.');
  }

  const userData = await userRes.json() as { id?: string };
  if (!userData.id) throw new UnauthorizedError('Invalid or expired reset link. Please request a new one.');

  await resetPassword(userData.id, newPassword);
}

export async function resetPassword(uid: string, newPassword: string): Promise<void> {
  const pwCheck = validatePassword(newPassword);
  if (!pwCheck.valid) throw new ValidationError(pwCheck.errors.join('; '));

  const response = await fetch(
    `${env.SUPABASE_URL}/auth/v1/admin/users/${uid}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ password: newPassword }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    logger.error('Failed to reset password', { uid, status: response.status, body });
    throw new AppError(502, 'Failed to reset password');
  }

  logger.info('Password reset completed via Supabase Admin', { uid });
}

export async function changePassword(uid: string, currentPassword: string, newPassword: string): Promise<void> {
  const pwCheck = validatePassword(newPassword);
  if (!pwCheck.valid) throw new ValidationError(pwCheck.errors.join('; '));

  const supabase = getSupabaseAdmin();
  const { data: userRow, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error || !userRow) throw new NotFoundError('User not found');
  const email = userRow.email as string;

  const tempClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const { error: signInError } = await tempClient.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInError) throw new UnauthorizedError('Current password is incorrect');
  await tempClient.auth.signOut();

  await updateUser(uid, { password: newPassword });
  logger.info('Password changed', { uid });
}

export async function refreshToken(refreshToken: string): Promise<{ token: string; refresh_token: string; uid: string }> {
  const response = await fetch(
    `${env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  );

  if (!response.ok) throw new UnauthorizedError('Invalid or expired refresh token');

  const data = await response.json() as { access_token?: string; refresh_token?: string; user?: { id: string } };
  return {
    token: data.access_token || '',
    refresh_token: data.refresh_token || '',
    uid: data.user?.id || '',
  };
}

export async function logout(token: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  try {
    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await supabase.from('revoked_tokens').insert({ token_hash: tokenHash });
  } catch {
    // ignore — token revocation is best-effort
  }
}
