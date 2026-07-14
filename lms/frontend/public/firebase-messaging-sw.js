importScripts('https://www.gstatic.com/firebasejs/10.x/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.x/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '{{VITE_FIREBASE_API_KEY}}',
  authDomain: '{{VITE_FIREBASE_AUTH_DOMAIN}}',
  projectId: '{{VITE_FIREBASE_PROJECT_ID}}',
  storageBucket: '{{VITE_FIREBASE_STORAGE_BUCKET}}',
  messagingSenderId: '{{VITE_FIREBASE_MESSAGING_SENDER_ID}}',
  appId: '{{VITE_FIREBASE_APP_ID}}',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, click_action } = payload.data || {};
  self.registration.showNotification(title || 'Genesis LMS', {
    body: body || '',
    icon: icon || '/genesis_icon.png',
    data: { url: click_action || '/' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
