import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

function createSupabaseAdminClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function createSupabaseAnonClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return null;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
let supabaseClient: ReturnType<typeof createSupabaseAnonClient>;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createSupabaseAdminClient();
  }
  return supabaseAdmin;
}

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseAnonClient();
  }
  return supabaseClient;
}
