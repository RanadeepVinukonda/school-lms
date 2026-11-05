import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import * as parentController from '../controllers/parent.controller';

const router = Router();

router.use(authenticate, requireRole('parent'));

router.get('/children', asyncHandler(parentController.getChildren));
router.get('/children/:studentId/dashboard', asyncHandler(parentController.getChildDashboard));
router.get('/children/:studentId/progress', asyncHandler(parentController.getChildProgress));
router.get('/children/:studentId/report', asyncHandler(parentController.getChildReport));
router.get('/recommendations', asyncHandler(parentController.getRecommendations));
router.get('/children/:studentId/yearly-report', asyncHandler(parentController.getYearlyReport));

export default router;
