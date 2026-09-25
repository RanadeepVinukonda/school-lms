/**
 * Remove ALL seed-created demo data, preserving legacy records.
 *
 * Usage:
 *   npx tsx src/scripts/cleanupSeedData.ts           # real run
 *   DRY_RUN=1 npx tsx src/scripts/cleanupSeedData.ts # preview only
 *
 * Strategy (backed up by backups/*.json):
 *  1. Determine seed auth user ids (all @school.edu). Seed profile ids in
 *     public.users are exactly those auth ids. The 3 legacy orphan profiles
 *     (1b012026/1b022026/2a022026@school.edu) have NO auth account and are
 *     preserved automatically (their ids are not in the seed set).
 *  2. Delete child FK rows referencing seed users (attendance, enrollments,
 *     class_teachers, tcs, fee_payments, device_tokens, notifications,
 *     notice_board) — otherwise deleting users violates FK constraints.
 *  3. Delete seed tables by detUuid fingerprint + seeded firestore_docs
 *     collections.
 *  4. Delete seed public.users profiles.
 *  5. Delete seed auth users via the Auth Admin API.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { getConnectionPool } from '../database/connection-manager';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const DRY_RUN = process.env.DRY_RUN === '1';
const SEED_ID_RE = '^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[0-9a-f]{4}-0000[0-9a-f]{8}$';

async function sql(pool: any, query: string, params: any[] = []): Promise<any[]> {
  return (await pool.query(query, params)).rows;
}

async function main() {
  const pool = getConnectionPool();
  const sep = DRY_RUN ? '[DRY-RUN] ' : '';
  console.log(`${sep}=== SEED DATA CLEANUP ===`);

  // 1. Seed auth users (all @school.edu)
  const auth = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const seedAuth = (auth.data?.users || []).filter((u: any) => (u.email || '').toLowerCase().endsWith('@school.edu'));
  const seedIds = seedAuth.map((u: any) => u.id);
  console.log(`${sep}Seed auth users: ${seedIds.length}`);

  // 1b. Also capture seeded firestore collections and detUuid tables.
  const firestoreCollections = ['examV2', 'examAttemptV2', 'quizV2', 'quizAttemptV2', 'teacherClassSubject'];

  // 2. Child FK rows referencing seed users
  const userChildren: Array<{ table: string; column: string }> = [
    { table: 'notice_board', column: 'created_by' },
    { table: 'notifications', column: 'user_id' },
    { table: 'device_tokens', column: 'user_id' },
    { table: 'fee_payments', column: 'student_id' },
    { table: 'attendance', column: 'student_id' },
    { table: 'student_class_enrollments', column: 'student_id' },
    { table: 'class_teachers', column: 'teacher_id' },
    { table: 'teacher_class_subject_assignments', column: 'teacher_id' },
  ];

  for (const { table, column } of userChildren) {
    let via = `${column} IN seedIds`;
    // fee_payments/notifications also carry detUuid ids — delete exactly those
    // plus any row whose user ref is a seed user (keeps legacy rows).
    const rows = await sql(pool, `SELECT id FROM "${table}" WHERE "${column}"::text = ANY($1::text[])`, [seedIds]);
    if (rows.length > 0) {
      console.log(`${sep}  ${table}: delete ${rows.length} rows referencing seed users`);
      if (!DRY_RUN) {
        await pool.query(`DELETE FROM "${table}" WHERE id = ANY($1::uuid[])`, [rows.map((r: any) => r.id)]);
      }
    } else {
      console.log(`${sep}  ${table}: 0 rows referencing seed users`);
    }
  }

  // 3a. tables purely seeded by detUuid id (all matching rows are seed)
  const seedIdTables = ['classes', 'subjects', 'class_subjects', 'exams', 'grades', 'fee_structures'];
  for (const t of seedIdTables) {
    const rows = await sql(pool, `SELECT id FROM "${t}" WHERE id::text ~ $1`, [SEED_ID_RE]);
    console.log(`${sep}  ${t}: delete ${rows.length} seed rows (detUuid)`);
    if (!DRY_RUN && rows.length > 0) {
      await pool.query(`DELETE FROM "${t}" WHERE id = ANY($1::uuid[])`, [rows.map((r: any) => r.id)]);
    }
  }

  // 3b. firestore_docs seeded collections
  for (const col of firestoreCollections) {
    const rows = await sql(pool, `SELECT doc_id FROM "firestore_docs" WHERE collection = $1`, [col]);
    console.log(`${sep}  firestore_docs[${col}]: delete ${rows.length} docs`);
    if (!DRY_RUN && rows.length > 0) {
      await pool.query(`DELETE FROM "firestore_docs" WHERE collection = $1`, [col]);
    }
  }

  // 4. Seed public.users profiles (ids in seedIds only; legacy orphans preserved)
  {
    const rows = await sql(pool, `SELECT id FROM "users" WHERE id = ANY($1::uuid[])`, [seedIds]);
    console.log(`${sep}  users.profiles: delete ${rows.length} seed profiles (legacy orphans kept)`);
    if (!DRY_RUN && rows.length > 0) {
      await pool.query(`DELETE FROM "users" WHERE id = ANY($1::uuid[])`, [rows.map((r: any) => r.id)]);
    }
  }

  // 5. Auth users (admin API)
  console.log(`${sep}  auth.users: delete ${seedIds.length} seed auth users`);
  if (!DRY_RUN) {
    for (const id of seedIds) {
      const { error } = await sb.auth.admin.deleteUser(id);
      if (error) console.log(`    ! failed ${id}: ${error.message}`);
    }
  }

  if (DRY_RUN) {
    console.log(`${sep}Dry run complete — nothing was written. Re-run without DRY_RUN=1 to apply.`);
  } else {
    console.log(`${sep}Cleanup complete. Backup available under lms/backend/backups/.`);
  }
  await pool.end();
}

main().catch((e) => { console.error('Cleanup failed:', e); process.exit(1); });