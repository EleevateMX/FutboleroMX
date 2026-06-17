const CACHE = 'tvc-v7';
const STATIC = [
  '/', '/index.html', '/quiniela.html', '/perfil.html', '/css/style.css',
  '/js/data.js', '/js/auth.js', '/js/app.js', '/js/quiniela.js', '/js/perfil.js', '/js/push.js',
  '/manifest.json', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never cache: embed.st, supabase, external APIs
  if (url.hostname.includes('embed.st') || url.hostname.includes('supabase') ||
      url.hostname.includes('cdn.jsdelivr') || url.hostname.includes('fonts.googleapis')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // HTML: network first
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  // Assets: cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});

// ── Notificaciones Push ─────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  const title = d.title || 'TVContigo';
  const options = {
    body: d.body || '',
    icon: d.icon || '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data: { url: d.url || '/' },
    vibrate: [80, 40, 80],
    tag: d.tag || 'tvcontigo',
    renotify: true,
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
