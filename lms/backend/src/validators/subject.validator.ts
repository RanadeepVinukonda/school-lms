import { z } from 'zod';

export const createSubjectSchema = z.object({
  name: z
    .string()
    .min(2, 'Subject name must be at least 2 characters')
    .max(100, 'Subject name must be at most 100 characters'),
  code: z
    .string()
    .min(2, 'Subject code must be at least 2 characters')
    .max(20, 'Subject code must be at most 20 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Subject code can only contain letters, numbers, hyphens, and underscores'),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  credits: z.number().int().positive('Credits must be positive').optional(),
  department: z.string().max(100).optional(),
  thumbnail: z.string().url('Invalid thumbnail URL').optional(),
  isElective: z.boolean().default(false),
  gradeLevels: z.array(z.string()).optional(),
  tags: z.array(z.string()).max(20).optional(),
  syllabus: z.string().max(20000).optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export const subjectQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  category: z.string().optional(),
  department: z.string().optional(),
  search: z.string().max(200).optional(),
});
