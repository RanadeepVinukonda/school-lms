import { z } from 'zod';

export const createAssignmentSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(10000, 'Description must be at most 10000 characters'),
  courseId: z.string().min(1, 'Course is required'),
  lessonId: z.string().optional(),
  dueDate: z.string().datetime('Invalid due date'),
  points: z.number().int().positive('Points must be positive'),
  passingGrade: z.number().int().min(0).optional(),
  maxAttempts: z.number().int().positive().default(1),
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
  rubric: z
    .array(
      z.object({
        criterion: z.string().min(1),
        maxPoints: z.number().int().positive(),
        description: z.string().optional(),
      })
    )
    .optional(),
  allowLateSubmission: z.boolean().default(false),
  latePenaltyPercent: z.number().min(0).max(100).optional(),
  isPublished: z.boolean().default(false),
});

export const updateAssignmentSchema = createAssignmentSchema.partial();

export const gradeSubmissionSchema = z.object({
  score: z.number().min(0, 'Score must be non-negative'),
  totalPoints: z.number().int().positive('Total points must be positive'),
  feedback: z.string().max(5000).optional(),
  rubricScores: z
    .array(
      z.object({
        criterion: z.string().min(1),
        score: z.number().min(0),
        feedback: z.string().optional(),
      })
    )
    .optional(),
  status: z.enum(['graded', 'returned']).default('graded'),
});
