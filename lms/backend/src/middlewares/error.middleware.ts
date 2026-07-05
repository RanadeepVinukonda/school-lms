import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError, ErrorCode } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File exceeds maximum allowed size. Images: 10MB, Videos: 50MB.'
      : err.message;
    res.status(413).json({
      success: false,
      error: { message },
    });
    return;
  }

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
        code: err.code,
        ...(env.NODE_ENV === 'development' && { details: err.details, stack: err.stack }),
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
      message: 'Internal server error',
      code: ErrorCode.INTERNAL,
      ...(env.NODE_ENV === 'development' && { message: err.message, stack: err.stack }),
    },
  });
}
