import { Router } from 'express';
import { z } from 'zod';
import * as settingsController from '../controllers/settings.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const updateSettingsSchema = z.object({}).passthrough();
const updateSystemSettingsSchema = z.object({}).passthrough();

router.get('/', asyncHandler(settingsController.getSettings));
router.put('/', authenticate, requireRole('admin'), validate(updateSettingsSchema), asyncHandler(settingsController.updateSettings));
router.get('/system', authenticate, requireRole('admin'), asyncHandler(settingsController.getSystemSettings));
router.put('/system', authenticate, requireRole('admin'), validate(updateSystemSettingsSchema), asyncHandler(settingsController.updateSystemSettings));

export default router;
