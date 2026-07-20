import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

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
        console.log('VALIDATE_ZOD', JSON.stringify({ errors: error.errors, details }));
        // Include details directly in message for debugging
        const msg = 'Validation failed: ' + details.map(d => d.field + ' ' + d.message).join(', ');
        next(new ValidationError(msg, details));
      } else {
        console.log('VALIDATE_DBG: non-Zod error in validate', error instanceof Error ? error.message : String(error), typeof error, error?.constructor?.name);
        next(error);
      }
    }
  };
}
