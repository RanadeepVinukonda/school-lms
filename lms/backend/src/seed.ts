import admin from 'firebase-admin';
import { initializeFirebase } from './config/firebase';

const USERS = [
  { id: 's1', email: 'alice@genesis.edu', password: 'password123', displayName: 'Alice Johnson', role: 'student', studentId: 'STU001', classId: 'c1' },
  { id: 's2', email: 'bob@genesis.edu', password: 'password123', displayName: 'Bob Smith', role: 'student', studentId: 'STU002', classId: 'c1' },
  { id: 's3', email: 'carol@genesis.edu', password: 'password123', displayName: 'Carol Davis', role: 'student', studentId: 'STU003', classId: 'c2' },
  { id: 't1', email: 'dr.wilson@genesis.edu', password: 'password123', displayName: 'Dr. Wilson', role: 'teacher', teacherId: 'TCH001' },
  { id: 't2', email: 'ms.parker@genesis.edu', password: 'password123', displayName: 'Ms. Parker', role: 'teacher', teacherId: 'TCH002' },
  { id: 'a1', email: 'admin@genesis.edu', password: 'password123', displayName: 'Principal Adams', role: 'admin' },
];

async function seed() {
  initializeFirebase();
  const auth = admin.auth();
  const db = admin.firestore();
  const now = new Date().toISOString();

  console.log('Creating Firebase Auth users...');
  const uidMap = new Map<string, string>();
  for (const u of USERS) {
    try {
      const rec = await auth.createUser({
        uid: u.id,
        email: u.email,
        password: u.password,
        displayName: u.displayName,
      });
      await auth.setCustomUserClaims(rec.uid, { role: u.role });
      uidMap.set(u.id, rec.uid);
      console.log(`  ✓ ${u.email} (${u.role})`);
    } catch (err: any) {
      if (err.code === 'auth/uid-already-exists' || err.code === 'auth/email-already-exists') {
        console.log(`  ~ ${u.email} already exists, skipping`);
        uidMap.set(u.id, u.id);
      } else {
        console.error(`  ✗ ${u.email}:`, err.message);
      }
    }
  }

  console.log('\nCreating Firestore documents...');

  const batch = db.batch();

  // Users collection
  for (const u of USERS) {
    const uid = uidMap.get(u.id) || u.id;
    const docData: Record<string, unknown> = {
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    if ('studentId' in u) docData.studentId = u.studentId;
    if ('classId' in u) docData.classId = u.classId;
    if ('teacherId' in u) docData.teacherId = u.teacherId;
    batch.set(db.collection('users').doc(uid), docData);
  }

  // Subjects
  const subjects = [
    { id: 'sub1', name: 'Mathematics', code: 'MATH10', icon: 'calculate', color: '#3B82F6', category: 'STEM' },
    { id: 'sub2', name: 'Physics', code: 'PHY10', icon: 'science', color: '#8B5CF6', category: 'STEM' },
    { id: 'sub3', name: 'English Literature', code: 'ENG10', icon: 'menu_book', color: '#EC4899', category: 'Humanities' },
    { id: 'sub4', name: 'World History', code: 'HIS10', icon: 'history', color: '#F59E0B', category: 'Humanities' },
  ];
  for (const s of subjects) {
    batch.set(db.collection('subjects').doc(s.id), { ...s, isActive: true, createdAt: now, updatedAt: now });
  }

  // Classes
  const classes = [
    { id: 'c1', name: 'Grade 10A', code: '10A', grade: '10', section: 'A', academicYear: '2025-2026', teacherIds: ['t1', 't2'], subjectIds: ['sub1', 'sub2', 'sub3'], studentCount: 30, status: 'active' },
    { id: 'c2', name: 'Grade 10B', code: '10B', grade: '10', section: 'B', academicYear: '2025-2026', teacherIds: ['t2'], subjectIds: ['sub1', 'sub2', 'sub3'], studentCount: 28, status: 'active' },
  ];
  for (const c of classes) {
    batch.set(db.collection('classes').doc(c.id), c);
  }

  // Enrollments
  const enrollmentData = [
    { studentId: 's1', courseId: 'sub1', status: 'active', progress: 65, enrolledAt: now },
    { studentId: 's1', courseId: 'sub2', status: 'active', progress: 40, enrolledAt: now },
    { studentId: 's1', courseId: 'sub3', status: 'active', progress: 80, enrolledAt: now },
    { studentId: 's2', courseId: 'sub1', status: 'active', progress: 45, enrolledAt: now },
    { studentId: 's2', courseId: 'sub2', status: 'active', progress: 70, enrolledAt: now },
    { studentId: 's3', courseId: 'sub1', status: 'active', progress: 90, enrolledAt: now },
  ];
  for (const e of enrollmentData) {
    const eid = `${e.courseId}_${e.studentId}`;
    batch.set(db.collection('enrollment').doc(eid), e);
  }

  // Grades
  const gradesData = [
    { id: 'g1', studentId: 's1', subjectId: 'sub1', itemName: 'Linear Equations Worksheet', score: 85, totalPoints: 100, percentage: 85, gradedAt: now, createdAt: now },
    { id: 'g2', studentId: 's1', subjectId: 'sub3', itemName: 'Essay Draft', score: 42, totalPoints: 50, percentage: 84, gradedAt: now, createdAt: now },
  ];
  for (const g of gradesData) {
    batch.set(db.collection('grades').doc(g.id), g);
  }

  // Notifications
  const notificationsData = [
    { id: 'n1', userId: 's1', type: 'assignment', title: 'New Assignment Posted', body: 'Linear Equations Worksheet is due in 7 days', link: '/assignments/a1', read: false, createdAt: now },
    { id: 'n2', userId: 's1', type: 'grade', title: 'Grade Published', body: 'Your essay draft has been graded: 42/50', link: '/assignments/a4', read: false, createdAt: now },
    { id: 'n3', userId: 's1', type: 'exam', title: 'Upcoming Exam', body: 'Midterm Examination starts in 30 days', link: '/exams/e1', read: true, createdAt: now },
    { id: 'n4', userId: 't1', type: 'submission', title: 'New Submission', body: 'Alice submitted her Linear Equations Worksheet', link: '/assignments/a1', read: false, createdAt: now },
  ];
  for (const n of notificationsData) {
    batch.set(db.collection('notifications').doc(n.id), n);
  }

  await batch.commit();
  console.log('  ✓ All Firestore documents created');
  console.log('\nSeed complete! Login credentials:');
  for (const u of USERS) {
    console.log(`  ${u.role}: ${u.email} / ${u.password}`);
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
