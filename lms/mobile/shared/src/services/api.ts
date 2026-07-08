import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from '../supabase/config';
import { API_BASE_URL } from '../utils/constants';
import { useAuthStore } from '../store/authStore';

interface ErrorResponse {
  error?: { message: string; code?: string; details?: Array<{ field: string; message: string }> };
  message?: string;
  code?: string;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s default; individual requests can override with their own timeout
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string | null) => void; reject: (error: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => { error ? p.reject(error) : p.resolve(token); });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); })
          .then((token) => {
            if (token && originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session) {
          useAuthStore.getState().setToken(session.access_token);
          processQueue(null, session.access_token);
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          return api(originalRequest);
        }
        throw new Error('Session refresh failed');
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(error);
      } finally { isRefreshing = false; }
    }
    const errData = error.response?.data;
    const errorMessage = errData?.error?.message || errData?.message || error.message;
    const apiError: ApiError = {
      message: errorMessage,
      code: errData?.error?.code || errData?.code,
      status: error.response?.status,
    };
    return Promise.reject(apiError);
  },
);

export default api;
