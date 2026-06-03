import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { notificationPreferencesSchema } from '../validators/settings.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(notificationController.getNotifications));
router.put('/read-all', authenticate, asyncHandler(notificationController.markAllNotificationsRead));
router.put('/:notificationId/read', authenticate, asyncHandler(notificationController.markNotificationRead));
router.get('/preferences', authenticate, asyncHandler(notificationController.getNotificationPreferences));
router.put('/preferences', authenticate, validate(notificationPreferencesSchema), asyncHandler(notificationController.updateNotificationPreferences));

export default router;
