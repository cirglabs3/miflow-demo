'use strict';
const VERSION = '63c14f7cc9e2a0cd';
const ASSETS = [".nojekyll", "app.js", "compat.js", "data.js", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "index.html", "manifest.webmanifest", "metrics.js", "pwa.css", "pwa.js", "style.css"];
const PREFIX = 'miflow-pwa:' + self.registration.scope + ':';
const CACHE = PREFIX + VERSION;
const urls = ASSETS.map(path => new URL(path, self.registration.scope).href);
const entry = new URL('index.html', self.registration.scope).href;
self.addEventListener('install', event => {
  // A partial download must never become an active release.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urls.map(url => new Request(url, {cache:'reload'})))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const key = event.request.mode === 'navigate' ? entry : url.origin + url.pathname;
  if (!urls.includes(key)) return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(key)).then(hit => hit || fetch(event.request)));
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'ACTIVATE_UPDATE') self.skipWaiting();
  if (event.data && event.data.type === 'CHECK_OFFLINE' && event.ports[0]) {
    event.waitUntil(caches.open(CACHE).then(async cache => {
      let complete = (await Promise.all(urls.map(url => cache.match(url)))).every(Boolean);
      if (!complete && event.data.repair) {
        // Only repair from this same release. A newer server release must be
        // installed through its new worker, never mixed into the active cache.
        const response = await fetch(new Request(new URL('sw.js', self.registration.scope), {cache:'no-store'}));
        const source = await response.text();
        if (response.ok && source.includes("const VERSION = '" + VERSION + "';")) {
          await cache.addAll(urls.map(url => new Request(url, {cache:'reload'})));
          complete = true;
        }
      }
      event.ports[0].postMessage({ready:complete, version:VERSION});
    }).catch(() => event.ports[0].postMessage({ready:false, version:VERSION})));
  }
});
