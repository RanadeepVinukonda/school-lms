import { z } from 'zod';

export const createLessonSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be at most 5000 characters'),
  courseId: z.string().min(1, 'Course is required'),
  content: z.string().max(50000).optional(),
  contentType: z.enum(['text', 'video', 'pdf', 'quiz', 'assignment', 'mixed']).default('text'),
  videoUrl: z.string().url('Invalid video URL').optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
        type: z.string(),
        size: z.number().int().positive(),
      })
    )
    .optional(),
  duration: z.number().int().positive('Duration must be positive').optional(),
  order: z.number().int().min(0).optional(),
  isPublished: z.boolean().default(false),
  resources: z
    .array(
      z.object({
        title: z.string().min(1),
        url: z.string().url(),
        type: z.enum(['pdf', 'video', 'link', 'document']),
      })
    )
    .optional(),
});

export const updateLessonSchema = createLessonSchema.partial().extend({
  order: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
  completedBy: z.array(z.string()).optional(),
});
