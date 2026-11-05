import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockQuery: any = {
  select: jest.fn(() => mockQuery),
  eq: jest.fn(() => mockQuery),
  in: jest.fn(() => mockQuery),
  is: jest.fn(() => mockQuery),
  contains: jest.fn(() => mockQuery),
  overlaps: jest.fn(() => mockQuery),
  order: jest.fn(() => mockQuery),
  range: jest.fn(() => mockQuery),
  insert: jest.fn(() => mockQuery),
  then: jest.fn(),
};

const mockSupabaseClient = {
  from: jest.fn(() => mockQuery),
};

jest.mock('../services/supabase', () => ({
  getSupabaseClient: jest.fn(() => mockSupabaseClient),
  getSupabaseAdmin: jest.fn(() => mockSupabaseClient),
}));

jest.mock('../services/notification.service', () => ({
  createBulkNotifications: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../services/academic-year.service', () => ({
  getCurrentAcademicYear: jest.fn(() => ({
    name: '2024-2025',
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    isCurrent: true,
    status: 'active',
  })),
}));

import {
  markAttendance,
  getClassAttendance,
  getStudentAttendance,
  getAttendanceReport,
  exportAttendanceCSV,
} from '../services/attendance.service';

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
});

describe('attendance.service', () => {
  it('marks attendance for students', async () => {
    let queryCallCount = 0;
    mockQuery.then.mockImplementation((resolve: any) => {
      queryCallCount++;
      if (queryCallCount === 1) {
        return resolve({ data: [{ id: 's1' }], error: null }); // enrollment validation
      } else if (queryCallCount === 2) {
        return resolve({ data: [], error: null }); // duplicate check
      } else if (queryCallCount === 3) {
        return resolve({ data: null, error: null }); // insert record
      } else if (queryCallCount === 4) {
        return resolve({ data: [{ id: 's1', display_name: 'John' }], error: null }); // student names
      } else if (queryCallCount === 5) {
        return resolve({ data: [{ id: 'p1', children_ids: ['s1'], role: 'parent' }], error: null }); // parents
      }
      return resolve({ data: [], error: null });
    });

    const result = await markAttendance({
      studentIds: ['s1'],
      classId: 'c1',
      date: '2025-01-15',
      status: 'present',
      markedBy: 't1',
    });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('present');
  });

  it('returns attendance records', async () => {
    mockQuery.then.mockImplementation((resolve: any) => {
      return resolve({
        data: [{
          id: 'a1',
          student_id: 's1',
          class_id: 'c1',
          date: '2025-01-15',
          status: 'present',
          marked_by: 't1',
          note: '',
          marked_at: '',
          created_at: '',
          updated_at: '',
        }],
        error: null,
      });
    });
    const result = await getClassAttendance('c1');
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe('a1');
    expect(result[0].studentId).toBe('s1');
  });

  it('returns sorted attendance records', async () => {
    mockQuery.then.mockImplementation((resolve: any) => {
      return resolve({
        data: [{
          id: 'a1',
          student_id: 's1',
          class_id: 'c1',
          date: '2025-01-15',
          status: 'present',
          marked_by: 't1',
          note: '',
          marked_at: '',
          created_at: '',
          updated_at: '',
        }],
        error: null,
      });
    });
    const result = await getStudentAttendance('s1');
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe('a1');
    expect(result[0].studentId).toBe('s1');
  });

  it('returns records and summary', async () => {
    const docs = [
      { id: 'a1', student_id: 's1', class_id: 'c1', date: '2025-01-15', status: 'present' },
      { id: 'a2', student_id: 's1', class_id: 'c1', date: '2025-01-16', status: 'absent' },
    ];
    let callCount = 0;
    mockQuery.then.mockImplementation((resolve: any) => {
      callCount++;
      if (callCount === 1) {
        // First .then: students query via .contains()
        return resolve({ data: [{ id: 's1', display_name: 'Alice', roll_no: '1', student_id: 'STU001' }], error: null });
      }
      // Second .then: attendance records via getClassAttendance
      return resolve({ data: docs, error: null });
    });
    const result = await getAttendanceReport('c1');
    expect(result.summary.s1.present).toBe(1);
    expect(result.summary.s1.absent).toBeGreaterThanOrEqual(1);
  });

  it('generates CSV string', async () => {
    let callCount = 0;
    mockQuery.then.mockImplementation((resolve: any) => {
      callCount++;
      if (callCount === 1) {
        // First call is getClassAttendance
        return resolve({
          data: [{
            id: 'a1',
            student_id: 's1',
            class_id: 'c1',
            date: '2025-01-15',
            status: 'present',
            marked_by: 't1',
            note: 'some note',
            marked_at: 'now',
          }],
          error: null,
        });
      } else if (callCount === 2) {
        // Second call is users in studentIds
        return resolve({
          data: [{ id: 's1', display_name: 'John' }],
          error: null,
        });
      }
      return resolve({ data: [], error: null });
    });

    const csv = await exportAttendanceCSV('c1');
    expect(typeof csv).toBe('string');
    expect(csv).toContain('StudentId');
    expect(csv).toContain('John');
  });
});
