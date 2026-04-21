// @ts-nocheck
// Service Worker for Premium Offline Support
const CACHE_NAME = 'cloud-kitchen-v3'; // Incremented version for cache busting
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Install event - cache core files with cache busting
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate new SW immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Use cache: 'reload' to bypass HTTP cache for critical files
        return Promise.all(
          urlsToCache.map(url => 
            fetch(url, { cache: 'reload' })
              .then(response => cache.put(url, response))
          )
        );
      })
  );
});

// Fetch event - network-first for API, cache-first for static
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests, websockets, and dev server requests
  if (event.request.method !== 'GET' || 
      url.protocol === 'ws:' || url.protocol === 'wss:' || 
      url.pathname.includes('@vite') || 
      url.pathname.includes('__vite_ping') ||
      url.pathname.includes('hot-update')) {
    return; // Let browser handle these directly
  }

  if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
  } else {
    event.respondWith(handleStaticRequest(event.request));
  }
});

async function handleApiRequest(request) {
  // Only cache GET API requests
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    if (networkResponse.ok && !networkResponse.bodyUsed) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('API fetch failed:', error);
    return caches.match(request);
  }
}

async function handleStaticRequest(request) {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return fetch(request);
  }

  const cachedResponse = await caches.match(request);
  
  // Stale-while-revalidate: return cache immediately then update in background
  if (cachedResponse) {
    // Update cache in background for next load
    fetch(request, { cache: 'reload' })
      .then(networkResponse => {
        if (networkResponse.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse));
        }
      })
      .catch(() => {}); // Ignore network errors
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request, { cache: 'reload' });
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('Static fetch failed:', error);
    return caches.match(request);
  }
};

// Activate - clean old caches and claim all clients
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Claim all clients immediately
      clients.claim(),
      // Delete old caches
      caches.keys().then(cacheNames => 
        Promise.all(
          cacheNames.map(cache => {
            if (cache !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cache);
              return caches.delete(cache);
            }
          })
        )
      )
    ])
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

// Listen for update messages from client
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
