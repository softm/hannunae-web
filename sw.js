'use strict';
// Scope is part of the cache name so two deployments on one host stay separate.
const SCOPE = new URL('./', self.location.href);
const CACHE_PREFIX = 'hannunae-shell-' + encodeURIComponent(SCOPE.pathname) + '-';
const CACHE = CACHE_PREFIX + 'v2';
const ASSETS = ["./", "./index.html", "./app.js", "./pwa.js", "./common-account.js", "./common-account.css", "./native-bridge.js", "./icon.svg", "./icon-192.png", "./icon-512.png", "./manifest.webmanifest", "./core.js", "./style.css"];
const URLS = ASSETS.map(asset => new URL(asset, SCOPE).href);
const SHELL = new URL('./index.html', SCOPE).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  const isShell = url.pathname === SCOPE.pathname || url.pathname === new URL(SHELL).pathname;
  if (request.mode === 'navigate' && isShell) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok && !response.redirected && (response.headers.get('content-type') || '').includes('text/html')) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(SHELL, copy)));
      }
      return response;
    }).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(SHELL)) || Response.error();
    }));
    return;
  }
  if (!URLS.includes(url.href)) return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(cached => cached || fetch(request)));
});
