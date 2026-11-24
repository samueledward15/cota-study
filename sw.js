// Offline support: app shell precached; everything else is served from cache and refreshed in the background.
const VERSION = 'cota-study-v3';
const SHELL = ['./', 'index.html', 'subjects.json', 'map.json', 'manifest.webmanifest',
  'img/logo-icon.svg', 'img/logo-mark-anim.svg', 'img/papyrus.svg', 'img/rule.svg', 'img/braid-tile.svg',
  'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !fonts) return;
  // JSON + HTML: network first (fresh content), fall back to cache offline
  const fresh = sameOrigin && (req.mode === 'navigate' || url.pathname.endsWith('.json') || url.pathname.endsWith('.html'));
  if (fresh) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  // images, fonts, svg: cache first, refresh in background
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
