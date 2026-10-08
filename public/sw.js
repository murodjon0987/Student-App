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
  // API va Next.js ichki so'rovlarini hech qachon keshlmaymiz.
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/")) return;

  // Network-first: har doim yangi kontent olinadi, tarmoq yo'q bo'lsa keshdan.
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
