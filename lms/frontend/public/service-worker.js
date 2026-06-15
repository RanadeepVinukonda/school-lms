self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  const regs = await self.registration.getRegistrations?.() ?? [];
  for (const r of regs) await r.unregister();
  await self.registration.unregister();
  self.clients.claim();
})()));
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));
