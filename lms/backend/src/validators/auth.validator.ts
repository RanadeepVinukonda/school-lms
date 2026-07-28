import { z } from 'zod';

const phoneSchema = z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone number');

export const signUpSchema = z.object({
  phone: phoneSchema,
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  role: z.enum(['student', 'teacher', 'admin', 'parent']).default('student'),
  photoURL: z.string().url('Invalid photo URL').optional(),
});

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  token: z.string().length(6, 'OTP must be 6 digits'),
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
