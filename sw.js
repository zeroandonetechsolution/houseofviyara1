// Bump this version when deploying changes so clients install a fresh service worker.
const CACHE_VERSION = 'lifestyle-luxury-v6';
const STATIC_CACHE = CACHE_VERSION + '-static';
const MEDIA_CACHE = CACHE_VERSION + '-media';
const MAX_MEDIA_ENTRIES = 60;

const STATIC_ASSETS = [
  '/',
  'index.html',
  'style.css',
  'loader.js',
  'app.js',
  'manifest.json',
  'product.html',
  'collections.html',
  'saree.html',
  'kurtis.html',
  'ethnic.html',
  'party.html',
  'casual.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isMediaRequest(request) {
  const dest = request.destination;
  return dest === 'image' || dest === 'video' || dest === 'audio' ||
    /\.(png|jpe?g|webp|gif|svg|mp4|webm|mov)(\?|$)/i.test(request.url);
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.length - maxEntries;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== MEDIA_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (isApiRequest(url)) return;

  // HTML: network-first for freshness, cache fallback
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  // Large media: cache-first, network fallback, runtime cache
  if (isMediaRequest(event.request)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(MEDIA_CACHE).then((cache) => {
                cache.put(event.request, clone);
                trimCache(MEDIA_CACHE, MAX_MEDIA_ENTRIES);
              });
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // CSS/JS/fonts: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
