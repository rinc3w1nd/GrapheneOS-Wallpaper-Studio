// GrapheneOS Wallpaper Studio — service worker.
//
// This app is 100% client-side and makes zero network requests at runtime, so
// it can run fully offline once installed. The worker exists to (1) satisfy PWA
// installability and (2) serve the app shell offline.
//
// Strategy: NETWORK-FIRST with a cache fallback for every same-origin GET. The
// shipped JS/CSS filenames are NOT content-hashed, so a cache-first strategy
// would pin users to stale code across a redeploy. Network-first means online
// users always get the freshest bytes (and we refresh the cache as a side
// effect), while offline users fall back to the last-cached shell. Page
// navigations fall back to the cached index so the app still opens offline.
//
// Bump CACHE_NAME whenever the shell list changes (e.g. a new style file is
// added) to purge stale caches on the next activate.

const CACHE_NAME = "gos-wallpaper-shell-v4";

// Precached on install so the very first offline launch works even if the user
// never exercised every code path. (Network-first keeps these fresh thereafter.)
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/style.css",
  "./src/core.js",
  "./src/styles/lattice.js",
  "./src/styles/topographic.js",
  "./src/styles/constellation.js",
  "./src/styles/flow.js",
  "./src/styles/circuit.js",
  "./src/styles/bokeh.js",
  "./src/styles/facets.js",
  "./src/styles/sonar.js",
  "./src/styles/truchet.js",
  "./src/styles/modulation.js",
  "./src/styles/matrix.js",
  "./src/styles/crashdump.js",
  "./src/styles/keepcalm.js",
  "./src/styles/forge.js",
  "./src/app.js",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png",
  "./icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // allSettled so one transient 404 can't abort the whole install.
      await Promise.allSettled(SHELL.map((url) => cache.add(url)));
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE_NAME) await caches.delete(key);
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // app is same-origin only

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (err) {
        const cached = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
        if (cached) return cached;
        if (req.mode === "navigate") {
          return (
            (await cache.match("./index.html")) ||
            (await cache.match("./")) ||
            Response.error()
          );
        }
        return Response.error();
      }
    })()
  );
});
