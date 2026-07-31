import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  requestPermission,
  getFCMToken,
  isFirebaseConfigured,
  onForegroundMessage,
} from '@/services/fcmService';

function getNotificationPermission(): NotificationPermission {
  return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
}

export function usePushNotifications(autoRequest = false) {
  const [permission, setPermission] = useState<NotificationPermission>(
    getNotificationPermission(),
  );
  const [token, setToken] = useState<string | null>(null);

  const request = useCallback(async () => {
    const t = await requestPermission();
    setToken(t);
    setPermission(getNotificationPermission());
    return t;
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    if (getNotificationPermission() === 'granted') {
      getFCMToken().then((t) => {
        if (t) setToken(t);
      });
    }
    if (autoRequest && getNotificationPermission() === 'default') {
      request();
    }
  }, [autoRequest, request]);

  // Show a toast when a push arrives while the app is in the foreground.
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let unsub: (() => void) | undefined;
    onForegroundMessage((payload) => {
      if (!payload.title && !payload.body) return;
      toast(payload.title, {
        description: payload.body,
        action: payload.data?.link
          ? {
              label: 'Open',
              onClick: () => {
                const url = String(payload.data?.link);
                if (url.startsWith('/')) window.location.href = url;
              },
            }
          : undefined,
      });
    }).then((fn) => {
      unsub = fn;
    });
    return () => unsub?.();
  }, []);

  return { permission, token, requestPermission: request };
}
