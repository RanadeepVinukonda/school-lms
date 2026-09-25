import api from './api';
import type { ApiResponse, LoginInput, RegisterInput, User } from '@/types';

/** API service for authentication — login, register, password management. */
export const authService = {
  /** Log in with email and password. Returns user and token. */
  async login(data: LoginInput) {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', data);
    return response.data;
  },

  /** Register a new user account. */
  async register(data: RegisterInput) {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', data);
    return response.data;
  },

  /** Log out the current user. */
  async logout() {
    await api.post('/auth/logout');
  },

  /** Get the currently authenticated user's profile. */
  async getCurrentUser() {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },

  /** Request a password reset email. */
  async forgotPassword(email: string) {
    const response = await api.post<ApiResponse<null>>('/auth/forgot-password', { email });
    return response.data;
  },

  /** Validate a password reset token. */
  async verifyResetToken(token: string) {
    const response = await api.post<ApiResponse<{ uid: string }>>('/auth/verify-reset-token', { token });
    return response.data;
  },

  /** Reset password using a reset token and the new password. */
  async resetPassword(token: string, newPassword: string) {
    const response = await api.post<ApiResponse<null>>('/auth/reset-password', { token, password: newPassword });
    return response.data;
  },

  /** Verify a token's validity. */
  async verifyToken(token: string) {
    const response = await api.post<ApiResponse<{ valid: boolean }>>('/auth/verify-token', { token });
    return response.data;
  },
};
