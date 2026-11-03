// Bump VERSION on every change so phones pick up the new files.
const VERSION = 'daily-productivity-v6';
const FILES = ['./', 'index.html', 'manifest.json', 'xlsx.full.min.js', 'template.xlsx', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'logo.png'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's HTTP cache so a new version never stores old files
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(FILES.map(f => fetch(new Request(f, { cache: 'reload' })).then(r => r.ok && c.put(f, r)))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // CDN libraries (PDF reading, image making) and the pump sheet on Google Drive are left to the browser
  if (new URL(e.request.url).origin !== location.origin) return;
  const path = new URL(e.request.url).pathname;
  // Images and the Excel library rarely change: serve the saved copy
  if (/\.(png|ico)$|xlsx\.full\.min\.js$/.test(path)) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
    return;
  }
  // The app itself: newest version when online, saved copy when offline
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })
    .then(hit => hit || caches.match('index.html'))));
});
