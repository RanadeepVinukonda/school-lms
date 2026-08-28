import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the analytics.service dependency to avoid loading heavy analytics modules.
jest.mock('../services/analytics.service', () => ({
  getAdminDashboard: jest.fn(() => Promise.resolve({})),
}));

// Build a supabase mock that routes firestore_docs queries by collection so the
// shared loader can be exercised realistically.
function resolvable(data: unknown) {
  return {
    then: (resolve: Function) => Promise.resolve(resolve({ data, error: null })),
  };
}

function buildMockSupabase(opts: {
  firestore?: Record<string, any[]>;
  users?: any[];
  classesView?: any[];
}) {
  const firestore = opts.firestore || {};
  const users = opts.users || [];
  const classesView = opts.classesView || [];

  return {
    from: jest.fn((table: string) => {
      if (table === 'firestore_docs') {
        return {
          select: () => ({
            eq: (field: string, value: string) => {
              if (field === 'collection') return resolvable(firestore[value] || []);
              return resolvable([]);
            },
          }),
        };
      }
      if (table === 'users') {
        const q = {
          eq: (field: string, value: any) => resolvable(users.filter((u: any) => u[field] === value)),
          then: (resolve: Function) => Promise.resolve(resolve({ data: users, error: null })),
        };
        return { select: () => q };
      }
      if (table === 'classes') {
        return { select: () => resolvable(classesView) };
      }
      return { select: () => resolvable([]) };
    }),
  };
}

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(),
  getSupabaseClient: jest.fn(),
}));

import { getSupabaseAdmin } from '../services/supabase';
import {
  getGradeComparison,
  getClassComparison,
  getTeacherComparison,
  getStudentComparison,
} from '../services/school-analytics.service';

const mockGetSupabaseAdmin = getSupabaseAdmin as jest.Mock;

const quizV2 = [
  { doc_id: 'q1', data: { classId: 'c1', teacherId: 't1' } },
  { doc_id: 'q2', data: { classId: 'c2', teacherId: 't2' } },
];

const quizAttemptV2 = [
  { data: { quizId: 'q1', studentId: 's1', percentage: 95 } },
  { data: { quizId: 'q1', studentId: 's2', percentage: 90 } },
  { data: { quizId: 'q2', studentId: 's1', percentage: 60 } },
];

const users = [
  { id: 't1', role: 'teacher', display_name: 'Teacher One' },
  { id: 't2', role: 'teacher', display_name: 'Teacher Two' },
  { id: 's1', role: 'student', display_name: 'Student One', class_ids: ['c1'] },
  { id: 's2', role: 'student', display_name: 'Student Two', class_ids: ['c1'] },
];

const classesView = [
  { id: 'c1', name: 'Grade 5 A', grade: '5', section: 'A' },
  { id: 'c2', name: 'Grade 6 B', grade: '6', section: 'B' },
];

function firestore() {
  return {
    quizV2,
    examV2: [],
    assignmentV2: [],
    quizAttemptV2,
    examAttemptV2: [],
    assignmentSubmissionV2: [],
  };
}

function setup() {
  const supabase = buildMockSupabase({ firestore: firestore(), users, classesView });
  mockGetSupabaseAdmin.mockReturnValue(supabase);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('grade comparison', () => {
  it('returns reliability fields, distinct exam counts, and ranks', async () => {
    setup();
    const result: any[] = await getGradeComparison();
    expect(result.length).toBe(2);

    const grade5 = result.find((g) => g.grade === '5')!;
    const grade6 = result.find((g) => g.grade === '6')!;

    // grade5: 2 records (95+90) across 1 distinct exam; grade6: 1 record across 1 exam
    expect(grade5.examCount).toBe(1);
    expect(grade6.examCount).toBe(1);
    expect(grade5.adjustedScore).toBeDefined();
    expect(grade5.confidence).toBe('Moderate confidence');
    expect(grade6.confidence).toBe('Low confidence');

    // School reference = (95+90+60)/3 = 81.67
    // grade5 avg 92.5 -> adjusted 85 ; grade6 avg 60 -> adjusted 78
    expect(grade5.adjustedScore).toBe(85);
    expect(grade6.adjustedScore).toBe(78);

    // Sorting by adjusted score
    expect(grade5.rank).toBe(1);
    expect(grade6.rank).toBe(2);
  });
});

describe('class comparison', () => {
  it('ranks classes by adjusted score', async () => {
    setup();
    const result: any[] = await getClassComparison();
    expect(result.length).toBe(2);

    const c1 = result.find((c) => c.classId === 'c1')!;
    const c2 = result.find((c) => c.classId === 'c2')!;

    expect(c1.rank).toBe(1);
    expect(c2.rank).toBe(2);
    expect(c1.adjustedScore).toBeGreaterThan(c2.adjustedScore);
    expect(c1.studentCount).toBe(2); // s1 and s2
    expect(c2.studentCount).toBe(1);
  });
});

describe('teacher comparison', () => {
  it('aggregates per teacher with class and exam counts', async () => {
    setup();
    const result: any[] = await getTeacherComparison();
    const t1 = result.find((t) => t.teacherId === 't1')!;
    const t2 = result.find((t) => t.teacherId === 't2')!;

    expect(result.length).toBe(2);
    expect(t1.teacherName).toBe('Teacher One');
    expect(t1.examCount).toBe(1);
    expect(t1.classCount).toBe(1);
    expect(t1.rank).toBe(1);
    expect(t2.rank).toBe(2);
    expect(t1.adjustedScore).toBeGreaterThan(t2.adjustedScore);
  });
});

describe('student comparison', () => {
  it('uses per-grade reference and ranks students', async () => {
    setup();
    const result: any[] = await getStudentComparison();

    // Both students are in class c1 -> grade '5'
    const s1 = result.find((s) => s.studentId === 's1')!;
    const s2 = result.find((s) => s.studentId === 's2')!;

    expect(result.length).toBe(2);
    expect(s1.studentName).toBe('Student One');
    expect(s1.grade).toBe('5');
    // s1: 2 exams (q1+q2); s2: 1 exam (q1)
    expect(s1.examCount).toBe(2);
    expect(s2.examCount).toBe(1);

    // grade ref = (95+90+60)/3 = 81.67
    // s1 avg 77.5 -> adjusted 80 ; s2 avg 90 -> adjusted 83
    expect(s2.adjustedScore).toBeGreaterThan(s1.adjustedScore);
    expect(s2.rank).toBe(1);
    expect(s1.rank).toBe(2);

    expect(s1.confidence).toBe('Moderate confidence');
    expect(s2.confidence).toBe('Low confidence');
  });
});
