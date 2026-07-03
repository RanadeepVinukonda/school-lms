import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';
import { getSupabaseAdmin } from '../services/supabase';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');

function checksum(sql: string): string {
  return crypto.createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
}

async function ensureTrackingTable(sup: ReturnType<typeof getSupabaseAdmin>): Promise<void> {
  const { error } = await sup!.from('_migrations').select('id').limit(1);
  if (!error) return;
  // Create tracking table and exec_sql RPC via raw REST API
  const trackingSql = fs.readFileSync(
    path.join(MIGRATIONS_DIR, '001_add_migration_tracking.sql'),
    'utf-8',
  );
  // Use Supabase's /rest/v1/rpc/ endpoint with service role
  const url = `${env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql: trackingSql }),
  });
  if (!res.ok) {
    // exec_sql doesn't exist yet — create it via raw SQL endpoint
    const createFnRes = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'params=single-object',
      },
      body: JSON.stringify({ query: trackingSql }),
    });
    if (!createFnRes.ok) {
      const body = await createFnRes.text();
      throw new Error(`Failed to create migration tracking: ${body}`);
    }
  }
}

export async function runMigrations(): Promise<void> {
  const sup = getSupabaseAdmin();
  if (!sup) {
    console.warn('[migrate] No supabase admin client — skipping migrations');
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[migrate] No migration files found');
    return;
  }

  await ensureTrackingTable(sup);

  const { data: applied } = await sup
    .from('_migrations')
    .select('filename, checksum')
    .order('id', { ascending: true });

  const appliedMap = new Map((applied || []).map((r: any) => [r.filename, r.checksum]));

  for (const file of files) {
    if (file === '001_add_migration_tracking.sql') continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const chk = checksum(sql);
    const prev = appliedMap.get(file);

    if (prev === chk) {
      console.log(`[migrate] ${file} — already applied, skipping`);
      continue;
    }

    if (prev && prev !== chk) {
      console.warn(`[migrate] ${file} — checksum mismatch! DB: ${prev}, local: ${chk}. Skipping already applied migration.`);
      continue;
    }

    const start = Date.now();
    const { error } = await sup.rpc('exec_sql', { sql });
    const duration = Date.now() - start;

    if (error) {
      console.error(`[migrate] ${file} — failed:`, error.message);
      throw error;
    }

    await sup.from('_migrations').insert({
      filename: file,
      checksum: chk,
      duration_ms: duration,
    });

    console.log(`[migrate] ${file} — applied (${duration}ms)`);
  }

  console.log('[migrate] All migrations applied');
}

if (require.main === module) {
  runMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
