importScripts('https://www.gstatic.com/firebasejs/10.x/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.x/firebase-messaging-compat.js');

fetch('/firebase-config.json')
  .then((res) => res.json())
  .then((config) => {
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title, body, icon, click_action } = payload.data || {};
      self.registration.showNotification(title || 'Genesis LMS', {
        body: body || '',
        icon: icon || '/genesis_icon.png',
        data: { url: click_action || '/' },
      });
    });
  })
  .catch(() => {});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
