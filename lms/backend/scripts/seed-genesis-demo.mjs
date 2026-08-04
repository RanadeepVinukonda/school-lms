#!/usr/bin/env node
/**
 * Genesis LMS — Production-Quality Demo Data Reseed (2026–2027)
 * =============================================================
 * Resets the database (preserving ALL admin/super_admin accounts and
 * school configuration) and recreates a fully populated demo dataset:
 *
 *   Genesis International School · Academic Year 2026–2027
 *   Classes 1–10 (sections A/B) · 113 students · 113 parents · 15 teachers
 *   Subjects per class · enrollments · 30-day attendance (90–97%)
 *   Unit Test 1/2, Quarterly, Half-Yearly, Pre-Final, Final
 *   Marks/grades with realistic distribution, CGPA, class rank
 *   AI reports, resources, notifications, Mon–Sat timetable,
 *   staff records + attendance, notice board
 *
 * Every non-admin account is created in Supabase Auth (auth.users +
 * auth.identities, bcrypt) so real logins work:
 *   Student:  Student@123
 *   Parent:   Parent@123
 *   Teacher:  Teacher@123
 *   Admin:    preserved (UNCHANGED)
 *
 * Requires DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY in backend/.env
 *
 * SAFETY: the entire reset+reload runs in ONE transaction; any failure
 * rolls everything back. Admin accounts are never deleted or modified.
 */

import pkg from 'pg';
import { randomUUID } from 'node:crypto';
import 'dotenv/config';

const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1); }

const pool = new Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 20000, max: 5 });

// ────────────────────────── utilities ──────────────────────────
const uid = () => randomUUID();
const now = () => new Date();
const nowISO = () => new Date().toISOString();
const isoDaysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];
const isoDaysAhead = (n) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0];

// deterministic PRNG (mulberry32) so the whole dataset is reproducible
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260804);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

async function q(text, params) { const r = await pool.query(text, params); return r.rows; }
async function q1(text, params) { const r = await pool.query(text, params); return r.rows[0]; }

// ────────────────────────── constants ──────────────────────────
const SCHOOL_ID = '00000000-0000-0000-0000-000000000001';
const ACADEMIC_YEAR = '2026-2027';

// class roster: grade, section, student count  (113 total)
const ROSTER = [
  { grade: '1', section: 'A', count: 13 },
  { grade: '1', section: 'B', count: 12 },
  { grade: '2', section: 'A', count: 13 },
  { grade: '2', section: 'B', count: 12 },
  { grade: '3', section: 'A', count: 8 },
  { grade: '4', section: 'A', count: 7 },
  { grade: '5', section: 'A', count: 6 },
  { grade: '6', section: 'A', count: 8 },
  { grade: '7', section: 'A', count: 10 },
  { grade: '8', section: 'A', count: 9 },
  { grade: '9', section: 'A', count: 7 },
  { grade: '10', section: 'A', count: 8 },
];

// subject catalog (id assigned later)
const SUBJECTS = [
  { name: 'Mathematics', code: 'MAT', type: 'core', category: 'STEM', icon: 'calculate', color: 'hsl(var(--accent-default))' },
  { name: 'English', code: 'ENG', type: 'core', category: 'Languages', icon: 'language', color: 'hsl(var(--accent-default))' },
  { name: 'Science', code: 'SCI', type: 'core', category: 'STEM', icon: 'science', color: 'hsl(var(--accent-default))' },
  { name: 'Social Studies', code: 'SST', type: 'core', category: 'Humanities', icon: 'public', color: 'hsl(var(--accent-default))' },
  { name: 'Physics', code: 'PHY', type: 'core', category: 'STEM', icon: 'speed', color: 'hsl(var(--accent-default))' },
  { name: 'Chemistry', code: 'CHE', type: 'core', category: 'STEM', icon: 'biotech', color: 'hsl(var(--accent-default))' },
  { name: 'Biology', code: 'BIO', type: 'core', category: 'STEM', icon: 'pest_control', color: 'hsl(var(--accent-default))' },
  { name: 'Computer Science', code: 'CS', type: 'core', category: 'STEM', icon: 'computer', color: 'hsl(var(--accent-default))' },
  { name: 'Hindi', code: 'HIN', type: 'core', category: 'Languages', icon: 'translate', color: 'hsl(var(--accent-default))' },
  { name: 'Telugu', code: 'TEL', type: 'core', category: 'Languages', icon: 'translate', color: 'hsl(var(--accent-default))' },
  { name: 'General Knowledge', code: 'GK', type: 'core', category: 'Humanities', icon: 'lightbulb', color: 'hsl(var(--accent-default))' },
  { name: 'Physical Education', code: 'PE', type: 'elective', category: 'Sports', icon: 'sports_soccer', color: 'hsl(var(--accent-default))' },
  { name: 'Art', code: 'ART', type: 'elective', category: 'Creative', icon: 'palette', color: 'hsl(var(--accent-default))' },
  { name: 'Music', code: 'MUS', type: 'elective', category: 'Creative', icon: 'music_note', color: 'hsl(var(--accent-default))' },
];

// which subjects each grade studies
function subjectsForGrade(g) {
  const n = Number(g);
  const core = ['Mathematics', 'English', 'Hindi', 'Telugu'];
  if (n <= 2) return [...core, 'Science', 'General Knowledge', 'Art', 'Music', 'Physical Education'];
  if (n <= 5) return [...core, 'Science', 'Social Studies', 'General Knowledge', 'Computer Science', 'Art', 'Music', 'Physical Education'];
  return [...core, 'Physics', 'Chemistry', 'Biology', 'Social Studies', 'Computer Science', 'Physical Education'];
}

// ────────────────────────── teachers ──────────────────────────
const TEACHERS = [
  { emp: 'T001', name: 'Rajesh Sharma',   dept: 'Mathematics',  qual: 'M.Sc Mathematics, B.Ed',    exp: 14, subjects: ['Mathematics'] },
  { emp: 'T002', name: 'Priya Verma',     dept: 'English',      qual: 'M.A English, B.Ed',          exp: 11, subjects: ['English'] },
  { emp: 'T003', name: 'Amit Patel',      dept: 'Science',      qual: 'M.Sc Physics, B.Ed',         exp: 9,  subjects: ['Science', 'Physics'] },
  { emp: 'T004', name: 'Sneha Reddy',     dept: 'Science',      qual: 'M.Sc Chemistry, B.Ed',       exp: 7,  subjects: ['Chemistry', 'Science'] },
  { emp: 'T005', name: 'Vikram Singh',    dept: 'Biology',      qual: 'M.Sc Botany, M.Ed',          exp: 12, subjects: ['Biology'] },
  { emp: 'T006', name: 'Deepa Nair',      dept: 'Social Studies', qual: 'M.A History, B.Ed',        exp: 10, subjects: ['Social Studies'] },
  { emp: 'T007', name: 'Sanjay Gupta',    dept: 'Hindi',        qual: 'M.A Hindi, B.Ed',            exp: 13, subjects: ['Hindi'] },
  { emp: 'T008', name: 'Meena Rao',       dept: 'Telugu',       qual: 'M.A Telugu, B.Ed',           exp: 8,  subjects: ['Telugu'] },
  { emp: 'T009', name: 'Arjun Kumar',     dept: 'Computer Science', qual: 'MCA',                   exp: 6,  subjects: ['Computer Science'] },
  { emp: 'T010', name: 'Kavita Joshi',    dept: 'Mathematics',  qual: 'M.Sc Mathematics, B.Ed',    exp: 5,  subjects: ['Mathematics'] },
  { emp: 'T011', name: 'Rohan Iyer',      dept: 'English',      qual: 'M.A English, B.Ed',          exp: 4,  subjects: ['English'] },
  { emp: 'T012', name: 'Nisha Das',       dept: 'GK & Art',     qual: 'B.A Fine Arts, B.Ed',        exp: 3,  subjects: ['General Knowledge', 'Art'] },
  { emp: 'T013', name: 'Pooja Mehta',     dept: 'Physical Education', qual: 'M.P.Ed',              exp: 9,  subjects: ['Physical Education'] },
  { emp: 'T014', name: 'Rahul Menon',     dept: 'Music',        qual: 'Sangeet Visharad',           exp: 15, subjects: ['Music'] },
  { emp: 'T015', name: 'Lakshmi Krishnan', dept: 'Science',     qual: 'M.Sc Biology, B.Ed',         exp: 6,  subjects: ['Science', 'Biology'] },
];

