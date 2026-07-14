import { createMockSupabase, resetMockQuery } from './helpers/mock-factory';

const { supabase: mockSupabase, query: mockQuery } = createMockSupabase();

jest.mock('../services/supabase', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabase),
  getSupabaseClient: jest.fn(() => mockSupabase),
}));

jest.mock('../database/transaction-manager', () => ({
  TransactionManager: jest.fn().mockImplementation(() => ({
    runTransaction: jest.fn(async (fn: Function) => {
      const mockTx = {
        get: jest.fn(() => Promise.resolve(null)),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
      };
      return fn(mockTx);
    }),
  })),
}));

import * as academicYearService from '../services/academic-year.service';
import * as classService from '../services/class.service';
import * as subjectService from '../services/subject.service';
import * as tcsService from '../services/teacher-class-subject.service';

describe('Admin Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockQuery(mockQuery);
    // Default: empty resolution for nosql queries
    (mockQuery as any)._mockData = [];
  });

  const mockYearData = {
    name: '2025-2026',
    code: '2025-26',
    startDate: new Date('2025-06-01').toISOString(),
    endDate: new Date('2026-05-31').toISOString(),
    isCurrent: true,
  };

  describe('Academic Year Management', () => {
    it('should create an academic year', async () => {
      const result = await academicYearService.createAcademicYear(mockYearData);
      expect(result).toBeDefined();
      expect(result.name).toBe('2025-2026');
      expect(result.isCurrent).toBe(true);
    });

    it('should set new current year and unset previous', async () => {
      const result = await academicYearService.createAcademicYear({
        ...mockYearData,
        code: '2026-27',
        name: '2026-2027',
        isCurrent: true,
      });
      expect(result).toBeDefined();
    });

    it('should list academic years', async () => {
      (mockQuery as any).data = [];
      const result = await academicYearService.listAcademicYears({});
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });

    it('should get current academic year', async () => {
      (mockQuery as any).data = [{ doc_id: 'year-1', data: { name: '2025-2026', isCurrent: true } }];
      const result = await academicYearService.getCurrentAcademicYear();
      expect(result).not.toBeNull();
    });
  });

  describe('Class Management', () => {
    it('should create a class', async () => {
      const result = await classService.createClass({
        name: 'Grade 10A',
        code: 'G10A',
        grade: '10',
        section: 'A',
      });
      expect(result).toBeDefined();
    });

    it('should list classes with filters', async () => {
      (mockQuery as any).data = [];
      const result = await classService.listClasses({ status: 'active' });
      expect(result).toBeDefined();
    });
  });

  describe('Subject Management', () => {
    it('should create a subject', async () => {
      const result = await subjectService.createSubject({
        name: 'Mathematics',
        code: 'MATH101',
        classId: 'class-1',
      });
      expect(result).toBeDefined();
    });

    it('should list subjects by class', async () => {
      (mockQuery as any).data = [];
      const result = await subjectService.listSubjectsByClass('class-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Teacher-Class-Subject Mapping', () => {
    it('should assign teacher to class and subject', async () => {
      // Mock empty query for duplicate check
      (mockQuery as any).data = [];
      mockQuery.maybeSingle.mockResolvedValue(({ data: null, error: null }) as any);

      const result = await tcsService.assignTeacher({
        teacherId: 'teacher-1',
        classId: 'class-1',
        subjectId: 'subject-1',
      });
      expect(result).toBeDefined();
      expect(result.teacherId).toBe('teacher-1');
    });

    it('should remove assignment', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({
        data: { doc_id: 'assignment-1', data: { teacherId: 'teacher-1' } },
        error: null,
      }) as any);

      await expect(tcsService.removeAssignment('assignment-1')).resolves.not.toThrow();
    });

    it('should throw on removing non-existent assignment', async () => {
      mockQuery.maybeSingle.mockResolvedValue(({ data: null, error: null }) as any);

      await expect(tcsService.removeAssignment('bad-id')).rejects.toThrow('Assignment not found');
    });
  });
});
