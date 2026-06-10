import { Router } from 'express';
import * as conceptController from '../controllers/concept.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/:conceptId', authenticate, requireRole('teacher'), asyncHandler(conceptController.getWhiteboard));
router.post('/:conceptId', authenticate, requireRole('teacher'), asyncHandler(conceptController.saveWhiteboard));

export default router;
