/* Student App service worker: PWA yangilanish + web push bildirishnomalar. */

const SW_VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const DEVELOPMENT = SW_VERSION === "dev" || ["localhost", "127.0.0.1", "[::1]"].includes(new URL(self.location.href).hostname);
// New cache namespace also clears assets retained by the old broad image cache.
const CACHE_NAME = `student-app-v2-${SW_VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch(OFFLINE_URL, { cache: "reload" });
      // A login redirect must never become the offline page.
      if (!response.ok || response.redirected) {
        throw new Error("Offline page could not be cached");
      }
      const cache = await caches.open(CACHE_NAME);
      await cache.put(OFFLINE_URL, response);
    })()
  );
  // Yangilanishni kutamiz: foydalanuvchi tugmani bosgach SKIP_WAITING keladi.
  // Development reuses asset URLs, so replace an older caching worker at once.
  if (DEVELOPMENT) self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Eski kesh versiyalarini tozalaymiz.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("student-app-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  // Local previews must use the browser's normal network path, including HMR.
  if (DEVELOPMENT) return;
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API so'rovlarini hech qachon keshlmaymiz.
  if (url.pathname.startsWith("/api/")) return;

  // Only public assets are shared between accounts. Private API images and
  // optimized images must keep their normal authenticated network behavior.
  if (
    (!DEVELOPMENT && url.pathname.startsWith("/_next/static/")) ||
    url.pathname.startsWith("/icons/") ||
    ["/icon.svg", "/favicon.ico", "/apple-icon.png"].includes(url.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok && !response.redirected) {
            await cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          const fallback = await cache.match(request);
          if (fallback) return fallback;
          throw error;
        }
      })
    );
    return;
  }

  // Personal pages are never cached. A document navigation can show a public
  // offline page; RSC, API and other requests must not receive HTML in its place.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (
          (await cache.match(OFFLINE_URL)) ||
          new Response("Internet aloqasi yo'q. Qayta urinib ko'ring.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      })
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    const data = event.data ? event.data.json() : {};
    payload = data && typeof data === "object" ? data : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Student App";
  const options = {
    body: payload.body || "Ilovaning yangi versiyasi mavjud. Yangilash uchun bosing.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag || "app-update",
    renotify: true,
    data: { url: payload.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

function getNotificationUrl(target) {
  try {
    const url = new URL(target, self.location.origin);
    if (url.origin === self.location.origin) return url.href;
  } catch {
    // Invalid or external notification links use the app's default route.
  }
  return new URL("/dashboard", self.location.origin).href;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = getNotificationUrl(
    (event.notification.data && event.notification.data.url) || "/dashboard"
  );

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const appClients = clientList.filter(
        (client) => new URL(client.url).origin === self.location.origin
      );
      const client =
        appClients.find((candidate) => candidate.url === target) || appClients[0];
      if (client) {
        try {
          const navigated = await client.navigate(target);
          if (navigated) {
            await navigated.focus();
            return;
          }
        } catch {
          // A closed window can fail navigation; open a new one below.
        }
      }

      await self.clients.openWindow(target);
    })()
  );
});
