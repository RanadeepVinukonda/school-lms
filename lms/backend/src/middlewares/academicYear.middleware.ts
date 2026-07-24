import { Request, Response, NextFunction } from 'express';

/**
 * Derives the current academic year from the system date.
 * Academic year runs July 1 → June 30 (e.g., July 2026 = "2026-2027").
 */
export function deriveAcademicYear(date: Date = new Date()): string {
  const year = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

/**
 * Middleware that derives the active academic year from the system date
 * and attaches it to `req.activeAcademicYear`.
 */
function _academicYearMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.activeAcademicYear = deriveAcademicYear();
  next();
}

export const academicYearMiddleware = _academicYearMiddleware;
