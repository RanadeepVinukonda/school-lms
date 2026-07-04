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
  skip: (req) => env.NODE_ENV === 'test' || ['/me', '/profile', '/logout'].some(p => req.path.endsWith(p)),
  handler: (_req, _res, next) => {
    next(new AppError(429, 'Too many authentication attempts. Please try again later.'));
  },
});

export const apiRateLimit = rateLimit({
  ...defaults,
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  max: env.API_RATE_LIMIT_MAX,
  skip: (req) => env.NODE_ENV === 'test' || (req.path.startsWith('/auth') && !['/me', '/profile', '/logout'].some(p => req.path.endsWith(p))),
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

export const strictRateLimit = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  max: 20,
  handler: (_req, _res, next) => {
    next(new AppError(429, 'Too many requests. Please try again later.'));
  },
});
