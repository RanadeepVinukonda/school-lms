import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

const defaults = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: () => env.NODE_ENV === 'test',
} as const;

export const authRateLimit = rateLimit({
  ...defaults,
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  skip: (req) => env.NODE_ENV === 'test' || ['/me', '/profile', '/logout'].some(p => req.path === p),
  handler: (_req, _res, next) => {
    next(new AppError(429, 'Too many authentication attempts. Please try again later.'));
  },
});

export const apiRateLimit = rateLimit({
  ...defaults,
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  max: env.API_RATE_LIMIT_MAX,
  skip: (req) => env.NODE_ENV === 'test' || (req.path.startsWith('/auth') && !['/me', '/profile', '/logout'].some(p => req.path === p)),
  handler: (_req, _res, next) => {
    next(new AppError(429, 'Too many requests. Please slow down.'));
  },
});

export const uploadRateLimit = rateLimit({
  ...defaults,
  windowMs: 60 * 1000,
  max: 5,
  handler: (_req, _res, next) => {
    next(new AppError(429, 'Too many upload attempts. Please try again later.'));
  },
});

export const schoolRateLimit = rateLimit({
  ...defaults,
  windowMs: 60 * 1000,
  max: 1000,
  keyGenerator: (req) => (req.user as Record<string, unknown> | undefined)?.school_id as string || req.ip || 'unknown',
  handler: (_req, _res, next) => {
    next(new AppError(429, 'School rate limit exceeded. Please slow down.'));
  },
});

export const aiRateLimit = rateLimit({
  ...defaults,
  windowMs: env.AI_RATE_LIMIT_WINDOW_MS,
  max: env.AI_RATE_LIMIT_MAX,
  keyGenerator: (req) => (req.user as Record<string, unknown> | undefined)?.id as string || req.ip || 'unknown',
  handler: (_req, _res, next) => {
    next(new AppError(429, 'AI rate limit exceeded. Please slow down.'));
  },
});

export const authIpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX * 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  skip: () => env.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts from this IP. Please try again later.',
      code: 'RATE_LIMIT',
    },
  },
});
