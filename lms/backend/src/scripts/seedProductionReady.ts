import dotenv from 'dotenv';
import path from 'path';

// Load environmental variables first
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getAdminAuth, getAdminFirestore } from '../firebase/admin';
import { collections } from '../firebase/firestore';
import { createClass } from '../services/class.service';
import { createSubject } from '../services/subject.service';
import { assignTeacher } from '../services/teacher-class-subject.service';
import { createTextbook } from '../services/textbook.service';
const auth = getAdminAuth();
const db = getAdminFirestore();

async function deleteCollection(name: string) {
  const snap = await db.collection(name).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`  Deleted ${snap.size} docs from ${name}`);
}

async function clearAllData() {
  console.log('Clearing Firebase Auth users...');
  let listUsersResult = await auth.listUsers(1000);
  while (listUsersResult.users.length > 0) {
    const uids = listUsersResult.users.map((u) => u.uid);
    await auth.deleteUsers(uids);
    console.log(`  Deleted ${uids.length} Auth users.`);
    listUsersResult = await auth.listUsers(1000);
  }

  console.log('Clearing Firestore collections...');
  const collectionsToClear = [
    'classes', 'subjects', 'teacherClassSubject', 'teacherVideos', 'grades',
    'quizV2', 'quizAttemptV2', 'assignmentV2', 'assignmentSubmissionV2',
    'examV2', 'examAttemptV2', 'enrollment', 'courses', 'lessons',
    'questionBank', 'questionPapers', 'testTemplates', 'testSchedule', 'timetable',
    'activityLogs', 'auditLogs', 'users'
  ];
  for (const name of collectionsToClear) {
    await deleteCollection(name);
  }

  // Clear textbooks and subcollections
  console.log('Clearing textbooks and subcollections...');
  const tbSnap = await db.collection('textbooks').get();
  for (const doc of tbSnap.docs) {
    const chaptersSnap = await doc.ref.collection('chapters').get();
    for (const chap of chaptersSnap.docs) {
      const conceptsSnap = await chap.ref.collection('concepts').get();
      const cBatch = db.batch();
      conceptsSnap.docs.forEach((cDoc) => cBatch.delete(cDoc.ref));
      await cBatch.commit();
      await chap.ref.delete();
    }
    await doc.ref.delete();
  }
  console.log('  Cleared textbooks.');
}

async function createUser(email: string, password: string, displayName: string, role: string, extra: Record<string, any> = {}) {
  const record = await auth.createUser({
    email,
    password,
    displayName,
  });
  await auth.setCustomUserClaims(record.uid, { role });
  
  const now = new Date().toISOString();
  await db.collection('users').doc(record.uid).set({
    uid: record.uid,
    email,
    displayName,
    role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...extra,
  });
  return record.uid;
}

