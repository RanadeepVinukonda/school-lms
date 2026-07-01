import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { isMfaVerified } from '../services/mfa.service';

export async function requireMfa(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError(401, 'Authentication required'));

  const verified = await isMfaVerified(req.user.uid);
  if (!verified) return next(new AppError(403, 'MFA verification required. Please set up multi-factor authentication.'));

  next();
}
