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
        // Write the cookie via JS too so the WebView always has a matching
        // csrf-token cookie even if the Set-Cookie header was dropped.
        try {
          document.cookie = `${CSRF_COOKIE_NAME}=${encodeURIComponent(bodyToken)}; path=/; SameSite=None; Secure`;
        } catch { /* ignore */ }
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
  // Treat as expired only 60s AFTER the real expiry time. This gives tolerance for
  // device clock skew (a fast clock would otherwise trigger premature refresh
  // storms); genuinely-expired tokens get caught by the backend 401 + refresh flow.
  return (payload.exp as number) * 1000 + 60 * 1000 < Date.now();
}

async function refreshViaBackend(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const storeState = useAuthStore.getState();
  // Fall back to the persisted refresh token when the SDK session is
  // missing/stale (WebView storage cleared, background throttle, desync).
  const refreshToken = session?.refresh_token || storeState.refreshToken;
  if (!refreshToken) return null;

  const refreshRes = await api.post('/auth/refresh', { refresh_token: refreshToken }, { timeout: 5000 });
  const newToken = refreshRes.data?.data?.token;
  if (!newToken) return null;

  const newRefreshToken = refreshRes.data?.data?.refresh_token;
  cachedToken = newToken;
  tokenExpiresAt = decodeAndGetExp(newToken);
  // Sync the rotated tokens back into the SDK AND the persisted store so the
  // new refresh token is never lost across reloads/backgrounding.
  try {
    await supabase.auth.setSession({
      access_token: newToken,
      refresh_token: newRefreshToken || refreshToken,
    });
  } catch { /* ignore */ }
  useAuthStore.getState().setSessionTokens(newToken, newRefreshToken || refreshToken);
  return newToken;
}

async function getAccessToken(): Promise<string | null> {
  // Use cached token if still valid
  if (cachedToken && !isTokenExpired(cachedToken)) return cachedToken;

  // Use the persisted store token if still valid (avoids a network round-trip)
  const storeToken = useAuthStore.getState().token;
  if (storeToken && !isTokenExpired(storeToken)) {
    cachedToken = storeToken;
    tokenExpiresAt = decodeAndGetExp(storeToken);
    return cachedToken;
  }

  // Token missing/expired — rotate via the backend (single refresh authority).
  try {
    const newToken = await refreshViaBackend();
    if (newToken) return newToken;
  } catch { /* fall through */ }

  // Last resort: send the store token even if locally expired — the backend
  // returns 401 and the response interceptor drives the refresh + retry.
  if (storeToken) {
    cachedToken = storeToken;
    tokenExpiresAt = decodeAndGetExp(storeToken);
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
    const newToken = await refreshViaBackend();
    return !!newToken;
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
    const isRefreshCall = (originalRequest?.url || '').includes('/auth/refresh');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRefreshCall
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
        const newToken = await refreshViaBackend();
        if (newToken) {
          processQueue(null);
        } else {
          // No refresh token anywhere — the session is unrecoverable.
          throw new Error('No refresh token');
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Distinguish a genuinely-dead session from a transient blip (offline,
        // Render cold start, timeout). Only a dead session logs the user out.
        const refreshStatus = (refreshError as any)?.response?.status ?? (refreshError as any)?.status;
        const code = (refreshError as any)?.code;
        const msg = String((refreshError as any)?.message || '').toLowerCase();
        const noRefreshToken = msg.includes('no refresh token');
        const transient = !noRefreshToken && (!refreshStatus || refreshStatus === 502 || refreshStatus === 503 || refreshStatus >= 500 || code === 'ECONNABORTED' || msg.includes('network'));

        if (noRefreshToken || !transient) {
          cachedToken = null;
          await useAuthStore.getState().logout();
          const errData = error.response?.data;
          const errorMessage = errData?.error?.message || errData?.message || 'Your session has expired. Please sign in again.';
          const apiError: ApiError = {
            message: errorMessage,
            code: errData?.error?.code || 'SESSION_EXPIRED',
            status: 401,
          };
          return Promise.reject(apiError);
        }

        // Transient — keep the session; surface a retryable error so pages show a
        // friendly "try again" instead of booting the user out.
        const apiError: ApiError = {
          message: 'Temporarily unable to connect. Please try again.',
          code: 'NETWORK_ERROR',
          status: 0,
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
