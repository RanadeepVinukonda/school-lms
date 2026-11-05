import { z } from 'zod';

export const generateQuestionsSchema = z.object({
  conceptId: z.string().min(1, 'Concept ID is required'),
  conceptName: z.string().min(1, 'Concept name is required'),
  subject: z.string().min(1, 'Subject is required'),
  types: z.array(z.enum(['olympiad', 'competency', 'viva'])).min(1, 'At least one question type required'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  count: z.number().int().positive().max(20).default(5),
});

export const saveQuestionsSchema = z.object({
  conceptId: z.string().min(1),
  questions: z.array(z.object({
    type: z.enum(['olympiad', 'competency', 'viva']),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    question: z.string().min(1),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().min(1),
    explanation: z.string().min(1),
    marks: z.number().int().positive(),
    competencyArea: z.string().optional(),
  })),
});

export const generateRubricSchema = z.object({
  assignmentId: z.string().min(1),
  title: z.string().min(1, 'Assignment title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  totalMarks: z.number().int().positive(),
  numCriteria: z.number().int().min(2).max(10).default(4),
});

export const saveRubricSchema = z.object({
  assignmentId: z.string().min(1),
  title: z.string().min(1),
  criteria: z.array(z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    maxMarks: z.number().int().positive(),
    levels: z.array(z.object({
      label: z.string().min(1),
      marks: z.number().min(0),
      description: z.string().min(1),
    })).min(2),
  })).min(1),
  totalMarks: z.number().int().positive(),
});

export const generateFeedbackSchema = z.object({
  submissionId: z.string().min(1),
  rubricId: z.string().min(1),
  studentAnswer: z.string().min(1, 'Student answer is required'),
  rubric: z.object({
    title: z.string().min(1),
    criteria: z.array(z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      maxMarks: z.number().int().positive(),
      levels: z.array(z.object({
        label: z.string().min(1),
        marks: z.number().min(0),
        description: z.string().min(1),
      })).min(2),
    })).min(1),
    totalMarks: z.number().int().positive(),
  }),
});
