const CACHE = 'futboleromx-v1';
const STATIC = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/data.js',
  '/js/auth.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/pages/terminos.html',
  '/pages/privacidad.html',
  '/pages/cookies.html',
  '/pages/dmca.html',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // No cachear iframes embed.st ni peticiones externas
  if (!url.origin.includes(self.location.origin) || url.pathname.includes('embed')) {
    return;
  }

  // Network-first para HTML, cache-first para assets estáticos
  if (request.destination === 'document') {
    e.respondWith(
      fetch(request)
        .then(res => { caches.open(CACHE).then(c => c.put(request, res.clone())); return res; })
        .catch(() => caches.match(request).then(r => r || caches.match('/index.html')))
    );
  } else {
    e.respondWith(
      caches.match(request).then(cached => cached ||
        fetch(request).then(res => {
          caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        })
      )
    );
  }
});
