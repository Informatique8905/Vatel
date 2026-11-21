// Service worker des notifications push (Firebase Cloud Messaging).
// Le backend envoie des messages data-only : { title, body, url?, ... }.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {
    msg = { data: { body: event.data ? event.data.text() : '' } };
  }
  const data = msg.data || msg;
  const n = msg.notification || {};
  const title = n.title || data.title || 'Cantine Vatel';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: n.body || data.body || '',
      tag: data.tag || data.dedupeKey || undefined,
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => w.url.startsWith(self.location.origin));
      if (win) {
        win.navigate(url).catch(() => {});
        return win.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

// Passthrough sans cache : requis pour les critères d'installabilité PWA.
self.addEventListener('fetch', () => {});
