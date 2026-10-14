// Service Worker for Alicante Tráfico PWA
const CACHE_NAME = 'alicante-trafico-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/icono.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network only for dynamic camera feeds and API requests
  if (
    url.pathname.startsWith('/api/') ||
    url.searchParams.has('cam') ||
    url.hostname.includes('alicante.es') ||
    url.hostname.includes('arcgisonline.com')
  ) {
    return;
  }

  // Network first, fallback to cache for HTML/assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((res) => res || caches.match('/')))
  );
});
