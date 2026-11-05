import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { toggleConceptCompletion, getConceptCompletionStatus } from '../services/concept-progress.service';
import { createMockSupabase } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.select.mockReturnThis();
  mockQuery.update.mockReturnThis();
  (mockQuery as any).upsert = jest.fn<any>().mockReturnThis();
  delete (mockQuery as any).data;
  delete (mockQuery as any).error;
  delete (mockQuery as any).count;
});

describe('toggleConceptCompletion', () => {
  it('creates a new progress record when none exists', async () => {
    // data undefined → empty results → upsert path
    const result = await toggleConceptCompletion({
      conceptId: 'c1',
      textbookId: 'tb1',
      chapterId: 'ch1',
      classId: 'cl1',
      teacherId: 't1',
    });

    expect(mockQuery.select).toHaveBeenCalled();
    expect(mockQuery.upsert).toHaveBeenCalled();
    expect(result.completed).toBe(true);
    expect(result.conceptId).toBe('c1');
  });

  it('toggles existing progress record', async () => {
    (mockQuery as any).data = [{ id: 'doc1', completed: false }];

    const result = await toggleConceptCompletion({
      conceptId: 'c2',
      textbookId: 'tb2',
      chapterId: 'ch2',
      classId: 'cl2',
      teacherId: 't2',
    });

    expect(mockQuery.select).toHaveBeenCalled();
    expect(mockQuery.update).toHaveBeenCalled();
    expect(result.completed).toBe(true);
  });
});

describe('getConceptCompletionStatus', () => {
  it('returns false when no record exists', async () => {
    // data undefined → empty → false
    const status = await getConceptCompletionStatus('c3', 'cl3', 't3');
    expect(status).toBe(false);
    expect(mockQuery.select).toHaveBeenCalled();
  });

  it('returns true when record indicates completed', async () => {
    (mockQuery as any).data = [{ completed: true }];

    const status = await getConceptCompletionStatus('c4', 'cl4', 't4');
    expect(status).toBe(true);
  });
});
