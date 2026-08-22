/* eslint-env serviceworker */

/**
 * =========================================================
 * تشكيلات للتسوق
 * Service Worker
 * =========================================================
 *
 * مسؤول عن:
 * - تحديث PWA
 * - التخزين المؤقت
 * - العمل دون اتصال
 * - الإشعارات
 * - فتح التطبيق عند الضغط على الإشعار
 *
 * لا يحتوي على أي منطق خاص بتصميم الواجهة.
 * =========================================================
 */

const CACHE_VERSION = "v7";

const SHELL_CACHE = `tashkilat-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `tashkilat-runtime-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";


/**
 * =========================================================
 * Install
 * =========================================================
 */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => {
        return cache.add("/");
      })
      .catch((error) => {
        console.warn(
          "[Tashkilat SW] Cache install failed:",
          error,
        );
      })
      .then(() => {
        return self.skipWaiting();
      }),
  );
});


/**
 * =========================================================
 * Activate
 * =========================================================
 */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName.startsWith("tashkilat-") &&
              cacheName !== SHELL_CACHE &&
              cacheName !== RUNTIME_CACHE
            ) {
              return caches.delete(cacheName);
            }

            return Promise.resolve(false);
          }),
        );
      })
      .then(() => {
        return self.clients.claim();
      }),
  );
});


/**
 * =========================================================
 * Push Notifications
 * =========================================================
 */

self.addEventListener("push", (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = {
        body: event.data.text(),
      };
    }
  }

  const title =
    data.title ||
    "إشعار جديد من تشكيلات";

  const body =
    data.body ||
    "لديك تحديث جديد في متجر تشكيلات.";

  const notificationUrl =
    data.link_url ||
    data.url ||
    "/";

  event.waitUntil(
    self.registration.showNotification(
      title,
      {
        body,
        dir: "rtl",
        lang: "ar",

        icon: "/icon-192.png",
        badge: "/icon-192.png",

        data: {
          url: notificationUrl,
        },
      },
    ),
  );
});


/**
 * =========================================================
 * Notification Click
 * =========================================================
 */

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const targetUrl =
      event.notification &&
      event.notification.data &&
      event.notification.data.url
        ? event.notification.data.url
        : "/";

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          for (const client of clientList) {
            if (
              client.url &&
              "focus" in client
            ) {
              return client
                .navigate(targetUrl)
                .then(() => client.focus());
            }
          }

          return self.clients.openWindow(
            targetUrl,
          );
        }),
    );
  },
);


/**
 * =========================================================
 * Fetch
 * =========================================================
 */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  /**
   * Service Worker يتعامل مع GET فقط.
   */
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /**
   * لا نتعامل مع طلبات النطاقات الخارجية.
   */
  if (
    url.origin !== self.location.origin
  ) {
    return;
  }

  /**
   * لا نتدخل في OAuth.
   */
  if (
    url.pathname.startsWith("/~oauth")
  ) {
    return;
  }

  /**
   * =======================================================
   * Connectivity Check
   * =======================================================
   */

  if (
    url.searchParams.has("connectivity")
  ) {
    event.respondWith(
      fetch(request, {
        cache: "no-store",
      }),
    );

    return;
  }


  /**
   * =======================================================
   * صفحات التطبيق
   *
   * Network First
   * ثم Cache
   * ثم Offline
   * =======================================================
   */

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone =
              response.clone();

            caches
              .open(RUNTIME_CACHE)
              .then((cache) => {
                return cache.put(
                  request,
                  responseClone,
                );
              })
              .catch(() => {
                // تجاهل خطأ التخزين المؤقت
              });
          }

          return response;
        })
        .catch(async () => {
          const cachedPage =
            await caches.match(request);

          if (cachedPage) {
            return cachedPage;
          }

          const cachedHome =
            await caches.match("/");

          if (cachedHome) {
            return cachedHome;
          }

          const offlinePage =
            await caches.match(
              OFFLINE_URL,
            );

          if (offlinePage) {
            return offlinePage;
          }

          return new Response(
            "أنت غير متصل بالإنترنت.",
            {
              status: 503,
              headers: {
                "Content-Type":
                  "text/plain; charset=utf-8",
              },
            },
          );
        }),
    );

    return;
  }


  /**
   * =======================================================
   * الملفات الثابتة
   *
   * Cache First
   * ثم Network
   * =======================================================
   */

  const isStaticAsset =
    /\.(?:js|css|png|jpg|jpeg|webp|svg|gif|ico|woff|woff2|ttf)$/i.test(
      url.pathname,
    );

  if (isStaticAsset) {
    event.respondWith(
      caches
        .match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone =
                  response.clone();

                caches
                  .open(RUNTIME_CACHE)
                  .then((cache) => {
                    return cache.put(
                      request,
                      responseClone,
                    );
                  })
                  .catch(() => {
                    // تجاهل خطأ التخزين المؤقت
                  });
              }

              return response;
            });
        })
        .catch(() => {
          return Response.error();
        }),
    );
  }
});
