import { z } from 'zod';

const examQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required').max(2000),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay', 'file_upload']),
  points: z.number().int().positive('Points must be positive'),
  options: z.array(z.string().min(1)).min(2).optional(),
  correctAnswer: z.string().optional(),
  correctAnswers: z.array(z.string()).optional(),
  explanation: z.string().max(2000).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
      })
    )
    .optional(),
});

export const createExamSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string().max(5000).optional(),
  courseId: z.string().min(1, 'Course is required'),
  questions: z.array(examQuestionSchema).min(1, 'At least one question required').max(200),
  timeLimit: z.number().int().positive('Time limit must be positive'),
  passingScore: z.number().int().min(0).optional(),
  maxAttempts: z.number().int().positive().default(1),
  shuffleQuestions: z.boolean().default(false),
  showResults: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  instructions: z.string().max(5000).optional(),
  proctored: z.boolean().default(false),
});

export const updateExamSchema = createExamSchema.partial();

export const scheduleExamSchema = z.object({
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  classIds: z.array(z.string().min(1)).min(1, 'At least one class required'),
  proctorIds: z.array(z.string()).optional(),
});

export const submitExamAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.union([z.string(), z.array(z.string())]),
        timeSpent: z.number().int().nonnegative().optional(),
      })
    )
    .min(1),
  startedAt: z.string().datetime(),
  submittedAt: z.string().datetime(),
});
