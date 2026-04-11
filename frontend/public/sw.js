// Service Worker for Premium Offline Support
const CACHE_NAME = 'cloud-kitchen-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/styles.css', // Add if exists
];

// Install event - cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event - network-first for API, cache-first for static
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cache API responses for offline (menu, tables, etc.)
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then(response => {
        // Clone and cache successful responses
        if (response.ok) {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
        }
        return response;
      }).catch(() => {
        // Offline fallback - return cached API data
        return caches.match(event.request);
      })
    );
  } else {
    // Static assets: cache-first
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request)
          .then(newResponse => {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, newResponse.clone()));
            return newResponse;
          })
        )
    );
  }
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => 
      Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    )
  );
});

// Background sync for pending orders (premium feature)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  // Implement IndexedDB pending orders sync here
  console.log('Background sync: syncing pending orders');
}
