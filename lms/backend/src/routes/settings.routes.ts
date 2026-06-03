import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(settingsController.getSettings));
router.put('/', authenticate, requireRole('admin'), asyncHandler(settingsController.updateSettings));
router.get('/system', authenticate, requireRole('admin'), asyncHandler(settingsController.getSystemSettings));
router.put('/system', authenticate, requireRole('admin'), asyncHandler(settingsController.updateSystemSettings));

export default router;
