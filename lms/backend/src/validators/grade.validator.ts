import { z } from 'zod';

export const updateGradeSchema = z.object({
  score: z.number().min(0, 'Score must be non-negative'),
  totalPoints: z.number().int().positive('Total points must be positive'),
  letterGrade: z.string().max(5).optional(),
  remarks: z.string().max(1000).optional(),
  gradedBy: z.string().min(1),
  gradedAt: z.string().datetime().optional(),
});

export const gradebookQuerySchema = z.object({
  classId: z.string().optional(),
  courseId: z.string().optional(),
  studentId: z.string().optional(),
  subjectId: z.string().optional(),
  term: z.string().optional(),
  academicYear: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const bulkGradeSchema = z.object({
  grades: z
    .array(
      z.object({
        studentId: z.string().min(1),
        score: z.number().min(0),
        totalPoints: z.number().int().positive(),
        feedback: z.string().max(5000).optional(),
      })
    )
    .min(1, 'At least one grade required')
    .max(100, 'Maximum 100 grades at once'),
});
