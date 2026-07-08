import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { logger } from '../utils/logger';

function createSupabaseAdminClient(): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    const msg = 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in environment';
    logger.error(msg);
    throw new Error(msg);
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function createSupabaseAnonClient(): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    const msg = 'SUPABASE_URL and SUPABASE_ANON_KEY are required in environment';
    logger.error(msg);
    throw new Error(msg);
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

let supabaseAdmin: SupabaseClient | null = null;
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    supabaseAdmin = createSupabaseAdminClient();
  }
  return supabaseAdmin;
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createSupabaseAnonClient();
  }
  return supabaseClient;
}
