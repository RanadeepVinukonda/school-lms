import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundError } from '../utils/errors';
import { createMockSupabase } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));
jest.mock('../services/notification.service', () => ({
  createNotification: jest.fn(() => Promise.resolve({ id: 'n1' })),
  createBulkNotifications: jest.fn(() => Promise.resolve(['n1'])),
}));

import { getStudentGrades, getGradebook, updateGrade, bulkUpdate, generateReport } from '../services/grade.service';

const gradeData: any = { current: {} };

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.select.mockReturnThis();
  mockQuery.update.mockReturnThis();
  (mockQuery as any).upsert = jest.fn<any>().mockReturnThis();
  (mockQuery.single as any).mockReset();
  (mockQuery.maybeSingle as any).mockReset();
  mockQuery.single.mockResolvedValue(({ data: null, error: null }) as any);
  mockQuery.maybeSingle.mockResolvedValue(({ data: null, error: null }) as any);
  delete (mockQuery as any).data;
  delete (mockQuery as any).error;
  delete (mockQuery as any).count;
  gradeData.current = {};
});

describe('grade.service', () => {
  it('returns grades for a student', async () => {
    (mockQuery as any).data = [gradeData.current];
    const result = await getStudentGrades('s1');
    expect(Array.isArray(result)).toBe(true);
  });
  it('returns paginated gradebook', async () => {
    (mockQuery as any).data = [gradeData.current];
    (mockQuery as any).count = 1;
    const result = await getGradebook({ classId: 'c1', page: '1', limit: '10' });
    expect(result.items).toBeDefined();
    expect(result.total).toBeGreaterThanOrEqual(0);
  });
  it('updates and returns grade with letter grade', async () => {
    mockQuery.maybeSingle.mockResolvedValue(({ data: { id: 'grade-1', studentId: 's1', courseId: 'c1', score: 50, totalPoints: 100 }, error: null }) as any);
    const result = await updateGrade('grade-1', { score: 90, totalPoints: 100, gradedBy: 't1' });
    expect(result.letterGrade).toBeDefined();
  });
  it('throws NotFoundError for missing grade', async () => {
    // Default maybeSingle returns { data: null } → gradeRow returns null → NotFoundError
    await expect(updateGrade('bad', { score: 50, totalPoints: 100, gradedBy: 't1' })).rejects.toThrow(NotFoundError);
  });
  it('updates multiple grades', async () => {
    mockQuery.maybeSingle.mockResolvedValue(({ data: { id: 'c1_s1', studentId: 's1' }, error: null }) as any);
    (mockQuery as any).count = 0;
    const result = await bulkUpdate([{ studentId: 's1', score: 90, totalPoints: 100 }], 'c1', 't1');
    expect(result).toHaveLength(1);
  });
  it('generates report with summary', async () => {
    (mockQuery as any).data = [{ score: 85, total_points: 100, student_id: 's1' }];
    const result = await generateReport('s1', '2025', '1');
    expect(result.summary).toBeDefined();
    expect(result.summary.letterGrade).toBe('B');
  });
});
