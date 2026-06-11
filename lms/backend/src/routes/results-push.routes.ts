import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import * as resultsPushController from '../controllers/results-push.controller';

const router = Router();

router.post('/release-class', authenticate, requireRole('teacher'), asyncHandler(resultsPushController.releaseBatch));
router.post('/release-single', authenticate, requireRole('teacher'), asyncHandler(resultsPushController.releaseSingle));

export default router;
