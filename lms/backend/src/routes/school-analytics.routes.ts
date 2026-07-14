import { Router } from 'express';
import * as schoolAnalyticsController from '../controllers/school-analytics.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/grade-comparison', authenticate, requireRole('admin'), asyncHandler(schoolAnalyticsController.getGradeComparison));
router.get('/teacher-comparison', authenticate, requireRole('admin'), asyncHandler(schoolAnalyticsController.getTeacherComparison));
router.get('/class-comparison', authenticate, requireRole('admin'), asyncHandler(schoolAnalyticsController.getClassComparison));
router.get('/overview', authenticate, requireRole('admin'), asyncHandler(schoolAnalyticsController.getSchoolOverview));
router.get('/trends', authenticate, requireRole('admin'), asyncHandler(schoolAnalyticsController.getPerformanceTrends));

export default router;
