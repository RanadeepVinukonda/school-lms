import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { assignTeacher } from '../services/teacher-class-subject.service';

// Mock the Firestore collections used by the service
jest.mock('../firebase/firestore', () => ({
  collections: {
    teacherClassSubject: jest.fn(),
  },
}));

import { collections } from '../firebase/firestore';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('assignTeacher', () => {
  it('creates a new assignment when none exists', async () => {
      // @ts-ignore
      const mockAdd = jest.fn().mockResolvedValue({ id: 'newId' });
    const mockCollection = {
      where: jest.fn().mockReturnThis(),
        // @ts-ignore
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      add: mockAdd,
    } as any;
    (collections.teacherClassSubject as jest.Mock).mockReturnValue(mockCollection);

    const result = await assignTeacher({
      teacherId: 't1',
      classId: 'c1',
      subjectId: 's1',
    });

    expect(mockAdd).toHaveBeenCalled();
    expect(result.id).toBe('newId');
    expect(result.teacherId).toBe('t1');
  });

  it('reassigns to a new teacher instead of throwing ConflictError', async () => {
    const existingDoc = {
      id: 'assignId',
      data: () => ({ teacherId: 'old', classId: 'c1', subjectId: 's1' }),
    } as any;
      // @ts-ignore
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      // @ts-ignore
      const mockGet = jest.fn().mockResolvedValue({
      id: 'assignId',
      data: () => ({ teacherId: 'new', classId: 'c1', subjectId: 's1' }),
    });
    const mockCollection = {
      where: jest.fn().mockReturnThis(),
        // @ts-ignore
        get: jest.fn().mockResolvedValue({ empty: false, docs: [existingDoc] }),
      doc: jest.fn(() => ({
        update: mockUpdate,
        get: mockGet,
      })),
    } as any;
    (collections.teacherClassSubject as jest.Mock).mockReturnValue(mockCollection);

    const result = await assignTeacher({
      teacherId: 'new',
      classId: 'c1',
      subjectId: 's1',
    });

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 'new' }));
    expect(result.teacherId).toBe('new');
    expect(result.id).toBe('assignId');
  });
});
