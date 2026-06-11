import api from './api';
import type { ApiResponse, PaginatedResponse, PaginationParams, User, UserProfile, UserRole } from '@/types';

export interface CreateUserInput {
  displayName: string;
  email?: string;
  password?: string;
  role: UserRole;
  classId?: string;
  rollNo?: number;
  academicYear?: string;
}

/** API service for user management (admin) and profile updates. */
export const userService = {
  /** Fetch all users with optional pagination and filters. */
  async getAll(params?: PaginationParams) {
    const response = await api.get<PaginatedResponse<User>>('/users', { params });
    return response.data;
  },

  /** Fetch a single user by id. */
  async getById(id: string) {
    const response = await api.get<ApiResponse<UserProfile>>(`/users/${id}`);
    return response.data;
  },

  /** Create a new user (admin only). */
  async create(data: CreateUserInput) {
    const response = await api.post<ApiResponse<User>>('/users', data);
    return response.data;
  },

  /** Update a user by id (admin only). */
  async update(id: string, data: Partial<User>) {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data;
  },

  /** Delete a user by id (admin only). */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/users/${id}`);
    return response.data;
  },

  /** Toggle a user's active status (admin only). */
  async toggleActive(id: string) {
    const response = await api.patch<ApiResponse<User>>(`/users/${id}/toggle-active`);
    return response.data;
  },

  /** Update the current user's own profile. */
  async updateProfile(data: Partial<UserProfile>) {
    const response = await api.put<ApiResponse<UserProfile>>('/users/profile', data);
    return response.data;
  },

  /** Change the current user's password. */
  async updatePassword(data: { currentPassword: string; newPassword: string }) {
    const response = await api.put<ApiResponse<void>>('/users/password', data);
    return response.data;
  },
};
