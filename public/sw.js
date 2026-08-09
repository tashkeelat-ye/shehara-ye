/* eslint-env serviceworker */
const CACHE = "tashkilat-v3";
const OFFLINE_URL = "/offline.html";

// الملفات الأساسية للتخزين المسبق
const PRECACHE = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // إرجاع استجابة فارغة فوراً لطلبات Supabase عند انقطاع الإنترنت لمنع تعليق Waite Skeletons
  if (url.origin.includes("supabase.co")) {
    event.respondWith(
      fetch(req).catch(() => new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/~oauth")) return;

  // 1. طلبات الصفحات (Navigation)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(req);
          if (cachedPage) return cachedPage;

          const homePage = await caches.match("/");
          if (homePage) return homePage;

          return (await caches.match(OFFLINE_URL)) || Response.error();
        })
    );
    return;
  }

  // 2. الملفات الساكنة والصور
  if (/\.(png|jpg|jpeg|webp|svg|gif|woff2?|ttf|css|js)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached || Response.error());

        return cached || network;
      })
    );
  }
});
