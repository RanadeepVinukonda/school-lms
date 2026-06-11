import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import * as analyticsV2Controller from '../controllers/analytics-v2.controller';

const router = Router();

router.get('/class/:classId', authenticate, asyncHandler(analyticsV2Controller.getClassPerformance));
router.get('/student/:studentId', authenticate, asyncHandler(analyticsV2Controller.getStudentPerformance));
router.get('/assessment/:assessmentId', authenticate, asyncHandler(analyticsV2Controller.getAssessmentAnalytics));

export default router;
