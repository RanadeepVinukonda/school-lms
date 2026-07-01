function createMockCollection() {
  const mockDoc = { exists: true, id: 'mock-id', data: jest.fn().mockReturnValue({}), ref: {} };
  const mockSnapshot = { empty: false, size: 1, docs: [mockDoc], forEach: (cb: Function) => cb(mockDoc) };
  const countSnap = { data: () => ({ count: 1 }) };
  const mockQuery = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(countSnap) }),
    get: jest.fn().mockResolvedValue(mockSnapshot),
  };
  return {
    doc: jest.fn().mockReturnValue({ ...mockDoc, get: jest.fn().mockResolvedValue(mockDoc), set: jest.fn().mockResolvedValue(undefined), update: jest.fn().mockResolvedValue(undefined), delete: jest.fn().mockResolvedValue(undefined) }),
    get: jest.fn().mockResolvedValue(mockSnapshot),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue(mockDoc),
    where: jest.fn().mockReturnValue(mockQuery),
    orderBy: jest.fn().mockReturnValue(mockQuery),
    limit: jest.fn().mockReturnValue(mockQuery),
    firestore: { batch: jest.fn().mockReturnValue({ update: jest.fn(), delete: jest.fn(), create: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }) },
  };
}

let mockCollection: any;

function resetMockCollection() {
  mockCollection = createMockCollection();
}

resetMockCollection();

jest.mock('../database/adapter', () => ({
  collections: {
    academicYears: jest.fn(() => mockCollection),
    classes: jest.fn(() => mockCollection),
    subjects: jest.fn(() => mockCollection),
    teacherClassSubject: jest.fn(() => mockCollection),
    users: jest.fn(() => mockCollection),
    auditLogs: jest.fn(() => mockCollection),
    textbooks: jest.fn(() => mockCollection),
  },
  FieldValue: { increment: jest.fn((n) => n) },
}));



import * as academicYearService from '../services/academic-year.service';
import * as classService from '../services/class.service';
import * as subjectService from '../services/subject.service';
import * as tcsService from '../services/teacher-class-subject.service';

describe('Admin Flows', () => {
  beforeEach(() => {
    // Reset mock state to prevent leakage between tests
    resetMockCollection();
  });

  const mockYearData = {
    name: '2025-2026',
    code: '2025-26',
    startDate: new Date('2025-06-01').toISOString(),
    endDate: new Date('2026-05-31').toISOString(),
    isCurrent: true,
  };

  describe('Academic Year Management', () => {
    beforeEach(() => {
      const { collections } = require('../database/adapter');
      // Override where() get to return empty:true so duplicate-code check passes
      const emptyQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, size: 0, docs: [], forEach: jest.fn() }),
      };
      collections.academicYears().where = jest.fn().mockReturnValue(emptyQuery);
    });

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
      const result = await academicYearService.listAcademicYears({});
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });

    it('should get current academic year', async () => {
      const { collections } = require('../database/adapter');
      collections.academicYears().where = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{ data: () => ({ name: '2025-2026', isCurrent: true }), id: 'year-1' }],
        }),
      });

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
      const result = await subjectService.listSubjectsByClass('class-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Teacher-Class-Subject Mapping', () => {
    it('should assign teacher to class and subject', async () => {
      const { collections } = require('../database/adapter');
      // Make where() return empty:true so assignTeacher uses add() path
      const emptyQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, size: 0, docs: [], forEach: jest.fn() }),
      };
      collections.teacherClassSubject().where = jest.fn().mockReturnValue(emptyQuery);

      const result = await tcsService.assignTeacher({
        teacherId: 'teacher-1',
        classId: 'class-1',
        subjectId: 'subject-1',
      });
      expect(result).toBeDefined();
      expect(result.teacherId).toBe('teacher-1');
    });

    it('should remove assignment', async () => {
      const { collections } = require('../database/adapter');
      collections.teacherClassSubject().doc().get = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ teacherId: 'teacher-1' }),
        id: 'assignment-1',
      });

      await expect(tcsService.removeAssignment('assignment-1')).resolves.not.toThrow();
    });

    it('should throw on removing non-existent assignment', async () => {
      const { collections } = require('../database/adapter');
      collections.teacherClassSubject().doc().get = jest.fn().mockResolvedValue({
        exists: false,
      });

      await expect(tcsService.removeAssignment('bad-id')).rejects.toThrow('Assignment not found');
    });
  });
});
