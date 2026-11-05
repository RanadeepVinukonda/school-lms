import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be at most 5000 characters'),
  subjectId: z.string().min(1, 'Subject is required'),
  classId: z.string().min(1, 'Class is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  thumbnail: z.string().url('Invalid thumbnail URL').optional(),
  syllabus: z.string().max(10000).optional(),
  prerequisites: z.array(z.string()).optional(),
  learningObjectives: z.array(z.string()).max(50).optional(),
  resources: z
    .array(
      z.object({
        title: z.string().min(1),
        url: z.string().url(),
        type: z.enum(['pdf', 'video', 'link', 'document']),
      })
    )
    .optional(),
  maxStudents: z.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export const courseQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  subjectId: z.string().optional(),
  classId: z.string().optional(),
  teacherId: z.string().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'startDate']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