const T_FIRST = ['Mahesh', 'Sunita', 'Venkat', 'Anita', 'Harish', 'Divya', 'Prakash', 'Rekha', 'Manoj', 'Sravani', 'Girish', 'Usha', 'Naveen', 'Padma', 'Kiran'];
const T_LAST = ['Kulkarni', 'Bhat', 'Naidu', 'Reddy', 'Murthy', 'Iyengar', 'Swamy', 'Rani', 'Sharma', 'Patil', 'Desai', 'Rao', 'Rao', 'Krishnan', 'Nair'];
const T_PHONE = ['9000000101', '9000000102', '9000000103', '9000000104', '9000000105', '9000000106', '9000000107', '9000000108', '9000000109', '9000000110', '9000000111', '9000000112', '9000000113', '9000000114', '9000000115'];
const T_EMAIL = ['rajesh.sharma', 'priya.verma', 'amit.patel', 'sneha.reddy', 'vikram.singh', 'deepa.nair', 'sanjay.gupta', 'meena.rao', 'arjun.kumar', 'kavita.joshi', 'rohan.iyer', 'nisha.das', 'pooja.mehta', 'rahul.menon', 'lakshmi.krishnan'];

// ────────────────────────── names ──────────────────────────
const M_FIRST = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Sai', 'Rohan', 'Vihaan', 'Krishna', 'Ishaan', 'Shaurya', 'Reyansh', 'Atharv', 'Advik', 'Pranav', 'Advaith', 'Abhimanyu', 'Hrithik', 'Kabir', 'Dhruv', 'Vedant', 'Siddharth', 'Omkar', 'Yash', 'Karthik', 'Varun', 'Tejas', 'Aryan', 'Nikhil', 'Mohan', 'Harsha'];
const F_FIRST = ['Ananya', 'Diya', 'Myra', 'Sara', 'Aanya', 'Aadhya', 'Aarohi', 'Navya', 'Anvi', 'Pihu', 'Riya', 'Ishita', 'Prisha', 'Kavya', 'Nisha', 'Meera', 'Trisha', 'Simran', 'Pooja', 'Neha', 'Lakshmi', 'Veda', 'Sanjana', 'Divya', 'Keerthi', 'Anjali', 'Sneha', 'Ritika', 'Tanvi', 'Shreya'];
const LAST = ['Kumar', 'Singh', 'Patel', 'Sharma', 'Gupta', 'Reddy', 'Nair', 'Das', 'Joshi', 'Mishra', 'Bose', 'Rao', 'Verma', 'Mehta', 'Choudhary', 'Iyengar', 'Naidu', 'Kulkarni', 'Bhat', 'Deshmukh'];
const P_FIRST_M = ['Ramesh', 'Suresh', 'Mahesh', 'Nagesh', 'Prasad', 'Srinivas', 'Vijay', 'Anil', 'Sunil', 'Ravi', 'Kiran', 'Mohan', 'Raj', 'Murali', 'Ganesh', 'Sekhar', 'Praveen', 'Dinesh'];
const P_FIRST_F = ['Sunita', 'Anita', 'Savitri', 'Lakshmi', 'Padma', 'Shobha', 'Usha', 'Rekha', 'Kavitha', 'Radha', 'Suma', 'Vijaya', 'Mamatha', 'Saritha', 'Deepa'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// grade -> expected age range for DOB (academic year 2026-27)
function dobForGrade(grade) {
  const n = Number(grade);
  const birthYear = 2020 - n + 1; // Class 1 born ~2019-2020
  const year = birthYear + (rand() < 0.5 ? 0 : 1);
  return `${year}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`;
}

function usernameFrom(first, last) {
  return `${first.toLowerCase().replace(/\s+/g, '')}.${last.toLowerCase().replace(/\s+/g, '')}`;
}

// letter grade from percentage (CBSE-style)
function letterGrade(pct) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}
const gpaOf = (pct) => Math.round(clamp(pct / 9.5, 0, 10) * 100) / 100;

// ────────────────────────── helpers: state ──────────────────────────
const subjectIds = {}; // name -> uuid
const classRows = [];   // {row, id, grade, section, subjects:[{name, id, teacherId}]}
const teachers = [];    // {user, id, email, username, subjects}
const students = [];    // {user, id, classId, grade, name, roll, email, username, parent, parentId, data}
const parents = [];
const attendance = [];
const exams = [];
const grades = [];
const enrollmentRows = [];
const tcsRows = []; // teacher_class_subject_assignments
const classSubjectRows = [];
const classTeacherRows = [];
const staffRows = [];
const staffAtt = [];
const timetableRows = [];
const notifRows = [];
const resourceRows = [];
const aiReportDocs = [];
const noticeRows = [];
const authUsers = []; // {id,email,pw}
const userStats = new Map(); // sid -> {overall,cgpa,lg,rank,total}

let admissionSeq = 1000;

