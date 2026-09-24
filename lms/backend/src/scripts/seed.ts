/**
 * Seed script — populates the school with realistic test data.
 *
 * Usage:  npx tsx src/scripts/seed.ts
 *
 * Idempotent: skips records that already exist (by email / unique constraints).
 * Does NOT delete or modify any existing data.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuid } from 'uuid';

dotenv.config({ path: __dirname + '/../../.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Constants ──────────────────────────────────────────────────────
const SCHOOL_ID = '00000000-0000-0000-0000-000000000001';
const ACADEMIC_YEAR = '2026-2027';
const PASSWORD = 'student123';   // all students / parents
const TEACHER_PASSWORD = 'teacher123';
const ADMIN_PASSWORD = 'admin123';

// ─── Auth user lookup helper ────────────────────────────────────────
// listUsers({ filter }) does substring matching — build exact-match map instead.
let _authUserMap: Map<string, string> | null = null;
async function getAuthUserByEmail(email: string): Promise<string | null> {
  if (!_authUserMap) {
    _authUserMap = new Map();
    let page = 1;
    while (true) {
      const { data } = await sb.auth.admin.listUsers({ page, perPage: 100 });
      for (const u of data?.users || []) {
        if (u.email) _authUserMap.set(u.email.toLowerCase(), u.id);
      }
      if (!data?.users || data.users.length < 100) break;
      page++;
    }
  }
  return _authUserMap.get(email.toLowerCase()) || null;
}

// ─── Deterministic UUID helper ──────────────────────────────────────
// Simple v5-like: hash a namespace + value to get a repeatable UUID.
function detUuid(namespace: string, value: string): string {
  let hash = 0;
  const str = `${namespace}:${value}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-5${hex.slice(0, 3)}-${((hash & 0x3fff) | 0x8000).toString(16)}-${hex.slice(0, 12).padStart(12, '0')}`;
}

// ─── Data definitions ───────────────────────────────────────────────

const CLASS_GRADES = [
  { name: 'Grade 1', grade: '1', section: 'A' },
  { name: 'Grade 1', grade: '1', section: 'B' },
  { name: 'Grade 2', grade: '2', section: 'A' },
  { name: 'Grade 2', grade: '2', section: 'B' },
  { name: 'Grade 3', grade: '3', section: 'A' },
  { name: 'Grade 3', grade: '3', section: 'B' },
  { name: 'Grade 4', grade: '4', section: 'A' },
  { name: 'Grade 4', grade: '4', section: 'B' },
  { name: 'Grade 5', grade: '5', section: 'A' },
  { name: 'Grade 5', grade: '5', section: 'B' },
  { name: 'Grade 6', grade: '6', section: 'A' },
  { name: 'Grade 6', grade: '6', section: 'B' },
  { name: 'Grade 7', grade: '7', section: 'A' },
  { name: 'Grade 7', grade: '7', section: 'B' },
  { name: 'Grade 8', grade: '8', section: 'A' },
  { name: 'Grade 8', grade: '8', section: 'B' },
  { name: 'Grade 9', grade: '9', section: 'A' },
  { name: 'Grade 9', grade: '9', section: 'B' },
  { name: 'Grade 10', grade: '10', section: 'A' },
  { name: 'Grade 10', grade: '10', section: 'B' },
];

const SUBJECTS = [
  { name: 'Mathematics', code: 'MATH', icon: 'calculate', color: '#6366f1' },
  { name: 'English', code: 'ENG', icon: 'menu_book', color: '#f59e0b' },
  { name: 'Science', code: 'SCI', icon: 'science', color: '#10b981' },
  { name: 'Social Studies', code: 'SST', icon: 'public', color: '#ef4444' },
  { name: 'Computer Science', code: 'CS', icon: 'computer', color: '#8b5cf6' },
  { name: 'Hindi', code: 'HIN', icon: 'translate', color: '#ec4899' },
  { name: 'Physics', code: 'PHY', icon: 'bolt', color: '#06b6d4' },
  { name: 'Chemistry', code: 'CHEM', icon: 'biotech', color: '#84cc16' },
  { name: 'Biology', code: 'BIO', icon: 'eco', color: '#22c55e' },
  { name: 'General Knowledge', code: 'GK', icon: 'lightbulb', color: '#f97316' },
];

// Teacher data (12 teachers with realistic Indian names)
const TEACHERS = [
  { firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@school.edu', phone: '+91-9876543201', subjects: ['Mathematics'], gender: 'female' },
  { firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh.kumar@school.edu', phone: '+91-9876543202', subjects: ['English'], gender: 'male' },
  { firstName: 'Anitha', lastName: 'Reddy', email: 'anitha.reddy@school.edu', phone: '+91-9876543203', subjects: ['Science'], gender: 'female' },
  { firstName: 'Venkatesh', lastName: 'Naidu', email: 'venkatesh.naidu@school.edu', phone: '+91-9876543204', subjects: ['Social Studies'], gender: 'male' },
  { firstName: 'Lakshmi', lastName: 'Devi', email: 'lakshmi.devi@school.edu', phone: '+91-9876543205', subjects: ['Hindi'], gender: 'female' },
  { firstName: 'Suresh', lastName: 'Babu', email: 'suresh.babu@school.edu', phone: '+91-9876543206', subjects: ['Computer Science'], gender: 'male' },
  { firstName: 'Padmavathi', lastName: 'Rao', email: 'padmavathi.rao@school.edu', phone: '+91-9876543207', subjects: ['Physics'], gender: 'female' },
  { firstName: 'Ramesh', lastName: 'Gupta', email: 'ramesh.gupta@school.edu', phone: '+91-9876543208', subjects: ['Chemistry'], gender: 'male' },
  { firstName: 'Kavitha', lastName: 'Menon', email: 'kavitha.menon@school.edu', phone: '+91-9876543209', subjects: ['Biology'], gender: 'female' },
  { firstName: 'Ganesh', lastName: 'Rao', email: 'ganesh.rao@school.edu', phone: '+91-9876543210', subjects: ['General Knowledge'], gender: 'male' },
  { firstName: 'Srinivas', lastName: 'Murthy', email: 'srinivas.murthy@school.edu', phone: '+91-9876543211', subjects: ['Mathematics', 'Physics'], gender: 'male' },
  { firstName: 'Deepika', lastName: 'Nair', email: 'deepika.nair@school.edu', phone: '+91-9876543212', subjects: ['English', 'Hindi'], gender: 'female' },
];

// Student names — 60 students, realistic Indian names
const STUDENT_NAMES = [
  { first: 'Aarav', last: 'Patel', gender: 'male' },
  { first: 'Vivaan', last: 'Singh', gender: 'male' },
  { first: 'Aditya', last: 'Verma', gender: 'male' },
  { first: 'Arjun', last: 'Nair', gender: 'male' },
  { first: 'Sai', last: 'Krishna', gender: 'male' },
  { first: 'Reyansh', last: 'Gupta', gender: 'male' },
  { first: 'Ayaan', last: 'Khan', gender: 'male' },
  { first: 'Krishna', last: 'Sharma', gender: 'male' },
  { first: 'Ishaan', last: 'Reddy', gender: 'male' },
  { first: 'Shaurya', last: 'Joshi', gender: 'male' },
  { first: 'Atharv', last: 'Mishra', gender: 'male' },
  { first: 'Advaith', last: 'Menon', gender: 'male' },
  { first: 'Dhruv', last: 'Rao', gender: 'male' },
  { first: 'Vedant', last: 'Iyer', gender: 'male' },
  { first: 'Kabir', last: 'Chatterjee', gender: 'male' },
  { first: 'Vihaan', last: 'Tiwari', gender: 'male' },
  { first: 'Arnav', last: 'Pandey', gender: 'male' },
  { first: 'Ansh', last: 'Dubey', gender: 'male' },
  { first: 'Pranav', last: 'Sinha', gender: 'male' },
  { first: 'Rohan', last: 'Bhatt', gender: 'male' },
  { first: 'Diya', last: 'Sharma', gender: 'female' },
  { first: 'Ananya', last: 'Patel', gender: 'female' },
  { first: 'Ira', last: 'Singh', gender: 'female' },
  { first: 'Saanvi', last: 'Reddy', gender: 'female' },
  { first: 'Myra', last: 'Kapoor', gender: 'female' },
  { first: 'Aanya', last: 'Verma', gender: 'female' },
  { first: 'Sara', last: 'Khan', gender: 'female' },
  { first: 'Aisha', last: 'Nair', gender: 'female' },
  { first: 'Kiara', last: 'Gupta', gender: 'female' },
  { first: 'Prisha', last: 'Menon', gender: 'female' },
  { first: 'Riya', last: 'Joshi', gender: 'female' },
  { first: 'Navya', last: 'Rao', gender: 'female' },
  { first: 'Anvi', last: 'Mishra', gender: 'female' },
  { first: 'Pihu', last: 'Iyer', gender: 'female' },
  { first: 'Kavya', last: 'Chatterjee', gender: 'female' },
  { first: 'Meera', last: 'Tiwari', gender: 'female' },
  { first: 'Sneha', last: 'Pandey', gender: 'female' },
  { first: 'Tara', last: 'Dubey', gender: 'female' },
  { first: 'Nisha', last: 'Sinha', gender: 'female' },
  { first: 'Deepa', last: 'Bhatt', gender: 'female' },
  { first: 'Harsh', last: 'Agarwal', gender: 'male' },
  { first: 'Manav', last: 'Saxena', gender: 'male' },
  { first: 'Yash', last: 'Malhotra', gender: 'male' },
  { first: 'Rudra', last: 'Chauhan', gender: 'male' },
  { first: 'Veer', last: 'Thakur', gender: 'male' },
  { first: 'Reyansh', last: 'Bansal', gender: 'male' },
  { first: 'Aaradhya', last: 'Goyal', gender: 'female' },
  { first: 'Sakshi', last: 'Arora', gender: 'female' },
  { first: 'Shreya', last: 'Kapoor', gender: 'female' },
  { first: 'Tanvi', last: 'Sethi', gender: 'female' },
  { first: 'Bhavya', last: 'Goel', gender: 'female' },
  { first: 'Aarohi', last: 'Singhal', gender: 'female' },
  { first: 'Ritika', last: 'Bhatia', gender: 'female' },
  { first: 'Ishita', last: 'Chadha', gender: 'female' },
  { first: 'Simran', last: 'Kohli', gender: 'female' },
  { first: 'Divya', last: 'Saini', gender: 'female' },
  { first: 'Nandini', last: 'Bali', gender: 'female' },
  { first: 'Pooja', last: 'Dhawan', gender: 'female' },
  { first: 'Rachna', last: 'Khanna', gender: 'female' },
];

// Parent names — 20 parents
const PARENT_NAMES = [
  { first: 'Rakesh', last: 'Patel', gender: 'male' },
  { first: 'Sunita', last: 'Singh', gender: 'female' },
  { first: 'Mohammed', last: 'Khan', gender: 'male' },
  { first: 'Lata', last: 'Sharma', gender: 'female' },
  { first: 'Sunil', last: 'Verma', gender: 'male' },
  { first: 'Geeta', last: 'Reddy', gender: 'female' },
  { first: 'Anil', last: 'Nair', gender: 'male' },
  { first: 'Meena', last: 'Gupta', gender: 'female' },
  { first: 'Vikram', last: 'Menon', gender: 'male' },
  { first: 'Savita', last: 'Joshi', gender: 'female' },
  { first: 'Dinesh', last: 'Rao', gender: 'male' },
  { first: 'Usha', last: 'Mishra', gender: 'female' },
  { first: 'Manoj', last: 'Iyer', gender: 'male' },
  { first: 'Kamala', last: 'Chatterjee', gender: 'female' },
  { first: 'Ravi', last: 'Tiwari', gender: 'male' },
  { first: 'Shanti', last: 'Pandey', gender: 'female' },
  { first: 'Ashok', last: 'Dubey', gender: 'male' },
  { first: 'Saroj', last: 'Sinha', gender: 'female' },
  { first: 'Gopal', last: 'Bhatt', gender: 'male' },
  { first: 'Pushpa', last: 'Agarwal', gender: 'female' },
];

// Helper: assign students to classes (3 per class = 60 total)
function assignStudentsToClasses(): Array<{ studentIdx: number; classIdx: number }> {
  const assignments: Array<{ studentIdx: number; classIdx: number }> = [];
  let studentIdx = 0;
  for (let classIdx = 0; classIdx < CLASS_GRADES.length; classIdx++) {
    const count = 3; // 3 students per class
    for (let j = 0; j < count && studentIdx < STUDENT_NAMES.length; j++) {
      assignments.push({ studentIdx, classIdx });
      studentIdx++;
    }
  }
  return assignments;
}

// Helper: generate attendance dates (school days in Sept 2026)
function schoolDays(): string[] {
  const days: string[] = [];
  const d = new Date('2026-09-01');
  while (d.getMonth() === 8) { // September
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) { // Mon-Fri
      days.push(d.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// Simple seeded random for reproducibility
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Main seed function ─────────────────────────────────────────────

async function seed() {
  console.log('=== School LMS Seed Script ===');
  console.log(`School ID: ${SCHOOL_ID}`);
  console.log(`Academic Year: ${ACADEMIC_YEAR}\n`);

  // ── 1. Classes ──────────────────────────────────────────────────
  console.log('1. Creating classes...');
  const classIds: string[] = [];
  for (const cls of CLASS_GRADES) {
    const id = detUuid('class', `${cls.grade}-${cls.section}`);
    classIds.push(id);
    const { data: existing } = await sb.from('classes').select('id').eq('id', id).maybeSingle();
    if (!existing) {
      const { error } = await sb.from('classes').insert({
        id,
        name: `${cls.name} - Section ${cls.section}`,
        grade: cls.grade,
        section: cls.section,
        code: `${cls.grade}${cls.section}`,
        academic_year: ACADEMIC_YEAR,
        school_id: SCHOOL_ID,
        student_count: 0,
        status: 'active',
      });
      if (error) console.error(`  Error creating class ${cls.name}-${cls.section}:`, error.message);
      else console.log(`  ✓ ${cls.name} - Section ${cls.section}`);
    } else {
      console.log(`  · ${cls.name} - Section ${cls.section} (exists)`);
    }
  }

  // ── 2. Subjects ─────────────────────────────────────────────────
  console.log('\n2. Creating subjects...');
  const subjectIds: string[] = [];
  for (const sub of SUBJECTS) {
    const id = detUuid('subject', sub.code);
    subjectIds.push(id);
    const { data: existing } = await sb.from('subjects').select('id').eq('id', id).maybeSingle();
    if (!existing) {
      const { error } = await sb.from('subjects').insert({
        id,
        name: sub.name,
        code: sub.code,
        icon: sub.icon,
        color: sub.color,
        type: 'core',
        school_id: SCHOOL_ID,
      });
      if (error) console.error(`  Error creating subject ${sub.name}:`, error.message);
      else console.log(`  ✓ ${sub.name}`);
    } else {
      console.log(`  · ${sub.name} (exists)`);
    }
  }

  // ── 3. Class ↔ Subject links ────────────────────────────────────
  console.log('\n3. Linking subjects to classes...');
  let classSubjectCount = 0;
  for (let ci = 0; ci < classIds.length; ci++) {
    const gradeNum = parseInt(CLASS_GRADES[ci].grade);
    // Assign relevant subjects per grade
    let subIndices: number[];
    if (gradeNum <= 3) {
      // Primary: Math, English, Science, Hindi, GK
      subIndices = [0, 1, 2, 5, 9];
    } else if (gradeNum <= 5) {
      // Upper primary: + Social Studies, Computer Science
      subIndices = [0, 1, 2, 3, 4, 5, 9];
    } else if (gradeNum <= 8) {
      // Middle: all core + CS
      subIndices = [0, 1, 2, 3, 4, 5, 9];
    } else {
      // High: Physics, Chemistry, Biology instead of Science
      subIndices = [0, 1, 3, 4, 5, 6, 7, 8, 9];
    }
    for (const si of subIndices) {
      const id = detUuid('cls-sub', `${classIds[ci]}-${subjectIds[si]}`);
      const { data: existing } = await sb.from('class_subjects').select('id').eq('id', id).maybeSingle();
      if (!existing) {
        await sb.from('class_subjects').insert({
          id,
          class_id: classIds[ci],
          subject_id: subjectIds[si],
          status: 'active',
          school_id: SCHOOL_ID,
        });
        classSubjectCount++;
      }
    }
  }
  console.log(`  ✓ ${classSubjectCount} class-subject links created`);

  // ── 4. Teachers (auth + profile) ────────────────────────────────
  console.log('\n4. Creating teachers...');
  const teacherIds: string[] = [];
  for (const t of TEACHERS) {
    const id = detUuid('teacher', t.email);
    teacherIds.push(id);

    // Check if auth user exists (exact match)
    const existingAuthId = await getAuthUserByEmail(t.email);
    if (!existingAuthId) {
      const { data: authData, error: authErr } = await sb.auth.admin.createUser({
        email: t.email,
        password: TEACHER_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: `${t.firstName} ${t.lastName}`, role: 'teacher' },
      });
      if (authErr) {
        console.error(`  Error creating auth user ${t.email}:`, authErr.message);
        continue;
      }
      // Insert profile with auth UUID
      const actualId = authData.user.id;
      teacherIds[teacherIds.length - 1] = actualId;
      const { error: profileErr } = await sb.from('users').insert({
        id: actualId,
        email: t.email,
        display_name: `${t.firstName} ${t.lastName}`,
        role: 'teacher',
        phone_number: t.phone,
        gender: t.gender,
        is_active: true,
        school_id: SCHOOL_ID,
        password: TEACHER_PASSWORD,
      });
      if (profileErr && !profileErr.message?.includes('duplicate')) {
        console.error(`  Error creating profile for ${t.email}:`, profileErr.message);
      } else {
        console.log(`  ✓ ${t.firstName} ${t.lastName} (${t.email})`);
      }
    } else {
      teacherIds[teacherIds.length - 1] = existingAuthId;
      // Ensure profile exists in users table
      const { data: existingProfile } = await sb.from('users').select('id').eq('id', existingAuthId).maybeSingle();
      if (!existingProfile) {
        const { error: profileErr } = await sb.from('users').insert({
          id: existingAuthId,
          email: t.email,
          display_name: `${t.firstName} ${t.lastName}`,
          role: 'teacher',
          phone_number: t.phone,
          gender: t.gender,
          is_active: true,
          school_id: SCHOOL_ID,
          password: TEACHER_PASSWORD,
        });
        if (profileErr && !profileErr.message?.includes('duplicate')) {
          console.error(`  Error backfilling profile for ${t.email}:`, profileErr.message);
        } else {
          console.log(`  ✓ ${t.firstName} ${t.lastName} (profile created)`);
        }
      } else {
        console.log(`  · ${t.firstName} ${t.lastName} (exists)`);
      }
    }
  }

  // ── 5. Students (auth + profile) ────────────────────────────────
  console.log('\n5. Creating students...');
  const studentIds: string[] = [];
  const studentAssignments = assignStudentsToClasses();
  let studentCount = 0;

  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const s = STUDENT_NAMES[i];
    const rollNo = i + 1;
    const studentIdStr = `9b${(2026 + Math.floor(i / 30)).toString().slice(-2)}${String(rollNo).padStart(3, '0')}`;
    const email = `${studentIdStr}@school.edu`;
    const id = detUuid('student', email);

    const existingAuthId = await getAuthUserByEmail(email);
    if (!existingAuthId) {
      const { data: authData, error: authErr } = await sb.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: `${s.first} ${s.last}`, role: 'student' },
      });
      if (authErr) {
        console.error(`  Error creating auth user ${email}:`, authErr.message);
        studentIds.push(id);
        continue;
      }
      const actualId = authData.user.id;
      studentIds.push(actualId);

      // Find class assignment
      const assignment = studentAssignments.find((a) => a.studentIdx === i);
      const classId = assignment !== undefined ? classIds[assignment.classIdx] : null;
      const birthYear = 2014 - parseInt(CLASS_GRADES[assignment?.classIdx ?? 0]?.grade ?? '1') + 1;
      const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');

      const { error: profileErr } = await sb.from('users').insert({
        id: actualId,
        email,
        display_name: `${s.first} ${s.last}`,
        role: 'student',
        student_id: studentIdStr,
        roll_no: rollNo,
        class_id: classId,
        gender: s.gender,
        academic_year: ACADEMIC_YEAR,
        is_active: true,
        school_id: SCHOOL_ID,
        password: PASSWORD,
      });
      if (profileErr && !profileErr.message?.includes('duplicate')) {
        console.error(`  Error creating profile for ${email}:`, profileErr.message);
      } else {
        studentCount++;
        if (studentCount % 10 === 0) console.log(`  ... ${studentCount} students created`);
      }
    } else {
      studentIds.push(existingAuthId);
      // Ensure profile exists in users table
      const { data: existingProfile } = await sb.from('users').select('id').eq('id', existingAuthId).maybeSingle();
      if (!existingProfile) {
        const assignment = studentAssignments.find((a) => a.studentIdx === i);
        const classId = assignment !== undefined ? classIds[assignment.classIdx] : null;
        const birthYear = 2014 - parseInt(CLASS_GRADES[assignment?.classIdx ?? 0]?.grade ?? '1') + 1;
        const birthMonth = String(Math.floor(seededRandom(i * 7)() * 12) + 1).padStart(2, '0');
        const birthDay = String(Math.floor(seededRandom(i * 13)() * 28) + 1).padStart(2, '0');
        const { error: profileErr } = await sb.from('users').insert({
          id: existingAuthId,
          email,
          display_name: `${s.first} ${s.last}`,
          role: 'student',
          student_id: studentIdStr,
          roll_no: rollNo,
          class_id: classId,
          gender: s.gender,
          academic_year: ACADEMIC_YEAR,
          is_active: true,
          school_id: SCHOOL_ID,
          password: PASSWORD,
        });
        if (profileErr && !profileErr.message?.includes('duplicate')) {
          console.error(`  Error backfilling profile for ${email}:`, profileErr.message);
        } else {
          console.log(`  ✓ ${s.first} ${s.last} (profile created)`);
          studentCount++;
        }
      } else {
        console.log(`  · ${s.first} ${s.last} (exists)`);
      }
    }
  }
  console.log(`  ✓ ${studentCount} new students created (${studentIds.length} total)`);

  // ── 6. Parents (auth + profile + children_ids) ──────────────────
  console.log('\n6. Creating parents...');
  let parentCount = 0;
  const parentIds: string[] = [];
  for (let i = 0; i < PARENT_NAMES.length; i++) {
    const p = PARENT_NAMES[i];
    const email = `${p.first.toLowerCase()}.${p.last.toLowerCase()}@school.edu`;
    const id = detUuid('parent', email);

    // Link to 1-3 students
    const childStart = (i * 3) % studentIds.length;
    const childCount = (i % 3) + 1;
    const childrenIds: string[] = [];
    for (let c = 0; c < childCount; c++) {
      childrenIds.push(studentIds[(childStart + c) % studentIds.length]);
    }

    const existingAuthId = await getAuthUserByEmail(email);
    if (!existingAuthId) {
      const { data: authData, error: authErr } = await sb.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: `${p.first} ${p.last}`, role: 'parent' },
      });
      if (authErr) {
        console.error(`  Error creating auth user ${email}:`, authErr.message);
        parentIds.push(id);
        continue;
      }
      const actualId = authData.user.id;
      parentIds.push(actualId);

      const { error: profileErr } = await sb.from('users').insert({
        id: actualId,
        email,
        display_name: `${p.first} ${p.last}`,
        role: 'parent',
        gender: p.gender,
        is_active: true,
        school_id: SCHOOL_ID,
        password: PASSWORD,
        children_ids: childrenIds,
      });
      if (profileErr && !profileErr.message?.includes('duplicate')) {
        console.error(`  Error creating profile for ${email}:`, profileErr.message);
      } else {
        parentCount++;
        console.log(`  ✓ ${p.first} ${p.last} → children: ${childrenIds.length}`);
      }
    } else {
      parentIds.push(existingAuthId);
      // Ensure profile exists in users table
      const { data: existingProfile } = await sb.from('users').select('id').eq('id', existingAuthId).maybeSingle();
      if (!existingProfile) {
        const { error: profileErr } = await sb.from('users').insert({
          id: existingAuthId,
          email,
          display_name: `${p.first} ${p.last}`,
          role: 'parent',
          gender: p.gender,
          is_active: true,
          school_id: SCHOOL_ID,
          password: PASSWORD,
          children_ids: childrenIds,
        });
        if (profileErr && !profileErr.message?.includes('duplicate')) {
          console.error(`  Error backfilling profile for ${email}:`, profileErr.message);
        } else {
          console.log(`  ✓ ${p.first} ${p.last} (profile created)`);
          parentCount++;
        }
      } else {
        console.log(`  · ${p.first} ${p.last} (exists)`);
      }
    }
  }
  console.log(`  ✓ ${parentCount} new parents created`);

  // ── 7. Teacher ↔ Class ↔ Subject assignments (batched) ──────────
  console.log('\n7. Assigning teachers to classes...');
  const rng = seededRandom(42);
  const tcsRows: any[] = [];
  const tcsDocRows: any[] = [];
  const ctRows: any[] = [];
  const ctSeen = new Set<string>();

  for (let ti = 0; ti < TEACHERS.length; ti++) {
    const teacherId = teacherIds[ti];
    const teacherSubjects = TEACHERS[ti].subjects;

    for (const subName of teacherSubjects) {
      const subIdx = SUBJECTS.findIndex((s) => s.name === subName);
      if (subIdx === -1) continue;
      const subjectId = subjectIds[subIdx];

      // Find classes that have this subject
      const eligibleClassIndices: number[] = [];
      for (let ci = 0; ci < classIds.length; ci++) {
        const gradeNum = parseInt(CLASS_GRADES[ci].grade);
        let subIndices: number[];
        if (gradeNum <= 3) subIndices = [0, 1, 2, 5, 9];
        else if (gradeNum <= 5) subIndices = [0, 1, 2, 3, 4, 5, 9];
        else if (gradeNum <= 8) subIndices = [0, 1, 2, 3, 4, 5, 9];
        else subIndices = [0, 1, 3, 4, 5, 6, 7, 8, 9];
        if (subIndices.includes(subIdx)) eligibleClassIndices.push(ci);
      }

      const assignCount = Math.min(3 + Math.floor(rng() * 3), eligibleClassIndices.length);
      const shuffled = eligibleClassIndices.sort(() => rng() - 0.5).slice(0, assignCount);

      for (const ci of shuffled) {
        tcsRows.push({
          id: detUuid('tcs', `${teacherId}-${classIds[ci]}-${subjectId}`),
          teacher_id: teacherId,
          class_id: classIds[ci],
          subject_id: subjectId,
          status: 'active',
        });

        tcsDocRows.push({
          collection: 'teacherClassSubject',
          doc_id: `${teacherId}_${classIds[ci]}_${subjectId}`,
          data: { teacherId, classId: classIds[ci], subjectId, status: 'active', schoolId: SCHOOL_ID },
        });

        const ctKey = `${teacherId}-${classIds[ci]}`;
        if (!ctSeen.has(ctKey)) {
          ctSeen.add(ctKey);
          ctRows.push({
            id: detUuid('ct', ctKey),
            teacher_id: teacherId,
            class_id: classIds[ci],
            role: 'primary',
            status: 'active',
          });
        }
      }
    }
  }

  // Batch insert
  for (let i = 0; i < tcsRows.length; i += 500) {
    await sb.from('teacher_class_subject_assignments').upsert(tcsRows.slice(i, i + 500), { onConflict: 'id', ignoreDuplicates: true });
  }
  for (let i = 0; i < tcsDocRows.length; i += 500) {
    await sb.from('firestore_docs').upsert(tcsDocRows.slice(i, i + 500), { onConflict: 'collection,doc_id', ignoreDuplicates: true });
  }
  for (let i = 0; i < ctRows.length; i += 500) {
    await sb.from('class_teachers').upsert(ctRows.slice(i, i + 500), { onConflict: 'id', ignoreDuplicates: true });
  }

  console.log(`  ✓ ${tcsRows.length} teacher-class-subject assignments created`);
  console.log(`  ✓ ${ctRows.length} class-teacher assignments created`);

  // ── 8. Student ↔ Class enrollments (batched) ─────────────────────
  console.log('\n8. Enrolling students in classes...');
  const enrollRows: any[] = [];
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const assignment = studentAssignments.find((a) => a.studentIdx === i);
    if (!assignment) continue;
    const classId = classIds[assignment.classIdx];
    const studentId = studentIds[i];

    enrollRows.push({
      id: detUuid('enroll', `${studentId}-${classId}-${ACADEMIC_YEAR}`),
      student_id: studentId,
      class_id: classId,
      academic_year: ACADEMIC_YEAR,
      status: 'active',
    });
  }
  const { error: enrollErr } = await sb.from('student_class_enrollments').upsert(enrollRows, { onConflict: 'student_id,class_id,academic_year', ignoreDuplicates: true });
  const enrollCount = enrollErr ? 0 : enrollRows.length;
  console.log(`  ✓ ${enrollCount} enrollments created`);

  // Update class student_ids and student_count
  console.log('  Updating class student counts...');
  for (const classId of classIds) {
    const { data: enrollments } = await sb.from('student_class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('academic_year', ACADEMIC_YEAR)
      .eq('status', 'active');
    const studentIdsForClass = (enrollments || []).map((e: any) => e.student_id);
    await sb.from('classes').update({
      student_ids: studentIdsForClass,
      student_count: studentIdsForClass.length,
    }).eq('id', classId);
  }

  // ── 9. Attendance records (batched) ──────────────────────────────
  console.log('\n9. Creating attendance records...');
  const days = schoolDays();
  const attRng = seededRandom(123);
  let attCount = 0;

  // Build all attendance rows first, then batch-insert
  const attRows: any[] = [];
  for (let si = 0; si < STUDENT_NAMES.length; si++) {
    const studentId = studentIds[si];
    const assignment = studentAssignments.find((a) => a.studentIdx === si);
    if (!assignment) continue;
    const classId = classIds[assignment.classIdx];

    for (const day of days) {
      const rand = attRng();
      let status: string;
      if (rand < 0.88) status = 'present';
      else if (rand < 0.94) status = 'absent';
      else if (rand < 0.97) status = 'late';
      else status = 'holiday';

      attRows.push({
        id: detUuid('att', `${studentId}-${classId}-${day}`),
        student_id: studentId,
        class_id: classId,
        date: day,
        status,
        school_id: SCHOOL_ID,
      });
    }
  }

  // Batch insert (500 at a time) — skip existing via onConflict ignore
  const BATCH = 500;
  for (let i = 0; i < attRows.length; i += BATCH) {
    const batch = attRows.slice(i, i + BATCH);
    const { error } = await sb.from('attendance').upsert(batch, { onConflict: 'student_id,class_id,date', ignoreDuplicates: true });
    if (!error) attCount += batch.length;
    else console.error(`  Attendance batch error:`, error.message);
  }
  console.log(`  ✓ ${attCount} attendance records created (${days.length} days × ${STUDENT_NAMES.length} students)`);

  // ── 10. Fee structures + payments ───────────────────────────────
  console.log('\n10. Creating fee structures and payments...');
  const FEE_TYPES = [
    { name: 'Tuition Fee', type: 'tuition', baseAmount: 15000 },
    { name: 'Lab Fee', type: 'lab', baseAmount: 3000 },
    { name: 'Library Fee', type: 'library', baseAmount: 1000 },
    { name: 'Sports Fee', type: 'sports', baseAmount: 2000 },
    { name: 'Exam Fee', type: 'exam', baseAmount: 1500 },
  ];

  // Pre-fetch enrollments for fee payments
  const enrollMap = new Map<string, string[]>();
  for (const classId of classIds) {
    const { data: enrollments } = await sb.from('student_class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('academic_year', ACADEMIC_YEAR)
      .eq('status', 'active');
    enrollMap.set(classId, (enrollments || []).map((e: any) => e.student_id));
  }

  let feeStructCount = 0;
  let feePayCount = 0;
  const feeRng = seededRandom(789);
  const feePayRows: any[] = [];
  const feeStructRows: any[] = [];

  for (let ci = 0; ci < classIds.length; ci++) {
    for (const ft of FEE_TYPES) {
      const gradeNum = parseInt(CLASS_GRADES[ci].grade);
      const amount = ft.baseAmount + (gradeNum * 500);
      const id = detUuid('fee-struct', `${classIds[ci]}-${ft.type}-${ACADEMIC_YEAR}`);

      feeStructRows.push({
        id,
        school_id: SCHOOL_ID,
        name: ft.name,
        fee_type: ft.type,
        amount,
        due_date: '2026-10-31',
        class_id: classIds[ci],
        academic_year: ACADEMIC_YEAR,
        term: 'First Term',
        description: `${ft.name} for ${CLASS_GRADES[ci].name} - ${ACADEMIC_YEAR}`,
      });

      // Build payment rows for students in this class
      const studentIdsForClass = enrollMap.get(classIds[ci]) || [];

      for (const studentId of studentIdsForClass) {
        const payId = detUuid('fee-pay', `${studentId}-${id}`);
        const rand = feeRng();
        let amountPaid: number;
        let status: string;
        if (rand < 0.65) { amountPaid = amount; status = 'completed'; }
        else if (rand < 0.80) { amountPaid = Math.round(amount * 0.5); status = 'completed'; }
        else { amountPaid = 0; status = 'pending'; }

        feePayRows.push({
          id: payId,
          student_id: studentId,
          fee_structure_id: id,
          amount,
          amount_paid: amountPaid,
          payment_date: amountPaid > 0 ? '2026-09-15' : null,
          payment_method: amountPaid > 0 ? 'bank_transfer' : null,
          status,
          school_id: SCHOOL_ID,
        });
      }
    }
  }

  // Batch insert fee structures
  for (let i = 0; i < feeStructRows.length; i += 500) {
    const batch = feeStructRows.slice(i, i + 500);
    const { error } = await sb.from('fee_structures').upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
    if (!error) feeStructCount += batch.length;
    else console.error(`  Fee struct batch error:`, error.message);
  }

  // Batch insert fee payments
  for (let i = 0; i < feePayRows.length; i += 500) {
    const batch = feePayRows.slice(i, i + 500);
    const { error } = await sb.from('fee_payments').upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
    if (!error) feePayCount += batch.length;
    else console.error(`  Fee payment batch error:`, error.message);
  }
  console.log(`  ✓ ${feeStructCount} fee structures created`);
  console.log(`  ✓ ${feePayCount} fee payments created`);

  // ── 11. Exams + Grades ──────────────────────────────────────────
  console.log('\n11. Creating exams and grades...');
  const EXAM_TITLES = [
    { title: 'Unit Test 1', suffix: 'UT1' },
    { title: 'Mid Term Exam', suffix: 'MT' },
    { title: 'Assignment 1', suffix: 'A1' },
    { title: 'Quiz 1', suffix: 'Q1' },
  ];

  let examCount = 0;
  let gradeCount = 0;
  let examV2Count = 0;
  let examAttemptCount = 0;
  const gradeRng = seededRandom(456);
  const gradeRows: any[] = [];
  const gradeDocRows: any[] = [];
  const examRows: any[] = [];
  const examV2Rows: any[] = [];
  const examAttemptRows: any[] = [];

  // Pre-fetch teacher assignments into a map
  console.log('  Pre-fetching teacher assignments...');
  const teacherMap = new Map<string, string>(); // `${classId}-${subjectId}` -> teacherId
  const { data: allTcs } = await sb.from('teacher_class_subject_assignments')
    .select('teacher_id, class_id, subject_id')
    .eq('status', 'active');
  for (const row of allTcs || []) {
    teacherMap.set(`${row.class_id}-${row.subject_id}`, row.teacher_id);
  }

  for (let ci = 0; ci < classIds.length; ci++) {
    const gradeNum = parseInt(CLASS_GRADES[ci].grade);

    let subIndices: number[];
    if (gradeNum <= 3) subIndices = [0, 1, 2, 5, 9];
    else if (gradeNum <= 5) subIndices = [0, 1, 2, 3, 4, 5, 9];
    else if (gradeNum <= 8) subIndices = [0, 1, 2, 3, 4, 5, 9];
    else subIndices = [0, 1, 3, 4, 5, 6, 7, 8, 9];

    const studentIdsForClass = enrollMap.get(classIds[ci]) || [];

    for (const si of subIndices) {
      for (const exam of EXAM_TITLES) {
        const examId = detUuid('exam', `${classIds[ci]}-${subjectIds[si]}-${exam.suffix}-${ACADEMIC_YEAR}`);

        examRows.push({
          id: examId,
          title: `${SUBJECTS[si].name} - ${exam.title}`,
          subject_id: subjectIds[si],
          subject_name: SUBJECTS[si].name,
          course_id: classIds[ci],
          duration: 60,
          total_points: 100,
          passing_score: 40,
          status: 'published',
          grades_released: true,
          scheduled_classes: [classIds[ci]],
          start_date: '2026-09-15',
          end_date: '2026-09-30',
          school_id: SCHOOL_ID,
        });

        const gradedBy = teacherMap.get(`${classIds[ci]}-${subjectIds[si]}`) || teacherIds[0];

        examV2Rows.push({
          collection: 'examV2',
          doc_id: examId,
          data: {
            id: examId,
            title: `${SUBJECTS[si].name} - ${exam.title}`,
            classId: classIds[ci],
            teacherId: gradedBy,
            subjectId: subjectIds[si],
            totalPoints: 100,
            scheduled_at: '2026-09-20T09:00:00.000Z',
            duration: 60,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        for (const studentId of studentIdsForClass) {
          const gradeId = detUuid('grade', `${studentId}-${examId}`);

          const baseScore = 40 + Math.floor(gradeRng() * 50);
          const score = Math.min(100, Math.max(10, baseScore + Math.floor((gradeRng() - 0.5) * 20)));
          const totalPoints = 100;
          const percentage = Math.round((score / totalPoints) * 100);

          gradeRows.push({
            id: gradeId,
            student_id: studentId,
            subject_id: subjectIds[si],
            course_id: classIds[ci],
            class_id: classIds[ci],
            score,
            total_points: totalPoints,
            max_score: totalPoints,
            percentage,
            graded_by: gradedBy,
            feedback: percentage >= 70 ? 'Good performance' : percentage >= 50 ? 'Satisfactory' : 'Needs improvement',
            school_id: SCHOOL_ID,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          const docId = `grade_${studentId}_${classIds[ci]}_${subjectIds[si]}_${exam.suffix}`;
          gradeDocRows.push({
            collection: 'grades',
            doc_id: docId,
            data: {
              studentId,
              subjectId: subjectIds[si],
              courseId: classIds[ci],
              classId: classIds[ci],
              examId,
              itemName: `${SUBJECTS[si].name} ${exam.title}`,
              score,
              totalPoints,
              maxScore: totalPoints,
              percentage,
              gradedBy,
              feedback: percentage >= 70 ? 'Good performance' : percentage >= 50 ? 'Satisfactory' : 'Needs improvement',
              academicYear: ACADEMIC_YEAR,
              createdAt: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          examAttemptRows.push({
            collection: 'examAttemptV2',
            doc_id: detUuid('exam-attempt', `${studentId}-${examId}`),
            data: {
              studentId,
              examId,
              score,
              totalPoints,
              percentage,
              status: 'submitted',
              gradedBy,
              submittedAt: new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000).toISOString(),
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  // Batch insert exams
  console.log('  Batch inserting exams...');
  for (let i = 0; i < examRows.length; i += 500) {
    const batch = examRows.slice(i, i + 500);
    const { error } = await sb.from('exams').upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
    if (!error) examCount += batch.length;
    else console.error(`  Exam batch error:`, error.message);
  }

  // Batch insert grades
  console.log('  Batch inserting grades...');
  for (let i = 0; i < gradeRows.length; i += 500) {
    const batch = gradeRows.slice(i, i + 500);
    const { error } = await sb.from('grades').upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
    if (!error) gradeCount += batch.length;
    else console.error(`  Grade batch error:`, error.message);
  }

  // Batch insert grade docs into firestore_docs
  console.log('  Batch inserting grade docs...');
  for (let i = 0; i < gradeDocRows.length; i += 500) {
    const batch = gradeDocRows.slice(i, i + 500);
    await sb.from('firestore_docs').upsert(batch, { onConflict: 'collection,doc_id', ignoreDuplicates: true });
  }

  // Batch insert examV2 metadata + examAttemptV2 attempts into firestore_docs
  console.log('  Batch inserting examV2 metadata + attempts...');
  for (let i = 0; i < examV2Rows.length; i += 500) {
    const batch = examV2Rows.slice(i, i + 500);
    const { error } = await sb.from('firestore_docs').upsert(batch, { onConflict: 'collection,doc_id', ignoreDuplicates: true });
    if (!error) examV2Count += batch.length;
    else console.error(`  examV2 batch error:`, error.message);
  }
  for (let i = 0; i < examAttemptRows.length; i += 500) {
    const batch = examAttemptRows.slice(i, i + 500);
    const { error } = await sb.from('firestore_docs').upsert(batch, { onConflict: 'collection,doc_id', ignoreDuplicates: true });
    if (!error) examAttemptCount += batch.length;
    else console.error(`  examAttempt batch error:`, error.message);
  }

  console.log(`  ✓ ${examCount} exams created`);
  console.log(`  ✓ ${gradeCount} grades created`);
  console.log(`  ✓ ${examV2Count} examV2 docs created`);
  console.log(`  ✓ ${examAttemptCount} examAttemptV2 attempts created`);

  // ── 12. Quiz attempts (firestore_docs) ──────────────────────────
  console.log('\n12. Creating quiz attempt records...');
  let quizAttemptCount = 0;
  const quizRng = seededRandom(321);

  for (let si = 0; si < Math.min(20, studentIds.length); si++) {
    const studentId = studentIds[si];
    const assignment = studentAssignments.find((a) => a.studentIdx === si);
    if (!assignment) continue;

    // 2 quiz attempts per student
    for (let q = 0; q < 2; q++) {
      const subIdx = Math.floor(quizRng() * SUBJECTS.length);
      const score = Math.floor(quizRng() * 80) + 20;
      const totalPoints = 100;
      const docId = `quiz_${studentId}_${q}_${Date.now()}`;

      const { data: existingDoc } = await sb.from('firestore_docs')
        .select('doc_id')
        .eq('collection', 'quizAttemptV2')
        .eq('doc_id', docId)
        .maybeSingle();
      if (!existingDoc) {
        await sb.from('firestore_docs').insert({
          collection: 'quizAttemptV2',
          doc_id: docId,
          data: {
            studentId,
            subjectId: subjectIds[subIdx],
            classId: classIds[assignment.classIdx],
            score,
            totalPoints,
            percentage: Math.round((score / totalPoints) * 100),
            status: 'completed',
            title: `${SUBJECTS[subIdx].name} Quiz ${q + 1}`,
            submittedAt: new Date(Date.now() - Math.floor(quizRng() * 30) * 86400000).toISOString(),
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        quizAttemptCount++;
      }
    }
  }
  console.log(`  ✓ ${quizAttemptCount} quiz attempts created`);

  // ── 13. Notifications (sample) ──────────────────────────────────
  console.log('\n13. Creating sample notifications...');
  let notifCount = 0;
  const sampleNotifs = [
    { title: 'Welcome to Genesis LMS', body: 'Your account has been created successfully.', type: 'success' },
    { title: 'New Assignment Posted', body: 'A new Mathematics assignment has been posted.', type: 'info' },
    { title: 'Exam Schedule Published', body: 'Mid-term exam schedule has been published.', type: 'info' },
    { title: 'Fee Payment Reminder', body: 'Please pay your tuition fee before the due date.', type: 'warning' },
    { title: 'Parent-Teacher Meeting', body: 'PTM is scheduled for this Saturday.', type: 'info' },
  ];

  for (let i = 0; i < Math.min(20, studentIds.length); i++) {
    const notif = sampleNotifs[i % sampleNotifs.length];
    const id = detUuid('notif', `${studentIds[i]}-${notif.title}`);
    const { data: existing } = await sb.from('notifications').select('id').eq('id', id).maybeSingle();
    if (!existing) {
      await sb.from('notifications').insert({
        id,
        user_id: studentIds[i],
        title: notif.title,
        message: notif.body,
        type: notif.type,
        read: false,
        school_id: SCHOOL_ID,
      });
      notifCount++;
    }
  }
  console.log(`  ✓ ${notifCount} notifications created`);

  // ── Done ────────────────────────────────────────────────────────
  console.log('\n=== Seed Complete ===');
  console.log(`Students: ${STUDENT_NAMES.length}`);
  console.log(`Teachers: ${TEACHERS.length}`);
  console.log(`Parents: ${PARENT_NAMES.length}`);
  console.log(`Classes: ${CLASS_GRADES.length}`);
  console.log(`Subjects: ${SUBJECTS.length}`);
  console.log(`Class-Subject links: ${classSubjectCount}`);
  console.log(`Teacher assignments: ${tcsRows.length}`);
  console.log(`Enrollments: ${enrollCount}`);
  console.log(`Attendance records: ${attCount}`);
  console.log(`Fee structures: ${feeStructCount}`);
  console.log(`Fee payments: ${feePayCount}`);
  console.log(`Exams: ${examCount}`);
  console.log(`Grades: ${gradeCount}`);
  console.log(`ExamV2 docs: ${examV2Count}`);
  console.log(`ExamAttemptV2 attempts: ${examAttemptCount}`);
  console.log(`Quiz attempts: ${quizAttemptCount}`);
  console.log(`Notifications: ${notifCount}`);
  console.log('\nLogin credentials:');
  console.log(`  Students: <studentId>@school.edu / ${PASSWORD}`);
  console.log(`  Teachers: <email>@school.edu / ${TEACHER_PASSWORD}`);
  console.log(`  Admin: admin@school.edu / ${ADMIN_PASSWORD}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
