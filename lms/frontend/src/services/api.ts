import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from '@/supabase/config';
import { API_BASE_URL } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import type { ApiError } from '@/types';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((p) => {
    if (error) { p.reject(error); } else { p.resolve(undefined); }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve: () => resolve(), reject });
        }).then(() => {
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const refreshToken = session?.refresh_token;
        if (!refreshToken) throw new Error('No refresh token');

        await api.post('/auth/refresh', { refresh_token: refreshToken }, { timeout: 5000 });
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().logout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    const data = error.response?.data as any;
    const errorMessage = data?.error?.message || data?.message || error.message;
    const details = data?.error?.details as Array<{ field: string; message: string }> | undefined;
    const message = details && details.length > 0
      ? details.map((d) => d.message).join('; ')
      : errorMessage;
    const apiError: ApiError = {
      message: message || 'An unexpected error occurred',
      code: data?.error?.code || data?.code,
      status: error.response?.status,
    };
    return Promise.reject(apiError);
  },
);

export default api;
