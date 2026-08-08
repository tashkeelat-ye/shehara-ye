/* eslint-env serviceworker */
const CACHE = "tashkilat-v2";
const OFFLINE_URL = "/offline.html";

// إضافة الصفحة الرئيسية والمسارات الأساسية للتخزين المسبق
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
      .then((cache) => cache.addAll(PRECACHE))
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

  // استثناء طلبات External / Supabase / OAuth
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/~oauth")) return;

  // 1. التعامل مع تنقل الصفحات (Navigation Requests)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          // تحديث كاش الصفحة الرئيسية/الصفحات عند توفر الإنترنت
          if (networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // عند انقطاع الإنترنت: إرجاع الصفحة المطلوبة إن كانت مخزنة، أو الصفحة الرئيسية "/"، أو offline.html
          const cachedPage = await caches.match(req);
          if (cachedPage) return cachedPage;

          const homePage = await caches.match("/");
          if (homePage) return homePage;

          return (await caches.match(OFFLINE_URL)) || Response.error();
        })
    );
    return;
  }

  // 2. التعامل مع الملفات الساكنة (Images, CSS, JS, Fonts)
  if (/\.(png|jpg|jpeg|webp|svg|woff2?|ttf|css|js)$/.test(url.pathname)) {
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

        // Stale-while-revalidate: استخدام النسخة المخزنة فوراً لجعل التطبيق فائق السرعة
        return cached || network;
      })
    );
  }
});
