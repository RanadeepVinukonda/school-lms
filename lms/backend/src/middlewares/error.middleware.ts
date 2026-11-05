import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError, ErrorCode } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = env.NODE_ENV === 'development';
  const requestId = req.headers['x-request-id'] as string | undefined;

  if (err instanceof multer.MulterError) {
    const message = (err as multer.MulterError).code === 'LIMIT_FILE_SIZE'
      ? 'File exceeds maximum allowed size. Images: 10MB, Videos: 50MB.'
      : err.message;
    res.status(413).json({
      success: false,
      error: { message, code: 'FILE_TOO_LARGE', requestId },
    });
    return;
  }

  if (err.message?.includes('not allowed by CORS')) {
    res.status(403).json({
      success: false,
      error: { message: 'Origin not allowed', code: 'CORS_ERROR', requestId },
    });
    return;
  }

  if (err instanceof AppError) {
    logger.warn('Application error', {
      message: err.message,
      code: err.statusCode,
      details: err.details,
      requestId,
    });

    const errorResponse: Record<string, unknown> = {
      message: err.message,
      code: err.code,
      requestId,
      details: err.details,
    };

    if (process.env.NODE_ENV !== 'production') {
      errorResponse._src = err.constructor?.name;
      errorResponse._hasDetails = err.details !== undefined;
      errorResponse._detailType = typeof err.details;
      errorResponse._detailLen = Array.isArray(err.details) ? err.details.length : -1;
    }

    if (isDev) {
      errorResponse.stack = err.stack;
    }

    res.status(err.statusCode).json({
      success: false,
      error: errorResponse,
    });
    return;
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    requestId,
  });

  res.status(500).json({
    success: false,
    error: {
      message: isDev ? err.message : 'Internal server error',
      code: ErrorCode.INTERNAL,
      requestId,
      ...(isDev && { stack: err.stack }),
    },
  });
}
