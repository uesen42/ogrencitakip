const CACHE_NAME = 'ogrenci-takip-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './css/styles.css',
        './js/app.js',
        './js/db.js',
        './js/dexie.js',
        './js/pages/dashboard.js',
        './js/pages/students.js',
        './js/pages/topics.js',
        './js/pages/daily-log.js',
        './js/pages/weekly-plan.js',
        './js/pages/reports.js',
        './js/pages/settings.js',
        './js/pages/timer.js',
        './js/pages/analysis.js',
        './js/utils/date.js',
        './js/utils/ui.js',
        './data/default-topics.js',
        './icons/icon-192.png',
        './icons/icon-512.png'
      ]).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cached;
      });

      return cached || fetched;
    })
  );
});