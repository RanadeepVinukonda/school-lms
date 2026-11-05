import { Router } from 'express';
import { z } from 'zod';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { notificationPreferencesSchema } from '../validators/settings.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const sendNotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  body: z.string().default(''),
  data: z.record(z.unknown()).optional(),
  link: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  role: z.string().optional(),
  classId: z.string().optional(),
  schoolId: z.string().optional(),
});

router.get('/', authenticate, asyncHandler(notificationController.getNotifications));
router.get('/unread-count', authenticate, asyncHandler(notificationController.getUnreadCount));
router.post('/send', authenticate, requireRole('admin', 'super_admin', 'teacher'), validate(sendNotificationSchema), asyncHandler(notificationController.sendNotification));
router.put('/read-all', authenticate, asyncHandler(notificationController.markAllNotificationsRead));
router.put('/:notificationId/read', authenticate, asyncHandler(notificationController.markNotificationRead));
router.delete('/:notificationId', authenticate, asyncHandler(notificationController.deleteNotification));
router.get('/preferences', authenticate, asyncHandler(notificationController.getNotificationPreferences));
router.put('/preferences', authenticate, validate(notificationPreferencesSchema), asyncHandler(notificationController.updateNotificationPreferences));

export default router;
