import api from './api';
import type { ApiResponse, LoginInput, RegisterInput, User } from '@/types';

export const authService = {
  async login(data: LoginInput) {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', data);
    return response.data;
  },

  async register(data: RegisterInput) {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', data);
    return response.data;
  },

  async logout() {
    await api.post('/auth/logout');
  },

  async getCurrentUser() {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },

  async forgotPassword(email: string) {
    const response = await api.post<ApiResponse<null>>('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string) {
    const response = await api.post<ApiResponse<null>>('/auth/reset-password', { token, password });
    return response.data;
  },

  async verifyToken(token: string) {
    const response = await api.post<ApiResponse<{ valid: boolean }>>('/auth/verify-token', { token });
    return response.data;
  },
};
