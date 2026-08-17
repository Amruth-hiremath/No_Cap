// NO CAP PWA service worker
// v0.1: app-shell cache + stale-while-revalidate for content.
// User state stays in localStorage (no network sync needed in v0.1).

const CACHE_VERSION = 'nocap-v0.1-';
const SHELL_CACHE = CACHE_VERSION + 'shell';
const CONTENT_CACHE = CACHE_VERSION + 'content';

const SHELL_ASSETS = [
  '/',
  '/roadmap',
  '/concepts',
  '/review',
  '/progress',
  '/glossary',
  '/practice',
  '/settings',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_VERSION) && key !== SHELL_CACHE && key !== CONTENT_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin (fonts, analytics, etc. - let browser handle)
  if (url.origin !== self.location.origin) return;

  // Navigation requests: serve app shell (offline-first)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).catch(() => caches.match('/'))
      )
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.open(CONTENT_CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
