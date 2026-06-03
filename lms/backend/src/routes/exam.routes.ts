import { Router } from 'express';
import * as examController from '../controllers/exam.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createExamSchema, updateExamSchema, scheduleExamSchema, submitExamAttemptSchema } from '../validators/exam.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/', authenticate, requireRole('teacher', 'admin'), validate(createExamSchema), asyncHandler(examController.createExam));
router.put('/:examId', authenticate, requireRole('teacher', 'admin'), validate(updateExamSchema), asyncHandler(examController.updateExam));
router.delete('/:examId', authenticate, requireRole('teacher', 'admin'), asyncHandler(examController.deleteExam));
router.get('/:examId', authenticate, asyncHandler(examController.getExam));
router.post('/:examId/schedule', authenticate, requireRole('teacher', 'admin'), validate(scheduleExamSchema), asyncHandler(examController.scheduleExam));
router.post('/:examId/start', authenticate, requireRole('student'), asyncHandler(examController.startExamAttempt));
router.post('/:examId/attempts/:attemptId/submit', authenticate, validate(submitExamAttemptSchema), asyncHandler(examController.submitExamAttempt));
router.put('/:examId/attempts/:attemptId/grade', authenticate, requireRole('teacher', 'admin'), asyncHandler(examController.gradeExamAttempt));
router.get('/:examId/results', authenticate, asyncHandler(examController.getExamResults));

export default router;
