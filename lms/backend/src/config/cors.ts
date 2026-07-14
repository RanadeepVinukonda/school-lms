import { CorsOptions, CorsRequest } from 'cors';
import { env } from './env';
import { logger } from '../utils/logger';

const PRODUCTION_ORIGINS = [
  'https://app.school-lms.com',
  env.FRONTEND_URL, // allow whatever FRONTEND_URL is set to (for flexible deploys)
] as const;

const STAGING_ORIGINS = [
  'https://staging.school-lms.com',
] as const;

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

const isAllowed = (origin: string): boolean => {
  if (env.NODE_ENV === 'production') {
    return PRODUCTION_ORIGINS.includes(origin as typeof PRODUCTION_ORIGINS[number]);
  }
  return [...DEV_ORIGINS, ...STAGING_ORIGINS, env.FRONTEND_URL].includes(origin);
};

export const corsOptions: CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, origin?: boolean | string) => void) {
    if (!origin || isAllowed(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin} (env=${env.NODE_ENV})`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-csrf-token', 'X-Request-Id'],
  exposedHeaders: ['Content-Disposition', 'X-Request-Id', 'X-Response-Time'],
  maxAge: 86400,
};
