import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const isTest = process.env.NODE_ENV === 'test';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().positive().max(65535).default(3001),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  GEMINI_API_KEY: isTest ? z.string().default('mock-gemini-api-key') : z.string().min(1),
  AI_API_KEY: z.string().optional().default(''),
  AI_BASE_URL: z.string().default('https://openrouter.ai/api/v1/chat/completions'),
  AI_MODEL: z.string().default('openai/gpt-4o-mini'),

  AI_TEXTBOOK_API_KEY: z.string().optional(),
  AI_TEXTBOOK_BASE_URL: z.string().optional(),
  AI_TEXTBOOK_MODEL: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: isTest ? z.string().default('mock-cloudinary-cloud-name') : z.string().min(1),
  CLOUDINARY_API_KEY: isTest ? z.string().default('mock-cloudinary-api-key') : z.string().min(1),
  CLOUDINARY_API_SECRET: isTest ? z.string().default('mock-cloudinary-api-secret') : z.string().min(1),

  SUPABASE_URL: isTest ? z.string().default('https://mock-supabase-url.supabase.co') : z.string().min(1),
  SUPABASE_ANON_KEY: isTest ? z.string().default('mock-supabase-anon-key') : z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: isTest ? z.string().default('mock-supabase-service-role-key') : z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default('textbooks'),

  DATABASE_URL: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@school-lms.com'),

  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(300000),
  API_RATE_LIMIT_MAX: z.coerce.number().default(100),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  AI_RATE_LIMIT_MAX: z.coerce.number().default(10),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.coerce.boolean().default(process.env.NODE_ENV === 'production'),

  API_DOCS_ENABLED: z.coerce.boolean().default(process.env.NODE_ENV !== 'production'),
  API_DOCS_USERNAME: z.string().optional(),
  API_DOCS_PASSWORD: z.string().optional(),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ADMIN_PHONE: z.string().default('8919473722'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  console.error('Invalid environment variables:', errors);
  throw new Error(`Invalid environment variables: ${JSON.stringify(errors)}`);
}

export const env = parsed.data;
