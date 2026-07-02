// ══════════════════════════════════════════════════════
//  سلالة Pro — Service Worker (PWA + FCM)
// ══════════════════════════════════════════════════════
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'sulala-v2';
const SHELL_FILES = ['./', './sulala.html', './manifest.json'];

// ── Firebase init inside SW ──
firebase.initializeApp({
  apiKey: 'AIzaSyDr2VFtg_RUBj6V2pmRssymqwdTdzuOIgA',
  authDomain: 'sulala-push.firebaseapp.com',
  projectId: 'sulala-push',
  storageBucket: 'sulala-push.firebasestorage.app',
  messagingSenderId: '809962976524',
  appId: '1:809962976524:web:4dd557ae12bfba9f0dc529'
});
const messaging = firebase.messaging();

// ── Background push notifications ──
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const data = payload.data || {};
  self.registration.showNotification(n.title || '🦜 سلالة Pro', {
    body: n.body || '',
    icon: '/manifest.json',
    badge: '/manifest.json',
    tag: 'sulala-comment-' + (data.listing_id || Date.now()),
    renotify: true,
    data: { url: self.location.origin + '/sulala.html' }
  });
});

// ── Notification click → open app ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.location.origin;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cls) => {
      for (const c of cls) {
        if (c.url === url && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Install ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

// ── Activate ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: Cache First ──
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./sulala.html');
        }
      });
    })
  );
});
