import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  requestPermission,
  getFCMToken,
  isFirebaseConfigured,
  onForegroundMessage,
  onNativePushAction,
  initFCM,
  getCachedFCMToken,
  deregisterToken,
  savePendingDeepLink,
  takePendingDeepLink,
} from '@/services/fcmService';
import { ensureNotificationChannels } from '@/services/notificationChannels';
import { syncBadge } from '@/services/badgeService';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { router } from '@/app/router';
import { ROUTES } from '@/lib/constants';

/** Fallback target when a push carries no usable link (legacy payloads). */
const TYPE_ROUTE_FALLBACK: Record<string, string> = {
  notice: ROUTES.NOTIFICATIONS,
  notices: ROUTES.NOTIFICATIONS,
  notice_published: ROUTES.NOTIFICATIONS,
};

function resolveDeepLink(data: Record<string, unknown>): string {
  const raw = data?.link || data?.url;
  if (raw && String(raw).startsWith('/')) return String(raw);
  const type = data?.type ? String(data.type).toLowerCase() : '';
  return TYPE_ROUTE_FALLBACK[type] || ROUTES.NOTIFICATIONS;
}

function getNotificationPermission(): NotificationPermission {
  return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
}

export function usePushNotifications(autoRequest = false) {
  const [permission, setPermission] = useState<NotificationPermission>(
    getNotificationPermission(),
  );
  const [token, setToken] = useState<string | null>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const isAuthenticatedRef = useRef(isAuthenticated);
  const hadAuthRef = useRef(false);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const request = useCallback(async () => {
    const t = await requestPermission();
    setToken(t);
    setPermission(getNotificationPermission());
    return t;
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    // Bootstrap: replay offline token queue, reconnect flush, create channels.
    initFCM();
    ensureNotificationChannels();
    // On native there is no web Notification API, so getNotificationPermission()
    // always reads as 'denied' and the granted/default gates below would never
    // trigger registration. When autoRequest is set (logged-in layouts), request
    // unconditionally: requestNativePermission() checks the OS state and only
    // shows the system dialog if the user hasn't decided yet.
    if (autoRequest) {
      request();
    } else if (getNotificationPermission() === 'granted') {
      getFCMToken().then((t) => {
        if (t) setToken(t);
      });
    }
  }, [autoRequest, request]);

  // Show a toast when a push arrives while the app is in the foreground.
  // Backend already gates pushes by the user's per-category in-app preference,
  // so only opted-in categories reach this handler.
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let unsub: (() => void) | undefined;
    onForegroundMessage((payload) => {
      if (!payload.title && !payload.body) return;
      toast(payload.title, {
        description: payload.body,
        action: payload.data
          ? {
              label: 'Open',
              onClick: () => {
                router.navigate(resolveDeepLink(payload.data || {}));
              },
            }
          : undefined,
      });
    }).then((fn) => {
      unsub = fn;
    });
    return () => unsub?.();
  }, []);

  // Deep-link navigation when a native push notification is tapped. Uses SPA
  // routing (no full reload) and queues the link until login if needed.
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let unsub: (() => void) | undefined;
    onNativePushAction((data) => {
      const target = resolveDeepLink(data);
      if (!isAuthenticatedRef.current) {
        savePendingDeepLink(target);
        return;
      }
      router.navigate(target);
    }).then((fn) => {
      unsub = fn;
    });
    return () => unsub?.();
  }, []);

  // Flush a queued deep link once the user is authenticated.
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = takePendingDeepLink();
    if (pending && pending.startsWith('/')) {
      router.navigate(pending);
    }
  }, [isAuthenticated]);

  // Keep the launcher badge in sync with the unread count.
  useEffect(() => {
    syncBadge(unreadCount);
  }, [unreadCount]);

  // Deregister this device's token and clear the badge on logout.
  useEffect(() => {
    if (isAuthenticated) {
      hadAuthRef.current = true;
      return;
    }
    if (hadAuthRef.current) {
      deregisterToken(getCachedFCMToken());
      syncBadge(0);
      hadAuthRef.current = false;
    }
  }, [isAuthenticated]);

  return { permission, token, requestPermission: request };
}
