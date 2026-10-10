/* Student App service worker: PWA yangilanish + web push bildirishnomalar. */

const SW_VERSION = new URL(self.location.href).searchParams.get("v") || "dev";

self.addEventListener("install", () => {
  // Yangilanishni kutamiz: foydalanuvchi tugmani bosgach SKIP_WAITING keladi.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Eski kesh versiyalarini tozalaymiz.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("student-app") && key !== `student-app-${SW_VERSION}`)
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
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API so'rovlarini hech qachon keshlmaymiz.
  if (url.pathname.startsWith("/api/")) return;

  // Statik va hash bilan nomlangan Next.js fayllari — cache-first (tez).
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(`student-app-${SW_VERSION}`).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
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

  // Sahifalar/RSC — network-first: har doim yangi kontent, tarmoq yo'q bo'lsa kesh.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
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

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          client.postMessage({ type: "RELOAD" });
          return;
        }
      }

      await self.clients.openWindow(target);
    })()
  );
});
