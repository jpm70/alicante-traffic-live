// Service Worker for Alicante Tráfico PWA
//
// Same-origin requests and the DGT data files of the `data` branch are handled. Other
// cross-origin calls (OSRM routing, Nominatim,
// map tiles, traffic cameras, Google) go straight to the network: intercepting them
// used to answer a failed routing request with the cached index.html, which the app
// then could not parse and drew the route as a straight line.
const CACHE_NAME = 'alicante-trafico-v5';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './icono.png',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // DGT data files. The app asks for them with a "?t=..." cache buster, first to the
  // `data` branch of the repository (raw.githubusercontent.com) and then to the copy
  // bundled with the site (data/...). Each is stored without the query; offline, the last
  // copy seen is served and the app shows how old it is.
  const isDataFile =
    /\/data\/[^/]+\.json$/.test(url.pathname) &&
    (url.origin === self.location.origin || url.hostname === 'raw.githubusercontent.com');
  if (isDataFile) {
    const key = url.origin + url.pathname;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(key, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(key).then((res) => res || Response.error()))
    );
    return;
  }

  if (url.origin !== self.location.origin) return; // let the browser handle it

  // Page navigations: network first, cached app shell when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('./index.html').then((res) => res || Response.error()))
    );
    return;
  }

  // Static assets: network first, cache as offline fallback (never the HTML shell)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((res) => res || Response.error()))
  );
});
