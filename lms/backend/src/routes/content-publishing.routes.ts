import { Router } from 'express';
import * as ctrl from '../controllers/content-publishing.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/', authenticate, requireRole('teacher'), asyncHandler(ctrl.publishContent));
router.get('/my', authenticate, requireRole('student'), asyncHandler(ctrl.getStudentContent));
router.get('/stats', authenticate, requireRole('teacher'), asyncHandler(ctrl.getContentStats));
router.get('/:classId', authenticate, requireRole('teacher', 'admin'), asyncHandler(ctrl.getPublishedContent));
router.delete('/:publishId', authenticate, requireRole('teacher'), asyncHandler(ctrl.unpublishContent));

export default router;
