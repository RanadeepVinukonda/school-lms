import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().positive().max(65535).default(3001),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).transform((key) => key.replace(/\\n/g, '\n')),
  OPENROUTER_API_KEY: z.string().min(1),
  AI_MODEL: z.string().default('nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
