import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn('Application error', {
      message: err.message,
      code: err.statusCode,
      details: err.details,
    });

    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        details: err.details,
        ...(env.NODE_ENV === 'development' && { stack: err.stack }),
      },
    });
    return;
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
