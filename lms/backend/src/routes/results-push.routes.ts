import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as resultsPushController from '../controllers/results-push.controller';

const router = Router();

const releaseBatchSchema = z.object({
  classId: z.string().min(1),
  assessmentType: z.string().min(1),
  assessmentIds: z.array(z.string().min(1)).min(1),
}).passthrough();

const releaseSingleSchema = z.object({
  studentId: z.string().min(1),
  assessmentId: z.string().min(1),
  assessmentType: z.string().min(1),
}).passthrough();

router.post('/release-class', authenticate, requireRole('teacher'), validate(releaseBatchSchema), asyncHandler(resultsPushController.releaseBatch));
router.post('/release-single', authenticate, requireRole('teacher'), validate(releaseSingleSchema), asyncHandler(resultsPushController.releaseSingle));

export default router;
