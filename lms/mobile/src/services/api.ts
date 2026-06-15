import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import auth from '@react-native-firebase/auth';
import { API_BASE_URL } from '../utils/constants';
import { useAuthStore } from '../store/authStore';
import type { ApiError } from '../types';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry &&
      auth().currentUser
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (token && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const freshToken = await auth().currentUser.getIdToken(true);
        useAuthStore.getState().setToken(freshToken);
        processQueue(null, freshToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      code: error.response?.data?.code,
      status: error.response?.status,
    };
    return Promise.reject(apiError);
  },
);

export default api;