// ────────────────────────── MAIN ──────────────────────────
async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 0. Preserve admins
    const admins = await client.query(`SELECT id, email, display_name, role FROM public.users WHERE role ILIKE '%admin%' ORDER BY created_at`);
    if (admins.rows.length === 0) throw new Error('No admin accounts found to preserve — aborting to avoid orphaned auth.');
    const adminIds = admins.rows.map((r) => r.id);
    const adminEmails = admins.rows.map((r) => r.email.toLowerCase());
    const adminId = admins.rows[0].id;
    console.log(`Preserving ${admins.rows.length} admin(s): ${adminEmails.join(', ')}`);

    // 1. Wipe — truncate all domain tables that actually exist (cascade clears dependents)
    const domainTables = [
      'concept_mastery', 'curriculum_plans', 'virtual_lab_progress', 'notification_preferences',
      'device_tokens', 'pre_primary_content', 'coding_challenges', 'ai_tutor_sessions', 'tutor_response_cache',
      'processing_jobs', 'raw_pages', 'concept_resources', 'concept_videos', 'concept_notes', 'concept_questions',
      'concepts', 'chapters', 'textbooks', 'attendance', 'fee_payments', 'fee_structures',
      'transport_attendance', 'transport_assignments', 'transport_stops', 'transport_routes',
      'inventory_usage_log', 'inventory_items', 'inventory_categories', 'suppliers',
      'payroll_runs', 'salary_config', 'leave_requests', 'staff_attendance', 'staff_records',
      'notice_board', 'notifications', 'subscriptions', 'assignments', 'quizzes', 'quizv2', 'exams',
      'grades', 'submissions', 'corrections', 'timetable', 'lessons', 'concept_releases', 'report_feedback',
      'auditlogs', 'audit_logs', 'curriculum_hierarchy', 'publisher_references',
      'student_class_enrollments', 'student_resources', 'resource_requests', 'teacher_class_subject_assignments',
      'class_subjects', 'class_teachers', 'classes', 'subjects', 'firestore_docs', 'nosql_docs',
      'document_store', 'exam_attempts', 'quiz_attempts', 'enrollment', 'enrollments', 'classroom_rooms',
      'room_assignments', 'reports', 'leave_balances', 'attendance_log', 'ai_usage', 'concept_progress', 'tutor_response_cache',
    ];
    const existing = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])`,
      [domainTables]
    );
    const toTruncate = existing.rows.map((r) => r.table_name);
    for (const t of toTruncate) {
      await client.query(`TRUNCATE TABLE public.${t} CASCADE`);
    }
    // delete non-admin public users
    const delUsers = await client.query(`DELETE FROM public.users WHERE id <> ALL($1::uuid[])`, [adminIds]);
    // delete non-admin auth users (admin auth rows untouched)
    const delAuth = await client.query(`DELETE FROM auth.users WHERE id <> ALL($1::uuid[])`, [adminIds]);
    console.log(`Wiped: ${delUsers.rowCount} non-admin users, ${delAuth.rowCount} auth users, all domain tables.`);

    // 2. School + subscription
    await client.query(
      `UPDATE public.schools SET name='Genesis International School', subdomain='genesis', plan='enterprise', primary_color='#3B82F6', updated_at=now() WHERE id=$1`,
      [SCHOOL_ID]
    );
    const subExistsC = await client.query(`SELECT 1 FROM public.subscriptions WHERE school_id=$1`, [SCHOOL_ID]);
    if (!subExistsC.rows.length) {
      await client.query(
        `INSERT INTO public.subscriptions (school_id, plan, status, student_limit, teacher_limit, features, starts_at, expires_at) VALUES ($1,'enterprise','active',2000,200,$2::jsonb, now(), now() + interval '365 days')`,
        [SCHOOL_ID, JSON.stringify({ ai_tutor: true, gamification: true, virtual_labs: true, reports: true })]
      );
    }
    console.log('School: Genesis International School (2026–2027)');

    // 3. Subjects
    for (const s of SUBJECTS) {
      const id = uid();
      subjectIds[s.name] = id;
      await client.query(
        `INSERT INTO public.subjects (id,name,code,description,type,credit_hours,icon,color,is_active,category,school_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10)`,
        [id, s.name, s.code, `${s.name} — ${ACADEMIC_YEAR}`, s.type, s.type === 'core' ? 5 : 2, s.icon, s.color, s.category, SCHOOL_ID]
      );
    }

    // 4. Teachers (public.users + auth)
    for (let i = 0; i < TEACHERS.length; i++) {
      const t = TEACHERS[i];
      const id = uid();
      const username = T_EMAIL[i];
      const email = `${username}@genesis.edu`;
      const pw = 'Teacher@123';
      teachers.push({ id, username, email, pw, name: t.name, emp: t.emp, dept: t.dept, qual: t.qual, exp: t.exp, subjects: t.subjects });
      await client.query(
        `INSERT INTO public.users (id,email,display_name,role,phone_number,is_active,class_ids,children_ids,password,data,school_id,status,created_at,updated_at)
         VALUES ($1,$2,$3,'teacher',$4,true,'{}'::text[],'{}'::text[],$5,$6::jsonb,$7,'active',now(),now())`,
        [id, email, t.name, `+91-${T_PHONE[i]}`, pw, JSON.stringify({ employee_id: t.emp, department: t.dept, qualification: t.qual, experience: t.exp, designation: 'Teacher' }), SCHOOL_ID]
      );
      authUsers.push({ id, email, pw, phone: `+91-${T_PHONE[i]}` });
      // staff record (id = teacher user id so staff_attendance FK holds)
      staffRows.push({ id, school_id: SCHOOL_ID, user_id: id, name: t.name, role: 'teacher', department: t.dept, joining_date: `20${String(randInt(8, 25)).padStart(2, '0')}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}` });
    }

    // 5. Classes
    for (const r of ROSTER) {
      const id = uid();
      const name = `Class ${r.grade}`;
      const code = `G${r.grade}${r.section}`;
      const subjects = subjectsForGrade(r.grade);
      classRows.push({ id, grade: r.grade, section: r.section, name, code, subjects, studentIds: [], teacherIds: new Set(), subjectRows: [] });
      await client.query(
        `INSERT INTO public.classes (id,name,code,description,grade,section,room_number,capacity,academic_year,teacher_ids,subject_ids,teacher_count,max_students,status,student_count,student_ids,version,school_id,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,40,$8,'{}'::text[],'{}'::text[],0,40,'active',0,'{}'::text[],0,$9,now(),now())`,
        [id, name, `${name} — Section ${r.section}`, `Grade ${r.grade} · Section ${r.section}`, r.grade, r.section, `Room ${100 + randInt(0, 9)}${r.section}`, ACADEMIC_YEAR, SCHOOL_ID]
      );
      // class_subjects for this class
      for (const sname of subjects) {
        const sid = subjectIds[sname];
        classSubjectRows.push({ class_id: id, subject_id: sid });
        classRows[classRows.length - 1].subjectRows.push({ name: sname, subjectId: sid });
      }
    }

    // 6. Assign teachers -> subjects -> classes (teacher_class_subject_assignments + class_teachers)
    for (const t of teachers) {
      const applicable = new Set();
      for (const cls of classRows) {
        for (const sname of t.subjects) {
          if (cls.subjects.includes(sname)) {
            applicable.add(cls.id);
            const subId = subjectIds[sname];
            tcsRows.push({ teacher_id: t.id, class_id: cls.id, subject_id: subId });
            cls.teacherIds.add(t.id);
          }
        }
      }
      // also record teacher teaching which subject per class for timetable lookup
      t.classSubjectMap = {};
      for (const cls of classRows) {
        for (const sname of t.subjects) {
          if (cls.subjects.includes(sname)) t.classSubjectMap[`${cls.id}:${sname}`] = subjectIds[sname];
        }
      }
      await client.query(`UPDATE public.users SET class_ids=$2 WHERE id=$1`, [t.id, Array.from(applicable)]);
    }
    // class_teachers: one primary class teacher per class (class teacher for grades)
    const classTeacherAssign = {};
    classRows.forEach((cls, idx) => {
      const teachersArr = Array.from(cls.teacherIds);
      const primary = teachersArr.length ? teachersArr[idx % teachersArr.length] : teachers[0].id;
      classTeacherAssign[cls.id] = primary;
      for (const tid of teachersArr) classTeacherRows.push({ teacher_id: tid, class_id: cls.id, role: tid === primary ? 'primary' : 'assistant', status: 'active' });
      cls.classTeacherId = primary;
    });

    // 7. Students + Parents
    let sGlobal = 0;
    for (const cls of classRows) {
      const firstNameUsed = new Set();
      for (let i = 0; i < ROSTER.find((r) => r.grade === cls.grade && r.section === cls.section).count; i++) {
        sGlobal++;
        const gender = rand() < 0.5 ? 'male' : 'female';
        const fname = gender === 'male' ? M_FIRST[randInt(0, M_FIRST.length - 1)] : F_FIRST[randInt(0, F_FIRST.length - 1)];
        const lname = LAST[randInt(0, LAST.length - 1)];
        const full = `${fname} ${lname}`;
        const username = `${fname.toLowerCase()}.${lname.toLowerCase()}${sGlobal}`;
        const email = `${username}@genesis.edu`;
        const sid = uid();
        admissionSeq++;
        const admissionNo = `GIS-26-${admissionSeq}`;
        const dob = dobForGrade(cls.grade);
        const blood = pick(BLOOD);

        // parent
        const pgender = rand() < 0.5 ? 'male' : 'female';
        const pfname = pgender === 'male' ? P_FIRST_M[randInt(0, P_FIRST_M.length - 1)] : P_FIRST_F[randInt(0, P_FIRST_F.length - 1)];
        const plname = lname;
        const pfull = `${pfname} ${plname}`;
        const puname = `${pfname.toLowerCase()}.${plname.toLowerCase()}${sGlobal}`;
        const pemail = `${puname}@genesis.edu`;
        const pid = uid();

        const sRow = {
          id: sid, email, display_name: full, role: 'student', phone_number: `+91-9${String(randInt(500000000, 999999999))}`,
          is_active: true, class_id: cls.id, class_ids: [cls.id], student_id: admissionNo, roll_no: i + 1,
          academic_year: ACADEMIC_YEAR, children_ids: [], password: 'Student@123', gender,
          data: { dob, blood_group: blood, admission_date: '2026-04-06', parent_email: pemail, parent_name: pfull, parent_phone: `+91-9${String(randInt(500000000, 999999999))}` },
          school_id: SCHOOL_ID,
        };
        const pRow = {
          id: pid, email: pemail, display_name: pfull, role: 'parent', phone_number: `+91-9${String(randInt(700000000, 999999999))}`,
          is_active: true, class_ids: [], children_ids: [sid], password: 'Parent@123',
          data: { child_name: full, child_id: sid, relation: pgender === 'male' ? 'Father' : 'Mother', occupation: pick(['Business', 'Engineer', 'Doctor', 'Teacher', 'Government Officer', 'Farmer', 'Private Employee']) },
          school_id: SCHOOL_ID,
        };
        students.push({ ...sRow, grade: cls.grade, className: `${cls.name} ${cls.section}`, parent: pRow });
        parents.push(pRow);
        authUsers.push({ id: sid, email, pw: 'Student@123', phone: sRow.phone_number });
        authUsers.push({ id: pid, email: pemail, pw: 'Parent@123', phone: pRow.phone_number });

        // enrollments
        enrollmentRows.push({ student_id: sid, class_id: cls.id, academic_year: ACADEMIC_YEAR, status: 'active' });
        cls.studentIds.push(sid);
      }
    }
    // batch insert students
    await batchInsert(client, 'public.users', students.map((s) => ({ id: s.id, email: s.email, display_name: s.display_name, role: 'student', phone_number: s.phone_number, is_active: true, class_ids: s.class_ids, class_id: s.class_id, student_id: s.student_id, roll_no: s.roll_no, academic_year: s.academic_year, children_ids: [], password: 'Student@123', gender: s.gender, data: s.data, school_id: s.school_id })), ['data']);
    await batchInsert(client, 'public.users', parents.map((p) => ({ id: p.id, email: p.email, display_name: p.display_name, role: 'parent', phone_number: p.phone_number, is_active: true, class_ids: [], children_ids: p.children_ids, password: 'Parent@123', data: p.data, school_id: p.school_id })), ['data']);
    console.log(`Users: ${students.length} students, ${parents.length} parents, ${teachers.length} teachers`);

    // update class aggregates
    for (const cls of classRows) {
      await client.query(
        `UPDATE public.classes SET student_count=$2, student_ids=$3::text[], teacher_ids=$4::text[], teacher_count=$5, subject_ids=$6::text[] WHERE id=$1`,
        [cls.id, cls.studentIds.length, cls.studentIds, Array.from(cls.teacherIds), cls.teacherIds.size, cls.subjectRows.map((s) => s.subjectId)]
      );
    }

    // 8. student_class_enrollments + teacher_class_subject_assignments + class_subjects + class_teachers
    await batchInsert(client, 'public.student_class_enrollments', enrollmentRows, []);
    await batchInsert(client, 'public.teacher_class_subject_assignments', tcsRows, []);
    await batchInsert(client, 'public.class_subjects', classSubjectRows, []);
    await batchInsert(client, 'public.class_teachers', classTeacherRows, []);

    // 9. Attendance (last 30 calendar days, Mon–Sat, 90–97% per student)
    const attDays = [];
    for (let d = 1; d <= 30; d++) {
      const date = isoDaysAgo(d);
      const wd = new Date(date + 'T00:00:00Z').getUTCDay();
      if (wd === 0) continue; // skip Sunday
      attDays.push(date);
    }
    for (const s of students) {
      const rate = 90 + rand() * 7; // 90–97
      const schoolDays = attDays.length;
      const absentDays = Math.round((1 - rate / 100) * schoolDays);
      const absentSet = new Set();
      while (absentSet.size < absentDays) absentSet.add(attDays[Math.floor(rand() * attDays.length)]);
      for (const date of attDays) {
        let status;
        if (absentSet.has(date)) status = rand() < 0.2 ? 'late' : 'absent';
        else status = rand() < 0.03 ? 'late' : 'present';
        attendance.push({ id: uid(), student_id: s.id, class_id: s.class_id, date, status, marked_by: classTeacherAssign[s.class_id], note: status === 'late' ? 'Arrived late' : '', school_id: SCHOOL_ID });
      }
    }
    await batchInsert(client, 'public.attendance', attendance, []);
    console.log(`Attendance: ${attendance.length} records (${attDays.length} school days)`);

    // 10. Exams (6 series per class)
    const EXAM_SERIES = [
      { name: 'Unit Test 1', date: '2026-04-20' },
      { name: 'Unit Test 2', date: '2026-06-22' },
      { name: 'Quarterly', date: '2026-07-27' },
      { name: 'Half-Yearly', date: '2026-09-21' },
      { name: 'Pre-Final', date: '2026-11-16' },
      { name: 'Final', date: '2027-02-15' },
    ];
    const examByName = {}; // `${classId}:${examName}` -> id
    for (const cls of classRows) {
      for (const ex of EXAM_SERIES) {
        const id = uid();
        examByName[`${cls.id}:${ex.name}`] = id;
        const start = ex.date, end = ex.date;
        exams.push({ id, title: `${ex.name} — ${cls.name} ${cls.section}`, description: `${ex.name} examination for ${cls.name} Section ${cls.section} (${ACADEMIC_YEAR})`, subject_id: null, subject_name: 'All Subjects', duration: 180, total_points: 100, passing_score: 35, questions: [], scheduled_classes: [cls.id], start_date: start, end_date: end, status: 'published', is_proctored: false, shuffle_questions: true, show_results: true, grades_released: ex.name !== 'Final' && ex.name !== 'Pre-Final', max_attempts: 1, school_id: SCHOOL_ID });
      }
    }
    await batchInsert(client, 'public.exams', exams.map((e) => ({
      ...e, questions: JSON.stringify(e.questions), scheduled_classes: e.scheduled_classes,
      startdate: e.start_date, enddate: e.end_date, isproctored: e.is_proctored, shufflequestions: e.shuffle_questions, showresults: e.show_results,
    })), ['questions']);
    console.log(`Exams: ${exams.length}`);

    // 11. Marks — realistic distribution, per (student, subject, exam)
    // Assign each student a general ability percentile ~ normal-ish via Box–Muller
    function ability() { const u = rand() || 1e-9, v = rand() || 1e-9; return clamp(0.5 + 0.22 * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v), 0.05, 0.99); }
    const studentAbility = new Map();
    for (const s of students) studentAbility.set(s.id, ability());

    for (const s of students) {
      const cls = classRows.find((c) => c.id === s.class_id);
      const abilityScore = studentAbility.get(s.id);
      for (const subj of cls.subjectRows) {
        // core academic strength varies per subject around ability
        const subjSkill = clamp(abilityScore + (rand() - 0.5) * 0.18, 0.03, 0.98);
        for (const ex of EXAM_SERIES) {
          const difficulty = ex.name === 'Final' || ex.name === 'Half-Yearly' ? -0.05 : ex.name === 'Unit Test 1' ? 0.05 : 0;
          // stronger students improve a little over the year, weaker students stay/decline slightly
          const trend = ex.name === 'Unit Test 1' ? -0.02 : ex.name === 'Final' ? 0.02 : 0;
          let raw = (subjSkill + difficulty + trend) * 100;
          raw += (rand() - 0.5) * 9; // per-exam noise so marks differ
          const pct = round1(clamp(raw, 28, 99));
          const lg = letterGrade(pct);
          const gradeId = uid();
          const row = {
            id: gradeId, studentid: s.id, student_id: s.id, courseid: null, course_id: null,
            classid: s.class_id, class_id: s.class_id, subjectid: subj.subjectId, subject_id: subj.subjectId,
            score: pct, maxscore: 100, max_score: 100, percentage: pct,
            lettergrade: lg, letter_grade: lg,
            comments: commentFor(lg), remarks: commentFor(lg), feedback: commentFor(lg),
            date: ex.date, examdate: ex.date, exam_date: ex.date,
            term: ex.name, academicyear: ACADEMIC_YEAR, academic_year: ACADEMIC_YEAR,
            gradedby: classTeacherAssign[s.class_id], graded_by: classTeacherAssign[s.class_id],
          };
          grades.push(row);
        }
      }
    }
    await batchInsert(client, 'public.grades', grades.map((g) => ({
      ...g, score: g.score, created_at: nowISO(), updated_at: nowISO(), createdat: nowISO(), updatedat: nowISO(),
    })), []);
    console.log(`Grades: ${grades.length} marks rows`);

    // 12. Overall stats + rank per class, CGPA; store on student user data
    const classOverall = new Map(); // classId -> [{sid,pct}]
    for (const s of students) {
      const cls = classRows.find((c) => c.id === s.class_id);
      const mine = grades.filter((g) => g.studentid === s.id);
      const perSubject = new Map();
      for (const g of mine) {
        const key = g.subject_id;
        if (!perSubject.has(key)) perSubject.set(key, []);
        perSubject.get(key).push(g.percentage);
      }
      // overall = mean of per-subject means
      let sum = 0, n = 0;
      for (const [k, arr] of perSubject) { sum += arr.reduce((a, b) => a + b, 0) / arr.length; n++; }
      const overall = n ? round1(sum / n) : 0;
      const cgpa = gpaOf(overall);
      const lg = letterGrade(overall);
      if (!classOverall.has(s.class_id)) classOverall.set(s.class_id, []);
      classOverall.get(s.class_id).push({ sid: s.id, overall, cgpa, lg, subjectCount: n });
    }
    // ranks
    for (const [classId, list] of classOverall) {
      const sorted = [...list].sort((a, b) => b.overall - a.overall);
      sorted.forEach((it, idx) => { it.rank = idx + 1; it.total = sorted.length; });
    }
    // ranks
    for (const [classId, list] of classOverall) {
      for (const it of list) {
        userStats.set(it.sid, it);
        const cls = classRows.find((c) => c.id === classId);
        const s = students.find((x) => x.id === it.sid);
        await client.query(
          `UPDATE public.users SET data = $2::jsonb WHERE id=$1`,
          [it.sid, JSON.stringify({ ...s.data, overall_percentage: it.overall, cgpa: it.cgpa, grade: it.lg, rank_in_class: it.rank, class_size: it.total, subject_count: it.subjectCount })]
        );
      }
    }

    // 13. AI reports -> document_store (collection 'ai_reports')
    for (const [classId, list] of classOverall) {
      for (const it of list) {
        const s = students.find((x) => x.id === it.sid);
        const report = buildAiReport(s, it);
        aiReportDocs.push({ collection: 'ai_reports', doc_id: s.id, data: report, school_id: SCHOOL_ID });
      }
    }
    await batchInsert(client, 'public.document_store', aiReportDocs, ['data']);

    // 14. Resources
    for (const s of students) {
      const cls = classRows.find((c) => c.id === s.class_id);
      const core = cls.subjectRows.filter((x) => x.name === 'Mathematics' || x.name === 'English' || x.name === 'Science' || x.name === 'Physics');
      const chosen = core.slice(0, 2);
      for (let r = 0; r < 3; r++) {
        const subj = chosen[r % chosen.length];
        const res = resourceFor(subj.name, r, s);
        resourceRows.push({ student_id: s.id, subject_id: subj.subjectId, subject_name: subj.name, concept_title: subj.name, title: res.title, url: res.url, source: res.source, source_label: res.sourceLabel, description: res.desc, school_id: SCHOOL_ID, pushed_by: classTeacherAssign[s.class_id] });
      }
    }
    await batchInsert(client, 'public.student_resources', resourceRows, []);
    console.log(`Resources: ${resourceRows.length}`);

    // 15. Timetable Mon–Sat, 6 periods
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const PERIODS = [['09:00', '09:45'], ['09:45', '10:30'], ['10:45', '11:30'], ['11:30', '12:15'], ['13:15', '14:00'], ['14:00', '14:45']];
    for (const cls of classRows) {
      const subs = cls.subjectRows;
      for (let d = 0; d < DAYS.length; d++) {
        for (let p = 0; p < PERIODS.length; p++) {
          const subj = subs[(d * 2 + p) % subs.length];
          const teacher = teachers.find((t) => t.subjects.includes(subj.name));
          timetableRows.push({ class_id: cls.id, day: DAYS[d], period: p + 1, subject_id: subj.subjectId, teacher_id: teacher ? teacher.id : classTeacherAssign[cls.id], room: `Room ${200 + Number(cls.grade)}${cls.section}`, start_time: PERIODS[p][0], end_time: PERIODS[p][1], status: 'active', school_id: SCHOOL_ID, academic_year: ACADEMIC_YEAR });
        }
      }
    }
    await batchInsert(client, 'public.timetable', timetableRows, []);
    console.log(`Timetable: ${timetableRows.length} entries`);

    // 16. Staff records + staff attendance
    await batchInsert(client, 'public.staff_records', staffRows, []);
    for (const t of teachers) {
      for (const date of attDays) {
        staffAtt.push({ school_id: SCHOOL_ID, staff_id: t.id, date, status: rand() < 0.97 ? 'present' : 'absent' });
      }
    }
    await batchInsert(client, 'public.staff_attendance', staffAtt, []);

    // 17. Notice board
    const NOTICES = [
      { title: 'Parent-Teacher Meeting', content: 'Parent-teacher meetings for all classes will be held on Saturday, 22 August 2026. Slots: 9:00 AM – 1:00 PM. All parents are requested to attend and collect report cards.', priority: 'high', expires_at: isoDaysAhead(40) },
      { title: 'Half-Yearly Exam Schedule Released', content: 'The Half-Yearly examination schedule (beginning 21 September 2026) has been published on your class timetable page. Syllabus and revision material available.', priority: 'high', expires_at: isoDaysAhead(60) },
      { title: 'Annual Day Celebration', content: 'Genesis Annual Day will be celebrated on 15 January 2027. Rehearsals begin the first week of December. Students participating should report to their class teachers.', priority: 'normal', expires_at: isoDaysAhead(180) },
      { title: 'Holiday Notice', content: 'The school will remain closed on Friday for a public holiday. Classes resume on Monday.', priority: 'high', expires_at: isoDaysAhead(10) },
      { title: 'Sports Meet 2026', content: 'Inter-class sports meet on 12–13 September 2026. Events include athletics, football, basketball and yoga. Registrations close 5 September.', priority: 'normal', expires_at: isoDaysAhead(45) },
      { title: 'Fee Payment Reminder', content: 'The last date for term-2 tuition fee payment is 15 October 2026. A late fee of ₹500 applies after the due date. Pay through the parent portal.', priority: 'high', expires_at: isoDaysAhead(75) },
      { title: 'Science Exhibition', content: 'Annual Science Exhibition on 28 September 2026. Students from Classes 6–10 can register projects with their science teachers.', priority: 'normal', expires_at: isoDaysAhead(55) },
      { title: 'Library Hours Extended', content: 'The library will remain open until 5:30 PM during the examination period for revision.', priority: 'low', expires_at: isoDaysAhead(90) },
    ];
    for (const n of NOTICES) {
      noticeRows.push({ school_id: SCHOOL_ID, title: n.title, content: n.content, created_by: adminId, priority: n.priority, expires_at: n.expires_at });
    }
    await batchInsert(client, 'public.notice_board', noticeRows, []);

    // 18. Notifications for admin, teachers, students, parents
    const nt = [];
    const pushNotif = (r) => nt.push({ school_id: SCHOOL_ID, user_id: r.user_id, title: r.title, message: r.message, body: r.message, type: r.type || 'info', priority: r.priority || 'normal', link: r.link || null });
    for (const t of teachers) {
      pushNotif({ user_id: t.id, title: 'Exam Reminder', message: `Half-Yearly exams begin 21 September — please finalise question papers and invigilation duties for your classes.`, type: 'exam', priority: 'high', link: '/teacher/timetable' });
      pushNotif({ user_id: t.id, title: 'Attendance Submitted', message: 'Today\'s class attendance records have been saved successfully.', type: 'attendance', priority: 'normal' });
    }
    for (const s of students) {
      const overall = userStats.get(s.id);
      pushNotif({ user_id: s.id, title: 'Result Published', message: `Your Quarterly result is out. Overall ${overall?.overall ?? '—'}% · Grade ${overall?.lg ?? '—'} · Rank ${overall?.rank ?? '—'} of ${overall?.total ?? '—'}.`, type: 'result', priority: 'high', link: '/student/report' });
      pushNotif({ user_id: s.id, title: 'Attendance Alert', message: 'Please maintain regular attendance this month to stay above 90%.', type: 'attendance', priority: 'normal' });
      pushNotif({ user_id: s.id, title: 'New Resource Available', message: `Practice material for ${classRows.find((c) => c.id === s.class_id).subjectRows[0].name} has been added to your resources.`, type: 'resource', priority: 'normal' });
    }
    for (const p of parents) {
      const child = students.find((s) => s.id === p.children_ids[0]);
      const overall = userStats.get(child.id);
      pushNotif({ user_id: p.id, title: 'Child Progress Update', message: `${child.display_name} scored ${overall?.overall ?? '—'}% overall (Grade ${overall?.lg ?? '—'}, Rank ${overall?.rank ?? '—'}).`, type: 'result', priority: 'high', link: '/parent/children' });
      pushNotif({ user_id: p.id, title: 'Fee Due Reminder', message: 'Term-2 fee is due by 15 October 2026. Please complete payment through the portal.', type: 'fee', priority: 'normal' });
    }
    pushNotif({ user_id: adminId, title: 'Holiday Notice', message: 'School closed Friday for a public holiday. Weekend timetable unaffected.', type: 'notice', priority: 'high' });
    pushNotif({ user_id: adminId, title: 'New Academic Year', message: 'Academic Year 2026–2027 is active. Verify teacher and class allocations in the admin panel.', type: 'system', priority: 'normal' });
    await batchInsert(client, 'public.notifications', nt, []);
    console.log(`Notifications: ${nt.length}`);

    // 19. Auth users + identities (real logins)
    await createAuthUsers(client, authUsers, adminEmails);
    console.log(`Auth: ${authUsers.length} accounts created (bcrypt)`);

    await client.query('COMMIT');
    console.log('\n✅ SEED COMMITTED');

    // 20. Validation + credentials doc
    await validateAndReport();
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ SEED FAILED — transaction rolled back, database unchanged.', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

// ────────────────────────── batch insert ──────────────────────────
async function batchInsert(client, table, rows, jsonbCols = []) {
  if (!rows.length) return;
  const qTable = table.startsWith('public.') ? table : `public.${table}`;
  const keys = Object.keys(rows[0]);
  const BATCH = 150;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const params = [];
    const ph = [];
    for (const row of chunk) {
      const placeholders = [];
      for (const k of keys) {
        let v = row[k];
        if (v === undefined) v = null;
        params.push(v);
        const cast = jsonbCols.includes(k) ? '::jsonb' : '';
        placeholders.push(`$${params.length}${cast}`);
      }
      ph.push(`(${placeholders.join(', ')})`);
    }
    const sql = `INSERT INTO ${qTable} (${cols}) VALUES ${ph.join(', ')}`;
    await client.query(sql, params);
  }
}

// ────────────────────────── auth creation ──────────────────────────
async function createAuthUsers(client, users, preservedEmails) {
  const seen = new Set(preservedEmails);
  const BATCH = 80;
  for (let i = 0; i < users.length; i += BATCH) {
    const chunk = users.slice(i, i + BATCH);
    const v = [];
    const p = [];
    const v2 = [];
    const p2 = [];
    for (const u of chunk) {
      if (seen.has(u.email.toLowerCase())) continue;
      seen.add(u.email.toLowerCase());
            p.push(u.id, u.email, u.pw, u.phone || '');
      v.push(`($${p.length - 3}::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', $${p.length - 2}, crypt($${p.length - 1}, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, ('{"role":"' || (SELECT role FROM public.users WHERE id = $${p.length - 3}::uuid) || '"}')::jsonb, now(), now(), false, false, '', '', '', '', '', '', $${p.length}, '', '')`);
      p2.push(u.id, u.email);
      v2.push(`(gen_random_uuid(), $${p2.length - 1}::uuid, jsonb_build_object('sub', $${p2.length - 1}::text, 'email', $${p2.length}::text), 'email', now(), now(), now(), $${p2.length}::text)`);
    }
    if (v.length) {
      await client.query(
        `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone, phone_change, phone_change_token) VALUES ${v.join(', ')}`,
        p
      );
      await client.query(
        `INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id) VALUES ${v2.join(', ')}`,
        p2
      );
    }
  }
}

