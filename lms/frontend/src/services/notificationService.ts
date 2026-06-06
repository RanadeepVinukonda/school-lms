import api from './api';
import type { ApiResponse, Notification, NotificationPreferences } from '@/types';

interface PaginatedNotifications {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
}

/** API service for notification CRUD and preferences. */
export const notificationService = {
  /** Fetch all notifications for the current user. */
  async getAll() {
    const response = await api.get<ApiResponse<PaginatedNotifications>>('/notifications');
    return response.data.data;
  },

  /** Get the unread notification count for the current user. */
  async getUnreadCount() {
    const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return response.data;
  },

  /** Mark a single notification as read. */
  async markAsRead(id: string) {
    const response = await api.put<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return response.data;
  },

  /** Mark all notifications as read for the current user. */
  async markAllAsRead() {
    const response = await api.put<ApiResponse<void>>('/notifications/read-all');
    return response.data;
  },

  /** Delete a notification by id. */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/notifications/${id}`);
    return response.data;
  },

  /** Get the current user's notification preferences. */
  async getPreferences() {
    const response = await api.get<ApiResponse<NotificationPreferences>>('/notifications/preferences');
    return response.data;
  },

  /** Update the current user's notification preferences. */
  async updatePreferences(data: Partial<NotificationPreferences>) {
    const response = await api.put<ApiResponse<NotificationPreferences>>('/notifications/preferences', data);
    return response.data;
  },
};
