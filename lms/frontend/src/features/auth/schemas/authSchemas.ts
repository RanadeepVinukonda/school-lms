import { z } from 'zod';
import { emailSchema, passwordSchema, nameSchema } from '@/utils/validation';

const phoneSchema = z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone number');

export const loginSchema = z.object({
  email: emailSchema.optional(),
  password: z.string().min(1, 'Password is required').optional(),
  phone: phoneSchema.optional(),
  rememberMe: z.boolean().optional().default(false),
}).refine(data => data.email || data.phone, {
  message: 'Email or phone is required',
});

export const otpLoginSchema = z.object({
  phone: phoneSchema,
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  token: z.string().length(6, 'OTP must be 6 digits'),
});

export const registerSchema = z
  .object({
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    confirmPassword: z.string().optional(),
    phone: phoneSchema.optional(),
    displayName: nameSchema,
    role: z.enum(['student', 'teacher', 'parent'], {
      required_error: 'Please select a role',
    }),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions' }),
    }),
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(data => data.email || data.phone, {
    message: 'Email or phone is required',
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type OtpLoginFormData = z.infer<typeof otpLoginSchema>;
export type OtpVerifyFormData = z.infer<typeof otpVerifySchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
