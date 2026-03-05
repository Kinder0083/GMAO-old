const CACHE_NAME = 'fsao-iris-v3';
const OFFLINE_URL = '/offline.html';

// Ne PAS mettre index.html en precache - il doit TOUJOURS venir du reseau
const PRECACHE_URLS = [
  '/offline.html',
  '/logo-iris.png'
];

// Installation : pre-cache des fichiers essentiels (sauf index.html)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage de TOUS les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Notifier tous les clients de recharger
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'FORCE_RELOAD', reason: 'update' });
        });
      });
    })
  );
  self.clients.claim();
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((name) => caches.delete(name)));
      }).then(() => {
        if (event.source) {
          event.source.postMessage({ type: 'CACHE_CLEARED' });
        }
      })
    );
  }
  // Forcer la mise a jour du service worker
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch : strategie differente selon le type de requete
self.addEventListener('fetch', (event) => {
  // Ignorer les requetes non-GET et les appels API
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  // NAVIGATION (index.html) : TOUJOURS reseau d'abord, JAMAIS mettre en cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => {
          return caches.match(OFFLINE_URL) || new Response('Hors-ligne', { status: 503 });
        })
    );
    return;
  }

  // sw.js et index.html : toujours reseau
  const url = new URL(event.request.url);
  if (url.pathname === '/sw.js' || url.pathname === '/index.html' || url.pathname === '/') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Fichiers statiques AVEC hash (main.abc123.js) : cache-first (le hash change a chaque build)
  // Fichiers SANS hash : network-first
  const hasHash = /\.[a-f0-9]{8,}\./i.test(url.pathname);

  if (hasHash) {
    // Cache-first pour les fichiers hashes (ils sont immutables)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      }).catch(() => new Response('', { status: 503 }))
    );
  } else {
    // Network-first pour les fichiers sans hash
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cached) => cached || new Response('', { status: 503 }));
        })
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'FSAO Iris', body: 'Nouvelle notification', type: 'general' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: '/logo-iris.png',
    badge: '/logo-iris.png',
    vibrate: [100, 50, 100],
    data: { type: data.type, url: data.url },
    actions: [{ action: 'open', title: 'Ouvrir' }]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let targetUrl = '/';

  switch (data.type) {
    case 'work_order_assigned':
    case 'work_order_status_changed':
      targetUrl = '/work-orders';
      break;
    case 'equipment_alert':
      targetUrl = '/equipments';
      break;
    case 'chat_message':
      targetUrl = '/chat';
      break;
    default:
      targetUrl = data.url || '/';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({ type: 'NAVIGATE', url: targetUrl });
            return;
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
