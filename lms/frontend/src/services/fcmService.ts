import api from './api';

let messagingInstance: any = null;
let currentToken: string | null = null;

/** Tokens already registered with the backend this session (avoids duplicate POSTs). */
const registeredTokens = new Set<string>();

const PENDING_TOKEN_KEY = 'lms_pending_push_token';
const PENDING_LINK_KEY = 'lms_pending_deep_link';

let nativeListenerReady: Promise<boolean> | null = null;

async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function getPendingToken(): string | null {
  try {
    return localStorage.getItem(PENDING_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setPendingToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(PENDING_TOKEN_KEY, token);
    else localStorage.removeItem(PENDING_TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(undefined);
  return navigator.serviceWorker.getRegistration().catch(() => undefined);
}

function getFirebaseConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !messagingSenderId || !appId) return null;
  return {
    apiKey,
    authDomain:
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
      `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
      `${projectId}.appspot.com`,
    messagingSenderId,
    appId,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
}

async function getMessaging() {
  if (messagingInstance) return messagingInstance;
  const config = getFirebaseConfig();
  if (!config) return null;
  try {
    const { initializeApp } = await import('firebase/app');
    const { getMessaging, isSupported } = await import('firebase/messaging');
    // FCM messaging swaps unsupported (bad push service provider, insecure context,
    // or no SW support). Avoid initialising app/messaging in those environments.
    if (!(await isSupported())) return null;
    const app = initializeApp(config);
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch {
    return null;
  }
}

/**
 * Register a token with the backend. On network failure the token is queued in
 * localStorage and re-sent on the next flush (app start / reconnect).
 */
async function postToken(token: string, platform: 'android' | 'web'): Promise<void> {
  if (registeredTokens.has(token)) return;
  try {
    await api.post('/device-tokens', { token, platform });
    registeredTokens.add(token);
    setPendingToken(null);
  } catch {
    setPendingToken(token);
  }
}

/**
 * Persistent native token listener. FCM generates a fresh registration token when
 * the app is reinstalled or the token rotates, so we re-register automatically
 * instead of only at first permission request.
 */
function ensureNativeTokenListener(): Promise<boolean> {
  if (nativeListenerReady) return nativeListenerReady;
  nativeListenerReady = (async () => {
    if (!(await isNativePlatform())) return false;
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.addListener('registration', (event: any) => {
        const token = event?.value as string | undefined;
        if (token && token !== currentToken) {
          currentToken = token;
          postToken(token, 'android');
        }
      });
      return true;
    } catch {
      return false;
    }
  })();
  return nativeListenerReady;
}

/** Retry any token that failed to register while offline. Idempotent. */
export async function flushPendingPushToken(): Promise<void> {
  const pending = getPendingToken();
  if (!pending) return;
  if (await isNativePlatform()) {
    await postToken(pending, 'android');
  } else {
    await postToken(pending, 'web');
  }
}

let initialized = false;
/** One-time bootstrap: queue replay + reconnect flush. Safe to call on every app start. */
export function initFCM(): void {
  if (initialized) return;
  initialized = true;
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      flushPendingPushToken();
    });
  }
  flushPendingPushToken();
}

async function requestNativePermission(): Promise<string | null> {
  if (currentToken) return currentToken;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') return null;

    await ensureNativeTokenListener();
    await PushNotifications.register();

    const token = await new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 10000);
      PushNotifications.addListener('registration', (event: any) => {
        clearTimeout(timeout);
        resolve(event?.value || null);
      }).then((handle) => {
        handle.remove();
      });
      PushNotifications.addListener('registrationError', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });

    if (token) {
      currentToken = token;
      await postToken(token, 'android');
    }
    return token;
  } catch {
    return null;
  }
}

export async function requestPermission(): Promise<string | null> {
  if (currentToken) return currentToken;
  if (await isNativePlatform()) {
    return requestNativePermission();
  }
  const messaging = await getMessaging();
  if (!messaging) return null;
  try {
    const { getToken } = await import('firebase/messaging');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const serviceWorkerRegistration = await getServiceWorkerRegistration();
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration,
    });
    if (token) {
      currentToken = token;
      await postToken(token, 'web');
    }
    return token;
  } catch {
    return null;
  }
}

export async function getFCMToken(): Promise<string | null> {
  if (currentToken) return currentToken;
  return requestPermission();
}

/** Current token (or the last one queued for re-registration), without prompting. */
export function getCachedFCMToken(): string | null {
  return currentToken || getPendingToken();
}

/** Best-effort server-side deregistration on logout. */
export async function deregisterToken(token: string | null | undefined): Promise<void> {
  if (!token) return;
  registeredTokens.delete(token);
  try {
    await api.delete(`/device-tokens/${encodeURIComponent(token)}`);
  } catch {
    // Stale tokens are swept server-side on the next send, so failure here is harmless.
  }
}

export function isFirebaseConfigured(): boolean {
  return !!getFirebaseConfig();
}

/** Pending deep link stashed while the app was logged out (flushed after login). */
export function savePendingDeepLink(link: string): void {
  try {
    localStorage.setItem(PENDING_LINK_KEY, link);
  } catch {
    /* storage unavailable */
  }
}

export function takePendingDeepLink(): string | null {
  try {
    const link = localStorage.getItem(PENDING_LINK_KEY);
    localStorage.removeItem(PENDING_LINK_KEY);
    return link;
  } catch {
    return null;
  }
}

/** Listen for foreground push messages and invoke the callback with the payload. */
export async function onForegroundMessage(
  handler: (payload: { title?: string; body?: string; data?: Record<string, unknown>; notification?: any }) => void,
): Promise<() => void> {
  if (await isNativePlatform()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const handle = await PushNotifications.addListener('pushNotificationReceived', (event: any) => {
        const payload = event?.notification || event || {};
        handler({
          title: payload.title || payload?.data?.title || 'Genesis',
          body: payload.body || payload?.data?.body || '',
          data: payload?.data || {},
        });
      });
      return () => { handle.remove(); };
    } catch {
      return () => {};
    }
  }
  const messaging = await getMessaging();
  if (!messaging) return () => {};
  try {
    const { onMessage } = await import('firebase/messaging');
    const unsubscribe = onMessage(messaging, (payload: any) => {
      handler({
        title: payload?.notification?.title || payload?.data?.title || 'Genesis',
        body: payload?.notification?.body || payload?.data?.body || '',
        data: payload?.data || {},
        notification: payload?.notification,
      });
    });
    return unsubscribe;
  } catch {
    return () => {};
  }
}

/** Register a tap handler for native push notifications (deep-link to the app). */
export async function onNativePushAction(
  handler: (data: Record<string, unknown>) => void,
): Promise<() => void> {
  if (!(await isNativePlatform())) return () => {};
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const handle = await PushNotifications.addListener('pushNotificationActionPerformed', (event: any) => {
      handler(event?.notification?.data || event?.data || {});
    });
    return () => { handle.remove(); };
  } catch {
    return () => {};
  }
}
