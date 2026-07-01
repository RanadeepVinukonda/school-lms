import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getAdminAuth, getAdminFirestore, admin } from '../database/admin';
import { v4 as uuidv4 } from 'uuid';
const auth = getAdminAuth();
const db = getAdminFirestore();

function uid() { return uuidv4().replace(/-/g, '').slice(0, 20); }
function now() { return new Date().toISOString(); }

async function deleteCollection(name: string) {
  const snap = await db.collection(name).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d: any) => batch.delete(d.ref));
  await batch.commit();
  console.log(`  Deleted ${snap.size} docs from ${name}`);
}

async function deleteSubcollections(docRef: FirebaseFirestore.DocumentReference) {
  const cols = await docRef.listCollections();
  for (const col of cols) {
    const snap = await col.get();
    if (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach((d: any) => batch.delete(d.ref));
      await batch.commit();
    }
  }
}

async function cleanExtraCollections() {
  console.log('\nCleaning additional collections...');
  const extra = [
    'courses', 'lessons', 'assignments', 'quizzes', 'exams', 'grades',
    'corrections', 'teacherVideos', 'questionBank', 'questionPapers',
    'testTemplates', 'testSchedule', 'timetable',
    'conversations', 'messages', 'notifications', 'settings',
    'activityLogs', 'auditLogs',
    'quizV2', 'quizAttemptV2', 'assignmentV2', 'assignmentSubmissionV2',
    'examV2', 'examAttemptV2',
    'conceptProgress', 'conceptReleases',
    'questionBank', 'questionPapers',
  ];
  for (const name of extra) {
    await deleteCollection(name);
  }
  console.log(`  Cleaned ${extra.length} extra collections`);
}

