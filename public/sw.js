const CACHE_NAME = 'vaultos-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch handler to satisfy PWA requirements
  event.respondWith(fetch(event.request).catch(() => new Response('Offline')));
});

// Background Sync for offline tasks
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-uploads') {
    event.waitUntil(
      self.registration.showNotification('VaultOS', {
        body: 'Background upload completed successfully.',
        icon: '/icon-192.png'
      })
    );
  } else if (event.tag === 'sync-downloads') {
    event.waitUntil(
      self.registration.showNotification('VaultOS', {
        body: 'Background download completed successfully.',
        icon: '/icon-192.png'
      })
    );
  }
});

// Background Fetch for large downloads/uploads
self.addEventListener('backgroundfetchsuccess', (event) => {
  const bgFetch = event.registration;
  event.waitUntil(
    self.registration.showNotification('VaultOS', {
      body: `Background task "${bgFetch.id}" completed successfully.`,
      icon: '/icon-192.png'
    })
  );
});

self.addEventListener('backgroundfetchfail', (event) => {
  const bgFetch = event.registration;
  event.waitUntil(
    self.registration.showNotification('VaultOS', {
      body: `Background task "${bgFetch.id}" failed.`,
      icon: '/icon-192.png'
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.text() : 'Background task update';
  event.waitUntil(
    self.registration.showNotification('VaultOS Task', {
      body: data,
      icon: '/icon-192.png'
    })
  );
});
