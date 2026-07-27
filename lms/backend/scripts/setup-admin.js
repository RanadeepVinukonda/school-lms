/**
 * Wipe all data + create admin in Supabase Auth + insert DB row.
 * Usage: node scripts/setup-admin.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SCHOOL_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_EMAIL = 'admin@school.com';
const ADMIN_PASSWORD = 'admin123';

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

async function deleteAllTables() {
  console.log('🗑️  Wiping all tables...\n');
  for (const t of ALL_TABLES) {
    const { error } = await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const status = error && !error.message?.includes('does not exist') && !error.message?.includes('relation')
      ? `⚠️  ${error.message.substring(0, 60)}`
      : '✅';
    console.log(`  ${status} ${t}`);
  }
  console.log('');
}

async function deleteAllAuthUsers() {
  console.log('🗑️  Wiping Supabase Auth users...\n');
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) { console.log('  ⚠️  listUsers error:', error.message); return; }
  for (const u of data.users || []) {
    const { error: delErr } = await db.auth.admin.deleteUser(u.id);
    console.log(`  ${delErr ? '⚠️  ' + delErr.message.substring(0, 60) : '✅'} ${u.email || u.id}`);
  }
  console.log('');
}

async function createSchool() {
  console.log('🏫 Creating school...');
  const { error } = await db.from('schools').insert({
    id: SCHOOL_ID,
    name: 'Springfield International School',
    subdomain: 'springfield',
    primary_color: '#6366f1',
    plan: 'enterprise',
  });
  console.log(error ? `  ⚠️  ${error.message}` : '  ✅ School created');
  console.log('');
}

async function createAdmin() {
  console.log('👤 Creating admin in Supabase Auth...\n');

  // 1. Create auth user
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      display_name: 'School Admin',
      phone_number: '+91-9000000001',
    },
    app_metadata: { role: 'admin' },
  });

  if (authError) {
    console.error('  ❌ Auth user creation failed:', authError.message);
    process.exit(1);
  }

  const uid = authData.user.id;
  console.log(`  ✅ Auth user created: ${uid}`);
  console.log(`     Email: ${ADMIN_EMAIL}`);
  console.log(`     Password: ${ADMIN_PASSWORD}`);
  console.log('');

  // 2. Insert into users table
  const { error: dbError } = await db.from('users').insert({
    id: uid,
    email: ADMIN_EMAIL,
    display_name: 'School Admin',
    role: 'admin',
    phone_number: '+91-9000000001',
    is_active: true,
    school_id: SCHOOL_ID,
    class_ids: [],
    children_ids: [],
    data: JSON.stringify({ designation: 'Principal' }),
  });

  if (dbError) {
    console.error('  ❌ DB row creation failed:', dbError.message);
    process.exit(1);
  }

  console.log('  ✅ DB user row created');
  console.log('');

  // 3. Verify login works
  console.log('🔐 Verifying login...');
  const loginRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: process.env.SUPABASE_ANON_KEY },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginData = await loginRes.json();
  if (loginData.access_token) {
    console.log('  ✅ Login verified — JWT obtained');
    console.log(`     Token (first 40 chars): ${loginData.access_token.substring(0, 40)}...`);
  } else {
    console.log('  ⚠️  Login response:', JSON.stringify(loginData).substring(0, 200));
  }

  return uid;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  FULL WIPE + ADMIN SETUP');
  console.log('═══════════════════════════════════════════════════\n');

  await deleteAllAuthUsers();
  await deleteAllTables();
  await createSchool();
  const uid = await createAdmin();

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  DONE — ADMIN READY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Auth UID:  ${uid}`);
  console.log(`  Email:     ${ADMIN_EMAIL}`);
  console.log(`  Password:  ${ADMIN_PASSWORD}`);
  console.log(`  Role:      admin`);
  console.log(`  School:    ${SCHOOL_ID}`);
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('❌ FATAL:', e.message); process.exit(1); });
