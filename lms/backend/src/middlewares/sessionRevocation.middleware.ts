import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../services/supabase';

export async function isTokenRevoked(token: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { data: revoked } = await supabase
      .from('revoked_tokens')
      .select('id, created_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (!revoked) return false;

    // TTL check: ignore stale revocations older than 7 days
    const revokedAt = new Date(revoked.created_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (revokedAt < sevenDaysAgo) return false;

    return true;
  } catch {
    return false;
  }
}
