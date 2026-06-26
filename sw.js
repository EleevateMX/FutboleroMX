const CACHE = 'tvc-v60';
const STATIC = [
  '/', '/index.html', '/quiniela.html', '/perfil.html', '/predicciones.html', '/css/style.css',
  '/js/data.js', '/js/auth.js', '/js/app.js', '/js/quiniela.js', '/js/perfil.js', '/js/push.js',
  '/manifest.json', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  console.log('[SW] install', CACHE);
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

// Mensajes desde la app: forzar activación del SW nuevo o limpiar la caché.
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') { console.log('[SW] SKIP_WAITING'); self.skipWaiting(); }
  if (e.data.type === 'CLEAR_DATA_CACHE') {
    console.log('[SW] CLEAR_DATA_CACHE → borrando', CACHE);
    e.waitUntil(caches.delete(CACHE));
  }
});

self.addEventListener('activate', e => {
  console.log('[SW] activate', CACHE);
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => clients.forEach(c => {
        // navigate() recarga incluso tabs congeladas en background (iOS/Android)
        // más fiable que postMessage que requiere que el JS del cliente esté activo
        c.navigate(c.url).catch(() => c.postMessage({ type: 'SW_UPDATED', cache: CACHE }));
      }))
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never cache: embed.st, supabase, external APIs, y version.json (auto-reset)
  if (url.hostname.includes('embed.st') || url.hostname.includes('supabase') ||
      url.hostname.includes('cdn.jsdelivr') || url.hostname.includes('fonts.googleapis') ||
      url.pathname.endsWith('/version.json') || url.pathname.endsWith('version.json')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request)));
    return;
  }
  // HTML: network first, saltando el HTTP cache del browser (evita stale en iOS PWA)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' }).catch(() => caches.match('/index.html'))
    );
    return;
  }
  // JS y CSS: network first saltando HTTP cache → SW cache como fallback offline
  // { cache: 'no-cache' } envía If-None-Match al servidor → 304 si no cambió (rápido)
  // y 200 con contenido nuevo si hubo deploy → siempre fresco, sin stale de 10 min
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('manifest.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' }).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Imágenes e íconos: cache first (no cambian entre deploys)
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
