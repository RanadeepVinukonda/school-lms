import { z } from 'zod';

export const createUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be at most 255 characters')
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .optional(),
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  role: z.enum(['student', 'teacher', 'admin', 'parent']),
  phoneNumber: z.string().max(20).optional(),
  photoURL: z.string().url('Invalid photo URL').optional(),
  classIds: z.array(z.string()).optional(),
  classId: z.string().optional(),
  rollNo: z.number().int().positive().optional(),
  academicYear: z.string().optional(),
  childrenIds: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  phoneNumber: z.string().max(20).optional(),
  photoURL: z.string().url('Invalid photo URL').optional(),
  disabled: z.boolean().optional(),
  classIds: z.array(z.string()).optional(),
  classId: z.string().optional(),
  rollNo: z.number().int().positive().optional(),
  academicYear: z.string().optional(),
});

export const userQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  role: z.enum(['student', 'teacher', 'admin', 'parent']).optional(),
  search: z.string().max(200).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  classId: z.string().optional(),
  sortBy: z.enum(['displayName', 'email', 'createdAt', 'role']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
