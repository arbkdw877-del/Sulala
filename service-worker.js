// ══════════════════════════════════════════════════════
//  سلالة Pro — Service Worker
//  استراتيجية: Cache First للملفات المحلية
// ══════════════════════════════════════════════════════

const CACHE_NAME = 'sulala-v1';

// الملفات الأساسية التي يجب تخزينها مؤقتاً
const SHELL_FILES = [
  './',
  './sulala.html',
  './manifest.json'
];

// ── Install: خزّن ملفات الـ App Shell ──
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] تخزين ملفات التطبيق...');
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

// ── Activate: احذف الكاشات القديمة ──
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: Cache First → Network Fallback ──
self.addEventListener('fetch', function(event) {
  // تجاهل الطلبات غير الـ GET
  if (event.request.method !== 'GET') return;

  // تجاهل طلبات Chrome extensions وما شابهها
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        // وجدنا الملف في الكاش — أرجعه فوراً
        return cached;
      }

      // مش موجود في الكاش — اطلبه من الشبكة وخزّنه
      return fetch(event.request).then(function(response) {
        // تخزين الاستجابات الناجحة فقط
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, toCache);
        });
        return response;
      }).catch(function() {
        // الشبكة فشلت والملف مش في الكاش
        // إذا طُلب صفحة HTML — أرجع الـ app shell
        if (event.request.headers.get('accept') &&
            event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./sulala.html');
        }
      });
    })
  );
});
