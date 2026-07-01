import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as analyticsV2Controller from '../controllers/analytics-v2.controller';

const router = Router();

const reTeachSchema = z.object({
  conceptId: z.string().min(1),
  classId: z.string().min(1),
}).passthrough();

router.get('/oversight', authenticate, requireRole('teacher', 'admin'), asyncHandler(analyticsV2Controller.getConceptOversight));
router.post('/re-teach', authenticate, requireRole('teacher', 'admin'), validate(reTeachSchema), asyncHandler(analyticsV2Controller.notifyReTeach));

router.get('/conducted-tests', authenticate, requireRole('teacher', 'admin'), asyncHandler(analyticsV2Controller.getConductedTests));
router.get('/class/:classId', authenticate, requireRole('teacher', 'admin'), asyncHandler(analyticsV2Controller.getClassPerformance));
router.get('/class/:classId/concepts', authenticate, requireRole('teacher', 'admin'), asyncHandler(analyticsV2Controller.getClassConcepts));
router.get('/student/:studentId', authenticate, requireRole('teacher', 'admin'), asyncHandler(analyticsV2Controller.getStudentPerformance));
router.get('/assessment/:assessmentId', authenticate, requireRole('teacher', 'admin'), asyncHandler(analyticsV2Controller.getAssessmentAnalytics));

export default router;
