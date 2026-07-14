import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  requestPermission,
  getFCMToken,
  isFirebaseConfigured,
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

  return { permission, token, requestPermission: request };
}
