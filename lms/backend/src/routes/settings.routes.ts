import { Router } from 'express';
import { z } from 'zod';
import * as settingsController from '../controllers/settings.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const updateSettingsSchema = z.object({
  schoolName: z.string().optional(),
  schoolCode: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  logo: z.string().optional(),
  academicYear: z.string().optional(),
  semester: z.string().optional(),
  conceptFlaggingThreshold: z.number().min(0).max(100).optional(),
  gradingSystem: z.object({ type: z.string(), scale: z.number(), passingGrade: z.string() }).optional(),
  attendanceSettings: z.object({ enableGeoFencing: z.boolean(), gracePeriodMinutes: z.number(), autoMarkAbsentAfter: z.number() }).optional(),
  notificationPreferences: z.object({ email: z.boolean(), push: z.boolean(), sms: z.boolean(), inApp: z.boolean() }).optional(),
  securitySettings: z.object({ passwordMinLength: z.number(), maxLoginAttempts: z.number(), sessionTimeoutMinutes: z.number(), requireTwoFactor: z.boolean() }).optional(),
  features: z.record(z.unknown()).optional(),
}).strict();

const updateSystemSettingsSchema = z.object({
  academicYear: z.string().optional(),
  semester: z.string().optional(),
  conceptFlaggingThreshold: z.number().min(0).max(100).optional(),
  gradingSystem: z.object({ type: z.string(), scale: z.number(), passingGrade: z.string() }).optional(),
  attendanceSettings: z.object({ enableGeoFencing: z.boolean(), gracePeriodMinutes: z.number(), autoMarkAbsentAfter: z.number() }).optional(),
  securitySettings: z.object({ passwordMinLength: z.number(), maxLoginAttempts: z.number(), sessionTimeoutMinutes: z.number(), requireTwoFactor: z.boolean() }).optional(),
  features: z.record(z.unknown()).optional(),
}).strict();

router.get('/', authenticate, asyncHandler(settingsController.getSettings));
router.put('/', authenticate, requireRole('admin'), validate(updateSettingsSchema), asyncHandler(settingsController.updateSettings));
router.get('/system', authenticate, requireRole('admin'), asyncHandler(settingsController.getSystemSettings));
router.put('/system', authenticate, requireRole('admin'), validate(updateSystemSettingsSchema), asyncHandler(settingsController.updateSystemSettings));

export default router;
