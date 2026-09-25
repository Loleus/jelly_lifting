const CACHE_NAME = "GLUTv1.0.1";
const APP_SHELL = [
  "./",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon-96x96.png",
  "./icons/favicon.ico",
  "./icons/flag-pl.svg",
  "./icons/flag-gb.svg",
  "./fonts/FreckleFace-Regular.woff2",
  "./fonts/Yarin-Regular.woff2",
  "./fonts/Cause-Regular.woff2",
  "./fonts/Cause-Bold.woff2",
  "./glut.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./")))
  );
});
