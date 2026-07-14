import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundError } from '../utils/errors';
import { createMockSupabase } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));
jest.mock('../services/course.service', () => ({ getEnrollments: jest.fn(() => Promise.resolve([])) }));
jest.mock('../services/notification.service', () => ({
  createNotification: jest.fn(() => Promise.resolve({ id: 'n1' })),
  createBulkNotifications: jest.fn(() => Promise.resolve(['n1'])),
}));

import { createAssignment, updateAssignment, deleteAssignment, getAssignmentById, listAllAssignments, listAssignmentsByCourse, submitAssignment, gradeSubmission } from '../services/assignment.service';

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.select.mockReturnThis();
  mockQuery.update.mockReturnThis();
  mockQuery.delete.mockReturnThis();
  (mockQuery as any).upsert = jest.fn<any>().mockReturnThis();
  mockQuery.single.mockResolvedValue(({ data: null, error: null }) as any);
  mockQuery.maybeSingle.mockResolvedValue(({ data: null, error: null }) as any);
  delete (mockQuery as any).data;
  delete (mockQuery as any).error;
  delete (mockQuery as any).count;
});

describe('assignment.service', () => {
  it('creates and returns assignment', async () => {
    const result = await createAssignment({ title: 'HW1', description: '', courseId: 'c1', dueDate: new Date().toISOString(), points: 100 });
    expect(result.title).toBe('HW1');
  });
  it('returns assignment', async () => {
    mockQuery.maybeSingle.mockResolvedValue(({ data: { title: 'HW1', courseId: 'c1', maxAttempts: 3 }, error: null }) as any);
    const result = await getAssignmentById('a1');
    expect(result.title).toBe('HW1');
  });
  it('throws NotFoundError for missing', async () => {
    await expect(getAssignmentById('bad')).rejects.toThrow(NotFoundError);
  });
  it('returns paginated assignments', async () => {
    (mockQuery as any).data = [];
    (mockQuery as any).count = 3;
    const result = await listAllAssignments({ page: '1', limit: '10' });
    expect(result.items).toBeDefined();
    expect(result.total).toBe(3);
  });
  it('returns assignments for course', async () => {
    (mockQuery as any).data = [];
    (mockQuery as any).count = 0;
    const result = await listAssignmentsByCourse('c1', { page: '1', limit: '10' });
    expect(result.items).toBeDefined();
  });
  it('updates assignment fields', async () => {
    mockQuery.maybeSingle.mockResolvedValue(({ data: { title: 'HW1', courseId: 'c1' }, error: null }) as any);
    mockQuery.single.mockResolvedValue(({ data: { title: 'Updated', courseId: 'c1' }, error: null }) as any);
    const result = await updateAssignment('a1', { title: 'Updated' });
    expect(result.title).toBe('Updated');
  });
  it('deletes assignment', async () => {
    mockQuery.maybeSingle.mockResolvedValue(({ data: { title: 'HW1' }, error: null }) as any);
    await expect(deleteAssignment('a1')).resolves.not.toThrow();
  });
  it('submits within max attempts', async () => {
    mockQuery.maybeSingle
      .mockResolvedValueOnce({ data: { title: 'HW1', courseId: 'c1', maxAttempts: 3, dueDate: new Date(Date.now() + 86400000).toISOString() }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const result = await submitAssignment('a1', 's1', { content: 'My answer' });
    expect(result.status).toBe('submitted');
  });
  it('grades a submission', async () => {
    mockQuery.maybeSingle.mockResolvedValue(({ data: { title: 'HW1', courseId: 'c1', studentId: 's1' }, error: null }) as any);
    await expect(gradeSubmission('a1', 'sub1', { score: 90, totalPoints: 100 })).resolves.not.toThrow();
  });
});
