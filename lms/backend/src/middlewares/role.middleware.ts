import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { getSupabaseAdmin } from '../services/supabase';

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const userRoles = req.user.role.split(',').map((r) => r.trim());
    if (userRoles.includes('super_admin') || roles.some((r) => userRoles.includes(r))) {
      next();
      return;
    }

    next(new ForbiddenError('Insufficient permissions'));
  };
}

export function requireSchoolAccess(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }
  if (!req.user.school_id) {
    next(new ForbiddenError('No school association'));
    return;
  }

  // Admins/super_admins bypass school matching
  const roles = req.user.role.split(',').map((r) => r.trim());
  if (roles.includes('admin') || roles.includes('super_admin')) {
    next();
    return;
  }

  // Check resource schoolId matches user schoolId (if present on request)
  const resourceSchoolId =
    (req.params.schoolId as string) ||
    (req.body?.schoolId as string) ||
    (req.query?.schoolId as string);

  if (resourceSchoolId && resourceSchoolId !== req.user.school_id) {
    next(new ForbiddenError('Access denied: school mismatch'));
    return;
  }

  // When no direct schoolId param, verify via class or other resource lookup
  if (!resourceSchoolId) {
    const classId = (req.params.classId as string) || (req.body?.classId as string) || (req.query?.classId as string);
    if (classId) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        (async () => {
          try {
            const { data } = await supabase.from('classes').select('school_id').eq('id', classId).maybeSingle();
            if (data && data.school_id !== req.user!.school_id) {
              next(new ForbiddenError('Access denied: class not in your school'));
              return;
            }
          } catch { /* fall through */ }
          next();
        })();
        return;
      }
    }
  }

  next();
}

export function requireOwnershipOrRole(
  getOwnerId: (req: Request) => string,
  ...roles: string[]
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const userRoles = req.user.role.split(',').map((r) => r.trim());
    if (userRoles.includes('super_admin') || roles.some((r) => userRoles.includes(r))) {
      next();
      return;
    }

    const ownerId = getOwnerId(req);
    if (req.user.uid === ownerId) {
      next();
      return;
    }

    next(new ForbiddenError('Insufficient permissions'));
  };
}
