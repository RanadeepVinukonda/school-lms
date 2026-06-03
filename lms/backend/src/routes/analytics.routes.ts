import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/student/dashboard', authenticate, requireRole('student', 'parent'), asyncHandler(analyticsController.getStudentDashboard));
router.get('/teacher/dashboard', authenticate, requireRole('teacher'), asyncHandler(analyticsController.getTeacherDashboard));
router.get('/admin/dashboard', authenticate, requireRole('admin'), asyncHandler(analyticsController.getAdminDashboard));
router.get('/course/:courseId', authenticate, requireRole('teacher', 'admin'), asyncHandler(analyticsController.getCourseAnalytics));

export default router;
