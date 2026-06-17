const CACHE = 'tvc-v3';
const STATIC = [
  '/', '/index.html', '/quiniela.html', '/perfil.html', '/css/style.css',
  '/js/data.js', '/js/auth.js', '/js/app.js', '/js/quiniela.js', '/js/perfil.js',
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
