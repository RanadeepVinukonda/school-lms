export enum ErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL = 'INTERNAL',
  BAD_REQUEST = 'BAD_REQUEST',
}

export class AppError extends Error {
  public statusCode: number;
  public details?: unknown;
  public code?: ErrorCode;

  constructor(statusCode: number, message: string, details?: unknown, code?: ErrorCode) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(404, message, details, ErrorCode.NOT_FOUND);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(400, message, details, ErrorCode.VALIDATION);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(401, message, details, ErrorCode.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(403, message, details, ErrorCode.FORBIDDEN);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: unknown) {
    super(409, message, details, ErrorCode.CONFLICT);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details?: unknown) {
    super(429, message, details, ErrorCode.RATE_LIMIT);
  }
}
