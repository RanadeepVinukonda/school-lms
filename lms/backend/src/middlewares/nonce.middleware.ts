import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function nonce(_req: Request, res: Response, next: NextFunction) {
  res.locals.nonce = crypto.randomUUID();
  next();
}
