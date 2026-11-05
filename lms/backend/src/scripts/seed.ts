/**
 * Seed script — creates the base school structure (classes and subjects).
 *
 * Usage:  npx tsx src/scripts/seed.ts
 *
 * Idempotent: skips records that already exist.
 * Does NOT create demo users, credentials, or demo records.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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

  // ── Done ────────────────────────────────────────────────────────
  console.log('\n=== Seed Complete ===');
  console.log(`Classes: ${CLASS_GRADES.length}`);
  console.log(`Subjects: ${SUBJECTS.length}`);
  console.log(`Class-Subject links: ${classSubjectCount}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