async function supplementalSeed() {
  console.log('\n=== SUPPLEMENTAL SEED — Extra Collections ===\n');

  // ── Fetch existing data from seedFull.ts ──
  console.log('Fetching existing data...');
  const usersSnap = await db.collection('users').get();
  const allUsers = usersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() as any }));
  const adminUser = allUsers.find((u: any) => u.role === 'admin');
  const teachers = allUsers.filter((u: any) => u.role === 'teacher');
  const students = allUsers.filter((u: any) => u.role === 'student');
  if (!adminUser || teachers.length === 0 || students.length === 0) {
    console.error('ERROR: Required users not found. Run seedFull.ts first.');
    return;
  }

  const classesSnap = await db.collection('classes').get();
  const classes = classesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() as any }));

  const subjectsSnap = await db.collection('subjects').get();
  const subjects = subjectsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() as any }));

  const enrollmentsSnap = await db.collection('enrollment').get();
  const enrollments = enrollmentsSnap.docs.map((d: any) => d.data() as any);

  const tcsSnap = await db.collection('teacherClassSubject').get();
  const tcsList = tcsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() as any }));

  console.log(`  Found: ${allUsers.length} users, ${classes.length} classes, ${subjects.length} subjects`);
  console.log(`  ${enrollments.length} enrollments, ${tcsList.length} teacher-class-subject assignments`);

  // ════════════════════════════════════════════
  // 1. SETTINGS
  // ════════════════════════════════════════════
  console.log('\nCreating settings...');
  await db.collection('settings').doc('general').set({
    schoolName: 'Genesis School',
    schoolCode: 'GENESIS2025',
    address: '123 Education Lane, Learning City',
    phone: '+1-555-0100',
    email: 'admin@school.edu',
    website: 'https://school.edu',
    logo: '',
    academicYear: '2025',
    semester: 'Annual',
    gradingSystem: { type: 'letter', scale: 10, passingGrade: 'D' },
    notificationPreferences: { email: true, push: true, sms: false, inApp: true },
    securitySettings: { passwordMinLength: 6, maxLoginAttempts: 5, sessionTimeoutMinutes: 60, requireTwoFactor: false },
    features: { aiGrading: true, adaptiveLearning: true, videoLibrary: true, messaging: true },
    updatedAt: now(),
  });
  console.log('  Created settings/general');

  // ════════════════════════════════════════════
  // 2. COURSES (one per subject per class)
  // ════════════════════════════════════════════
  console.log('\nCreating courses...');
  const courseMap: Record<string, string> = {};
  for (const sub of subjects) {
    const cls = classes.find((c: any) => c.id === sub.classId);
    const tcs = tcsList.find((t: any) => t.subjectId === sub.id && t.classId === sub.classId);
    const teacher = teachers.find((t: any) => t.id === tcs?.teacherId);
    if (!cls || !teacher) continue;
    const courseId = uid();
    await db.collection('courses').doc(courseId).set({
      id: courseId,
      title: `${sub.name} - ${cls.name}`,
      description: `Complete ${sub.name} course for ${cls.name} covering all core topics aligned with the ${cls.grade} curriculum.`,
      subjectId: sub.id,
      classId: cls.id,
      teacherId: teacher.id,
      status: 'published',
      enrollmentCount: students.filter((s: any) => s.classId === cls.id).length,
      lessonCount: 2,
      createdAt: now(),
      updatedAt: now(),
    });
    courseMap[`${cls.grade}_${sub.name.toLowerCase()}`] = courseId;
    console.log(`  Created course: ${sub.name} - ${cls.name}`);
  }

  // ════════════════════════════════════════════
  // 3. LESSONS (2 per course)
  // ════════════════════════════════════════════
  console.log('\nCreating lessons...');
  const lessonData: { title: string; desc: string; content: string }[] = [
    { title: 'Introduction & Overview', desc: 'First lesson covering foundational concepts.', content: 'Welcome to the course! In this lesson we will explore the fundamental concepts. Pay close attention to the key terminology introduced here as it will form the basis for all future lessons.' },
    { title: 'Core Concepts & Practice', desc: 'Deep dive into core topics with practice exercises.', content: 'Now that you understand the basics, let us dive deeper. This lesson covers the core concepts in detail with worked examples and practice problems.' },
  ];
  for (const [key, courseId] of Object.entries(courseMap)) {
    for (let i = 0; i < lessonData.length; i++) {
      const lessonId = uid();
      await db.collection('lessons').doc(lessonId).set({
        id: lessonId,
        title: lessonData[i].title,
        description: lessonData[i].desc,
        content: lessonData[i].content,
        courseId,
        contentType: 'text',
        duration: 30,
        order: i + 1,
        isPublished: true,
        completedBy: [],
        createdAt: now(),
        updatedAt: now(),
      });
    }
    console.log(`  Created ${lessonData.length} lessons for course ${key}`);
  }

  // ════════════════════════════════════════════
  // 4. ASSIGNMENTS (V1)
  // ════════════════════════════════════════════
  console.log('\nCreating assignments (V1)...');
  const assignmentTemplates = [
    { title: 'Weekly Practice Problems', desc: 'Practice the concepts covered this week with these problems.' },
    { title: 'Chapter Review Exercise', desc: 'Review the chapter material and complete the following exercises.' },
  ];
  for (const [key, courseId] of Object.entries(courseMap)) {
    for (let i = 0; i < assignmentTemplates.length; i++) {
      const asId = uid();
      const due = new Date();
      due.setDate(due.getDate() + 7 * (i + 1));
      await db.collection('assignments').doc(asId).set({
        id: asId,
        title: `${assignmentTemplates[i].title} - ${key}`,
        description: assignmentTemplates[i].desc,
        courseId,
        dueDate: due.toISOString(),
        points: 100,
        passingGrade: 50,
        maxAttempts: 1,
        submissionCount: 0,
        allowLateSubmission: true,
        latePenaltyPercent: 10,
        isPublished: true,
        createdAt: now(),
        updatedAt: now(),
      });
    }
    console.log(`  Created ${assignmentTemplates.length} assignments for ${key}`);
  }

  // ════════════════════════════════════════════
  // 5. QUIZZES (V1)
  // ════════════════════════════════════════════
  console.log('\nCreating quizzes (V1)...');
  const quizTemplates = [
    { title: 'Quick Check Quiz', desc: 'Test your understanding of recent topics.', questions: [
      { questionText: 'What is 5 + 3?', type: 'multiple_choice', points: 1, options: ['6', '7', '8', '9'], correctAnswer: '8' },
      { questionText: 'The Earth revolves around the Sun.', type: 'true_false', points: 1, options: ['True', 'False'], correctAnswer: 'True' },
    ]},
    { title: 'Mid-Unit Assessment', desc: 'Comprehensive quiz covering the unit material.', questions: [
      { questionText: 'Which planet is known as the Red Planet?', type: 'multiple_choice', points: 2, options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctAnswer: 'Mars' },
      { questionText: 'Describe the water cycle in 2-3 sentences.', type: 'short_answer', points: 3, correctAnswer: 'The water cycle describes how water evaporates, condenses into clouds, and falls as precipitation.' },
    ]},
  ];
  for (const [key, courseId] of Object.entries(courseMap)) {
    for (let i = 0; i < quizTemplates.length; i++) {
      const qId = uid();
      const totalPoints = quizTemplates[i].questions.reduce((sum, q) => sum + q.points, 0);
      await db.collection('quizzes').doc(qId).set({
        id: qId,
        title: `${quizTemplates[i].title} - ${key}`,
        description: quizTemplates[i].desc,
        courseId,
        questions: quizTemplates[i].questions.map((q, qi) => ({ ...q, id: `q_${qId}_${qi}` })),
        totalPoints,
        attemptCount: 0,
        timeLimit: 15,
        passingScore: 50,
        maxAttempts: 2,
        shuffleQuestions: false,
        showResults: true,
        isPublished: true,
        createdAt: now(),
        updatedAt: now(),
      });
    }
    console.log(`  Created ${quizTemplates.length} quizzes for ${key}`);
  }

  // ════════════════════════════════════════════
  // 6. EXAMS (V1)
  // ════════════════════════════════════════════
  console.log('\nCreating exams (V1)...');
  const examTemplates = [
    { title: 'Mid-Term Examination', desc: 'Comprehensive mid-term covering all topics so far.', questions: [
      { questionText: 'Solve: 15 × 12', type: 'multiple_choice', points: 2, options: ['150', '170', '180', '200'], correctAnswer: '180' },
      { questionText: 'Photosynthesis occurs only during the day.', type: 'true_false', points: 1, options: ['True', 'False'], correctAnswer: 'True' },
    ]},
    { title: 'Final Examination', desc: 'End of year comprehensive examination.', questions: [
      { questionText: 'What is the chemical symbol for water?', type: 'multiple_choice', points: 1, options: ['H2O', 'CO2', 'NaCl', 'O2'], correctAnswer: 'H2O' },
      { questionText: 'Explain Newton\'s First Law of Motion.', type: 'short_answer', points: 3, correctAnswer: 'An object at rest stays at rest and an object in motion stays in motion unless acted upon by an external force.' },
    ]},
  ];
  for (const [key, courseId] of Object.entries(courseMap)) {
    for (let i = 0; i < examTemplates.length; i++) {
      const eId = uid();
      const totalPoints = examTemplates[i].questions.reduce((sum, q) => sum + q.points, 0);
      await db.collection('exams').doc(eId).set({
        id: eId,
        title: `${examTemplates[i].title} - ${key}`,
        description: examTemplates[i].desc,
        courseId,
        questions: examTemplates[i].questions.map((q, qi) => ({ ...q, id: `q_${eId}_${qi}` })),
        totalPoints,
        attemptCount: 0,
        timeLimit: 60,
        passingScore: 40,
        maxAttempts: 1,
        shuffleQuestions: true,
        showResults: false,
        isPublished: true,
        scheduledClasses: [],
        gradesReleased: false,
        createdAt: now(),
        updatedAt: now(),
      });
    }
    console.log(`  Created ${examTemplates.length} exams for ${key}`);
  }

  // ════════════════════════════════════════════
  // 7. GRADES (sample grades for students)
  // ════════════════════════════════════════════
  console.log('\nCreating sample grades...');
  const classGradeMap: Record<string, string> = {};
  for (const cls of classes) classGradeMap[cls.id] = cls.grade;
  let gradeCount = 0;
  for (const student of students) {
    const studentGrade = classGradeMap[student.classId] || '';
    const classSubjects = subjects.filter((s: any) => s.classId === student.classId);
    for (const subj of classSubjects) {
      const key = `${studentGrade}_${subj.name?.toLowerCase()}`;
      const courseId = courseMap[key];
      const score = Math.floor(Math.random() * 30) + 65;
      const gId = uid();
      await db.collection('grades').doc(gId).set({
        id: gId,
        studentId: student.id,
        subjectId: subj.id,
        courseId: courseId || '',
        classId: student.classId,
        score,
        totalPoints: 100,
        percentage: score,
        letterGrade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D',
        feedback: 'Good effort! Keep up the consistent work.',
        academicYear: '2025',
        term: 'Term 1',
        gradedBy: teachers[0]?.id,
        createdAt: now(),
        updatedAt: now(),
      });
      gradeCount++;
    }
  }
  console.log(`  Created ${gradeCount} grades`);

  // ════════════════════════════════════════════
  // 8. TEACHER VIDEOS
  // ════════════════════════════════════════════
  console.log('\nCreating teacher videos...');
  const sampleVideos = [
    { youtubeId: 'pzmB0GoEKkA', title: 'Counting Numbers 1-100', channelName: 'Jack Hartmann', duration: '5:22', description: 'Learn to count from 1 to 100 with this fun song.' },
    { youtubeId: 'uRoJ5E-Xx9s', title: 'Addition and Subtraction Facts', channelName: 'Jack Hartmann', duration: '4:15', description: 'Practice addition and subtraction facts.' },
    { youtubeId: 'Gy60BqCnTG4', title: 'Living and Non-Living Things', channelName: 'SciShow Kids', duration: '6:30', description: 'Learn what makes something alive.' },
  ];
  for (const teacher of teachers) {
    for (const v of sampleVideos) {
      const vId = uid();
      await db.collection('teacherVideos').doc(vId).set({
        id: vId,
        teacherId: teacher.id,
        title: v.title,
        youtubeId: v.youtubeId,
        thumbnail: `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`,
        duration: v.duration,
        channelName: v.channelName,
        description: v.description,
        embedUrl: `https://www.youtube.com/embed/${v.youtubeId}`,
        tags: ['educational', 'k12'],
        createdAt: now(),
        updatedAt: now(),
      });
    }
    console.log(`  Created ${sampleVideos.length} videos for teacher ${teacher.displayName}`);
  }

  // ════════════════════════════════════════════
  // 9. NOTIFICATIONS
  // ════════════════════════════════════════════
  console.log('\nCreating notifications...');
  const notificationTypes = [
    { type: 'assignment', title: 'New Assignment Posted', body: 'A new assignment has been posted in your course.' },
    { type: 'grade', title: 'Grade Updated', body: 'Your grade for the recent assignment has been updated.' },
    { type: 'exam', title: 'Upcoming Exam', body: 'You have an exam scheduled soon. Please prepare.' },
  ];
  for (const student of students) {
    for (const n of notificationTypes) {
      const nId = uid();
      await db.collection('notifications').doc(nId).set({
        id: nId,
        userId: student.id,
        type: n.type,
        title: n.title,
        body: `${n.body} (${student.displayName})`,
        priority: 'normal',
        read: false,
        createdAt: now(),
      });
    }
  }
  console.log(`  Created ${notificationTypes.length * students.length} notifications`);

  // ════════════════════════════════════════════
  // 10. CONVERSATIONS & MESSAGES
  // ════════════════════════════════════════════
  console.log('\nCreating conversations and messages...');
  for (let i = 0; i < teachers.length; i++) {
    const teacher = teachers[i];
    const classStudents = students.filter((s: any) => s.classId === classes[i]?.id);
    for (const student of classStudents) {
      const convId = uid();
      await db.collection('conversations').doc(convId).set({
        id: convId,
        participants: [teacher.id, student.id],
        type: 'direct',
        lastMessage: { content: 'Welcome to the class! Let me know if you have any questions.', senderId: teacher.id, createdAt: now() },
        lastMessageAt: now(),
        unreadCount: { [teacher.id]: 0, [student.id]: 1 },
        createdAt: now(),
        updatedAt: now(),
      });
      const msgId = uid();
      await db.collection('messages').doc(msgId).set({
        id: msgId,
        conversationId: convId,
        senderId: teacher.id,
        content: 'Welcome to the class! Let me know if you have any questions.',
        messageType: 'text',
        attachments: [],
        readBy: [teacher.id],
        createdAt: now(),
      });
      const replyId = uid();
      await db.collection('messages').doc(replyId).set({
        id: replyId,
        conversationId: convId,
        senderId: student.id,
        content: `Thank you ${teacher.displayName}! I am excited to learn.`,
        messageType: 'text',
        attachments: [],
        parentMessageId: msgId,
        readBy: [student.id],
        createdAt: new Date(Date.now() + 60000).toISOString(),
      });
    }
  }
  console.log('  Created conversations and messages');

  // ════════════════════════════════════════════
  // 11. ACTIVITY LOGS
  // ════════════════════════════════════════════
  console.log('\nCreating activity logs...');
  const activities = [
    { action: 'user_login', description: 'User logged in' },
    { action: 'page_view', description: 'Viewed dashboard' },
    { action: 'assignment_view', description: 'Viewed assignment details' },
  ];
  for (const user of [adminUser, ...teachers, ...students]) {
    for (const act of activities) {
      const aId = uid();
      await db.collection('activityLogs').doc(aId).set({
        id: aId,
        userId: user.id,
        action: act.action,
        description: `${act.description} - ${user.displayName}`,
        timestamp: now(),
        metadata: {},
      });
    }
  }
  console.log(`  Created ${activities.length * allUsers.length} activity logs`);

  // ════════════════════════════════════════════
  // 12. AUDIT LOGS
  // ════════════════════════════════════════════
  console.log('\nCreating audit logs...');
  const auditActions = [
    { summary: 'System initialized with seed data' },
    { summary: 'Initial user accounts created' },
    { summary: 'Course structure configured' },
  ];
  for (const audit of auditActions) {
    const aId = uid();
    await db.collection('auditLogs').doc(aId).set({
      action: 'system_seed',
      targetId: 'system',
      targetType: 'system',
      targetName: 'Database Seed',
      performedBy: adminUser.id,
      performedByName: adminUser.displayName,
      performedByRole: 'admin',
      summary: audit.summary,
      timestamp: now(),
    });
  }
  console.log(`  Created ${auditActions.length} audit logs`);

  // ════════════════════════════════════════════
  // 13. TIMETABLE
  // ════════════════════════════════════════════
  console.log('\nCreating timetable entries...');
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  let timetableCount = 0;
  for (const cls of classes) {
    const classSubjects = subjects.filter((s: any) => s.classId === cls.id);
    for (let d = 0; d < days.length; d++) {
      for (let p = 0; p < Math.min(classSubjects.length, 4); p++) {
        const sub = classSubjects[p];
        const tcs = tcsList.find((t: any) => t.subjectId === sub.id && t.classId === cls.id);
        const tId = uid();
        await db.collection('timetable').doc(tId).set({
          id: tId,
          classId: cls.id,
          day: days[d],
          period: p + 1,
          subjectId: sub.id,
          teacherId: tcs?.teacherId || teachers[0].id,
          room: `Room ${100 + p * 10 + d}`,
        });
        timetableCount++;
      }
    }
  }
  console.log(`  Created ${timetableCount} timetable entries`);

  // ════════════════════════════════════════════
  // 14. QUESTION BANK
  // ════════════════════════════════════════════
  console.log('\nCreating question bank...');
  const bankQuestions = [
    { text: 'What is the capital of France?', type: 'multiple_choice', difficulty: 'easy', options: ['London', 'Paris', 'Berlin', 'Madrid'], correctAnswer: 'Paris', points: 1 },
    { text: 'Water boils at 100 degrees Celsius.', type: 'true_false', difficulty: 'easy', correctAnswer: 'True', points: 1 },
    { text: 'Name three states of matter.', type: 'short_answer', difficulty: 'medium', correctAnswer: 'Solid, liquid, gas', points: 2 },
  ];
  for (let i = 0; i < bankQuestions.length; i++) {
    const q = bankQuestions[i];
    const qId = uid();
    await db.collection('questionBank').doc(qId).set({
      id: qId,
      ...q,
      tags: ['general', 'reusable'],
      createdBy: adminUser.id,
      createdAt: now(),
      updatedAt: now(),
    });
  }
  console.log(`  Created ${bankQuestions.length} question bank entries`);

  // ════════════════════════════════════════════
  // 15. CONCEPT PROGRESS (sample for students)
  // ════════════════════════════════════════════
  console.log('\nCreating concept progress...');
  const textbooksSnap = await db.collection('textbooks').get();
  let cpCount = 0;
  // Pre-collect all concept IDs to avoid deep nesting
  const allConceptIds: string[] = [];
  for (const tbDoc of textbooksSnap.docs) {
    const chaptersSnap = await tbDoc.ref.collection('chapters').get();
    for (const chDoc of chaptersSnap.docs) {
      const conceptsSnap = await chDoc.ref.collection('concepts').get();
      for (const coDoc of conceptsSnap.docs) {
        allConceptIds.push(coDoc.id);
      }
    }
  }
  for (const student of students) {
    const batch = db.batch();
    let batchCount = 0;
    for (const conceptId of allConceptIds) {
      const cpId = uid();
      batch.set(db.collection('conceptProgress').doc(cpId), {
        userId: student.id,
        conceptId: conceptId,
        quizScores: [Math.floor(Math.random() * 30) + 70],
        quizAttempts: 1,
        timeSpentMinutes: Math.floor(Math.random() * 60) + 15,
        lessonCompleted: Math.random() > 0.3,
        videoCompleted: Math.random() > 0.4,
        practiceCompleted: Math.random() > 0.5,
        questionAccuracy: Math.floor(Math.random() * 20) + 75,
        masteryPercentage: Math.floor(Math.random() * 40) + 50,
        skillLevel: Math.random() > 0.5 ? 'intermediate' : 'beginner',
        lastAccessed: now(),
      });
      batchCount++;
      cpCount++;
    }
    await batch.commit();
  }
  console.log(`  Created ${cpCount} concept progress entries`);

  // ════════════════════════════════════════════
  // 16. CONCEPT RELEASES (teacher releases first concept of each chapter)
  // ════════════════════════════════════════════
  console.log('\nCreating concept releases...');
  let crCount = 0;
  for (const tcs of tcsList) {
    const tbSnap = await db.collection('textbooks')
      .where('subjectId', '==', tcs.subjectId)
      .where('classId', '==', tcs.classId)
      .get();
    for (const tbDoc of tbSnap.docs) {
      const chaptersSnap = await tbDoc.ref.collection('chapters').get();
      for (const chDoc of chaptersSnap.docs) {
        const conceptsSnap = await chDoc.ref.collection('concepts').get();
        for (const coDoc of conceptsSnap.docs) {
          const crId = uid();
          await db.collection('conceptReleases').doc(crId).set({
            id: crId,
            textbookId: tbDoc.id,
            chapterId: chDoc.id,
            conceptId: coDoc.id,
            teacherId: tcs.teacherId,
            questionBankReleased: true,
            assignmentsReleased: true,
            mindMapReleased: true,
            updatedAt: now(),
          });
          crCount++;
        }
      }
    }
  }
  console.log(`  Created ${crCount} concept releases`);

  // ════════════════════════════════════════════
  // 17. TEST TEMPLATES & SCHEDULE
  // ════════════════════════════════════════════
  console.log('\nCreating test templates and schedules...');
  const tcsEntries = tcsList.slice(0, 2);
  for (const tcs of tcsEntries) {
    const templateId = uid();
    await db.collection('testTemplates').doc(templateId).set({
      id: templateId,
      title: `Weekly Test Template - ${subjects.find((s: any) => s.id === tcs.subjectId)?.name || ''}`,
      description: 'Standard weekly test template with mixed question types.',
      classId: tcs.classId,
      subjectId: tcs.subjectId,
      createdBy: tcs.teacherId,
      config: { timeLimitMinutes: 30, passingScore: 40, maxAttempts: 1, shuffleQuestions: true, showResults: true },
      source: 'question_bank',
      selectionConfig: { selectedModels: ['multiple_choice', 'true_false', 'short_answer'], questionCount: 5, difficultyDistribution: { easy: 60, medium: 30, hard: 10 } },
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    });
    const scheduleId = uid();
    const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.collection('testSchedule').doc(scheduleId).set({
      id: scheduleId,
      templateId,
      title: 'Weekly Test',
      description: 'Scheduled weekly test for this class.',
      classId: tcs.classId,
      subjectId: tcs.subjectId,
      createdBy: tcs.teacherId,
      startDate: startDate.toISOString(),
      endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 30,
      status: 'scheduled',
      config: { timeLimitMinutes: 30, passingScore: 40, maxAttempts: 1, shuffleQuestions: true, showResults: true },
      requiresApproval: false,
      totalStudents: students.filter((s: any) => s.classId === tcs.classId).length,
      attemptedCount: 0,
      createdAt: now(),
      updatedAt: now(),
    });
    console.log(`  Created template + schedule for subject ${subjects.find((s: any) => s.id === tcs.subjectId)?.name}`);
  }

  // ════════════════════════════════════════════
  // 18. QUESTION PAPERS
  // ════════════════════════════════════════════
  console.log('\nCreating question papers...');
  for (const tcs of tcsEntries) {
    const paperId = uid();
    await db.collection('questionPapers').doc(paperId).set({
      id: paperId,
      title: `Practice Paper - ${subjects.find((s: any) => s.id === tcs.subjectId)?.name || ''}`,
      description: 'Comprehensive practice question paper.',
      classId: tcs.classId,
      subjectId: tcs.subjectId,
      createdBy: tcs.teacherId,
      sections: [
        { title: 'Section A - Multiple Choice', instructions: 'Choose the best answer.', questions: [
          { questionId: `qp_${paperId}_q1`, points: 1, order: 1, text: 'Sample question?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
          { questionId: `qp_${paperId}_q2`, points: 1, order: 2, text: 'Another question?', options: ['X', 'Y', 'Z', 'W'], correctAnswer: 'Y' },
        ]},
        { title: 'Section B - Short Answer', instructions: 'Answer in 2-3 sentences.', questions: [
          { questionId: `qp_${paperId}_q3`, points: 2, order: 1, text: 'Explain briefly.', correctAnswer: 'A brief explanation.' },
        ]},
      ],
      totalPoints: 4,
      duration: 30,
      status: 'ready',
      createdAt: now(),
      updatedAt: now(),
    });
  }
  console.log(`  Created ${tcsEntries.length} question papers`);

  // ════════════════════════════════════════════
  // 19. CORRECTIONS (sample)
  // ════════════════════════════════════════════
  console.log('\nCreating sample corrections...');
  for (const student of students.slice(0, 2)) {
    const examSnap = await db.collection('exams').limit(1).get();
    if (examSnap.empty) continue;
    const exam = examSnap.docs[0];
    const corrId = uid();
    await db.collection('corrections').doc(corrId).set({
      id: corrId,
      examId: exam.id,
      studentId: student.id,
      teacherId: teachers[0]?.id,
      questionMarks: exam.data()?.questions?.map((q: any) => ({
        questionId: q.id,
        awarded: Math.floor(Math.random() * q.points) + 1,
        maxPoints: q.points,
        comment: 'Good attempt, review the material.',
      })) || [],
      totalMarks: Math.floor(Math.random() * 50) + 40,
      overallFeedback: 'Solid performance overall, keep practicing.',
      status: 'completed',
      correctedAt: now(),
    });
  }
  console.log('  Created sample corrections');

  // ════════════════════════════════════════════
  // 20. QUIZ V2 (adaptive)
  // ════════════════════════════════════════════
  console.log('\nCreating V2 assessments (adaptive)...');
  const conceptChapters = await db.collection('textbooks').limit(1).get();
  if (!conceptChapters.empty) {
    const tbDoc = conceptChapters.docs[0];
    const chSnap = await tbDoc.ref.collection('chapters').limit(1).get();
    if (!chSnap.empty) {
      const chDoc = chSnap.docs[0];
      const coSnap = await chDoc.ref.collection('concepts').limit(1).get();
      if (!coSnap.empty) {
        const coDoc = coSnap.docs[0];
        const cls = classes[0];
        const teacher = teachers[0];
        if (cls && teacher) {
          // QuizV2
          const qv2Id = uid();
          await db.collection('quizV2').doc(qv2Id).set({
            id: qv2Id,
            title: 'Adaptive Quiz - Sample',
            description: 'An adaptive quiz that adjusts to student level.',
            classId: cls.id,
            textbookId: tbDoc.id,
            chapterId: chDoc.id,
            conceptId: coDoc.id,
            teacherId: teacher.id,
            timeLimitMinutes: 15,
            selectedModels: ['mcq', 'true_false'],
            questionCount: 5,
            totalPoints: 5,
            passingScore: 60,
            maxAttempts: 3,
            shuffleQuestions: true,
            showResults: true,
            createdAt: now(),
            updatedAt: now(),
          });
          // AssignmentV2
          const av2Id = uid();
          await db.collection('assignmentV2').doc(av2Id).set({
            id: av2Id,
            title: 'Adaptive Assignment - Sample',
            description: 'Adaptive homework assignment.',
            classId: cls.id,
            textbookId: tbDoc.id,
            chapterId: chDoc.id,
            conceptId: coDoc.id,
            teacherId: teacher.id,
            timeLimitMinutes: 30,
            questions: [
              { id: `q_${av2Id}_0`, text: 'Sample MCQ?', type: 'mcq', difficulty: 'easy', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', points: 1 },
              { id: `q_${av2Id}_1`, text: 'True or false?', type: 'true_false', difficulty: 'easy', options: ['True', 'False'], correctAnswer: 'True', points: 1 },
            ],
            totalPoints: 2,
            passingScore: 50,
            maxAttempts: 1,
            shuffleQuestions: true,
            showResults: false,
            createdAt: now(),
            updatedAt: now(),
          });
          // ExamV2
          const ev2Id = uid();
          await db.collection('examV2').doc(ev2Id).set({
            id: ev2Id,
            title: 'Adaptive Exam - Sample',
            description: 'Adaptive exam that tests all levels.',
            classId: cls.id,
            textbookId: tbDoc.id,
            chapterId: chDoc.id,
            teacherId: teacher.id,
            timeLimitMinutes: 45,
            selectedModels: ['mcq', 'true_false', 'short_answer'],
            questionCountPerConcept: 3,
            totalPoints: 9,
            passingScore: 40,
            maxAttempts: 1,
            shuffleQuestions: true,
            showResults: false,
            createdAt: now(),
            updatedAt: now(),
          });
          console.log('  Created V2 assessments (quiz, assignment, exam)');
        }
      }
    }
  }

  // ════════════════════════════════════════════
  // 21. QUIZ/ASSIGNMENT/EXAM SUBMISSIONS (V2)
  // ════════════════════════════════════════════
  console.log('\nCreating V2 attempts/submissions...');
  const qv2Snap = await db.collection('quizV2').limit(1).get();
  if (!qv2Snap.empty) {
    const qv2 = qv2Snap.docs[0];
    for (const student of students.slice(0, 2)) {
      const qaId = uid();
      await db.collection('quizAttemptV2').doc(qaId).set({
        id: qaId,
        quizId: qv2.id,
        studentId: student.id,
        startedAt: now(),
        submittedAt: now(),
        answers: [
          { questionId: 'q1', answer: 'A', isCorrect: true, pointsEarned: 1, timeSpent: 30 },
          { questionId: 'q2', answer: 'True', isCorrect: true, pointsEarned: 1, timeSpent: 20 },
        ],
        score: 2,
        totalPoints: 2,
        percentage: 100,
        passed: true,
        timeSpent: 120,
        status: 'completed',
        selectedModels: ['mcq', 'true_false'],
        level: 'beginner',
      });
    }
    console.log(`  Created ${students.slice(0, 2).length} quiz attempts (V2)`);
  }

  const av2Snap = await db.collection('assignmentV2').limit(1).get();
  if (!av2Snap.empty) {
    const av2 = av2Snap.docs[0];
    for (const student of students.slice(0, 2)) {
      const asId = uid();
      await db.collection('assignmentSubmissionV2').doc(asId).set({
        id: asId,
        assignmentId: av2.id,
        studentId: student.id,
        startedAt: now(),
        submittedAt: now(),
        answers: [
          { questionId: `q_${av2.id}_0`, answer: 'A', isCorrect: true, pointsEarned: 1, timeSpent: 45 },
          { questionId: `q_${av2.id}_1`, answer: 'True', isCorrect: true, pointsEarned: 1, timeSpent: 15 },
        ],
        score: 2,
        totalPoints: 2,
        percentage: 100,
        passed: true,
        timeSpent: 180,
        status: 'completed',
        level: 'intermediate',
      });
    }
    console.log(`  Created ${students.slice(0, 2).length} assignment submissions (V2)`);
  }

  // ════════════════════════════════════════════
  // COMPLETE
  // ════════════════════════════════════════════
  console.log('\n=== SUPPLEMENTAL SEED COMPLETE ===');
  console.log(`  Classes: ${classes.length}`);
  console.log(`  Subjects: ${subjects.length}`);
  console.log(`  Courses: ${Object.keys(courseMap).length}`);
  console.log(`  Lessons: ${Object.keys(courseMap).length * lessonData.length}`);
  console.log(`  Assignments (V1): ${Object.keys(courseMap).length * assignmentTemplates.length}`);
  console.log(`  Quizzes (V1): ${Object.keys(courseMap).length * quizTemplates.length}`);
  console.log(`  Exams (V1): ${Object.keys(courseMap).length * examTemplates.length}`);
  console.log(`  Grades: ${gradeCount}`);
  console.log(`  Teacher Videos: ${teachers.length * sampleVideos.length}`);
  console.log(`  Notifications: ${notificationTypes.length * students.length}`);
  console.log(`  Concept Progress: ${cpCount}`);
  console.log(`  Concept Releases: ${crCount}`);
  console.log(`  Settings: 1`);
  console.log(`  Conversations + Messages: created`);
  console.log(`  Activity Logs: ${activities.length * allUsers.length}`);
  console.log(`  Audit Logs: ${auditActions.length}`);
  console.log(`  Timetable: ${timetableCount}`);
  console.log(`  Question Bank: ${bankQuestions.length}`);
  console.log(`  Question Papers: ${tcsEntries.length}`);
  console.log(`  Test Templates: ${tcsEntries.length}`);
  console.log(`  Test Schedules: ${tcsEntries.length}`);
  console.log(`  Corrections: created`);
  console.log(`  V2 Assessments: quiz + assignment + exam`);
  console.log(`  V2 Quiz Attempts: created`);
  console.log(`  V2 Assignment Submissions: created`);

  process.exit(0);
}

// First clean extra collections, then seed
cleanExtraCollections()
  .then(() => supplementalSeed())
  .catch((err) => {
    console.error('Supplemental seed failed:', err);
    process.exit(1);
  });
