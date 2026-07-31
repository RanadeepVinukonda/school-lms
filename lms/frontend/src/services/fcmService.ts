import api from './api';

let messagingInstance: any = null;
let currentToken: string | null = null;

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined;
  const reg = await navigator.serviceWorker.getRegistration().catch(() => undefined);
  if (reg) return reg;
  return navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => undefined);
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
    const { getMessaging } = await import('firebase/messaging');
    const app = initializeApp(config);
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch {
    return null;
  }
}

export async function requestPermission(): Promise<string | null> {
  if (currentToken) return currentToken;
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
      await api.post('/device-tokens', { token, platform: 'web' }).catch(() => {});
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

export function isFirebaseConfigured(): boolean {
  return !!getFirebaseConfig();
}

/** Listen for foreground FCM messages and invoke the callback with the payload. */
export async function onForegroundMessage(
  handler: (payload: { title?: string; body?: string; data?: Record<string, unknown>; notification?: any }) => void,
): Promise<() => void> {
  const messaging = await getMessaging();
  if (!messaging) return () => {};
  try {
    const { onMessage } = await import('firebase/messaging');
    const unsubscribe = onMessage(messaging, (payload: any) => {
      handler({
        title: payload?.notification?.title || payload?.data?.title || 'Genesis LMS',
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
