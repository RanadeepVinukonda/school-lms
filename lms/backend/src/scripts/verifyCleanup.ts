import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseAdmin } from '../services/supabase';
import { getConnectionPool } from '../database/connection-manager';

async function main() {
  const pool = getConnectionPool();
  const client = await pool.connect();

  console.log('=== CLEANUP VERIFICATION ===\n');

  const tables = [
    'chapters','concepts','concept_notes','concept_videos',
    'concept_questions','concept_resources','processing_jobs','raw_pages',
    'textbooks','firestore_docs','fee_structures','fee_payments',
    'subscriptions','device_tokens','notification_preferences',
    'quizv2','auditlogs','subjects','classes','enrollments',
    'lessons','assignments','exams','timetable','concept_releases',
  ];

  let totalRows = 0;
  let tablesWithData = 0;

  for (const t of tables) {
    try {
      const r = await client.query(`SELECT COUNT(*) as cnt FROM ${t}`);
      const c = parseInt(r.rows[0].cnt);
      if (c > 0) {
        console.log(`  ${t}: ${c} rows REMAINING`);
        tablesWithData++;
        totalRows += c;
      }
    } catch (e: any) {
      // table doesn't exist or is a view
    }
  }

  console.log(`\nTables with remaining data: ${tablesWithData}`);
  console.log(`Total remaining rows: ${totalRows}`);

  // Schools (should still be there)
  try {
    const r = await client.query(`SELECT COUNT(*) as cnt FROM schools`);
    console.log(`\n  schools: ${r.rows[0].cnt} row(s) — KEPT`);
  } catch {}

  client.release();

  // Users
  const supabase = getSupabaseAdmin();
  const { data: users } = await supabase.from('users').select('id, email, role');
  if (users) {
    console.log(`\n  public.users: ${users.length} user(s)`);
    for (const u of users) {
      console.log(`    [${u.role || '?'}] ${u.email} — KEPT`);
    }
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
