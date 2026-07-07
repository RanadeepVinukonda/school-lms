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

// ---------- Cached auth token ----------
// Avoid calling supabase.auth.getSession() on every request — it hits Auth API and can
// trigger rate limits under rapid concurrent requests.  We cache the token and only
// re-fetch when it is missing or clearly expired (based on JWT exp claim).
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch { return null; }
}

function isTokenExpired(token: string): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  // Treat as expired 30 seconds before actual expiry to be safe
  return (payload.exp as number) * 1000 - 30000 < Date.now();
}

async function getAccessToken(): Promise<string | null> {
  // Use cached token if still valid
  if (cachedToken && !isTokenExpired(cachedToken)) return cachedToken;

  // Try refreshing the Supabase session first (handles auto-refresh behind the scenes)
  try {
    const { data: { session } } = await supabase.auth.refreshSession();
    if (session?.access_token) {
      cachedToken = session.access_token;
      const payload = decodeJwtPayload(session.access_token);
      tokenExpiresAt = payload?.exp ? (payload.exp as number) * 1000 : 0;
      return cachedToken;
    }
  } catch { /* fall through */ }

  // Try getting the current session (if refresh didn't work)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      cachedToken = session.access_token;
      const payload = decodeJwtPayload(session.access_token);
      tokenExpiresAt = payload?.exp ? (payload.exp as number) * 1000 : 0;
      return cachedToken;
    }
  } catch { /* fall through */ }

  // Fallback to persisted store token
  const storeToken = useAuthStore.getState().token;
  if (storeToken && !isTokenExpired(storeToken)) {
    cachedToken = storeToken;
    return cachedToken;
  }

  return null;
}

// ---------- Auth token interceptor ----------
api.interceptors.request.use(async (config) => {
  // Skip auth for the refresh endpoint itself
  if (config.url === '/auth/refresh') {
    return config;
  }

  // Attach auth token from cache (avoids per-request Supabase session call)
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
          cachedToken = newToken; // update cache
          const payload = decodeJwtPayload(newToken);
          tokenExpiresAt = payload?.exp ? (payload.exp as number) * 1000 : 0;
          await supabase.auth.setSession({
            access_token: newToken,
            refresh_token: newRefreshToken || refreshToken,
          });
          processQueue(null);
        } else {
          // No new token returned — treat as refresh failure
          throw new Error('Refresh endpoint did not return a new token');
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        cachedToken = null;
        await useAuthStore.getState().logout();
        const data = error.response?.data as any;
        const errorMessage = data?.error?.message || data?.message || 'Session expired. Please sign in again.';
        const apiError: ApiError = {
          message: errorMessage,
          code: data?.error?.code || 'SESSION_EXPIRED',
          status: 401,
        };
        return Promise.reject(apiError);
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
