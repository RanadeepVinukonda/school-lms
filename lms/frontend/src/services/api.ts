import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from '@/supabase/config';
import { API_BASE_URL } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import type { ApiError } from '@/types';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  withCredentials: true,
});

// ---------- CSRF token management ----------
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

// In-memory cache for CSRF token (needed for Capacitor/mobile where JS
// cannot read cookies set by a different origin /api backend domain).
let cachedCsrfToken: string | null = null;

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
      const response = await axios.get<{ success: boolean; data: { csrfToken: string } }>(
        `${API_BASE_URL}/csrf-token`,
        { withCredentials: true, timeout: 5000 }
      );
      const bodyToken = response.data?.data?.csrfToken;
      if (bodyToken) {
        cachedCsrfToken = bodyToken;
        return bodyToken;
      }
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
  // 1. Check in-memory cache first (works everywhere, including Capacitor)
  if (cachedCsrfToken) return cachedCsrfToken;
  // 2. Try reading the cookie (works on same-origin web)
  const existing = readCsrfCookie();
  if (existing) {
    cachedCsrfToken = existing;
    return existing;
  }
  // 3. Fetch a fresh token from the server
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

const AUTH_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms)),
  ]);
}

async function getAccessToken(): Promise<string | null> {
  // Use cached token if still valid
  if (cachedToken && !isTokenExpired(cachedToken)) return cachedToken;

  // Try refreshing the Supabase session first (handles auto-refresh behind the scenes)
  try {
    const { data: { session } } = await withTimeout(supabase.auth.refreshSession(), AUTH_TIMEOUT_MS);
    if (session?.access_token) {
      cachedToken = session.access_token;
      const payload = decodeJwtPayload(session.access_token);
      tokenExpiresAt = payload?.exp ? (payload.exp as number) * 1000 : 0;
      return cachedToken;
    }
  } catch { /* fall through */ }

  // Try getting the current session (if refresh didn't work)
  try {
    const { data: { session } } = await withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS);
    if (session?.access_token) {
      cachedToken = session.access_token;
      const payload = decodeJwtPayload(session.access_token);
      tokenExpiresAt = payload?.exp ? (payload.exp as number) * 1000 : 0;
      return cachedToken;
    }
  } catch { /* fall through */ }

  // Fallback to persisted store token (use even if locally expired — backend will return 401 to trigger refresh)
  const storeToken = useAuthStore.getState().token;
  if (storeToken) {
    cachedToken = storeToken;
    const payload = decodeJwtPayload(storeToken);
    if (payload?.exp) tokenExpiresAt = (payload.exp as number) * 1000;
    return cachedToken;
  }

  return null;
}

// ---------- Debug logging interceptor ----------
const LOG_PREFIX = '[API]';
api.interceptors.request.use(
  (config) => {
    const url = `${config.baseURL || ''}${config.url || ''}`;
    const method = (config.method || 'GET').toUpperCase();
    const hasAuth = !!config.headers?.Authorization;
    const hasCsrf = !!config.headers?.[CSRF_HEADER_NAME];
    console.log(`${LOG_PREFIX} ➡️  ${method} ${url}`, { hasAuth, hasCsrf, dataSize: config.data ? JSON.stringify(config.data).length : 0 });
    (config as any)._startTime = Date.now();
    return config;
  },
  (error) => {
    console.error(`${LOG_PREFIX} ❌ Request interceptor error:`, error.message);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    const cfg = response.config as any;
    const duration = cfg._startTime ? Date.now() - cfg._startTime : -1;
    const url = `${response.config.baseURL || ''}${response.config.url || ''}`;
    const method = (response.config.method || 'GET').toUpperCase();
    console.log(`${LOG_PREFIX} ✅ ${method} ${url} ${response.status} (${duration}ms)`);
    return response;
  },
  (error) => {
    const cfg = error.config as any;
    const duration = cfg?._startTime ? Date.now() - cfg._startTime : -1;
    const url = cfg ? `${cfg.baseURL || ''}${cfg.url || ''}` : 'unknown';
    const method = cfg ? (cfg.method || 'GET').toUpperCase() : 'UNKNOWN';
    const status = error.response?.status || 'NETWORK_ERR';
    const respBody = error.response?.data ? JSON.stringify(error.response.data).substring(0, 500) : '(no response body)';
    console.error(`${LOG_PREFIX} ❌ ${method} ${url} ${status} (${duration}ms)`, { responseBody: respBody, message: error.message, code: error.code });
    // Continue with the normal error handling below
    return Promise.reject(error);
  }
);

// ---------- Proactive token refresh ----------
let refreshTimerId: ReturnType<typeof setInterval> | null = null;

function decodeAndGetExp(token: string): number {
  const payload = decodeJwtPayload(token);
  return payload?.exp ? (payload.exp as number) * 1000 : 0;
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const { data: { session } } = await withTimeout(supabase.auth.refreshSession(), AUTH_TIMEOUT_MS);
    if (session?.access_token) {
      cachedToken = session.access_token;
      tokenExpiresAt = decodeAndGetExp(session.access_token);
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

export function startTokenRefresh(): void {
  stopTokenRefresh();
  refreshTimerId = setInterval(async () => {
    const token = cachedToken || useAuthStore.getState().token;
    if (!token) return;
    const exp = tokenExpiresAt || decodeAndGetExp(token);
    // Refresh if within 10 minutes of expiry
    if (exp > 0 && exp - Date.now() < 10 * 60 * 1000) {
      await tryRefreshToken();
    }
  }, 5 * 60 * 1000);
}

export function stopTokenRefresh(): void {
  if (refreshTimerId !== null) {
    clearInterval(refreshTimerId);
    refreshTimerId = null;
  }
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
  async (error: AxiosError<{ error?: { message: string; code?: string; details?: Array<{ field: string; message: string }> }; message?: string; code?: string }>) => {
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
        const errData = error.response?.data;
        const errorMessage = errData?.error?.message || errData?.message || 'Session expired. Please sign in again.';
        const apiError: ApiError = {
          message: errorMessage,
          code: errData?.error?.code || 'SESSION_EXPIRED',
          status: 401,
        };
        return Promise.reject(apiError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle CSRF token failures — refresh token and retry once
    if (
      error.response?.status === 403 &&
      (error.response?.data as any)?.error?.message?.toLowerCase().includes('csrf') &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      cachedCsrfToken = null; // clear stale cache
      const newToken = await fetchAndCacheCsrfToken();
      if (newToken) {
        originalRequest.headers[CSRF_HEADER_NAME] = newToken;
        return api(originalRequest);
      }
    }

    const errData = error.response?.data;
    let errorMessage = errData?.error?.message || errData?.message || error.message;
    const details = errData?.error?.details;

    // Replace cryptic CSRF error with user-friendly message
    if (errorMessage?.toLowerCase().includes('csrf')) {
      errorMessage = 'Your session has expired. Please log in again.';
    }

    const message = details && details.length > 0
      ? details.map((d) => d.message).join('; ')
      : errorMessage;
    const apiError: ApiError = {
      message: message || 'An unexpected error occurred',
      code: errData?.error?.code || errData?.code,
      status: error.response?.status,
      details: errData?.error?.details,
    };
    return Promise.reject(apiError);
  },
);

export default api;
