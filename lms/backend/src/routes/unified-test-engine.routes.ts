import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/unified-test-engine.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const createTestSchema = z.object({
  title: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  sections: z.array(z.any()).optional(),
  duration: z.number().positive().optional(),
}).passthrough();

const previewTestSchema = z.object({
  sections: z.array(z.any()),
}).passthrough();

const updateTestSchema = z.object({
  title: z.string().optional(),
  sections: z.array(z.any()).optional(),
}).passthrough();

const startTestAttemptSchema = z.object({}).passthrough();

const submitTestAttemptSchema = z.object({
  answers: z.any(),
}).passthrough();

const releaseTestResultsSchema = z.object({
  results: z.any(),
}).passthrough();

const createTemplateSchema = z.object({
  title: z.string().min(1),
  sections: z.array(z.any()).optional(),
}).passthrough();

const updateTemplateSchema = z.object({
  title: z.string().optional(),
  sections: z.array(z.any()).optional(),
}).passthrough();

router.post('/create', authenticate, requireRole('teacher', 'admin'), validate(createTestSchema), asyncHandler(ctrl.createTest));
router.post('/preview', authenticate, requireRole('teacher', 'admin'), validate(previewTestSchema), asyncHandler(ctrl.previewTest));
router.get('/class/:classId', authenticate, asyncHandler(ctrl.listTestsForClass));
router.get('/my', authenticate, requireRole('teacher'), asyncHandler(ctrl.listTestsForTeacher));
router.get('/attempts/my', authenticate, requireRole('student'), asyncHandler(ctrl.getStudentAttempts));
router.get('/attempts/student/:studentId', authenticate, requireRole('teacher', 'admin'), asyncHandler(ctrl.getStudentAttempts));
router.get('/class/:classId/attempts', authenticate, requireRole('teacher', 'admin'), asyncHandler(ctrl.getClassAttempts));
router.get('/:testId', authenticate, asyncHandler(ctrl.getTest));
router.patch('/:testId', authenticate, requireRole('teacher'), validate(updateTestSchema), asyncHandler(ctrl.updateTest));
router.delete('/:testId', authenticate, requireRole('teacher'), asyncHandler(ctrl.deleteTest));
router.post('/:testId/republish', authenticate, requireRole('teacher'), asyncHandler(ctrl.republishTest));
router.post('/:testId/start', authenticate, requireRole('student'), validate(startTestAttemptSchema), asyncHandler(ctrl.startTestAttempt));
router.post('/attempts/:attemptId/submit', authenticate, requireRole('student'), validate(submitTestAttemptSchema), asyncHandler(ctrl.submitTestAttempt));
router.get('/:testId/results', authenticate, asyncHandler(ctrl.getTestResults));
router.put('/:testId/results', authenticate, requireRole('teacher'), validate(releaseTestResultsSchema), asyncHandler(ctrl.releaseTestResults));

router.get('/templates/my', authenticate, requireRole('teacher'), asyncHandler(ctrl.listTemplates));
router.post('/templates', authenticate, requireRole('teacher'), validate(createTemplateSchema), asyncHandler(ctrl.createTemplate));
router.put('/templates/:templateId', authenticate, requireRole('teacher'), validate(updateTemplateSchema), asyncHandler(ctrl.updateTemplate));
router.delete('/templates/:templateId', authenticate, requireRole('teacher'), asyncHandler(ctrl.deleteTemplate));

export default router;
