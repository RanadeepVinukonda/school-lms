import { Router } from 'express';
import { z } from 'zod';
import * as conceptController from '../controllers/concept.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const saveWhiteboardSchema = z.object({
  content: z.any(),
}).passthrough();

router.get('/:conceptId', authenticate, requireRole('teacher'), asyncHandler(conceptController.getWhiteboard));
router.post('/:conceptId', authenticate, requireRole('teacher'), validate(saveWhiteboardSchema), asyncHandler(conceptController.saveWhiteboard));

export default router;
