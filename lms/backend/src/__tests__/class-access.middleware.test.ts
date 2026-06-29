import { Request, Response, NextFunction } from 'express';
import { requireClassAccess, requireTeacherSubjectAccess } from '../middlewares/class-access.middleware';

jest.mock('../database/adapter', () => {
  const mockSnapshot = {
    empty: false,
    size: 1,
    docs: [{ id: 'assignment-1', data: () => ({ teacherId: 'teacher-1', classId: 'class-1', subjectId: 'subject-1' }) }],
    forEach: (cb: Function) => cb({ id: 'assignment-1', data: () => ({ teacherId: 'teacher-1', classId: 'class-1', subjectId: 'subject-1' }) }),
  };

  return {
    collections: {
      teacherClassSubject: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      }),
    },
    FieldValue: { increment: jest.fn((n) => n) },
  };
});

function mockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    user: { uid: 'teacher-1', role: 'teacher', name: 'Teacher', email: 't@t.com', classIds: ['class-1'], classId: 'class-1' },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('Class Access Middleware', () => {
  let nextFn: NextFunction;

  beforeEach(() => {
    nextFn = jest.fn();
  });

  describe('requireClassAccess', () => {
    it('should allow admin access to any class', () => {
      const req = mockReq({ user: { uid: 'admin-1', role: 'admin', name: 'Admin', email: 'a@a.com' } });
      requireClassAccess('admin', 'super_admin')(req, mockRes(), nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should allow teacher access to assigned class via classIds', () => {
      const req = mockReq({ params: { classId: 'class-1' } });
      requireClassAccess('admin', 'super_admin')(req, mockRes(), nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should allow teacher access to assigned class via classId', () => {
      const req = mockReq({ params: { classId: 'class-1' } });
      requireClassAccess('admin', 'super_admin')(req, mockRes(), nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should deny access to unassigned class', () => {
      const req = mockReq({ params: { classId: 'class-2' } });
      requireClassAccess('admin', 'super_admin')(req, mockRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('should deny unauthenticated requests', () => {
      const req = mockReq({ user: undefined });
      requireClassAccess()(req, mockRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('should return 403 when no classId provided', () => {
      const req = mockReq({ params: {} });
      requireClassAccess()(req, mockRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });
  });

  describe('requireTeacherSubjectAccess', () => {
    it('should allow admin access without checking assignment', async () => {
      const req = mockReq({ user: { uid: 'admin-1', role: 'admin', name: 'Admin', email: 'a@a.com' } });
      await requireTeacherSubjectAccess(req, mockRes(), nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should allow teacher access to assigned subject', async () => {
      const req = mockReq({ params: { classId: 'class-1', subjectId: 'subject-1' } });
      await requireTeacherSubjectAccess(req, mockRes(), nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should deny teacher access to unassigned subject', async () => {
      const { collections } = require('../database/adapter');
      collections.teacherClassSubject().get = jest.fn().mockResolvedValue({
        empty: true, size: 0, docs: [],
        forEach: jest.fn(),
      });

      const req = mockReq({ params: { classId: 'class-1', subjectId: 'subject-2' } });
      await requireTeacherSubjectAccess(req, mockRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('should return 403 when classId or subjectId missing', async () => {
      const req = mockReq({ params: {} });
      await requireTeacherSubjectAccess(req, mockRes(), nextFn);
      expect(nextFn).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });
  });
});
