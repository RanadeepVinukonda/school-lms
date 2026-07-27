import { Request, Response } from 'express';
import * as notificationService from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

export async function getNotifications(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await notificationService.getNotificationsByUser(req.user.uid, req.query as Record<string, unknown>);
  sendSuccess(res, result);
}

export async function markNotificationRead(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  await notificationService.markNotificationRead(req.params.notificationId, req.user.uid);
  sendSuccess(res, null, 'Notification marked as read');
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  await notificationService.markAllNotificationsRead(req.user.uid);
  sendSuccess(res, null, 'All notifications marked as read');
}

export async function getUnreadCount(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await notificationService.getUnreadCount(req.user.uid);
  sendSuccess(res, result);
}

export async function deleteNotification(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  await notificationService.deleteNotification(req.params.notificationId, req.user.uid);
  sendSuccess(res, null, 'Notification deleted');
}

export async function getNotificationPreferences(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await notificationService.getNotificationPreferences(req.user.uid);
  sendSuccess(res, result);
}

export async function updateNotificationPreferences(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await notificationService.updateNotificationPreferences(req.user.uid, req.body);
  sendSuccess(res, result, 'Preferences updated');
}
