import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ponytail: skip crash when env vars missing in CI/test — becomes no-op client
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — running without Supabase');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        // Single refresh authority: the backend /auth/refresh rotates tokens via
        // api.ts and syncs back with setSession. If the SDK also auto-refreshes,
        // two systems rotate the same refresh-token chain and break each other.
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : (null as unknown as ReturnType<typeof createClient>);
