import { CorsOptions } from 'cors';
import { env } from './env';
import { logger } from '../utils/logger';

const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

const isAllowed = (origin: string): boolean => {
  if (env.NODE_ENV === 'production') {
    return origin === env.FRONTEND_URL;
  }
  return allowedOrigins.includes(origin);
};

export const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    if (!origin || isAllowed(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-csrf-token'],
  exposedHeaders: ['Content-Disposition'],
  maxAge: 86400,
};
