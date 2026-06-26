import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

function createSupabaseClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

let supabaseAdmin: ReturnType<typeof createSupabaseClient>;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createSupabaseClient();
  }
  return supabaseAdmin;
}
