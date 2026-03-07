// Service Worker FSAO Iris - Notifications push uniquement (pas de cache)
// Version: 1772874752
// Ce SW ne met RIEN en cache. NGINX sert les fichiers statiques directement.
// Cela élimine les problèmes de cache stale après les mises à jour.

// Installation : prise de contrôle immédiate
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activation : nettoyage de TOUS les anciens caches et prise de contrôle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// PAS de cache - le SW redirige tout vers le réseau
// Ce fetch handler est OBLIGATOIRE pour que Chrome Android permette l'installation PWA
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
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