// ────────────────────────── content helpers ──────────────────────────
function commentFor(lg) {
  const map = {
    'A+': 'Outstanding performance. Consistently accurate with strong conceptual clarity.',
    'A': 'Excellent work. Very good grasp of the subject and problem-solving skills.',
    'B+': 'Very good performance. Slight improvement needed in complex applications.',
    'B': 'Good effort. Regular practice will improve accuracy and speed.',
    'C': 'Average performance. Needs more practice and revision of fundamentals.',
    'D': 'Needs improvement. Must revise basic concepts with teacher support.',
    'F': 'At risk. Requires immediate remedial support and parent involvement.',
  };
  return map[lg];
}

function resourceFor(subject, idx, s) {
  const sets = {
    'Mathematics': [
      { source: 'khan_academy', sourceLabel: 'Khan Academy', title: `${subject} — Grade practice exercises`, url: 'https://www.khanacademy.org/math', desc: 'Practice exercises and instructional videos covering the full syllabus.' },
      { source: 'youtube', sourceLabel: 'YouTube', title: `${subject} made easy — video lessons`, url: 'https://www.youtube.com/results?search_query=mathematics+grade+6+cbse', desc: 'Curated video playlist explaining core topics step by step.' },
      { source: 'worksheet', sourceLabel: 'Worksheet', title: `${subject} practice worksheet — set ${idx + 1}`, url: '', desc: 'Printable worksheet with 25 problems and answer key.' },
      { source: 'pyq', sourceLabel: 'Previous Year Papers', title: `Previous year ${subject} question paper`, url: '', desc: 'Solved previous year papers for exam pattern practice.' },
    ],
    'English': [
      { source: 'khan_academy', sourceLabel: 'Khan Academy', title: 'English grammar and reading practice', url: 'https://www.khanacademy.org/humanities/grammar', desc: 'Grammar, vocabulary and reading comprehension exercises.' },
      { source: 'youtube', sourceLabel: 'YouTube', title: 'English — story lessons and grammar', url: 'https://www.youtube.com/results?search_query=cbse+english+grammar+lessons', desc: 'Video lessons for grammar and literature chapters.' },
      { source: 'notes', sourceLabel: 'Notes', title: 'English chapter notes & summaries', url: '', desc: 'Concise notes for each chapter with important questions.' },
      { source: 'worksheet', sourceLabel: 'Worksheet', title: 'English practice worksheets', url: '', desc: 'Grammar and composition worksheets for practice.' },
    ],
    'Science': [
      { source: 'khan_academy', sourceLabel: 'Khan Academy', title: 'Science — concept practice', url: 'https://www.khanacademy.org/science', desc: 'Interactive exercises and videos for core science concepts.' },
      { source: 'youtube', sourceLabel: 'YouTube', title: 'Science experiments and concepts', url: 'https://www.youtube.com/results?search_query=cbse+science+concepts', desc: 'Video demonstrations of experiments and theory.' },
      { source: 'pdf', sourceLabel: 'PDF', title: 'Science revision notes (PDF)', url: '', desc: 'Compiled revision notes covering the complete syllabus.' },
      { source: 'pyq', sourceLabel: 'Previous Year Papers', title: 'Previous year Science question paper', url: '', desc: 'Solved papers for exam practice.' },
    ],
    'Physics': [
      { source: 'khan_academy', sourceLabel: 'Khan Academy', title: 'Physics — topic-wise practice', url: 'https://www.khanacademy.org/science/physics', desc: 'Concept videos and practice on mechanics, optics and more.' },
      { source: 'youtube', sourceLabel: 'YouTube', title: 'Physics — numericals and derivations', url: 'https://www.youtube.com/results?search_query=cbse+physics+numericals', desc: 'Step-by-step numericals and derivation videos.' },
      { source: 'worksheet', sourceLabel: 'Worksheet', title: 'Physics numerical practice set', url: '', desc: 'Numericals covering each chapter with solutions.' },
      { source: 'pyq', sourceLabel: 'Previous Year Papers', title: 'Previous year Physics paper', url: '', desc: 'Board-pattern question paper for revision.' },
    ],
  };
  const set = sets[subject] || sets['Mathematics'];
  const item = set[idx % set.length];
  return item;
}

