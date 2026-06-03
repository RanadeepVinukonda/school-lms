import api from './api';
import type { ApiResponse, PaginatedResponse, PaginationParams, User, UserProfile } from '@/types';

export const userService = {
  async getAll(params?: PaginationParams) {
    const response = await api.get<PaginatedResponse<User>>('/users', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get<ApiResponse<UserProfile>>(`/users/${id}`);
    return response.data;
  },

  async create(data: Partial<User>) {
    const response = await api.post<ApiResponse<User>>('/users', data);
    return response.data;
  },

  async update(id: string, data: Partial<User>) {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/users/${id}`);
    return response.data;
  },

  async toggleActive(id: string) {
    const response = await api.patch<ApiResponse<User>>(`/users/${id}/toggle-active`);
    return response.data;
  },

  async updateProfile(data: Partial<UserProfile>) {
    const response = await api.put<ApiResponse<UserProfile>>('/users/profile', data);
    return response.data;
  },

  async updatePassword(data: { currentPassword: string; newPassword: string }) {
    const response = await api.put<ApiResponse<void>>('/users/password', data);
    return response.data;
  },
};
