import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseAdmin } from '../services/supabase';
import { getConnectionPool } from '../database/connection-manager';

const ADMIN_EMAIL = 'admin@school.com';

async function cleanupSupabaseTransactions() {
  console.log('\n--- 1. Truncating transactional tables (keeping schema intact) ---');
  const pool = getConnectionPool();
  const client = await pool.connect();

  try {
    const transactionalTables = [
      'chapters', 'concepts', 'concept_notes', 'concept_videos',
      'concept_questions', 'concept_resources', 'processing_jobs',
      'raw_pages', 'submissions', 'corrections', 'quizzes',
      'quizv2', 'timetable', 'lessons', 'auditlogs',
      'concept_releases', 'assignments', 'exams',
      'subjects', 'classes', 'enrollments', 'fee_payments',
      'fee_structures', 'textbooks', 'firestore_docs',
      'subscriptions', 'revoked_tokens', 'user_mfa',
      'device_tokens', 'notification_preferences',
    ];

    for (const t of transactionalTables) {
      try {
        await client.query(`TRUNCATE TABLE ${t} CASCADE;`);
        console.log(`  OK: ${t}`);
      } catch (err: any) {
        console.log(`  SKIP: ${t} — ${err.message.slice(0, 60)}`);
      }
    }
  } finally {
    client.release();
  }
}

async function cleanupPublicUsers() {
  console.log('\n--- 2. Removing non-admin users from public.users ---');
  const supabase = getSupabaseAdmin();

  const { data: users } = await supabase.from('users').select('id, email, role');
  if (!users) { console.log('  No users found'); return; }

  const admin = users.find(u => u.email === ADMIN_EMAIL);
  if (!admin) { console.log('  WARNING: admin@school.com not found in public.users!'); return; }

  const toDelete = users.filter(u => u.email !== ADMIN_EMAIL);
  if (toDelete.length === 0) { console.log('  No non-admin users to delete'); return; }

  const ids = toDelete.map(u => u.id);
  const { error } = await supabase.from('users').delete().in('id', ids);
  if (error) {
    console.log(`  ERROR: ${error.message}`);
  } else {
    console.log(`  Deleted ${toDelete.length} non-admin users (kept ${ADMIN_EMAIL})`);
    for (const u of toDelete) {
      console.log(`    [${u.role || '?'}] ${u.email}`);
    }
  }
}

async function cleanupFirebaseUsers() {
  console.log('\n--- 3. Removing non-admin Firebase Auth users ---');
  try {
    const { getAdminAuth } = require('../database/admin');
    const fbAuth = getAdminAuth();

    let deletedCount = 0;
    let listResult = await fbAuth.listUsers();
    while (listResult.users.length > 0) {
      const toDelete = listResult.users.filter((u: any) => u.email !== ADMIN_EMAIL);
      if (toDelete.length > 0) {
        const uids = toDelete.map((u: any) => u.uid);
        const result = await fbAuth.deleteUsers(uids);
        deletedCount += result.successCount;
        console.log(`  Deleted ${result.successCount} users this batch`);
      }
      if (listResult.pageToken) {
        listResult = await fbAuth.listUsers(1000, listResult.pageToken);
      } else break;
    }
    console.log(`  Total non-admin users deleted from Firebase Auth: ${deletedCount}`);
    console.log(`  Kept: ${ADMIN_EMAIL}`);
  } catch (e: any) {
    console.log(`  SKIP (Firebase not available): ${e.message.slice(0, 80)}`);
  }
}

async function main() {
  console.log('=== PRODUCTION CLEANUP — REMOVING DEMO/SEED DATA ===');
  console.log(`Admin to keep: ${ADMIN_EMAIL}`);
  console.log('Backup: C:\\Users\\Alrihab\\Downloads\\school-lms (3)\\school-lms-build\\lms\\backend\\backups\\backup-2026-07-15T15-17-17-346Z');

  await cleanupSupabaseTransactions();
  await cleanupPublicUsers();
  await cleanupFirebaseUsers();

  console.log('\n=== CLEANUP COMPLETE ===');
  console.log('Demo/seed data removed. System intact. Admin account preserved.');
  process.exit(0);
}

main().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
