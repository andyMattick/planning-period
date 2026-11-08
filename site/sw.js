// Service worker: keeps the app shell on the device so the pages open offline.
// - The shell (pages, styles, scripts, icons) is precached and served cache-first, refreshed in the background.
// - Settings and data (brand.config.json, menu.json, samples/*.json, the manifest) are network-first,
//   falling back to the cached copy when offline.
// - backend.config.json (online orders on or off) is network-first like the other settings. Supabase is another origin,
//   so sign-in, uploads, orders and signed file links are never touched or cached here.
// - Only same-origin GET requests are touched (so "Paste a link", a POST to ../api/fetch-page, never is). Files a teacher picks are read on the device and never fetched,
//   so they are never cached; the zips and JSON files the pages make are blob: downloads, also never cached.
// Bump VERSION when the shell changes; old caches are deleted on activate.
'use strict';
var VERSION = 'v11';
var SHELL = 'shell-' + VERSION;
var DATA = 'data-' + VERSION;

var SHELL_FILES = [
  './', 'index.html', 'review.html', 'samples.html', 'about.html', 'orders.html', 'feasibility.js',
  'style.css', 'common.js', 'zip.js', 'order.js', 'review.js', 'samples.js', 'backend.js', 'orders.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png',
  'icons/maskable-512.png', 'icons/apple-touch-icon.png'
];
var DATA_FILES = ['../brand.config.json', '../menu.json', '../feasibility.json', 'manifest.webmanifest'];   // ../backend.config.json is cached when fetched (it may not exist)

self.addEventListener('install', function (e) {
  e.waitUntil(Promise.all([
    caches.open(SHELL).then(function (c) { return Promise.all(SHELL_FILES.map(function (u) { return c.add(u).catch(function () {}); })); }),
    caches.open(DATA).then(function (c) { return Promise.all(DATA_FILES.map(function (u) { return c.add(u).catch(function () {}); })); })
  ]).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== SHELL && k !== DATA; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function isData(url) {
  return /\.(json|webmanifest)$/.test(url.pathname);
}
function isShell(url) {
  var scope = new URL('./', self.registration.scope).pathname;
  return url.pathname.indexOf(scope) === 0 && !/\/samples\//.test(url.pathname);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isData(url)) {
    // Network first: fresh settings and menu when online, the last copy when offline.
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(DATA).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || new Response('null', { status: 503, headers: { 'Content-Type': 'application/json' } });
      });
    }));
    return;
  }

  if (isShell(url)) {
    // Cache first, refreshed in the background (pages fall back to the cached copy of the order page).
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res.ok && res.type === 'basic') { var copy = res.clone(); caches.open(SHELL).then(function (c) { c.put(req, copy); }); }
        return res;
      });
      if (hit) { net.catch(function () {}); return hit; }
      return net.catch(function () {
        return req.mode === 'navigate' ? caches.match('index.html') : Response.error();
      });
    }));
  }
  // Anything else (sample pack files and folders) goes to the network as normal.
});
