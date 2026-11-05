import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import * as teachResourcesController from '../controllers/teach-resources.controller';

const router = Router();

router.get(
  '/search/:conceptId',
  authenticate,
  requireRole('teacher', 'admin'),
  asyncHandler(teachResourcesController.searchTeachResources),
);

export default router;
