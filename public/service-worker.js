const CACHE_VERSION = 'scanledger-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/images/icons/icon-72x72.png',
  '/images/icons/icon-128x128.png',
  '/images/icons/icon-152x152.png',
  '/images/icons/icon-384x384.png',
  '/images/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((error) => {
        console.warn('Service worker install cache failed', error);
      }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .catch((error) => {
        console.warn('Service worker activation cleanup failed', error);
      }),
  );
  self.clients.claim();
});

const fetchWithOfflineFallback = async (request) => {
  try {
    const networkResponse = await fetch(request);
    if (
      request.method === 'GET' &&
      networkResponse?.ok &&
      !networkResponse.headers.get('Cache-Control')?.includes('no-store')
    ) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch (error) {
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_VERSION);
      const cachedPage = await cache.match('/offline.html');
      if (cachedPage) {
        return cachedPage;
      }
    }
    const cache = await caches.open(CACHE_VERSION);
    const cachedResource = await cache.match(request);
    if (cachedResource) {
      return cachedResource;
    }
    throw error;
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(fetchWithOfflineFallback(request));
});
