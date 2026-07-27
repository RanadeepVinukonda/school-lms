#!/usr/bin/env npx ts-node
/**
 * Comprehensive seed script — fills every table for full feature testing.
 * Usage: npx ts-node scripts/seed.ts
 * 
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * Deletes ALL existing data first, then rebuilds from scratch.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });

// ── Helpers ──
let seq = 0;
function uid(prefix: string): string {
  seq++;
  // deterministic UUID-like: prefix + zero-padded seq + random-ish suffix
  const hex = seq.toString(16).padStart(8, '0');
  return `${prefix}${hex}-0000-4000-8000-000000000001`;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function today(): string { return new Date().toISOString().split('T')[0]; }
function pastDate(daysAgo: number): string {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}
function futureDate(daysAhead: number): string {
  const d = new Date(); d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

// ── Constants ──
const SCHOOL_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_ID = '10000000-0000-4000-8000-000000000001';
const ACADEMIC_YEAR = '2025-2026';

const SUBJECTS = [
  { name: 'Mathematics', code: 'MATH', icon: '📐', color: '#6366f1', category: 'core' },
  { name: 'Science', code: 'SCI', icon: '🔬', color: '#10b981', category: 'core' },
  { name: 'English', code: 'ENG', icon: '📖', color: '#f59e0b', category: 'core' },
  { name: 'Hindi', code: 'HIN', icon: '🇮🇳', color: '#ef4444', category: 'core' },
  { name: 'Social Studies', code: 'SST', icon: '🌍', color: '#8b5cf6', category: 'core' },
  { name: 'Computer Science', code: 'CS', icon: '💻', color: '#06b6d4', category: 'elective' },
  { name: 'Physical Education', code: 'PE', icon: '⚽', color: '#f97316', category: 'elective' },
  { name: 'Art', code: 'ART', icon: '🎨', color: '#ec4899', category: 'elective' },
  { name: 'Music', code: 'MUS', icon: '🎵', color: '#14b8a6', category: 'elective' },
  { name: 'General Knowledge', code: 'GK', icon: '🧠', color: '#a855f7', category: 'core' },
];

const GRADES = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const SECTIONS = ['A'];

const TEACHER_FIRST = ['Rajesh','Priya','Amit','Sneha','Vikram','Deepa','Sanjay','Meena','Arjun','Kavita'];
const TEACHER_LAST = ['Sharma','Verma','Patel','Reddy','Gupta','Nair','Singh','Das','Kumar','Iyer'];
const TEACHER_EMAIL = (i: number) => `teacher${i+1}@school.com`;

const STUDENT_FIRST_M = ['Aarav','Vivaan','Aditya','Arjun','Sai','Rohan','Vihaan','Krishna','Ishaan','Shaurya',
  'Reyansh','Atharv','Advik','Pranav','Advaith','Abhimanyu','Hrithik','Kabir','Dhruv','Vedant'];
const STUDENT_FIRST_F = ['Ananya','Diya','Myra','Sara','Aanya','Aadhya','Aarohi','Navya','Anvi','Pihu',
  'Riya','Ishita','Prisha','Kavya','Nisha','Meera','Trisha','Simran','Pooja','Neha'];
const STUDENT_LAST = ['Kumar','Singh','Patel','Sharma','Gupta','Reddy','Nair','Das','Joshi','Mishra','Bose','Rao','Verma','Mehta','Choudhary'];

// ── Teacher & Student ID generators ──
function teacherId(i: number): string { return uid(`t${i.toString().padStart(2, '0')}`); }
function studentId(classIdx: number, studentIdx: number): string {
  return uid(`s${(classIdx+1).toString().padStart(2,'0')}${(studentIdx+1).toString().padStart(2,'0')}`);
}
function subjectId(i: number): string { return uid(`sub${i.toString().padStart(2,'0')}`); }
function classId(i: number): string { return uid(`cls${i.toString().padStart(2,'0')}`); }
function textbookId(i: number): string { return uid(`txt${i.toString().padStart(2,'0')}`); }
function chapterId(textbookIdx: number, chapterIdx: number): string {
  return uid(`ch${(textbookIdx+1).toString().padStart(2,'0')}${(chapterIdx+1).toString().padStart(2,'0')}`);
}
function conceptId(textbookIdx: number, chapterIdx: number, conceptIdx: number): string {
  return uid(`cn${(textbookIdx+1).toString().padStart(2,'0')}${(chapterIdx+1).toString().padStart(2,'0')}${(conceptIdx+1).toString().padStart(2,'0')}`);
}

// ── Data arrays ──
const teacherIds: string[] = [];
const classIds: string[] = [];
const subjectIds: string[] = [];
const allStudentIds: string[][] = []; // allStudentIds[classIdx][studentIdx]
const textbookIds: string[][] = []; // textbookIds[classIdx][subjectIdx]
const chapterIds: string[][] = []; // flat, indexed by textbookFlatIdx
const conceptIds: string[][] = [];

// ── Chapter/Concept content per subject ──
const SUBJECT_CHAPTERS: Record<string, string[][]> = {
  MATH: [
    ['Number Systems','Polynomials','Coordinate Geometry','Linear Equations','Euclid\'s Geometry'],
    ['Real Numbers','Polynomials','Pair of Linear Equations','Quadratic Equations','Arithmetic Progressions'],
    ['Real Numbers','Polynomials','Coordinate Geometry','Triangles','Introduction to Trigonometry'],
    ['Real Numbers','Polynomials','Pair of Linear Equations','Quadratic Equations','Arithmetic Progressions','Triangles'],
    ['Number Systems','Polynomials','Coordinate Geometry','Linear Equations in Two Variables','Introduction to Euclid\'s Geometry'],
    ['Number Systems','Polynomials','Coordinate Geometry','Linear Equations','Triangles'],
    ['Integers','Fractions','Decimals','Data Handling','Mensuration'],
    ['Integers','Fractions','Decimals','Data Handling','Mensuration','Algebra'],
    ['Knowing Our Numbers','Whole Numbers','Playing with Numbers','Basic Geometrical Ideas','Understanding Elementary Shapes'],
    ['Shapes','Numbers','Patterns','Measures','Money'],
    ['Pre-Math','Shapes and Space','Numbers 1-10','Patterns','Measures'],
    ['Numbers','Shapes','Patterns','Measures','Fun with Numbers'],
  ],
  SCI: [
    ['Food: Where does it come from?','Components of Food','Fibre to Fabric','Sorting Materials','Separation of Substances'],
    ['Food','Materials','The World of the Living','Moving Things People and Ideas','How Things Work'],
    ['Food','Materials','The World of the Living','Moving Things People and Ideas','How Things Work','Natural Phenomena'],
    ['Food','Materials','The World of the Living','Natural Phenomena','Effects of Current'],
    ['Food','Materials','The World of the Living','Natural Phenomena','Effects of Current','Natural Resources'],
    ['Food','Materials','The World of the Living','Natural Phenomena','Effects of Current','Natural Resources'],
    ['Components of Food','Fibre to Fabric','Sorting Materials','Separation of Substances'],
    ['Crop Production','Microorganisms','Synthetic Fibres','Materials'],
    ['Matter','Atoms and Molecules','Structure of the Atom','Tissues','Diversity in Living Organisms'],
    ['Chemical Reactions','Acids Bases Salts','Metals','Life Processes','Control and Coordination'],
    ['States of Matter','Atoms and Molecules','Chemical Reactions','Acids Bases Salts','Metals and Non-metals'],
    ['Solid State','Solutions','Electrochemistry','Chemical Kinetics','Surface Chemistry'],
  ],
  ENG: [
    ['A Happy Child','After a Bath','The Bubble','Out and About','Noisy Birds'],
    ['Who Did Patrick\'s Homework?','How the Dog Found Himself','Taro\'s Reward','An Indian-American Woman','Beauty'],
    ['Who Did Patrick\'s Homework?','How the Dog Found Himself','Taro\'s Reward','Beauty','The Banyan Tree'],
    ['The Best Seller','The Story of Cricket','The Little Girl','The House on the Beach','Glimpses of the Past'],
    ['How the Camel Got Its Hump','Children at Work','The Invisible Man','The Bill Collecting','The Ashes That Made Trees Bloom'],
    ['The Happy Prince','How the Camel Got Its Hump','Children at Work','The Invisible Man','The Bill Collecting'],
    ['Who Did Patrick\'s Homework?','How the Dog Found Himself','Taro\'s Reward','Beauty','The Banyan Tree'],
    ['The Treasure Within','The Accidental Tourist','The Open Window','The Best Seller','Glimpses of the Past'],
    ['The Fun They Had','The Sound of Music','The Little Girl','A Dog Named Duke','The Legend of Lake Titicaca'],
    ['The Portrait of a Lady','We\'re Not Afraid to Die','Discovering Tut','The Laburnum Top','The Voice of the Rain'],
    ['The Last Lesson','Lost Spaces','Deep Water','The Rattrap','Indigo'],
    ['The Third Level','The Tiger King','Journey to the End of the Earth','Enemies','On the Face of It'],
  ],
};

// ══════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════
async function main() {
  console.log('🗑️  Deleting all existing data...');
  await deleteAll();
  console.log('✅ Data cleared.\n');

  console.log('🏫 Creating school...');
  await createSchool();
  console.log('✅ School created.\n');

  console.log('👤 Creating admin...');
  await createAdmin();
  console.log('✅ Admin created.\n');

  console.log('👩‍🏫 Creating 10 teachers...');
  await createTeachers();
  console.log('✅ Teachers created.\n');

  console.log('📚 Creating subjects...');
  await createSubjects();
  console.log('✅ Subjects created.\n');

  console.log('🏫 Creating 12 classes...');
  await createClasses();
  console.log('✅ Classes created.\n');

  console.log('👧 Creating 60 students (5 per class)...');
  await createStudents();
  console.log('✅ Students created.\n');

  console.log('👩‍🏫📊 Creating teacher-class-subject mappings...');
  await createTeacherMappings();
  console.log('✅ Mappings created.\n');

  console.log('📘 Creating textbooks with chapters and concepts...');
  await createTextbooks();
  console.log('✅ Textbooks created.\n');

  console.log('❓ Populating question banks...');
  await createQuestionBanks();
  console.log('✅ Question banks created.\n');

  console.log('📝 Creating quizzes...');
  await createQuizzes();
  console.log('✅ Quizzes created.\n');

  console.log('📋 Creating assignments...');
  await createAssignments();
  console.log('✅ Assignments created.\n');

  console.log('📊 Creating grades...');
  await createGrades();
  console.log('✅ Grades created.\n');

  console.log('📅 Creating attendance records...');
  await createAttendance();
  console.log('✅ Attendance created.\n');

  console.log('🕐 Creating timetable...');
  await createTimetable();
  console.log('✅ Timetable created.\n');

  console.log('💰 Creating fee structures and payments...');
  await createFees();
  console.log('✅ Fees created.\n');

  console.log('🚌 Creating transport...');
  await createTransport();
  console.log('✅ Transport created.\n');

  console.log('📦 Creating inventory...');
  await createInventory();
  console.log('✅ Inventory created.\n');

  console.log('👩‍💼 Creating staff records...');
  await createStaff();
  console.log('✅ Staff created.\n');

  console.log('📣 Creating notices...');
  await createNotices();
  console.log('✅ Notices created.\n');

  console.log('🔔 Creating notifications...');
  await createNotifications();
  console.log('✅ Notifications created.\n');

  console.log('📅 Creating curriculum plans...');
  await createCurriculumPlans();
  console.log('✅ Curriculum plans created.\n');

  console.log('🏆 Creating gamification data...');
  await createGamification();
  console.log('✅ Gamification created.\n');

  console.log('🧠 Creating adaptive learning data...');
  await createAdaptiveLearning();
  console.log('✅ Adaptive learning created.\n');

  console.log('✅═══════════════════════════════════════════════════✅');
  console.log('   SEED COMPLETE');
  console.log('✅═══════════════════════════════════════════════════✅');
  console.log(`   School: ${SCHOOL_ID}`);
  console.log(`   Admin: admin@school.com / admin123`);
  console.log(`   Teachers: 10 (teacher1-10@school.com)`);
  console.log(`   Students: 60 (student0101-1205@school.com)`);
  console.log(`   Classes: 12 (Grade 1-12, Section A)`);
  console.log(`   Subjects: ${SUBJECTS.length}`);
  console.log(`   Textbooks: ${GRADES.length * 3}`);
  console.log('✅═══════════════════════════════════════════════════✅');
}

// ══════════════════════════════════════════════════════════
// DELETE ALL
// ══════════════════════════════════════════════════════════
async function deleteAll() {
  // Order matters for FK constraints
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
  for (const t of tables) {
    const { error } = await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error && !error.message.includes('does not exist')) {
      // silently skip tables that don't exist
    }
  }
}

// ══════════════════════════════════════════════════════════
// SCHOOL
// ══════════════════════════════════════════════════════════
async function createSchool() {
  await db.from('schools').insert({
    id: SCHOOL_ID,
    name: 'Springfield International School',
    subdomain: 'springfield',
    primary_color: '#6366f1',
    plan: 'enterprise',
  });
  await db.from('subscriptions').insert({
    school_id: SCHOOL_ID,
    plan: 'enterprise',
    status: 'active',
    student_limit: 500,
    teacher_limit: 50,
    features: JSON.stringify({ ai_tutor: true, gamification: true, virtual_labs: true }),
    expires_at: futureDate(365),
  });
}

// ══════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════
async function createAdmin() {
  await db.from('users').insert({
    id: ADMIN_ID,
    email: 'admin@school.com',
    display_name: 'School Admin',
    role: 'admin',
    phone_number: '+91-9000000001',
    is_active: true,
    school_id: SCHOOL_ID,
    class_ids: [],
    children_ids: [],
    data: JSON.stringify({ designation: 'Principal' }),
  });
}

// ══════════════════════════════════════════════════════════
// TEACHERS
// ══════════════════════════════════════════════════════════
async function createTeachers() {
  const rows = [];
  for (let i = 0; i < 10; i++) {
    const id = teacherId(i);
    teacherIds.push(id);
    rows.push({
      id,
      email: TEACHER_EMAIL(i),
      display_name: `${TEACHER_FIRST[i]} ${TEACHER_LAST[i]}`,
      role: 'teacher',
      phone_number: `+91-9${randInt(100000000, 999999999)}`,
      is_active: true,
      school_id: SCHOOL_ID,
      class_ids: [],
      children_ids: [],
      data: JSON.stringify({
        department: pick(['Science','Mathematics','Languages','Humanities','Arts']),
        qualification: pick(['M.Sc','M.A','M.Ed','B.Ed','Ph.D']),
        experience: randInt(1, 20),
      }),
    });
  }
  await db.from('users').insert(rows);
}

// ══════════════════════════════════════════════════════════
// SUBJECTS
// ══════════════════════════════════════════════════════════
async function createSubjects() {
  const rows = [];
  for (let i = 0; i < SUBJECTS.length; i++) {
    const id = subjectId(i);
    subjectIds.push(id);
    const s = SUBJECTS[i];
    rows.push({
      id,
      name: s.name,
      code: s.code,
      description: `${s.name} for all grades`,
      type: s.category === 'core' ? 'core' : 'elective',
      creditHours: s.category === 'core' ? 5 : 2,
      icon: s.icon,
      color: s.color,
      isActive: true,
      academic_year: ACADEMIC_YEAR,
      category: s.category,
      school_id: SCHOOL_ID,
    });
  }
  await db.from('subjects').insert(rows);
}

// ══════════════════════════════════════════════════════════
// CLASSES
// ══════════════════════════════════════════════════════════
async function createClasses() {
  const rows = [];
  for (let i = 0; i < 12; i++) {
    const id = classId(i);
    classIds.push(id);
    rows.push({
      id,
      name: `Grade ${GRADES[i]} - A`,
      code: `G${GRADES[i].padStart(2,'0')}A`,
      description: `Class ${GRADES[i]} Section A`,
      grade: GRADES[i],
      section: 'A',
      academicYear: ACADEMIC_YEAR,
      academic_year: ACADEMIC_YEAR,
      roomNumber: `Room ${100 + i}`,
      teacherIds: [],
      subjectIds: [],
      studentCount: 0,
      teacherCount: 0,
      maxStudents: 40,
      status: 'active',
      isActive: true,
      school_id: SCHOOL_ID,
      student_count: 0,
    });
  }
  await db.from('classes').insert(rows);
}

// ══════════════════════════════════════════════════════════
// STUDENTS
// ══════════════════════════════════════════════════════════
async function createStudents() {
  const rows = [];
  for (let ci = 0; ci < 12; ci++) {
    allStudentIds[ci] = [];
    for (let si = 0; si < 5; si++) {
      const id = studentId(ci, si);
      allStudentIds[ci].push(id);
      const gender = (ci + si) % 2 === 0 ? 'male' : 'female';
      const firstName = gender === 'male'
        ? STUDENT_FIRST_M[(ci * 5 + si) % STUDENT_FIRST_M.length]
        : STUDENT_FIRST_F[(ci * 5 + si) % STUDENT_FIRST_F.length];
      const lastName = STUDENT_LAST[(ci * 3 + si) % STUDENT_LAST.length];

      rows.push({
        id,
        email: `student${(ci+1).toString().padStart(2,'0')}${(si+1).toString().padStart(2,'0')}@school.com`,
        display_name: `${firstName} ${lastName}`,
        role: 'student',
        phone_number: `+91-9${randInt(100000000, 999999999)}`,
        is_active: true,
        school_id: SCHOOL_ID,
        class_id: classIds[ci],
        class_ids: [classIds[ci]],
        student_id: `S${GRADES[ci]}${(si+1).toString().padStart(2,'0')}`,
        roll_no: si + 1,
        academic_year: ACADEMIC_YEAR,
        children_ids: [],
        gender,
        data: JSON.stringify({
          admission_date: pastDate(randInt(30, 365)),
          blood_group: pick(['A+','B+','O+','AB+','A-','B-']),
          parent_phone: `+91-9${randInt(700000000, 999999999)}`,
        }),
      });
    }
  }
  // Batch insert (Supabase has row limit per insert)
  const BATCH = 20;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.from('users').insert(rows.slice(i, i + BATCH));
  }

  // Update class student counts
  for (let ci = 0; ci < 12; ci++) {
    await db.from('classes').update({ student_count: 5, studentCount: 5 }).eq('id', classIds[ci]);
  }
}

// ══════════════════════════════════════════════════════════
// TEACHER-CLASS-SUBJECT MAPPINGS
// ══════════════════════════════════════════════════════════
async function createTeacherMappings() {
  // Assign teachers to classes: each teacher gets ~12 classes (all grades for their subjects)
  // Teacher 0-1: Math, 2-3: Science, 4-5: English, 6: Hindi, 7: SST, 8: CS, 9: PE/Art
  // Update teacher class_ids
  for (let ti = 0; ti < 10; ti++) {
    const assignedClasses = classIds; // all teachers see all classes for simplicity
    await db.from('users').update({
      class_ids: assignedClasses,
    }).eq('id', teacherIds[ti]);
  }

  // Update class teacherIds and subjectIds
  for (let ci = 0; ci < 12; ci++) {
    await db.from('classes').update({
      teacherIds: teacherIds.slice(0, 6),
      subjectIds: subjectIds.slice(0, 6),
      teacherCount: 6,
    }).eq('id', classIds[ci]);
  }
}

// ══════════════════════════════════════════════════════════
// TEXTBOOKS + CHAPTERS + CONCEPTS
// ══════════════════════════════════════════════════════════
async function createTextbooks() {
  const keySubjects = [0, 1, 2]; // Math, Science, English
  let txtIdx = 0;

  for (let gi = 0; gi < 12; gi++) {
    textbookIds[gi] = [];
    for (const si of keySubjects) {
      const subName = SUBJECTS[si].name;
      const grade = GRADES[gi];
      const chapters = SUBJECT_CHAPTERS[subName]?.[gi] || ['Chapter 1','Chapter 2','Chapter 3','Chapter 4','Chapter 5'];
      const tid = textbookId(txtIdx);
      textbookIds[gi].push(tid);

      // Textbook
      await db.from('textbooks').insert({
        id: tid,
        title: `${subName} - Class ${grade}`,
        subject_id: subjectIds[si],
        class_id: classIds[gi],
        teacher_id: teacherIds[si === 0 ? 0 : si === 1 ? 2 : 4],
        description: `Comprehensive ${subName} textbook for Class ${grade}`,
        status: 'ready',
        chapter_count: chapters.length,
        total_concepts: chapters.length * 3,
        completed_concepts: 0,
        academic_year: ACADEMIC_YEAR,
        school_id: SCHOOL_ID,
      });

      // Chapters + Concepts
      let flatIdx = chapterIds.length;
      for (let chi = 0; chi < chapters.length; chi++) {
        const chId = chapterId(txtIdx, chi);
        chapterIds.push(chId);
        conceptIds[flatIdx] = [];

        await db.from('chapters').insert({
          id: chId,
          textbook_id: tid,
          title: chapters[chi],
          order: chi + 1,
          summary: `Chapter ${chi+1}: ${chapters[chi]} — covers key concepts and practice problems.`,
          school_id: SCHOOL_ID,
        });

        // 3 concepts per chapter
        const conceptNames = [
          `${chapters[chi]} - Introduction`,
          `${chapters[chi]} - Core Concepts`,
          `${chapters[chi]} - Practice & Application`,
        ];
        for (let cnIdx = 0; cnIdx < 3; cnIdx++) {
          const cnId = conceptId(txtIdx, chi, cnIdx);
          conceptIds[flatIdx].push(cnId);

          await db.from('concepts').insert({
            id: cnId,
            chapter_id: chId,
            textbook_id: tid,
            title: conceptNames[cnIdx],
            order: cnIdx + 1,
            notes: `${conceptNames[cnIdx]}. Detailed notes with examples and practice problems for Class ${grade} ${subName}.`,
            school_id: SCHOOL_ID,
          });

          // Concept notes (enriched content)
          await db.from('concept_notes').insert({
            concept_id: cnId,
            textbook_id: tid,
            chapter_id: chId,
            summary: `Summary of ${conceptNames[cnIdx]}`,
            notes: `Detailed notes for ${conceptNames[cnIdx]}. This section covers the fundamental principles, key formulas, and worked examples.`,
            key_points: `Key points: 1. Definition 2. Formula 3. Application`,
            formulas: cnIdx === 0 ? 'Basic formula' : cnIdx === 1 ? 'Core equations and relationships' : 'Application formulas',
            examples: `Example 1: Basic application\nExample 2: Intermediate problem\nExample 3: Advanced challenge`,
            learning_objectives: `1. Understand the concept\n2. Apply formulas correctly\n3. Solve real-world problems`,
            school_id: SCHOOL_ID,
          });
        }
        flatIdx++;
      }
      txtIdx++;
    }
  }
}

// ══════════════════════════════════════════════════════════
// QUESTION BANKS (concept_questions)
// ══════════════════════════════════════════════════════════
async function createQuestionBanks() {
  const rows = [];
  let qCount = 0;
  const flatChapterCount = chapterIds.length;

  for (let chi = 0; chi < flatChapterCount && chi < 36; chi++) { // first 36 textbooks worth
    const chId = chapterIds[chi];
    const txtId = textbookIds[Math.floor(chi / 3)]?.[chi % 3] || textbookIds[0][0];
    const concepts = conceptIds[chi] || [];

    for (let q = 0; q < 5; q++) { // 5 questions per chapter
      const type = pick(['mcq', 'mcq', 'mcq', 'true_false', 'short_answer']);
      const difficulty = pick(['easy', 'easy', 'medium', 'medium', 'hard']);
      const conceptIdVal = concepts[q % concepts.length] || concepts[0];

      const options = type === 'mcq'
        ? ['Option A: Correct answer', 'Option B: Wrong answer 1', 'Option C: Wrong answer 2', 'Option D: Wrong answer 3']
        : type === 'true_false'
        ? ['True', 'False']
        : undefined;

      rows.push({
        id: uid(`qb${qCount.toString().padStart(4,'0')}`),
        concept_id: conceptIdVal,
        textbook_id: txtId,
        chapter_id: chId,
        question: `Question ${q+1} for chapter ${Math.floor(chi/3)+1}: What is the key concept here?`,
        type,
        difficulty,
        options: options || null,
        answer: type === 'mcq' ? 'Option A: Correct answer' : type === 'true_false' ? 'True' : 'Sample answer text',
        explanation: `Explanation: The correct answer demonstrates understanding of the core concept.`,
        school_id: SCHOOL_ID,
      });
      qCount++;
    }
  }

  // Batch insert
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from('concept_questions').insert(rows.slice(i, i + BATCH));
    if (error) console.warn('  question batch warning:', error.message?.substring(0, 80));
  }
  console.log(`  → ${qCount} questions inserted`);
}

// ══════════════════════════════════════════════════════════
// QUIZZES
// ══════════════════════════════════════════════════════════
async function createQuizzes() {
  const rows = [];
  let qIdx = 0;
  for (let gi = 0; gi < 12; gi++) {
    for (const si of [0, 1, 2]) { // Math, Science, English
      const questions = [];
      for (let q = 0; q < 10; q++) {
        questions.push({
          id: `qq${qIdx++}`,
          question: `Quiz question ${q+1} for Grade ${GRADES[gi]} ${SUBJECTS[si].name}`,
          type: 'mcq',
          options: ['A', 'B', 'C', 'D'],
          answer: pick(['A','B','C','D']),
          difficulty: pick(['easy','medium','hard']),
        });
      }
      rows.push({
        id: uid(`qz${gi.toString().padStart(2,'0')}${si}`),
        title: `${SUBJECTS[si].name} Quiz - Grade ${GRADES[gi]}`,
        description: `Mid-chapter quiz for Grade ${GRADES[gi]} ${SUBJECTS[si].name}`,
        subjectId: subjectIds[si],
        subjectName: SUBJECTS[si].name,
        timeLimit: 30,
        questions: JSON.stringify(questions),
        questionCount: 10,
        status: 'active',
        school_id: SCHOOL_ID,
      });
    }
  }
  const BATCH = 10;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.from('quizzes').insert(rows.slice(i, i + BATCH));
  }
  console.log(`  → ${rows.length} quizzes inserted`);
}

// ══════════════════════════════════════════════════════════
// ASSIGNMENTS
// ══════════════════════════════════════════════════════════
async function createAssignments() {
  const rows = [];
  for (let gi = 0; gi < 12; gi++) {
    for (const si of [0, 1, 2]) {
      for (let a = 0; a < 3; a++) { // 3 assignments per subject per grade
        rows.push({
          id: uid(`as${gi.toString().padStart(2,'0')}${si}${a}`),
          title: `${SUBJECTS[si].name} Assignment ${a+1} - Grade ${GRADES[gi]}`,
          description: `Complete exercises from chapter ${a+1}. Show all work.`,
          subjectId: subjectIds[si],
          subjectName: SUBJECTS[si].name,
          courseId: null,
          dueDate: futureDate(7 + a * 7),
          points: 100,
          maxAttempts: 3,
          allowLateSubmission: true,
          latePenaltyPercent: 10,
          passingGrade: 40,
          status: a === 0 ? 'active' : 'draft',
          submissionCount: 0,
          isPublished: a === 0,
          academicYear: ACADEMIC_YEAR,
          academic_year: ACADEMIC_YEAR,
          school_id: SCHOOL_ID,
        });
      }
    }
  }
  const BATCH = 20;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.from('assignments').insert(rows.slice(i, i + BATCH));
  }
  console.log(`  → ${rows.length} assignments inserted`);
}

// ══════════════════════════════════════════════════════════
// GRADES
// ══════════════════════════════════════════════════════════
async function createGrades() {
  const rows = [];
  for (let gi = 0; gi < 12; gi++) {
    for (let si = 0; si < 5; si++) { // 5 students per class
      for (const subIdx of [0, 1, 2]) { // Math, Science, English
        const score = randInt(40, 100);
        const maxScore = 100;
        const pct = (score / maxScore) * 100;
        const letterGrade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'D';

        rows.push({
          id: uid(`gr${gi.toString().padStart(2,'0')}${si}${subIdx}`),
          studentId: allStudentIds[gi][si],
          courseId: null,
          assignmentId: null,
          score,
          maxScore,
          letterGrade,
          comments: `${letterGrade} — ${pick(['Excellent work','Good effort','Needs improvement','Well done','Keep trying'])}`,
          date: pastDate(randInt(1, 60)),
          semester: pick(['1', '2']),
          academicYear: ACADEMIC_YEAR,
          academic_year: ACADEMIC_YEAR,
          created_at: new Date().toISOString(),
        });
      }
    }
  }
  const BATCH = 30;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.from('grades').insert(rows.slice(i, i + BATCH));
  }
  console.log(`  → ${rows.length} grades inserted`);
}

// ══════════════════════════════════════════════════════════
// ATTENDANCE (last 30 days)
// ══════════════════════════════════════════════════════════
async function createAttendance() {
  const rows = [];
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = pastDate(dayOffset);
    const d = new Date(date);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends

    for (let gi = 0; gi < 12; gi++) {
      for (let si = 0; si < 5; si++) {
        const status = Math.random() < 0.85 ? 'present' : Math.random() < 0.5 ? 'absent' : 'late';
        rows.push({
          student_id: allStudentIds[gi][si],
          class_id: classIds[gi],
          date,
          status,
          marked_by: teacherIds[gi % 10],
          note: status === 'late' ? 'Arrived late' : '',
          marked_at: new Date().toISOString(),
          school_id: SCHOOL_ID,
        });
      }
    }
  }
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from('attendance').insert(rows.slice(i, i + BATCH));
    if (error?.message?.includes('unique')) {
      // skip duplicates
    } else if (error) {
      console.warn('  attendance batch warning:', error.message?.substring(0, 80));
    }
  }
  console.log(`  → ${rows.length} attendance records inserted`);
}

// ══════════════════════════════════════════════════════════
// TIMETABLE
// ══════════════════════════════════════════════════════════
async function createTimetable() {
  const rows = [];
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const periods = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00'];
  const endPeriods = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00'];

  for (let gi = 0; gi < 12; gi++) {
    for (let di = 0; di < days.length; di++) {
      for (let pi = 0; pi < 7; pi++) {
        const subIdx = pi % SUBJECTS.length;
        rows.push({
          id: uid(`tt${gi.toString().padStart(2,'0')}${di}${pi}`),
          class_id: classIds[gi],
          day: days[di],
          period: pi + 1,
          subject_id: subjectIds[subIdx],
          teacher_id: teacherIds[subIdx % 10],
          room: `Room ${100 + gi}`,
          start_time: periods[pi],
          end_time: endPeriods[pi],
          academic_year: ACADEMIC_YEAR,
          school_id: SCHOOL_ID,
        });
      }
    }
  }
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.from('timetable').insert(rows.slice(i, i + BATCH));
  }
  console.log(`  → ${rows.length} timetable entries inserted`);
}

// ══════════════════════════════════════════════════════════
// FEES
// ══════════════════════════════════════════════════════════
async function createFees() {
  const feeRows = [];
  const paymentRows = [];

  for (let gi = 0; gi < 12; gi++) {
    const amount = 25000 + gi * 5000; // increases with grade
    const fid = uid(`fs${gi.toString().padStart(2,'0')}`);

    feeRows.push({
      id: fid,
      school_id: SCHOOL_ID,
      name: `Tuition Fee - Grade ${GRADES[gi]} - ${ACADEMIC_YEAR}`,
      amount,
      due_date: futureDate(30),
      class_id: classIds[gi],
      academic_year: ACADEMIC_YEAR,
      description: `Annual tuition fee for Grade ${GRADES[gi]}`,
    });

    // Create payments for 3 of 5 students per class
    for (let si = 0; si < 3; si++) {
      paymentRows.push({
        id: uid(`fp${gi.toString().padStart(2,'0')}${si}`),
        student_id: allStudentIds[gi][si],
        fee_structure_id: fid,
        amount: amount * (si === 0 ? 1 : si === 1 ? 0.5 : 0.25), // full, half, quarter
        school_id: SCHOOL_ID,
      });
    }
  }

  await db.from('fee_structures').insert(feeRows);
  const BATCH = 20;
  for (let i = 0; i < paymentRows.length; i += BATCH) {
    await db.from('fee_payments').insert(paymentRows.slice(i, i + BATCH));
  }
  console.log(`  → ${feeRows.length} fee structures, ${paymentRows.length} payments inserted`);
}

// ══════════════════════════════════════════════════════════
// TRANSPORT
// ══════════════════════════════════════════════════════════
async function createTransport() {
  const routes = [];
  const stops = [];
  const assignments = [];

  const routeNames = ['Route A - North', 'Route B - South', 'Route C - East'];
  const vehicles = ['MH-12-AB-1234', 'MH-12-CD-5678', 'MH-12-EF-9012'];
  const drivers = ['Ramesh Yadav', 'Suresh Patil', 'Mahesh Joshi'];
  const phones = ['+91-9800000001', '+91-9800000002', '+91-9800000003'];

  for (let ri = 0; ri < 3; ri++) {
    const rid = uid(`tr${ri}`);
    routes.push({
      id: rid,
      school_id: SCHOOL_ID,
      name: routeNames[ri],
      vehicle_number: vehicles[ri],
      driver_name: drivers[ri],
      driver_phone: phones[ri],
    });

    const stopNames = [
      ['Main Gate', 'Oak Street', 'Park Avenue', 'School'],
      ['Bus Stand', 'MG Road', 'Temple Lane', 'School'],
      ['Station', 'Market Road', 'Hill View', 'School'],
    ];
    const pickupTimes = ['07:00', '07:15', '07:30', '07:45'];
    const dropTimes = ['15:15', '15:30', '15:45', '16:00'];

    for (let si = 0; si < 4; si++) {
      const stopId = uid(`ts${ri}${si}`);
      stops.push({
        id: stopId,
        school_id: SCHOOL_ID,
        route_id: rid,
        name: stopNames[ri][si],
        pickup_time: pickupTimes[si],
        drop_time: dropTimes[si],
        fare: 500 + si * 200,
        sequence: si + 1,
      });
    }

    // Assign 5 students per route
    for (let si = 0; si < 5; si++) {
      const studentIdx = ri * 5 + si;
      const classIdx = Math.floor(studentIdx / 5) % 12;
      const sIdx = studentIdx % 5;
      if (allStudentIds[classIdx]?.[sIdx]) {
        assignments.push({
          id: uid(`ta${ri}${si}`),
          school_id: SCHOOL_ID,
          student_id: allStudentIds[classIdx][sIdx],
          route_id: rid,
          stop_id: stops[ri * 4 + 2].id, // middle stop
        });
      }
    }
  }

  await db.from('transport_routes').insert(routes);
  await db.from('transport_stops').insert(stops);
  const BATCH = 10;
  for (let i = 0; i < assignments.length; i += BATCH) {
    const { error } = await db.from('transport_assignments').insert(assignments.slice(i, i + BATCH));
    if (error?.message?.includes('unique')) {} // skip dupes
    else if (error) console.warn('  transport assign warning:', error.message?.substring(0, 80));
  }
  console.log(`  → ${routes.length} routes, ${stops.length} stops, ${assignments.length} assignments inserted`);
}

// ══════════════════════════════════════════════════════════
// INVENTORY
// ══════════════════════════════════════════════════════════
async function createInventory() {
  // Suppliers
  const suppliers = [
    { id: uid('sp0'), school_id: SCHOOL_ID, name: 'Office Supplies Co.', contact_person: 'Raj Kumar', phone: '+91-9700000001', email: 'raj@officesupplies.com' },
    { id: uid('sp1'), school_id: SCHOOL_ID, name: 'Lab Equipment Ltd.', contact_person: 'Sunil Mehta', phone: '+91-9700000002', email: 'sunil@labequipment.com' },
    { id: uid('sp2'), school_id: SCHOOL_ID, name: 'Sports World', contact_person: 'Anil Sharma', phone: '+91-9700000003', email: 'anil@sportsworld.com' },
  ];
  await db.from('suppliers').insert(suppliers);

  // Categories
  const categories = [
    { id: uid('ic0'), school_id: SCHOOL_ID, name: 'Stationery', description: 'Pens, pencils, notebooks' },
    { id: uid('ic1'), school_id: SCHOOL_ID, name: 'Lab Equipment', description: 'Microscopes, test tubes, chemicals' },
    { id: uid('ic2'), school_id: SCHOOL_ID, name: 'Sports', description: 'Balls, nets, equipment' },
    { id: uid('ic3'), school_id: SCHOOL_ID, name: 'Electronics', description: 'Projectors, speakers, cables' },
    { id: uid('ic4'), school_id: SCHOOL_ID, name: 'Furniture', description: 'Desks, chairs, boards' },
  ];
  await db.from('inventory_categories').insert(categories);

  // Items
  const items = [
    { id: uid('ii0'), school_id: SCHOOL_ID, name: 'A4 Paper (ream)', category_id: categories[0].id, quantity: 200, unit: 'reams', reorder_level: 20, supplier_id: suppliers[0].id },
    { id: uid('ii1'), school_id: SCHOOL_ID, name: 'Ballpoint Pens (box)', category_id: categories[0].id, quantity: 100, unit: 'boxes', reorder_level: 10, supplier_id: suppliers[0].id },
    { id: uid('ii2'), school_id: SCHOOL_ID, name: 'Notebooks (pack)', category_id: categories[0].id, quantity: 500, unit: 'packs', reorder_level: 50, supplier_id: suppliers[0].id },
    { id: uid('ii3'), school_id: SCHOOL_ID, name: 'Microscope', category_id: categories[1].id, quantity: 15, unit: 'pcs', reorder_level: 5, supplier_id: suppliers[1].id },
    { id: uid('ii4'), school_id: SCHOOL_ID, name: 'Test Tubes (set)', category_id: categories[1].id, quantity: 30, unit: 'sets', reorder_level: 10, supplier_id: suppliers[1].id },
    { id: uid('ii5'), school_id: SCHOOL_ID, name: 'Chemical Set', category_id: categories[1].id, quantity: 10, unit: 'sets', reorder_level: 3, supplier_id: suppliers[1].id },
    { id: uid('ii6'), school_id: SCHOOL_ID, name: 'Football', category_id: categories[2].id, quantity: 20, unit: 'pcs', reorder_level: 5, supplier_id: suppliers[2].id },
    { id: uid('ii7'), school_id: SCHOOL_ID, name: 'Cricket Bat', category_id: categories[2].id, quantity: 15, unit: 'pcs', reorder_level: 5, supplier_id: suppliers[2].id },
    { id: uid('ii8'), school_id: SCHOOL_ID, name: 'Basketball', category_id: categories[2].id, quantity: 12, unit: 'pcs', reorder_level: 4, supplier_id: suppliers[2].id },
    { id: uid('ii9'), school_id: SCHOOL_ID, name: 'Projector', category_id: categories[3].id, quantity: 5, unit: 'pcs', reorder_level: 2, supplier_id: suppliers[0].id },
    { id: uid('iiA'), school_id: SCHOOL_ID, name: 'Whiteboard Marker (box)', category_id: categories[0].id, quantity: 50, unit: 'boxes', reorder_level: 10, supplier_id: suppliers[0].id },
    { id: uid('iiB'), school_id: SCHOOL_ID, name: 'Desk Chair', category_id: categories[4].id, quantity: 30, unit: 'pcs', reorder_level: 5, supplier_id: suppliers[0].id },
  ];
  await db.from('inventory_items').insert(items);

  // Usage logs
  const usageLogs = [];
  for (let i = 0; i < 20; i++) {
    usageLogs.push({
      id: uid(`iu${i.toString().padStart(2,'0')}`),
      school_id: SCHOOL_ID,
      item_id: pick(items).id,
      quantity_changed: -(randInt(1, 10)),
      reason: pick(['Class use', 'Lab session', 'Sports period', 'Staff request', 'Event preparation']),
      action_by: ADMIN_ID,
    });
  }
  await db.from('inventory_usage_log').insert(usageLogs);
  console.log(`  → ${suppliers.length} suppliers, ${categories.length} categories, ${items.length} items, ${usageLogs.length} usage logs inserted`);
}

// ══════════════════════════════════════════════════════════
// STAFF + LEAVES + PAYROLL
// ══════════════════════════════════════════════════════════
async function createStaff() {
  const staffRows = [];
  const salaryRows = [];
  const payrollRows = [];
  const leaveRows = [];

  for (let i = 0; i < 10; i++) {
    const staffId = uid(`st${i}`);
    staffRows.push({
      id: staffId,
      school_id: SCHOOL_ID,
      user_id: teacherIds[i],
      name: `${TEACHER_FIRST[i]} ${TEACHER_LAST[i]}`,
      role: 'teacher',
      department: pick(['Science','Mathematics','Languages','Humanities','Arts','Administration']),
      joining_date: pastDate(randInt(180, 2000)),
    });

    // Salary config
    const base = 30000 + randInt(0, 40000);
    const allowances = randInt(2000, 10000);
    const deductions = randInt(1000, 5000);
    salaryRows.push({
      id: uid(`sc${i}`),
      school_id: SCHOOL_ID,
      staff_id: staffId,
      base_salary: base,
      allowances,
      deductions,
    });

    // 3 months of payroll
    for (let m = 0; m < 3; m++) {
      const month = `2025-${(4 + m).toString().padStart(2, '0')}`;
      payrollRows.push({
        id: uid(`pr${i}${m}`),
        school_id: SCHOOL_ID,
        staff_id: staffId,
        month,
        base_paid: base,
        allowances_paid: allowances,
        deductions_paid: deductions,
        net_salary: base + allowances - deductions,
        status: 'paid',
      });
    }

    // Leave requests
    if (i < 4) {
      leaveRows.push({
        id: uid(`lv${i}`),
        school_id: SCHOOL_ID,
        staff_id: staffId,
        start_date: pastDate(randInt(5, 30)),
        end_date: pastDate(randInt(1, 5)),
        reason: pick(['Personal', 'Medical', 'Family event', 'Conference']),
        status: i < 2 ? 'approved' : 'pending',
        approved_by: i < 2 ? ADMIN_ID : null,
      });
    }
  }

  await db.from('staff_records').insert(staffRows);
  await db.from('salary_config').insert(salaryRows);
  const BATCH = 10;
  for (let i = 0; i < payrollRows.length; i += BATCH) {
    const { error } = await db.from('payroll_runs').insert(payrollRows.slice(i, i + BATCH));
    if (error?.message?.includes('unique')) {} 
    else if (error) console.warn('  payroll warning:', error.message?.substring(0, 80));
  }
  await db.from('leave_requests').insert(leaveRows);
  console.log(`  → ${staffRows.length} staff, ${salaryRows.length} salary configs, ${payrollRows.length} payroll runs, ${leaveRows.length} leave requests inserted`);
}

// ══════════════════════════════════════════════════════════
// NOTICES
// ══════════════════════════════════════════════════════════
async function createNotices() {
  const notices = [
    { title: 'Parent-Teacher Meeting', content: 'Scheduled for July 25, 2025. All parents are requested to attend.', priority: 'high' },
    { title: 'Annual Day Celebration', content: 'Annual day will be celebrated on August 15, 2025. Rehearsals start next week.', priority: 'normal' },
    { title: 'Exam Schedule Released', content: 'Mid-term examination schedule has been published. Check your class page.', priority: 'high' },
    { title: 'Holiday Notice', content: 'School will remain closed on July 20 due to heavy rainfall.', priority: 'high' },
    { title: 'Sports Day', content: 'Inter-class sports competition will be held on August 5-6.', priority: 'normal' },
    { title: 'Library Hours Extended', content: 'Library will remain open until 5 PM during exam period.', priority: 'low' },
    { title: 'Fee Payment Reminder', content: 'Last date for fee payment is August 10. Late fee of Rs. 500 will be charged after deadline.', priority: 'high' },
    { title: 'Science Exhibition', content: 'Annual science exhibition on August 20. Students can register projects.', priority: 'normal' },
  ];

  const rows = notices.map((n, i) => ({
    id: uid(`nt${i}`),
    school_id: SCHOOL_ID,
    title: n.title,
    content: n.content,
    created_by: ADMIN_ID,
    priority: n.priority,
    expires_at: futureDate(30 + i * 10),
  }));
  await db.from('notice_board').insert(rows);
  console.log(`  → ${rows.length} notices inserted`);
}

// ══════════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════════
async function createNotifications() {
  const rows = [];
  const types = ['grade_released','assignment_due','notice_posted','fee_due','attendance_alert'];
  const titles = ['Grade Released','Assignment Due','New Notice','Fee Due','Attendance Alert'];
  const messages = [
    'Your grades for Mathematics have been updated.',
    'Assignment "Chapter 5 Problems" is due in 3 days.',
    'New notice: Parent-Teacher Meeting on July 25.',
    'Fee payment of Rs. 25,000 is due by August 10.',
    'Your child was marked absent today.',
  ];

  // Notifications for first 20 students
  for (let i = 0; i < 20; i++) {
    const ti = i % 5;
    rows.push({
      id: uid(`nf${i}`),
      userId: allStudentIds[Math.floor(i / 5)][i % 5],
      title: titles[ti],
      message: messages[ti],
      type: types[ti],
      read: Math.random() > 0.5,
      school_id: SCHOOL_ID,
    });
  }
  await db.from('notifications').insert(rows);
  console.log(`  → ${rows.length} notifications inserted`);
}

// ══════════════════════════════════════════════════════════
// CURRICULUM PLANS
// ══════════════════════════════════════════════════════════
async function createCurriculumPlans() {
  const boards = await db.from('boards').select('id');
  const boardId = boards.data?.[0]?.id;

  if (!boardId) {
    console.log('  ⚠️  No boards found, skipping curriculum plans');
    return;
  }

  const rows = [];
  for (let ti = 0; ti < 3; ti++) { // first 3 teachers
    for (const subject of ['Mathematics', 'Science', 'English']) {
      const chapters = [];
      for (let w = 1; w <= 8; w++) {
        chapters.push({
          chapterId: uid(`cp${ti}${w}`),
          chapterTitle: `Week ${w} - ${subject} Topic`,
          week: w,
          startDate: futureDate((w - 1) * 7),
          endDate: futureDate(w * 7 - 1),
        });
      }
      rows.push({
        id: uid(`cpl${ti}${subject.substring(0,2)}`),
        teacher_id: teacherIds[ti],
        board_id: boardId,
        grade: GRADES[ti * 4],
        subject,
        title: `${subject} Plan - Grade ${GRADES[ti * 4]}`,
        academic_year: ACADEMIC_YEAR,
        school_id: SCHOOL_ID,
        chapters: JSON.stringify(chapters),
      });
    }
  }
  const { error } = await db.from('curriculum_plans').insert(rows);
  if (error) console.warn('  curriculum plan warning:', error.message?.substring(0, 80));
  else console.log(`  → ${rows.length} curriculum plans inserted`);
}

// ══════════════════════════════════════════════════════════
// GAMIFICATION (concept_releases + grades already created)
// ══════════════════════════════════════════════════════════
async function createGamification() {
  // Concept releases — mark some concepts as released for classes
  const rows = [];
  for (let gi = 0; gi < 6; gi++) {
    for (let chi = 0; chi < 3; chi++) {
      const concepts = conceptIds[gi * 3 + chi % conceptIds.length] || [];
      for (let ci = 0; ci < Math.min(2, concepts.length); ci++) {
        rows.push({
          id: uid(`cr${gi}${chi}${ci}`),
          class_id: classIds[gi],
          textbook_id: textbookIds[gi]?.[chi % 3] || textbookIds[0][0],
          chapter_id: chapterIds[gi * 3 + chi % chapterIds.length] || chapterIds[0],
          concept_id: concepts[ci],
          teacher_id: teacherIds[0],
          completed: ci === 0,
          school_id: SCHOOL_ID,
        });
      }
    }
  }
  const BATCH = 20;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from('concept_releases').insert(rows.slice(i, i + BATCH));
    if (error?.message?.includes('unique')) {} 
    else if (error) console.warn('  concept_releases warning:', error.message?.substring(0, 80));
  }
  console.log(`  → ${rows.length} concept releases inserted`);
}

// ══════════════════════════════════════════════════════════
// ADAPTIVE LEARNING (concept_mastery)
// ══════════════════════════════════════════════════════════
async function createAdaptiveLearning() {
  const rows = [];
  for (let gi = 0; gi < 6; gi++) {
    for (let si = 0; si < 5; si++) {
      for (let ci = 0; ci < 3; ci++) {
        const concepts = conceptIds[gi * 3 + ci % conceptIds.length] || [];
        if (concepts.length === 0) continue;
        const conceptIdVal = concepts[0];
        const accuracy = Math.round(Math.random() * 100) / 100;

        rows.push({
          id: uid(`cm${gi}${si}${ci}`),
          student_id: allStudentIds[gi][si],
          concept_id: conceptIdVal,
          school_id: SCHOOL_ID,
          accuracy,
          attempt_count: randInt(1, 10),
          mastery_score: accuracy * 0.8 + Math.random() * 0.2,
        });
      }
    }
  }
  const BATCH = 30;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from('concept_mastery').insert(rows.slice(i, i + BATCH));
    if (error?.message?.includes('unique')) {} 
    else if (error) console.warn('  concept_mastery warning:', error.message?.substring(0, 80));
  }
  console.log(`  → ${rows.length} concept mastery records inserted`);
}

// ══════════════════════════════════════════════════════════
// RUN
// ══════════════════════════════════════════════════════════
main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
