import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().positive().max(65535).default(3001),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).transform((key) => key.replace(/\\n/g, '\n')),
  AI_API_KEY: z.string().min(1),
  AI_BASE_URL: z.string().default('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'),
  AI_MODEL: z.string().default('openrouter/free'),
  GEMINI_API_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  FIREBASE_WEB_API_KEY: z.string().min(1),
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  console.error('Invalid environment variables:', errors);
  throw new Error(`Invalid environment variables: ${JSON.stringify(errors)}`);
}

export const env = parsed.data;