function buildAiReport(s, stats) {
  const { overall, lg, rank, total } = stats;
  let strengths = [];
  let weaknesses = [];
  if (lg === 'A+' || lg === 'A') {
    strengths = ['Strong conceptual understanding across core subjects', 'Excellent problem-solving and analytical skills', 'Consistent performance and disciplined study habits', 'Good participation in class discussions'];
    weaknesses = ['May occasionally overlook minor procedural details under time pressure', 'Can benefit from attempting more advanced/challenge problems'];
  } else if (lg === 'B+' || lg === 'B') {
    strengths = ['Solid grasp of fundamental concepts', 'Completes assignments on time and with care', 'Active in class activities'];
    weaknesses = ['Needs to practise application-level questions more', 'Should strengthen speed and accuracy in calculations', 'Revises concepts more deeply before exams'];
  } else if (lg === 'C') {
    strengths = ['Good attendance and willingness to learn', 'Understands basic topics with support'];
    weaknesses = ['Difficulty applying concepts to new problems', 'Needs consistent daily practice and revision', 'May struggle with time management in exams'];
  } else {
    strengths = ['Regular attendance and positive attitude', 'Responds well to one-on-one guidance'];
    weaknesses = ['Missing foundational concepts from previous classes', 'Needs structured revision and remedial support', 'Requires regular practice and parent/teacher follow-up'];
  }
  const improvement = lg === 'A+' || lg === 'A'
    ? 'Continue advanced practice and take on olympiad-level challenges; mentor peers in group study.'
    : lg === 'B+' || lg === 'B'
    ? 'Practise 3–4 application problems daily per subject; revise weak chapters weekly with mock tests.'
    : lg === 'C'
    ? 'Revise each chapter with solved examples, attend remedial classes, and redo practice worksheets.'
    : 'Begin with prerequisite concepts from the previous class (Khan Academy + worksheets), attend daily remedial support, and follow the teacher-guided improvement plan.';
  const prevClass = lg === 'A+' || lg === 'A'
    ? ['Advanced topics from current grade', 'Integration of multiple chapters']
    : lg === 'B+' || lg === 'B'
    ? ['Reinforce current-grade fundamentals', 'Practice previous-grade core topics as revision']
    : lg === 'C'
    ? ['Core concepts from the previous grade', 'Basic formulas and definitions']
    : ['Prerequisite concepts from the previous class', 'Foundational arithmetic/language skills', 'Simple definitions and first-level application'];
  const practice = lg === 'A+' || lg === 'A'
    ? ['Solve 5 challenge problems weekly per subject', 'Attempt previous-year competitive-level questions']
    : lg === 'B+' || lg === 'B'
    ? ['Attempt 1 full-length mock test per week', 'Practise 10 application problems per subject weekly']
    : lg === 'C'
    ? ['Complete 2 practice worksheets per subject weekly', 'Take weekly revision quizzes on covered topics']
    : ['Daily practice of 5 basic problems per subject', 'Weekly one-on-one remedial sessions with teacher'];
  return {
    student_id: s.id,
    student_name: s.display_name,
    class: s.className,
    grade: lg,
    percentage: overall,
    cgpa: stats.cgpa,
    rank,
    rank_total: total,
    generated_at: nowISO(),
    summary: `${s.display_name} scored ${overall}% overall (Grade ${lg}, Rank ${rank}/${total}) in ${ACADEMIC_YEAR}.`,
    strengths,
    weaknesses,
    teacher_remarks: commentFor(lg),
    parent_suggestions: lg === 'A+' || lg === 'A'
      ? ['Encourage participation in olympiads and inter-school competitions', 'Maintain a quiet, consistent study environment']
      : lg === 'B+' || lg === 'B'
      ? ['Set a fixed daily study schedule of 2 hours', 'Discuss school topics at home to reinforce learning']
      : lg === 'C'
      ? ['Supervise homework and ensure daily revision', 'Meet the class teacher once a month to review progress']
      : ['Meet with teachers regularly to review the remedial plan', 'Ensure 1 hour of daily guided study', 'Consider after-school remedial classes'],
    learning_path: lg === 'A+' || lg === 'A'
      ? ['Advanced problem sets', 'Peer tutoring / mentoring roles', 'Competitive exam preparation']
      : lg === 'B+' || lg === 'B'
      ? ['Foundation strengthening', 'Application-level practice', 'Mock test series']
      : lg === 'C'
      ? ['Concept revision', 'Guided practice worksheets', 'Weekly assessments']
      : ['Prerequisite concept revision', 'Remedial classes', 'Frequent low-stakes assessments'],
    recommended_resources: lg === 'A+' || lg === 'A'
      ? ['Khan Academy advanced practice', 'Olympiad preparation books', 'Previous year competitive papers']
      : lg === 'B+' || lg === 'B'
      ? ['Khan Academy grade practice', 'NCERT exemplar problems', 'Practice test series']
      : lg === 'C'
      ? ['Khan Academy concept videos', 'NCERT textbook examples', 'Practice worksheets']
      : ['Khan Academy — previous class concepts', 'NCERT basics worksheets', 'Remedial workbooks'],
    previous_class_concepts: prevClass,
    practice_suggestions: practice,
    improvement_plan: improvement,
  };
}

