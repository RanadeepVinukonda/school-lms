
import * as notificationService from "../../services/notification.service";
import { sendSuccess, sendCreated, buildPaginationMeta } from "../../utils/response";
import { parsePagination } from "../../utils/pagination";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const getNotifications = asyncHandler(async (req: AuthRequest, res) => {
  const pagination = parsePagination(req.query);
  const result = await notificationService.getNotifications(req.user!.id, pagination);
  sendSuccess(res, "Notifications retrieved", {
    notifications: result.notifications,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});

export const markNotificationRead = asyncHandler(async (req: AuthRequest, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user!.id);
  sendSuccess(res, "Notification marked as read", notification);
});

export const markAllRead = asyncHandler(async (req: AuthRequest, res) => {
  await notificationService.markAllAsRead(req.user!.id);
  sendSuccess(res, "All notifications marked as read");
});

export const getPreferences = asyncHandler(async (req: AuthRequest, res) => {
  const preferences = await notificationService.getPreferences(req.user!.id);
  sendSuccess(res, "Preferences retrieved", preferences);
});

export const updatePreferences = asyncHandler(async (req: AuthRequest, res) => {
  const preferences = await notificationService.updatePreferences(req.user!.id, req.body);
  sendSuccess(res, "Preferences updated", preferences);
});

export const createBulkNotifications = asyncHandler(async (req: AuthRequest, res) => {
  const notifications = await notificationService.createBulkNotifications(req.body);
  sendCreated(res, "Notifications created", notifications);
});

