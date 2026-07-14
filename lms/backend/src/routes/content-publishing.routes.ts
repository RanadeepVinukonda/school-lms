import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/content-publishing.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const publishContentSchema = z.object({
  classId: z.string().min(1),
  lessonId: z.string().min(1),
  scheduledDate: z.string().optional(),
}).passthrough();

router.post('/', authenticate, requireRole('teacher'), validate(publishContentSchema), asyncHandler(ctrl.publishContent));
router.get('/my', authenticate, requireRole('student'), asyncHandler(ctrl.getStudentContent));
router.get('/stats', authenticate, requireRole('teacher'), asyncHandler(ctrl.getContentStats));
router.get('/:classId', authenticate, requireRole('teacher', 'admin'), asyncHandler(ctrl.getPublishedContent));
router.delete('/:publishId', authenticate, requireRole('teacher'), asyncHandler(ctrl.unpublishContent));

export default router;
