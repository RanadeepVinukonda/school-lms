import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from '../supabase/config';
import { API_BASE_URL } from '../utils/constants';
import { useAuthStore } from '../store/authStore';
import { useNetworkStore } from '../store/networkStore';
import { offlineCache } from '../utils/offlineCache';

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

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s as required by U28
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

let isSyncingMutations = false;
async function triggerSyncMutations() {
  if (isSyncingMutations) return;
  isSyncingMutations = true;
  try {
    const queueStr = await offlineCache.getItem('mutation_queue');
    const queue: Array<{ url: string; method: string; data: any; headers: any }> = queueStr ? JSON.parse(queueStr) : [];
    if (queue.length === 0) {
      isSyncingMutations = false;
      return;
    }
    
    const remainingQueue = [];
    for (const item of queue) {
      try {
        await axios({
          baseURL: API_BASE_URL,
          url: item.url,
          method: item.method,
          data: item.data,
          headers: {
            ...item.headers,
            Authorization: `Bearer ${useAuthStore.getState().token}`
          }
        });
      } catch (err: any) {
        const isNetworkErr = !err.response || err.code === 'ECONNABORTED';
        if (isNetworkErr) {
          remainingQueue.push(...queue.slice(queue.indexOf(item)));
          break;
        }
      }
    }
    await offlineCache.setItem('mutation_queue', JSON.stringify(remainingQueue));
  } catch {
    // ignore
  } finally {
    isSyncingMutations = false;
  }
}

api.interceptors.response.use(
  (response) => {
    // Successful response means we are online
    useNetworkStore.getState().setOffline(false);
    triggerSyncMutations();

    const config = response.config;
    if (config.method?.toLowerCase() === 'get' && config.url) {
      const cacheKey = `api_get:${config.url}${config.params ? JSON.stringify(config.params) : ''}`;
      offlineCache.setItem(cacheKey, JSON.stringify({
        data: response.data,
        timestamp: Date.now()
      }));
    }
    return response;
  },
  async (error: AxiosError<ErrorResponse>) => {
    const config = error.config as CustomAxiosRequestConfig;
    const isNetworkError = !error.response || error.code === 'ECONNABORTED';

    if (isNetworkError) {
      useNetworkStore.getState().setOffline(true);

      // 1. Retry logic with exponential backoff (max 3 retries)
      config._retryCount = config._retryCount || 0;
      if (config._retryCount < 3) {
        config._retryCount += 1;
        const delay = Math.pow(2, config._retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return api(config);
      }

      // 2. Offline caching for GET requests
      if (config.method?.toLowerCase() === 'get' && config.url) {
        const cacheKey = `api_get:${config.url}${config.params ? JSON.stringify(config.params) : ''}`;
        const cachedStr = await offlineCache.getItem(cacheKey);
        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr);
            return {
              data: cached.data,
              status: 200,
              statusText: 'OK (Cached)',
              headers: {},
              config
            } as any;
          } catch {}
        }
      }

      // 3. Queue mutations for POST, PUT, DELETE requests
      const method = config.method?.toLowerCase();
      if ((method === 'post' || method === 'put' || method === 'delete') && config.url) {
        if (!config.url.includes('/api/device-tokens') && !config.url.includes('/auth/')) {
          try {
            const queueStr = await offlineCache.getItem('mutation_queue');
            const queue = queueStr ? JSON.parse(queueStr) : [];
            let parsedData = config.data;
            if (typeof config.data === 'string') {
              try {
                parsedData = JSON.parse(config.data);
              } catch {}
            }
            queue.push({
              url: config.url,
              method: config.method,
              data: parsedData,
              headers: config.headers,
              timestamp: Date.now()
            });
            await offlineCache.setItem('mutation_queue', JSON.stringify(queue));
          } catch {}
          const apiError: ApiError = {
            message: 'Offline. Action has been queued and will sync when online.',
            code: 'OFFLINE_QUEUED',
            status: 503
          };
          return Promise.reject(apiError);
        }
      }
    }

    const originalRequest = config;
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
