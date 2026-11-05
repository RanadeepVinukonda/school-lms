import { z } from 'zod';

const questionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required').max(1000),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']),
  points: z.number().int().positive('Points must be positive'),
  options: z
    .array(z.string().min(1))
    .min(2, 'At least 2 options required for multiple choice')
    .optional(),
  correctAnswer: z.string().min(1).optional(),
  correctAnswers: z.array(z.string()).optional(),
  explanation: z.string().max(2000).optional(),
});

export const createQuizSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string().max(5000).optional(),
  courseId: z.string().min(1, 'Course is required'),
  lessonId: z.string().optional(),
  questions: z.array(questionSchema).min(1, 'At least one question required').max(100),
  timeLimit: z.number().int().positive('Time limit must be positive').optional(),
  passingScore: z.number().int().min(0).optional(),
  maxAttempts: z.number().int().positive().default(1),
  shuffleQuestions: z.boolean().default(false),
  showResults: z.boolean().default(true),
  isPublished: z.boolean().default(false),
  dueDate: z.string().datetime().optional(),
  instructions: z.string().max(5000).optional(),
});

export const updateQuizSchema = createQuizSchema.partial();

export const submitAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.union([z.string(), z.array(z.string())]),
        timeSpent: z.number().int().nonnegative().optional(),
      })
    )
    .min(1, 'At least one answer required'),
  startedAt: z.string().datetime(),
  submittedAt: z.string().datetime(),
});
