import { Router } from 'express';
import * as gradeController from '../controllers/grade.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { gradebookQuerySchema, bulkGradeSchema } from '../validators/grade.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/gradebook', authenticate, requireRole('teacher', 'admin'), validate(gradebookQuerySchema, 'query'), asyncHandler(gradeController.getGradebook));
router.get('/student/:studentId', authenticate, asyncHandler(gradeController.getStudentGrades));
router.put('/:gradeId', authenticate, requireRole('teacher', 'admin'), asyncHandler(gradeController.updateGrade));
router.post('/bulk/:courseId', authenticate, requireRole('teacher', 'admin'), validate(bulkGradeSchema), asyncHandler(gradeController.bulkUpdateGrades));
router.get('/report/:studentId', authenticate, requireRole('teacher', 'admin', 'parent'), asyncHandler(gradeController.generateReport));

export default router;
