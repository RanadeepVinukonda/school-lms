import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });

const ALL_TABLES = [
  'concept_mastery','curriculum_plans','virtual_lab_progress','notification_preferences','device_tokens',
  'pre_primary_content','coding_challenges','ai_tutor_sessions','processing_jobs','raw_pages',
  'concept_resources','concept_videos','concept_notes','concept_questions','concepts','chapters','textbooks',
  'attendance','fee_payments','fee_structures','transport_attendance','transport_assignments','transport_stops',
  'transport_routes','inventory_usage_log','inventory_items','inventory_categories','suppliers','payroll_runs',
  'salary_config','leave_requests','staff_attendance','staff_records','notice_board','notifications',
  'subscriptions','revoked_tokens','user_mfa','assignments','quizzes','quizv2','exams','grades','submissions',
  'corrections','timetable','lessons','concept_releases','report_feedback','curriculum_hierarchy',
  'publisher_references','enrollments','subjects','classes','users','schools','firestore_docs',
];

async function wipeAll() {
  // 1. Delete all auth users
  console.log('Deleting all auth users...');
  const { data: authUsers } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      const { error } = await db.auth.admin.deleteUser(u.id);
      if (error) console.log(`  FAIL ${u.email || u.id}: ${error.message}`);
      else console.log(`  OK ${u.email || u.id}`);
    }
  }
  console.log();

  // 2. Delete all table data
  console.log('Wiping all table data...');
  for (const t of ALL_TABLES) {
    const { error } = await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error && !error.message?.includes('does not exist') && !error.message?.includes('relation')) {
      console.log(`  FAIL ${t}: ${error.message.substring(0, 80)}`);
    } else {
      console.log(`  OK ${t}`);
    }
  }

  console.log('\n=== ALL DATA WIPED ===');
}

wipeAll().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
