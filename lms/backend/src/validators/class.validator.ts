import { z } from 'zod';

export const createClassSchema = z.object({
  name: z
    .string()
    .min(2, 'Class name must be at least 2 characters')
    .max(100, 'Class name must be at most 100 characters'),
  code: z
    .string()
    .min(2, 'Class code must be at least 2 characters')
    .max(20, 'Class code must be at most 20 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Class code can only contain letters, numbers, hyphens, and underscores'),
  description: z.string().max(1000).optional(),
  grade: z.string().max(50).optional(),
  section: z.string().max(50).optional(),
  academicYear: z.string().max(20).optional(),
  roomNumber: z.string().max(20).optional(),
  teacherIds: z.array(z.string()).optional(),
  subjectIds: z.array(z.string()).optional(),
  maxStudents: z.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export const updateClassSchema = createClassSchema.partial();

export const classQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  teacherId: z.string().optional(),
  academicYear: z.string().optional(),
  search: z.string().max(200).optional(),
});
