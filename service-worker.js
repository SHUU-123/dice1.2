const CACHE_NAME = "dice-tool-cache-v1";

const FILES_TO_CACHE = [
  "/dice1.2/",
  "/dice1.2/index.html",
  "/dice1.2/styles.css",
  "/dice1.2/app.js",
  "/dice1.2/manifest.json",
  "/dice1.2/icons/icon-192.png",
  "/dice1.2/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});
