import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseAdmin } from '../services/supabase';
import { getConnectionPool } from '../database/connection-manager';
import fs from 'fs';

const BACKUP_DIR = path.resolve(__dirname, '../../backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const DIR = path.join(BACKUP_DIR, `backup-${TIMESTAMP}`);

async function backup() {
  console.log('=== CREATING COMPLETE DATABASE BACKUP ===\n');
  fs.mkdirSync(DIR, { recursive: true });
  console.log(`Backup directory: ${DIR}\n`);

  const supabase = getSupabaseAdmin();
  const pool = getConnectionPool();
  const client = await pool.connect();

  const manifest: any = { timestamp: TIMESTAMP, tables: {}, authUsers: [], firebaseUsers: [] };

  try {
    // ── 1. Supabase Auth Users ──
    console.log('1. Backing up Supabase Auth users...');
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    if (authUsers?.users) {
      const sanitized = authUsers.users.map((u: any) => ({
        id: u.id, email: u.email, phone: u.phone,
        role: u.role, created_at: u.created_at || u.createdAt,
        user_metadata: u.user_metadata,
      }));
      fs.writeFileSync(path.join(DIR, 'supabase-auth-users.json'), JSON.stringify(sanitized, null, 2));
      manifest.authUsers = sanitized.map(u => ({ id: u.id, email: u.email }));
      console.log(`  Saved ${sanitized.length} Auth users`);
    }

    // ── 2. Public Users ──
    console.log('\n2. Backing up public.users...');
    const { data: publicUsers } = await supabase.from('users').select('*');
    if (publicUsers) {
      fs.writeFileSync(path.join(DIR, 'public-users.json'), JSON.stringify(publicUsers, null, 2));
      manifest.tables['public.users'] = publicUsers.length;
      console.log(`  Saved ${publicUsers.length} records`);
    }

    // ── 3. All transactional tables via direct SQL ──
    console.log('\n3. Backing up all database tables...');
    const tables = [
      'subscriptions', 'revoked_tokens', 'user_mfa',
      'chapters', 'concepts', 'concept_notes', 'concept_videos',
      'concept_questions', 'concept_resources', 'processing_jobs',
      'raw_pages', 'submissions', 'corrections', 'quizzes',
      'quizv2', 'timetable', 'lessons', 'auditlogs',
      'concept_releases', 'assignments', 'exams',
      'subjects', 'classes', 'enrollments', 'fee_payments',
      'fee_structures', 'textbooks', 'firestore_docs',
      'device_tokens', 'notification_preferences',
    ];

    for (const t of tables) {
      try {
        const result = await client.query(`SELECT * FROM ${t}`);
        if (result.rows.length > 0) {
          fs.writeFileSync(path.join(DIR, `table-${t}.json`), JSON.stringify(result.rows, null, 2));
          manifest.tables[t] = result.rows.length;
          console.log(`  ${t}: ${result.rows.length} rows`);
        } else {
          console.log(`  ${t}: (empty)`);
        }
      } catch (err: any) {
        console.log(`  ${t}: (not available — ${err.message.slice(0, 50)})`);
      }
    }

    // ── 4. Firestore via Firebase Admin (if available) ──
    console.log('\n4. Backing up Firebase Auth + Firestore...');
    try {
      const { getAdminAuth, getAdminFirestore, admin } = require('../database/admin');
      const fbAuth = getAdminAuth();

      // Firebase Auth users
      const fbUsers: any[] = [];
      let listResult = await fbAuth.listUsers();
      while (listResult.users.length > 0) {
        for (const u of listResult.users) {
          fbUsers.push({ uid: u.uid, email: u.email, role: u.role });
        }
        if (listResult.pageToken) {
          listResult = await fbAuth.listUsers(1000, listResult.pageToken);
        } else break;
      }
      if (fbUsers.length > 0) {
        fs.writeFileSync(path.join(DIR, 'firebase-auth-users.json'), JSON.stringify(fbUsers, null, 2));
        manifest.firebaseUsers = fbUsers;
        console.log(`  Saved ${fbUsers.length} Firebase Auth users`);
      }

      // Firestore collections
      const db = getAdminFirestore();
      const collections = [
        'users', 'classes', 'subjects', 'teacherClassSubject', 'teacherVideos',
        'grades', 'grade', 'quizV2', 'quizAttemptV2', 'assignmentV2',
        'assignmentSubmissionV2', 'examV2', 'examAttemptV2', 'enrollment',
        'courses', 'lessons', 'questionBank', 'questionPapers',
        'testTemplates', 'testSchedule', 'whiteboards', 'timetable',
        'activityLogs', 'auditLogs', 'academicYears', 'conceptReleases',
        'conversations', 'messages', 'notifications', 'settings',
        'uploads', 'tokens', 'feeTransactions',
      ];
      for (const col of collections) {
        try {
          const snap = await db.collection(col).get();
          if (!snap.empty) {
            const docs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            fs.writeFileSync(path.join(DIR, `firestore-${col}.json`), JSON.stringify(docs, null, 2));
            manifest.tables[`firestore.${col}`] = docs.length;
            console.log(`  firestore.${col}: ${docs.length} docs`);
          }
        } catch {}
      }

      // Textbooks with subcollections
      try {
        const tbSnap = await db.collection('textbooks').get();
        if (!tbSnap.empty) {
          const textbooks: any[] = [];
          for (const doc of tbSnap.docs) {
            const tb: any = { id: doc.id, ...doc.data(), chapters: [] };
            const chSnap = await doc.ref.collection('chapters').get();
            for (const chDoc of chSnap.docs) {
              const ch: any = { id: chDoc.id, ...chDoc.data(), concepts: [] };
              const coSnap = await chDoc.ref.collection('concepts').get();
              for (const coDoc of coSnap.docs) {
                const co: any = { id: coDoc.id, ...coDoc.data() };
                const qSnap = await coDoc.ref.collection('questions').get();
                if (!qSnap.empty) {
                  co.questions = qSnap.docs.map((q: any) => ({ id: q.id, ...q.data() }));
                }
                ch.concepts.push(co);
              }
              tb.chapters.push(ch);
            }
            textbooks.push(tb);
          }
          if (textbooks.length > 0) {
            fs.writeFileSync(path.join(DIR, 'firestore-textbooks-full.json'), JSON.stringify(textbooks, null, 2));
            manifest.tables['firestore.textbooks'] = textbooks.length;
            console.log(`  firestore.textbooks: ${textbooks.length} (with chapters/concepts/questions)`);
          }
        }
      } catch {}
    } catch (e: any) {
      console.log('  Firebase not available:', e.message?.slice(0, 80));
    }

    // ── 5. Schools (reference data) ──
    console.log('\n5. Backing up reference data...');
    try {
      const { data: schools } = await supabase.from('schools').select('*');
      if (schools) {
        fs.writeFileSync(path.join(DIR, 'reference-schools.json'), JSON.stringify(schools, null, 2));
        manifest.tables['schools'] = schools.length;
        console.log(`  schools: ${schools.length}`);
      }
    } catch (e: any) {
      console.log(`  schools: (error — ${e.message?.slice(0, 50)})`);
    }

    // ── 6. Write manifest ──
    fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // ── 7. Summary ──
    const totalSize = getDirSize(DIR);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('BACKUP COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Location: ${DIR}`);
    console.log(`  Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Tables backed up: ${Object.keys(manifest.tables).length}`);
    console.log(`  Auth users backed up: ${manifest.authUsers.length}`);
    console.log(`  Firebase users backed up: ${manifest.firebaseUsers.length}`);

    let totalRecords = 0;
    for (const count of Object.values(manifest.tables)) {
      totalRecords += count as number;
    }
    console.log(`  Total records backed up: ${totalRecords}`);

  } catch (err) {
    console.error('Backup failed:', err);
  } finally {
    client.release();
  }
}

function getDirSize(dir: string): number {
  let size = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile()) size += fs.statSync(fullPath).size;
      else if (entry.isDirectory()) size += getDirSize(fullPath);
    }
  } catch {}
  return size;
}

backup();
