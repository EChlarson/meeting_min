const CACHE_NAME = "meeting-min-v3"; // bump this number whenever you deploy

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

  // Always go to network first for these (so you get newest code on refresh)
  const isCoreAsset =
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/record.js") ||
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

  // For everything else, cache-first is fine
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});