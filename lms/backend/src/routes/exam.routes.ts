import { Router } from 'express';
import { z } from 'zod';
import * as examController from '../controllers/exam.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createExamSchema, updateExamSchema, scheduleExamSchema, submitExamAttemptSchema } from '../validators/exam.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const gradeAttemptSchema = z.object({
  scores: z.record(z.number().min(0)).optional(),
  feedback: z.string().optional(),
  totalScore: z.number().min(0).optional(),
  gradedBy: z.string().optional(),
}).passthrough();

const releaseExamGradesSchema = z.object({
  classIds: z.array(z.string()).optional(),
}).passthrough();

const startExamAttemptSchema = z.object({}).passthrough();

router.get('/', authenticate, asyncHandler(examController.listAllExams));
router.post('/', authenticate, requireRole('teacher', 'admin'), validate(createExamSchema), asyncHandler(examController.createExam));
router.put('/:examId', authenticate, requireRole('teacher', 'admin'), validate(updateExamSchema), asyncHandler(examController.updateExam));
router.delete('/:examId', authenticate, requireRole('teacher', 'admin'), asyncHandler(examController.deleteExam));
router.get('/:examId', authenticate, asyncHandler(examController.getExam));
router.post('/:examId/schedule', authenticate, requireRole('teacher', 'admin'), validate(scheduleExamSchema), asyncHandler(examController.scheduleExam));
router.post('/:examId/start', authenticate, requireRole('student'), validate(startExamAttemptSchema), asyncHandler(examController.startExamAttempt));
router.post('/:examId/attempts/:attemptId/submit', authenticate, validate(submitExamAttemptSchema), asyncHandler(examController.submitExamAttempt));
router.put('/:examId/attempts/:attemptId/grade', authenticate, requireRole('teacher', 'admin'), validate(gradeAttemptSchema), asyncHandler(examController.gradeExamAttempt));
router.get('/:examId/results', authenticate, asyncHandler(examController.getExamResults));
router.patch('/:examId/release-grades', authenticate, requireRole('teacher', 'admin'), validate(releaseExamGradesSchema), asyncHandler(examController.releaseExamGrades));

export default router;
