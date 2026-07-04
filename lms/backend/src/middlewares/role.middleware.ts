import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
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

    if (roles.includes(req.user.role)) {
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
