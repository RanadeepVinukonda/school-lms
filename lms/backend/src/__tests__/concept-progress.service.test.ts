import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { toggleConceptCompletion, getConceptCompletionStatus } from '../services/concept-progress.service';

// Mock the Supabase collections adapter
jest.mock('../database/adapter', () => ({
  collections: {
    conceptReleases: jest.fn(),
  },
}));

import { collections } from '../database/adapter';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('toggleConceptCompletion', () => {
  it('creates a new progress record when none exists', async () => {
    const mockSet = jest.fn().mockResolvedValue(undefined as any);
    const mockDoc = {
      set: mockSet,
    } as any;
    const mockGet = jest.fn().mockResolvedValue({ empty: true, docs: [] });
    const mockCollection = {
      where: jest.fn().mockReturnThis(),
      get: mockGet,
      doc: jest.fn(() => mockDoc),
    } as any;
    (collections.conceptReleases as jest.Mock).mockReturnValue(mockCollection);

    const result = await toggleConceptCompletion({
      conceptId: 'c1',
      textbookId: 'tb1',
      chapterId: 'ch1',
      classId: 'cl1',
      teacherId: 't1',
    });

    expect(mockGet).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalled();
    expect(result.completed).toBe(true);
    expect(result.conceptId).toBe('c1');
  });

  it('toggles existing progress record', async () => {
    const existingData = {
      completed: false,
    };
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockDoc = {
      data: () => existingData,
      ref: { update: mockUpdate },
    } as any;
    const mockGet = jest.fn().mockResolvedValue({ docs: [mockDoc] });
    const mockCollection = {
      where: jest.fn().mockReturnThis(),
      get: mockGet,
    } as any;
    (collections.conceptReleases as jest.Mock).mockReturnValue(mockCollection);

    const result = await toggleConceptCompletion({
      conceptId: 'c2',
      textbookId: 'tb2',
      chapterId: 'ch2',
      classId: 'cl2',
      teacherId: 't2',
    });

    expect(mockGet).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({ completed: true, updated_at: expect.any(String) });
    expect(result.completed).toBe(true);
  });
});

describe('getConceptCompletionStatus', () => {
  it('returns false when no record exists', async () => {
    const mockGet = jest.fn().mockResolvedValue({ empty: true, docs: [] });
    const mockCollection = {
      where: jest.fn().mockReturnThis(),
      get: mockGet,
    } as any;
    (collections.conceptReleases as jest.Mock).mockReturnValue(mockCollection);

    const status = await getConceptCompletionStatus('c3', 'cl3', 't3');
    expect(status).toBe(false);
    expect(mockGet).toHaveBeenCalled();
  });

  it('returns true when record indicates completed', async () => {
    const mockGet = jest.fn().mockResolvedValue({ docs: [{ data: () => ({ completed: true }) }] });
    const mockCollection = {
      where: jest.fn().mockReturnThis(),
      get: mockGet,
    } as any;
    (collections.conceptReleases as jest.Mock).mockReturnValue(mockCollection);

    const status = await getConceptCompletionStatus('c4', 'cl4', 't4');
    expect(status).toBe(true);
  });
});
