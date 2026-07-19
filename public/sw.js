const CACHE_NAME = "agro-operativo-v1";
const APP_SHELL_ROUTES = ["/", "/chofer", "/maquinista", "/manifest.webmanifest", "/icon.svg"];
const SYNC_TAG = "agro-offline-sync";
const ASSET_EXTENSIONS = /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i;
const IS_LOCAL_DEV = ["localhost", "127.0.0.1", "0.0.0.0"].includes(self.location.hostname);

self.addEventListener("install", (event) => {
  if (IS_LOCAL_DEV) {
    event.waitUntil(clearAllCaches().then(() => self.skipWaiting()));
    return;
  }

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ROUTES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  if (IS_LOCAL_DEV) {
    event.waitUntil(
      clearAllCaches()
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
    );
    return;
  }

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (IS_LOCAL_DEV) {
    return;
  }

  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || ASSET_EXTENSIONS.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(notifyClientsToSync());
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "QUEUE_SYNC") {
    event.waitUntil(notifyClientsToSync());
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || caches.match("/");
  }
}

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  clients.forEach((client) => {
    client.postMessage({ type: "SYNC_PENDING" });
  });
}

async function clearAllCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}
