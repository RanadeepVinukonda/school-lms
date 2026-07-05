import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from '@/supabase/config';
import { API_BASE_URL } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import type { ApiError } from '@/types';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000,
});

// ---------- CSRF token management ----------
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

let csrfFetchPromise: Promise<string | null> | null = null;

async function fetchAndCacheCsrfToken(): Promise<string | null> {
  // Avoid concurrent fetches
  if (csrfFetchPromise) return csrfFetchPromise;

  csrfFetchPromise = (async () => {
    try {
      // A GET to /csrf-token sets the cookie and returns the token in the body.
      await axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true });
      return readCsrfCookie();
    } catch {
      return null;
    } finally {
      csrfFetchPromise = null;
    }
  })();

  return csrfFetchPromise;
}

async function getCsrfToken(): Promise<string | null> {
  const existing = readCsrfCookie();
  if (existing) return existing;
  return fetchAndCacheCsrfToken();
}

// ---------- Auth token interceptor ----------
// Attach Bearer token on every request — try Supabase session first, then store token fallback
api.interceptors.request.use(async (config) => {
  // Attach auth token
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      // Session is null (expired or not restored) — use store token
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // Supabase session retrieval failed, fall through to store token
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // Attach CSRF token on state-changing requests
  if (config.method && MUTATING_METHODS.has(config.method.toLowerCase())) {
    const csrfToken = await getCsrfToken();
    if (csrfToken) {
      config.headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  return config;
});

// ---------- Response interceptor (token refresh on 401) ----------
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
      error.response?.status === 401 &&
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

        const refreshRes = await api.post('/auth/refresh', { refresh_token: refreshToken }, { timeout: 5000 });
        // Sync refreshed tokens back into Supabase client session
        const newToken = refreshRes.data?.data?.token;
        const newRefreshToken = refreshRes.data?.data?.refresh_token;
        if (newToken) {
          await supabase.auth.setSession({
            access_token: newToken,
            refresh_token: newRefreshToken || refreshToken,
          });
        }
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
