import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/errors';

const defaults = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
} as const;

export const authRateLimit = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (_req, _res, next) => {
    next(new AppError(429, 'Too many authentication attempts. Please try again later.'));
  },
});

export const apiRateLimit = rateLimit({
  ...defaults,
  windowMs: 60 * 1000,
  max: 100,
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
