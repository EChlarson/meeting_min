const CACHE_NAME = "meeting-min-v4"; // bump this number whenever you deploy

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

  // BYPASS non-GET (POST/OPTIONS) requests
  if (req.method !== "GET") {
    event.respondWith(fetch(req));
    return;
  }

  // BYPASS cross-origin requests (like your Cloudflare AI Worker)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // --- Your existing caching logic below this line ---
  const isCoreAsset =
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/record.js") ||
    url.pathname.endsWith("/export.js") ||
    url.pathname.endsWith("/style.css");

  if (isCoreAsset) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});