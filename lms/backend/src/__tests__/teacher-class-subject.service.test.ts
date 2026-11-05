import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { assignTeacher } from '../services/teacher-class-subject.service';
import { createMockSupabase } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Chainable: all non-terminal methods must return mockQuery
  mockQuery.select.mockReturnThis();
  mockQuery.update.mockReturnThis();
  (mockQuery as any).upsert = jest.fn<any>().mockReturnThis();
  // Reset query result data
  delete (mockQuery as any).data;
  delete (mockQuery as any).error;
  delete (mockQuery as any).count;
});

describe('assignTeacher', () => {
  it('creates a new assignment when none exists', async () => {
    // Default: mockQuery.data undefined → empty results → insert path
    const result = await assignTeacher({
      teacherId: 't1',
      classId: 'c1',
      subjectId: 's1',
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('firestore_docs');
    expect(mockQuery.insert).toHaveBeenCalled();
    expect(result.teacherId).toBe('t1');
    expect(result.id).toBeDefined();
  });

  it('reassigns to a new teacher instead of throwing ConflictError', async () => {
    (mockQuery as any).data = [{
      doc_id: 'assignId',
      data: { teacherId: 'old', classId: 'c1', subjectId: 's1' },
    }];

    const result = await assignTeacher({
      teacherId: 'new',
      classId: 'c1',
      subjectId: 's1',
    });

    expect(mockQuery.update).toHaveBeenCalled();
    expect(result.teacherId).toBe('new');
    expect(result.id).toBe('assignId');
  });
});
