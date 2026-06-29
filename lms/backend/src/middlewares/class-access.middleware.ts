import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { collections } from '../database/adapter';

export function requireClassAccess(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (roles.includes(req.user.role)) {
      next();
      return;
    }

    const classId = req.params.classId || req.params.class_id || req.body?.classId;

    if (!classId) {
      next(new ForbiddenError('Class ID is required for access validation'));
      return;
    }

    const userClassIds = req.user.classIds || [];
    if (userClassIds.includes(classId)) {
      next();
      return;
    }

    if (req.user.classId === classId) {
      next();
      return;
    }

    next(new ForbiddenError('You do not have access to this class'));
  };
}

export function requireClassAccessByParam(paramName: string, ...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (roles.includes(req.user.role)) {
      next();
      return;
    }

    const classId = req.params[paramName] || req.query[paramName] as string;

    if (!classId) {
      next(new ForbiddenError(`Class ID from "${paramName}" is required`));
      return;
    }

    const userClassIds = req.user.classIds || [];
    if (userClassIds.includes(classId)) {
      next();
      return;
    }

    if (req.user.classId === classId) {
      next();
      return;
    }

    next(new ForbiddenError('You do not have access to this class'));
  };
}

export async function requireTeacherSubjectAccess(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    next();
    return;
  }

  const classId = req.params.classId || req.body?.classId;
  const subjectId = req.params.subjectId || req.body?.subjectId;

  if (!classId || !subjectId) {
    next(new ForbiddenError('Class ID and Subject ID are required'));
    return;
  }

  try {
    const snap = await collections.teacherClassSubject()
      .where('teacherId', '==', req.user.uid)
      .where('classId', '==', classId)
      .where('subjectId', '==', subjectId)
      .limit(1)
      .get();

    if (!snap.empty) {
      next();
      return;
    }

    next(new ForbiddenError('You are not assigned to teach this subject in this class'));
  } catch {
    next(new ForbiddenError('Access validation failed'));
  }
}