async function main() {
  console.log('=== STARTING PRODUCTION SEED ===');
  await clearAllData();

  // Create Admin
  console.log('\nCreating Admin...');
  await createUser('admin@school.edu', 'adminPassword123', 'Principal Admin', 'admin');
  console.log('  Admin created: admin@school.edu / adminPassword123');

  // Create Classes
  console.log('\nCreating Classes...');
  const class1 = await createClass({
    name: 'Grade 10 - Section A',
    code: '10A',
    grade: '10',
    section: 'A',
    academicYear: '2026',
  });
  const class2 = await createClass({
    name: 'Grade 11 - Section A',
    code: '11A',
    grade: '11',
    section: 'A',
    academicYear: '2026',
  });
  console.log(`  Class 1 created: ${class1.name} (id: ${class1.id})`);
  console.log(`  Class 2 created: ${class2.name} (id: ${class2.id})`);

  // Create Subjects for Class 1
  console.log('\nCreating Subjects for Class 1...');
  const subjectsClass1Data = [
    { name: 'Mathematics', code: 'MATH10' },
    { name: 'Science', code: 'SCI10' },
    { name: 'English', code: 'ENG10' },
    { name: 'Social Studies', code: 'SOC10' },
  ];
  const subjectsClass1: any[] = [];
  for (const s of subjectsClass1Data) {
    const sub = await createSubject({ ...s, classId: class1.id });
    subjectsClass1.push(sub);
    console.log(`  Created ${sub.name} (id: ${sub.id}) for Class 1`);
  }

  // Create Subjects for Class 2
  console.log('\nCreating Subjects for Class 2...');
  const subjectsClass2Data = [
    { name: 'Mathematics', code: 'MATH11' },
    { name: 'Science', code: 'SCI11' },
    { name: 'English', code: 'ENG11' },
    { name: 'Social Studies', code: 'SOC11' },
  ];
  const subjectsClass2: any[] = [];
  for (const s of subjectsClass2Data) {
    const sub = await createSubject({ ...s, classId: class2.id });
    subjectsClass2.push(sub);
    console.log(`  Created ${sub.name} (id: ${sub.id}) for Class 2`);
  }

  // Create Teachers
  console.log('\nCreating Teachers...');
  const teacher1Uid = await createUser('teacher1@school.edu', 'teacherPassword123', 'Dr. John Doe', 'teacher', {
    classIds: [class1.id]
  });
  const teacher2Uid = await createUser('teacher2@school.edu', 'teacherPassword123', 'Prof. Jane Smith', 'teacher', {
    classIds: [class2.id]
  });
  console.log(`  Teacher 1 created: teacher1@school.edu / teacherPassword123 (id: ${teacher1Uid})`);
  console.log(`  Teacher 2 created: teacher2@school.edu / teacherPassword123 (id: ${teacher2Uid})`);

  // Assign Teacher 1 to all Class 1 subjects
  console.log('\nAssigning Teacher 1 to Class 1 subjects...');
  for (const sub of subjectsClass1) {
    await assignTeacher({
      teacherId: teacher1Uid,
      classId: class1.id,
      subjectId: sub.id,
    });
    console.log(`  Assigned Teacher 1 to ${sub.name}`);
  }

  // Assign Teacher 2 to all Class 2 subjects
  console.log('\nAssigning Teacher 2 to Class 2 subjects...');
  for (const sub of subjectsClass2) {
    await assignTeacher({
      teacherId: teacher2Uid,
      classId: class2.id,
      subjectId: sub.id,
    });
    console.log(`  Assigned Teacher 2 to ${sub.name}`);
  }

  // Create textbooks for each subject (with dynamic questions generation)
  console.log('\nCreating Textbooks & mock-AI parsed Chapters/Concepts/Questions...');
  for (const sub of subjectsClass1) {
    await createTextbook({
      title: `${sub.name} Textbook - Grade 10`,
      subjectId: sub.id,
      classId: class1.id,
      teacherId: teacher1Uid,
      description: `Complete Grade 10 curriculum for ${sub.name}`,
    });
    console.log(`  Created textbook for ${sub.name} (Class 1)`);
  }
  for (const sub of subjectsClass2) {
    await createTextbook({
      title: `${sub.name} Textbook - Grade 11`,
      subjectId: sub.id,
      classId: class2.id,
      teacherId: teacher2Uid,
      description: `Complete Grade 11 curriculum for ${sub.name}`,
    });
    console.log(`  Created textbook for ${sub.name} (Class 2)`);
  }

  // Create Students for Class 1
  console.log('\nCreating Students for Class 1...');
  const student1Uid = await createUser('10a-01-2026@school.edu', 'studentPassword123', 'Alex Rivera', 'student', {
    classId: class1.id,
    studentId: '10A-01-2026',
    rollNo: 1,
    academicYear: '2026',
    classIds: [class1.id],
  });
  const student2Uid = await createUser('10a-02-2026@school.edu', 'studentPassword123', 'Bella Harris', 'student', {
    classId: class1.id,
    studentId: '10A-02-2026',
    rollNo: 2,
    academicYear: '2026',
    classIds: [class1.id],
  });
  console.log(`  Student 1 (Class 1) created: 10a-01-2026@school.edu / studentPassword123 (studentId: 10A-01-2026)`);
  console.log(`  Student 2 (Class 1) created: 10a-02-2026@school.edu / studentPassword123 (studentId: 10A-02-2026)`);

  // Create Students for Class 2
  console.log('\nCreating Students for Class 2...');
  const student3Uid = await createUser('11a-01-2026@school.edu', 'studentPassword123', 'Chris Evans', 'student', {
    classId: class2.id,
    studentId: '11A-01-2026',
    rollNo: 1,
    academicYear: '2026',
    classIds: [class2.id],
  });
  const student4Uid = await createUser('11a-02-2026@school.edu', 'studentPassword123', 'Diana Prince', 'student', {
    classId: class2.id,
    studentId: '11A-02-2026',
    rollNo: 2,
    academicYear: '2026',
    classIds: [class2.id],
  });
  console.log(`  Student 3 (Class 2) created: 11a-01-2026@school.edu / studentPassword123 (studentId: 11A-01-2026)`);
  console.log(`  Student 4 (Class 2) created: 11a-02-2026@school.edu / studentPassword123 (studentId: 11A-02-2026)`);

  // Enroll Students in class subjects
  console.log('\nEnrolling Students in Class 1 subjects...');
  for (const sid of [student1Uid, student2Uid]) {
    for (const sub of subjectsClass1) {
      const enrollId = `${sub.id}_${sid}`;
      await db.collection('enrollment').doc(enrollId).set({
        courseId: sub.id,
        studentId: sid,
        status: 'active',
        progress: 0,
        enrolledAt: new Date().toISOString(),
      });
    }
  }
  await collections.classes().doc(class1.id).update({ studentCount: 2 });
  console.log('  Enrolled Class 1 students.');

  console.log('\nEnrolling Students in Class 2 subjects...');
  for (const sid of [student3Uid, student4Uid]) {
    for (const sub of subjectsClass2) {
      const enrollId = `${sub.id}_${sid}`;
      await db.collection('enrollment').doc(enrollId).set({
        courseId: sub.id,
        studentId: sid,
        status: 'active',
        progress: 0,
        enrolledAt: new Date().toISOString(),
      });
    }
  }
  await collections.classes().doc(class2.id).update({ studentCount: 2 });
  console.log('  Enrolled Class 2 students.');

  console.log('\n=== SEED COMPLETE AND READY FOR PRODUCTION ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
