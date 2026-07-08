import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
  VITE_FIREBASE_API_KEY: z.string().optional(),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  VITE_FIREBASE_PROJECT_ID: z.string().optional(),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  VITE_FIREBASE_APP_ID: z.string().optional(),
  VITE_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  VITE_FIREBASE_VAPID_KEY: z.string().optional(),
});

function parseEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(import.meta.env);
  if (!result.success) {
    const missing = result.error.errors
      .map((e) => e.path.join('.'))
      .join(', ');
    throw new Error(
      `Missing or invalid environment variables: ${missing}. ` +
      'Check your .env file matches .env.example.'
    );
  }
  return result.data;
}

export const env = parseEnv();
