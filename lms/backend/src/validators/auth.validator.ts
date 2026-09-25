import { z } from 'zod';

const phoneSchema = z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone number');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const emailSchema = z.string().email('Invalid email address').toLowerCase();

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'Invalid reset token'),
  password: passwordSchema,
});

export const verifyResetTokenSchema = z.object({
  token: z.string().min(20, 'Invalid reset token'),
});

export const signUpSchema = z.object({
  phone: phoneSchema,
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  role: z.enum(['student', 'teacher', 'admin', 'parent']).default('student'),
  photoURL: z.string().url('Invalid photo URL').optional(),
});

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  phoneNumber: z.string().max(20).optional(),
  photoURL: z.string().url('Invalid photo URL').optional(),
});
