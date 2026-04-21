// Self-destroying service worker to clean up and remove SW completely
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Delete all caches
      caches.keys().then(cacheNames => 
        Promise.all(cacheNames.map(cache => caches.delete(cache)))
      ),
      // Unregister this service worker
      self.registration.unregister(),
      // Refresh all clients
      clients.matchAll().then(clients => {
        clients.forEach(client => client.navigate(client.url));
      })
    ])
  );
});

// Pass through all requests directly to network
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
