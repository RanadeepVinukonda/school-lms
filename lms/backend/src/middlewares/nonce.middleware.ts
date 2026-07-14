import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function nonce(req: Request, res: Response, next: NextFunction) {
  res.locals.nonce = crypto.randomUUID();
  next();
}
