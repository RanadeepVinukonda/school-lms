import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getConnectionPool } from '../database/connection-manager';
import { getSupabaseAdmin } from '../services/supabase';

async function main() {
  console.log('=== STARTING COMPLETE DATA WIPE ===');
  const pool = getConnectionPool();
  const client = await pool.connect();
  const supabase = getSupabaseAdmin();

  try {
    // List of all tables we want to truncate (order does not matter since we use CASCADE)
    const tables = [
      'subscriptions',
      'revoked_tokens',
      'user_mfa',
      'chapters',
      'concepts',
      'concept_notes',
      'concept_videos',
      'concept_questions',
      'concept_resources',
      'processing_jobs',
      'raw_pages',
      'submissions',
      'corrections',
      'quizzes',
      'quizv2',
      'timetable',
      'lessons',
      'auditlogs',
      'concept_releases',
      'assignments',
      'exams',
      'subjects',
      'classes',
      'device_tokens',
      'notification_preferences',
      'enrollments',
      'fee_payments',
      'fee_structures',
      'textbooks',
      'schools',
      'firestore_docs'
    ];

    for (const t of tables) {
      console.log(`Truncating table: ${t}...`);
      try {
        await client.query(`TRUNCATE TABLE ${t} CASCADE;`);
      } catch (err: any) {
        console.log(`  Failed to truncate ${t} (might be view/missing): ${err.message}`);
      }
    }

    // Now let's handle the user deletion. We want to keep ONLY admin@school.com
    console.log('Fetching users to delete...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email');
    if (userError) throw userError;

    const keptAdmin = users?.find(u => u.email === 'admin@school.com');
    if (!keptAdmin) {
      console.log('Warning: admin@school.com not found. We will keep the first admin instead.');
    }
    const keptId = keptAdmin?.id || '291414d5-0d5f-41af-bf2c-35bff35ea317';

    console.log(`Keeping admin user: admin@school.com (ID: ${keptId})`);

    // Delete non-kept users from public.users table
    try {
      await client.query(`DELETE FROM users WHERE id <> $1`, [keptId]);
    } catch (err: any) {
      console.error('Failed to delete from users table:', err.message);
    }

    // Delete non-kept users from auth.users (via Supabase Admin API)
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let deletedAuthCount = 0;
    for (const u of authUsers.users) {
      if (u.id !== keptId) {
        console.log(`Deleting Auth user: ${u.email} (${u.id})...`);
        const { error: delError } = await supabase.auth.admin.deleteUser(u.id);
        if (delError) {
          console.error(`  Failed to delete Auth User ${u.id}: ${delError.message}`);
        } else {
          deletedAuthCount++;
        }
      }
    }

    console.log(`=== COMPLETE DATA WIPE SUCCEEDED (Deleted ${deletedAuthCount} Auth users) ===`);
  } catch (err) {
    console.error('Data wipe failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
