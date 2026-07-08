import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

const DEFAULT_TIMEOUT_MS = 30000;

export function timeoutMiddleware(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.setTimeout(timeoutMs, () => {
      next(new AppError(503, 'Request timed out'));
    });
    next();
  };
}
