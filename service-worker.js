const CACHE_NAME = "meeting-min-v5"; // bump this number whenever you deploy

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Never touch other domains (like your Cloudflare Worker)
  if (url.origin !== self.location.origin) return;

  // 2) Never touch non-GET (POST/PUT/etc)
  if (req.method !== "GET") return;

  // ... your existing caching logic for same-origin GETs only ...
});

self.addEventListener("install", (event) => {
  self.skipWaiting(); // activate new SW immediately
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim(); // take control immediately
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass non-GET (POST/OPTIONS) requests
  if (req.method !== "GET") {
    event.respondWith(fetch(req));
    return;
  }

  // Bypass cross-origin requests (Cloudflare Worker is cross-origin)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // Your normal caching logic for same-origin GETs can stay below...
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});