// ────────────────────────── validation + credentials ──────────────────────────
async function validateAndReport() {
  const counts = {};
  const tables = ['users', 'classes', 'subjects', 'student_class_enrollments', 'attendance', 'exams', 'grades', 'timetable', 'notifications', 'staff_records', 'staff_attendance', 'notice_board', 'student_resources', 'resource_requests', 'teacher_class_subject_assignments', 'class_subjects', 'class_teachers', 'document_store'];
  for (const t of tables) {
    try { counts[t] = (await q1(`SELECT count(*)::int c FROM public.${t}`)).c; } catch { counts[t] = 'n/a'; }
  }
  console.log('\n=== COUNTS ===');
  console.table(counts);

  const byRole = await q(`SELECT role, count(*)::int c FROM public.users GROUP BY role ORDER BY role`);
  console.log('Users by role:', byRole.map((r) => `${r.role}=${r.c}`).join('  '));

  // relationship checks
  const orphanAtt = (await q1(`SELECT count(*)::int c FROM public.attendance a LEFT JOIN public.users u ON u.id=a.student_id WHERE u.id IS NULL`)).c;
  const orphanEnr = (await q1(`SELECT count(*)::int c FROM public.student_class_enrollments e LEFT JOIN public.users u ON u.id=e.student_id WHERE u.id IS NULL`)).c;
  const orphanGrade = (await q1(`SELECT count(*)::int c FROM public.grades g LEFT JOIN public.users u ON u.id::text=g.student_id WHERE u.id IS NULL`)).c;
  const orphanTcs = (await q1(`SELECT count(*)::int c FROM public.teacher_class_subject_assignments t LEFT JOIN public.users u ON u.id=t.teacher_id WHERE u.id IS NULL`)).c;
  console.log('Orphan students in attendance/enrollment/grades/teacher-assign:', orphanAtt, orphanEnr, orphanGrade, orphanTcs);

  // grade distribution check
  const dist = await q(`SELECT letter_grade, count(*)::int c, round(avg(percentage)::numeric,1) avg_pct FROM public.grades GROUP BY letter_grade ORDER BY letter_grade`);
  console.log('Grade distribution:');
  console.table(dist);

  // attendance coverage
  const attPct = await q(`SELECT student_id, round(100.0*count(*) FILTER (WHERE status='present')/count(*)::numeric,1) pct FROM public.attendance GROUP BY student_id ORDER BY pct LIMIT 3`);
  const attMax = await q(`SELECT round(100.0*count(*) FILTER (WHERE status='present')/count(*)::numeric,1) pct FROM public.attendance GROUP BY student_id ORDER BY pct DESC LIMIT 3`);
  console.log('Attendance lowest:', JSON.stringify(attPct), 'highest:', JSON.stringify(attMax));

  // auth login sample verification
  const sample = await q(`SELECT email, role FROM public.users WHERE role='student' ORDER BY created_at LIMIT 1`);
  await verifyLogins(sample[0].email, 'Student@123', 'student');
  await verifyLogins((await q(`SELECT email FROM public.users WHERE role='parent' LIMIT 1`))[0].email, 'Parent@123', 'parent');
  await verifyLogins((await q(`SELECT email FROM public.users WHERE role='teacher' LIMIT 1`))[0].email, 'Teacher@123', 'teacher');

  await writeCredentials();
}

