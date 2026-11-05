const CACHE_NAME = 'genesis-lms-v4';
const STATIC_ASSETS = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Push / notification handlers (Firebase Cloud Messaging) ──
function resolveUrl(raw) {
  if (!raw) return '/';
  // Web push links are absolute or app-relative paths
  return String(raw);
}

self.addEventListener('push', (e) => {
  if (!e.data) return;
  let payload = {};
  try { payload = e.data.json(); } catch (err) { payload = { notification: {} }; }

  const n = payload.notification || {};
  const d = payload.data || {};
  const title = n.title || d.title || 'Genesis';
  const body = n.body || d.body || d.message || '';
  const icon = n.icon || d.icon || '/icon-192x192.png';

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icon-192x192.png',
      data: {
        url: resolveUrl(d.link || d.url || '/'),
        notificationId: d.notificationId || d.id || null,
        type: d.type || 'system',
      },
      tag: d.tag || undefined,
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data && e.notification.data.url ? e.notification.data.url : '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('notificationclose', (e) => {
  e.waitUntil(new Promise((resolve) => setTimeout(resolve, 0)));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Navigations (HTML documents): network-first so new deployments are picked
  // up immediately; fall back to the cached shell only when offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  e.respondWith(
    // Network-first for everything so new deployments are picked up
    // immediately. Previously this was cache-first, which served stale JS
    // chunks forever and kept old (buggy) builds running long after a deploy —
    // including inside the Android APK's WebView. Fall back to cache only when
    // offline so the app shell still works.
    fetch(e.request)
      .then((res) => {
        if (
          res.ok &&
          (e.request.destination === 'script' ||
            e.request.destination === 'style' ||
            e.request.destination === 'font' ||
            e.request.destination === 'image')
        ) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((cached) => {
          if (cached) return cached;
          if (e.request.mode === 'navigate') return caches.match('/');
          return new Response('', { status: 503 });
        })
      )
  );
});
