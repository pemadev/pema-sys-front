/* Service worker khusus Web Push notifikasi PEMA SYS: menampilkan notifikasi walau situs sedang tidak dibuka. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch (e) {
    d = { judul: 'PEMA SYS', isi: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(d.judul || 'PEMA SYS', {
      body: d.isi || '',
      icon: '/favicon.ico',
      tag: d.id ? `notif-${d.id}` : undefined,
      data: { url: d.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const buka = wins.find((w) => w.url.startsWith(self.location.origin));
      if (buka) {
        return buka.navigate(url).then((w) => w && w.focus());
      }
      return self.clients.openWindow(url);
    }),
  );
});
