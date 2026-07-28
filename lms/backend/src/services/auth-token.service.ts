import { getSupabaseAdmin } from './supabase';
import { UnauthorizedError } from '../utils/errors';
import { env } from '../config/env';

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
