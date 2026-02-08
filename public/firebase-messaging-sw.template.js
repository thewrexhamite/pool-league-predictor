// Firebase Cloud Messaging Service Worker (TEMPLATE)
// This file is processed at build time to inject Firebase configuration
// DO NOT edit firebase-messaging-sw.js directly - it is auto-generated
// Edit this template file instead
//
// Handles background push notifications and notification actions

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: Config must be public values only (no secrets)
const firebaseConfig = {
  apiKey: 'REPLACE_WITH_FIREBASE_API_KEY',
  authDomain: 'REPLACE_WITH_AUTH_DOMAIN',
  projectId: 'REPLACE_WITH_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_APP_ID',
  measurementId: 'REPLACE_WITH_MEASUREMENT_ID'
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
// This is called when the app is in the background or closed
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Pool League Update';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: payload.data?.type || 'default',
    data: {
      url: payload.data?.url || '/',
      type: payload.data?.type || 'general',
      ...payload.data
    },
    actions: [
      {
        action: 'open',
        title: 'View'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ],
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Get the deep-link URL from notification data
  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with this origin
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            // Navigate to the deep-link URL and focus the window
            return client.focus().then(client => {
              if ('navigate' in client) {
                return client.navigate(fullUrl);
              }
            });
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});

// Handle push events (fallback)
self.addEventListener('push', (event) => {
  if (event.data) {
    console.log('[firebase-messaging-sw.js] Push event received', event.data.text());
  }
});
