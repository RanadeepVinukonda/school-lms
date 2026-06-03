import api from './api';
import type { ApiResponse, Notification, NotificationPreferences } from '@/types';

export const notificationService = {
  async getAll() {
    const response = await api.get<ApiResponse<Notification[]>>('/notifications');
    return response.data;
  },

  async getUnreadCount() {
    const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return response.data;
  },

  async markAsRead(id: string) {
    const response = await api.put<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await api.put<ApiResponse<void>>('/notifications/read-all');
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/notifications/${id}`);
    return response.data;
  },

  async getPreferences() {
    const response = await api.get<ApiResponse<NotificationPreferences>>('/notifications/preferences');
    return response.data;
  },

  async updatePreferences(data: Partial<NotificationPreferences>) {
    const response = await api.put<ApiResponse<NotificationPreferences>>('/notifications/preferences', data);
    return response.data;
  },
};
