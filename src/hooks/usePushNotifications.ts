import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  requestPermission,
  getFCMToken,
  isFirebaseConfigured,
} from '@/services/fcmService';

export function usePushNotifications(autoRequest = false) {
  const [permission, setPermission] = useState<NotificationPermission>(
    Notification.permission,
  );
  const [token, setToken] = useState<string | null>(null);

  const request = useCallback(async () => {
    const t = await requestPermission();
    setToken(t);
    setPermission(Notification.permission);
    return t;
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    if (Notification.permission === 'granted') {
      getFCMToken().then((t) => {
        if (t) setToken(t);
      });
    }
    if (autoRequest && Notification.permission === 'default') {
      request();
    }
  }, [autoRequest, request]);

  return { permission, token, requestPermission: request };
}
