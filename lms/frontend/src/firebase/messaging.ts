import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import app from './config';

let messaging: ReturnType<typeof getMessaging> | null = null;

export async function initMessaging() {
  const supported = await isSupported();
  if (supported) {
    messaging = getMessaging(app);
  }
  return messaging;
}

export async function requestNotificationPermission(): Promise<string | null> {
  if (!messaging) {
    await initMessaging();
    if (!messaging) return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
      });
      return token;
    }
    return null;
  } catch {
    return null;
  }
}

export function onForegroundMessage(callback: (payload: unknown) => void) {
  if (!messaging) return () => {};
  const unsubscribe = onMessage(messaging, callback);
  return unsubscribe;
}

export { messaging };
