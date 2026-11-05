import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[target]);
      req[target] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.code === 'invalid_string' && e.message === 'Invalid' ? 'Invalid format' : e.message,
        }));
        const msg = 'Validation failed: ' + details.map(d => d.field + ' ' + d.message).join(', ');
        next(new ValidationError(msg, details));
      } else {
        logger.warn('Non-Zod error in validate middleware', { error: error instanceof Error ? error.message : String(error) });
        next(error);
      }
    }
  };
}
