import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const tables = [
  'concept_mastery','curriculum_plans','virtual_lab_progress',
  'notification_preferences','device_tokens','pre_primary_content',
  'coding_challenges','ai_tutor_sessions','processing_jobs','raw_pages',
  'concept_resources','concept_videos','concept_notes','concept_questions',
  'concepts','chapters','textbooks',
  'attendance','fee_payments','fee_structures',
  'transport_attendance','transport_assignments','transport_stops','transport_routes',
  'inventory_usage_log','inventory_items','inventory_categories','suppliers',
  'payroll_runs','salary_config','leave_requests','staff_attendance','staff_records',
  'notice_board','notifications','subscriptions','revoked_tokens','user_mfa',
  'assignments','quizzes','quizv2','exams','grades','submissions','corrections',
  'timetable','lessons','concept_releases','report_feedback','auditLogs',
  'curriculum_hierarchy','publisher_references','enrollments',
  'subjects','classes','users','schools',
  'firestore_docs',
];

async function main() {
  console.log('🗑️  Deleting ALL data...\n');
  let total = 0;
  for (const t of tables) {
    const { error } = await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error && !error.message.includes('does not exist') && !error.message.includes('relation')) {
      console.log(`  ⚠️  ${t}: ${error.message.substring(0, 80)}`);
    } else {
      console.log(`  ✅ ${t} cleared`);
      total++;
    }
  }
  console.log(`\n✅ Done — ${total} tables cleared.`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
