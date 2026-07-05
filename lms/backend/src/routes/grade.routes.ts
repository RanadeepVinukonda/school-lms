import { Router } from 'express';
import { z } from 'zod';
import * as gradeController from '../controllers/grade.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { gradebookQuerySchema, bulkGradeSchema } from '../validators/grade.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const updateGradeSchema = z.object({
  score: z.number().min(0).optional(),
  feedback: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'graded', 'returned']).optional(),
}).passthrough();

router.get('/gradebook', authenticate, requireRole('teacher', 'admin'), validate(gradebookQuerySchema, 'query'), asyncHandler(gradeController.getGradebook));
router.get('/student/:studentId', authenticate, asyncHandler(gradeController.getStudentGrades));
router.put('/:gradeId', authenticate, requireRole('teacher', 'admin'), validate(updateGradeSchema), asyncHandler(gradeController.updateGrade));
router.post('/bulk/:courseId', authenticate, requireRole('teacher', 'admin'), validate(bulkGradeSchema), asyncHandler(gradeController.bulkUpdateGrades));
router.get('/report/:studentId', authenticate, requireRole('teacher', 'admin', 'parent'), asyncHandler(gradeController.generateReport));

// ponytail: alias for frontend compatibility
router.get('/', authenticate, requireRole('teacher', 'admin'), asyncHandler(gradeController.getGradebook));
router.get('/summary', authenticate, requireRole('teacher', 'admin'), asyncHandler(gradeController.getGradebook));
router.get('/courses/:courseId', authenticate, requireRole('teacher', 'admin'), asyncHandler(gradeController.getGradebook));

export default router;
