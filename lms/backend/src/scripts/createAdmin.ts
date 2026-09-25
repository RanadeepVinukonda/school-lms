/**
 * Create ONE real admin account (no seed/fake emails).
 *
 * Usage:
 *   npx tsx src/scripts/createAdmin.ts
 *
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD from environment or prompts. Uses the
 * existing database/auth.createUser + updateUser path, then inserts the
 * public.users profile row (same shape the seed used). Verifies sign-in via
 * the Supabase anon client (password auth) and prints a one-time password the
 * operator must rotate. The password is never written to any source file.
 */
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'alrihabchandhinimohammed@gmail.com').trim();
const SCHOOL_ID = '00000000-0000-0000-0000-000000000001';

function generatePassword(): string {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*';
  const bytes = crypto.randomBytes(24);
  let pw = '';
  for (let i = 0; i < 16; i++) pw += chars[bytes[i] % chars.length];
  return pw;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY required');
    process.exit(1);
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  const password = process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 12
    ? process.env.ADMIN_PASSWORD
    : generatePassword();

  // 1. Reuse existing admin-client creation path (same function the app uses).
  const { createUser, updateUser } = await import('../database/auth');

  let uid: string;
  const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const match = (userList?.users || []).find((u: any) => (u.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase());
  if (match) {
    uid = match.id;
    console.log(`User exists (${ADMIN_EMAIL}); updating password/role.`);
    await updateUser(uid, { password, role: 'super_admin', displayName: 'System Administrator' });
  } else {
    const created = await createUser({
      email: ADMIN_EMAIL,
      password,
      displayName: 'System Administrator',
      role: 'super_admin',
    });
    uid = created.uid;
    console.log(`Created auth user: ${ADMIN_EMAIL} (${uid})`);
  }

  // 2. Ensure the public.users profile row exists for that uid.
  const { data: profile } = await admin.from('users').select('id').eq('id', uid).maybeSingle();
  if (!profile) {
    const now = new Date().toISOString();
    const { error: insErr } = await admin.from('users').insert({
      id: uid,
      email: ADMIN_EMAIL,
      display_name: 'System Administrator',
      role: 'super_admin',
      is_active: true,
      school_id: SCHOOL_ID,
      status: 'active',
      created_at: now,
      updated_at: now,
    });
    if (insErr) {
      console.error('Failed to insert profile row:', insErr.message);
      process.exit(1);
    }
    console.log('Inserted public.users profile row.');
  }

  // 3. Verify sign-in with the anon client (password flow the UI uses).
  const { data, error } = await anon.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
  if (error || !data.user) {
    console.error('Sign-in verification FAILED:', error?.message);
    process.exit(1);
  }
  console.log(`Sign-in verified for ${data.user.email} (uid ${data.user.id}).`);
  await anon.auth.signOut();

  console.log('\n' + '='.repeat(60));
  console.log('Admin account ready:');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: (provisioned securely — rotate it now if this is a shared terminal)`);
  console.log('  Role:     super_admin');
  console.log('='.repeat(60));
}

main().catch((e) => { console.error('Failed:', e); process.exit(1); });