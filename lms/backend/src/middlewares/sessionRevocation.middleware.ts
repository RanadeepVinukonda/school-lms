import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../services/supabase';

export async function isTokenRevoked(token: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { data: revoked } = await supabase
      .from('revoked_tokens')
      .select('id')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    return !!revoked;
  } catch {
    return false;
  }
}
