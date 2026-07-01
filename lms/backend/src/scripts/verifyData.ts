import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { getAdminFirestore } from '../database/admin';
const db = getAdminFirestore();

async function main() {
  const collections = [
    'users','classes','subjects','teacherClassSubject','enrollment',
    'courses','lessons','assignments','quizzes','exams','grades',
    'textbooks','teacherVideos','notifications','conversations','messages',
    'activityLogs','auditLogs','timetable','questionBank','questionPapers',
    'testTemplates','testSchedule','corrections','conceptProgress','conceptReleases',
    'quizV2','assignmentV2','examV2','quizAttemptV2','assignmentSubmissionV2','settings',
    'academicYears',
  ];
  console.log('=== Data Counts ===');
  for (const c of collections) {
    try {
      const snap = await db.collection(c).get();
      console.log(`  ${c.padEnd(25)} ${snap.size}`);
    } catch (e: any) {
      console.log(`  ${c.padEnd(25)} ERROR: ${e.message}`);
    }
  }
  console.log('\n✅ Verification complete');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
