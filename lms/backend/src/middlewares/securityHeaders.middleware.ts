import helmet from 'helmet';
import { Request, Response } from 'express';
import { env } from '../config/env';

const cspMiddleware = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      (req, res) => `'nonce-${(res as Response).locals.nonce}'`,
      "'strict-dynamic'",
    ],
    styleSrc: [
      "'self'",
      (req, res) => `'nonce-${(res as Response).locals.nonce}'`,
      'https://fonts.googleapis.com',
    ],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
    connectSrc: [
      "'self'",
      env.FRONTEND_URL,
      'https://*.cloudinary.com',
      'https://*.supabase.co',
      'https://www.youtube.com',
      'https://fonts.googleapis.com',
    ],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
  },
});

const restOfHelmet = helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  noSniff: true,
  ieNoOpen: true,
  contentSecurityPolicy: false,
});

const permissionsPolicy = (_req: Request, res: Response, next: () => void) => {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), interest-cohort=()'
  );
  next();
};

export const securityHeaders = [cspMiddleware, restOfHelmet, permissionsPolicy];