async function verifyLogins(email, password, role) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.log(`Login check skipped (no SUPABASE_URL)`); return; }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    const ok = !!(data.access_token || data.access_token === '');
    console.log(`Login [${role}] ${email} → ${data.access_token ? 'OK' : 'FAIL ' + JSON.stringify(data).substring(0, 160)}`);
  } catch (e) {
    console.log(`Login [${role}] ${email} → ERROR ${e.message}`);
  }
}

async function writeCredentials() {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const lines = [];
  lines.push(`# Genesis International School — Demo Login Credentials (Academic Year 2026–2027)`);
  lines.push('');
  lines.push(`All demo passwords satisfy the platform policy (uppercase, lowercase, digit, special character).`);
  lines.push('');
  lines.push(`## Admin`);
  lines.push('');
  lines.push(`| Username | Email | Password | Role |`);
  lines.push(`|---|---|---|---|`);
  const admins = await q(`SELECT display_name, email FROM public.users WHERE role ILIKE '%admin%' ORDER BY role`);
  for (const a of admins) lines.push(`| ${a.display_name} | ${a.email} | *(unchanged — as configured)* | admin |`);
  lines.push('');
  lines.push(`## Teachers (15)`);
  lines.push('');
  lines.push(`| Employee ID | Name | Assigned Classes | Username | Email | Password |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const t of teachers) {
    const cls = classRows.filter((c) => t.classSubjectMap?.[`${c.id}:${t.subjects[0]}`]).map((c) => `Class ${c.grade}-${c.section}`).join(', ');
    lines.push(`| ${t.emp} | ${t.name} | ${cls || 'Various'} | ${t.username} | ${t.email} | Teacher@123 |`);
  }
  lines.push('');
  lines.push(`## Students (${students.length})`);
  lines.push('');
  lines.push(`| Class | Roll | Name | Username | Email | Password | Grade | Percentage |`);
  lines.push(`|---|---|---|---|---|---|---|---|`);
  for (const s of students) {
    const st = userStats.get(s.id);
    lines.push(`| ${s.className} | ${s.roll_no} | ${s.display_name} | ${s.email.split('@')[0]} | ${s.email} | Student@123 | ${st?.lg ?? '—'} | ${st?.overall ?? '—'}% |`);
  }
  lines.push('');
  lines.push(`## Parents (${parents.length})`);
  lines.push('');
  lines.push(`| Child Name | Parent Name | Username | Email | Password |`);
  lines.push(`|---|---|---|---|---|`);
  for (const p of parents) {
    lines.push(`| ${p.data.child_name} | ${p.display_name} | ${p.email.split('@')[0]} | ${p.email} | Parent@123 |`);
  }
  lines.push('');
  const outDir = path.resolve(process.cwd(), '../../docs');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'DEMO_CREDENTIALS_2026-27.md');
  fs.writeFileSync(outFile, lines.join('\n') + '\n');
  console.log(`\n📄 Credentials written to ${outFile}`);
}

main();
