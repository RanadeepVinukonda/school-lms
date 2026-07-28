const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const delResult = await client.query("DELETE FROM users WHERE email != 'admin@school.com'");
    const delSchools = await client.query("DELETE FROM schools WHERE id != '00000000-0000-0000-0000-000000000001'");
    console.log('Deleted non-admin schools:', delSchools.rowCount);
    console.log('Deleted non-admin users:', delResult.rowCount);

    const tables = [
      'classes','subjects','boards',
      'student_class_enrollments','class_teachers','class_subjects',
      'teacher_class_subject_assignments',
      'timetable','attendance',
      'fee_structures','fee_payments',
      'staff_records','staff_attendance','leave_requests',
      'salary_config','payroll_runs',
      'textbooks','chapters',
      'curriculum_plans','curriculum_hierarchy','publisher_references',
      'concepts','concept_releases','concept_notes','concept_videos',
      'concept_questions','concept_resources','concept_mastery',
      'processing_jobs','raw_pages',
      'notice_board',
      'transport_routes','transport_stops','transport_assignments','transport_attendance',
      'suppliers','inventory_categories','inventory_items','inventory_usage_log',
      'ai_tutor_sessions','tutor_response_cache','pre_primary_content',
      'coding_challenges',
      'virtual_lab_progress','device_tokens','notification_preferences',
      'user_mfa',
      'firestore_docs','revoked_tokens','idempotency_keys',
      'subscriptions',
      'whiteboards','mindmaps','mindmap_shares','mindmap_resources',
      'user_badges','user_streaks','user_challenge_completions',
      'gamification_profiles','daily_challenges','weekly_challenges','monthly_challenges',
      'otp_codes','audit_logs','auditLogs',
      'assignments','quizzes','quizv2','exams','grades','submissions','corrections',
      'lessons','enrollments','notifications'
    ];

    for (const t of tables) {
      const exists = await client.query("SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = $1)", [t]);
      if (exists.rows[0].exists) {
        await client.query('TRUNCATE TABLE ' + t + ' CASCADE');
        console.log('Truncated:', t);
      } else {
        console.log('Skipped (not exist):', t);
      }
    }

    await client.query('COMMIT');
    console.log('\nDone. All data cleaned. Admin user preserved.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
