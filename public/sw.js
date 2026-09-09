/* eslint-env serviceworker */

/**
 * =========================================================
 * شهارة للتسوق
 * Service Worker
 * =========================================================
 *
 * مسؤول عن:
 * - تحديث PWA
 * - التخزين المؤقت
 * - العمل دون اتصال
 * - Web Push Notifications
 * - فتح التطبيق عند الضغط على الإشعار
 *
 * ملاحظة:
 * صوت الإشعار عندما يكون التطبيق مغلقًا بالكامل
 * يخضع لإعدادات نظام التشغيل والمتصفح.
 * تشغيل notification.mp3 مخصص يتم من داخل التطبيق
 * عندما تكون الصفحة مفتوحة.
 * =========================================================
 */

const CACHE_VERSION = "v8";

const SHELL_CACHE = `shehara-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `shehara-runtime-${CACHE_VERSION}`;

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
          "[Shehara SW] Cache install failed:",
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
              cacheName.startsWith("shehara-") &&
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
 *
 * يعمل حتى عندما تكون واجهة التطبيق غير مفتوحة،
 * بشرط أن يكون Web Push مسجلاً بشكل صحيح وأن يسمح
 * نظام التشغيل والمتصفح بالإشعارات.
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
    "إشعار جديد من شهارة";

  const body =
    data.body ||
    "لديك تحديث جديد في متجر شهارة.";

  const notificationUrl =
    data.link_url ||
    data.url ||
    "/";

  const notificationTag =
    data.tag ||
    data.kind ||
    "shehara-notification";

  const options = {
    body,
    dir: "rtl",
    lang: "ar",

    icon: "/icon-192.png",
    badge: "/icon-192.png",

    tag: notificationTag,

    /**
     * السماح بإعادة التنبيه عند وصول إشعار جديد
     * بنفس النوع.
     */
    renotify: true,

    /**
     * إبقاء إشعار طلب جديد ظاهرًا حتى يتفاعل المستخدم
     * معه، قدر الإمكان وفق نظام التشغيل.
     */
    requireInteraction: true,

    /**
     * اهتزاز الأجهزة التي تدعم ذلك.
     */
    vibrate: [250, 100, 250, 100, 400],

    timestamp: Date.now(),

    data: {
      url: notificationUrl,
      notification_id:
        data.notification_id || null,
      kind:
        data.kind || null,
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options,
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
        .then(async (clientList) => {
          /**
           * إذا كان التطبيق مفتوحًا بالفعل،
           * نحاول استخدام النافذة الحالية بدل فتح نافذة جديدة.
           */
          for (const client of clientList) {
            if (
              client.url &&
              "focus" in client
            ) {
              try {
                if (
                  typeof client.navigate ===
                  "function"
                ) {
                  await client.navigate(
                    targetUrl,
                  );
                }
              } catch {
                // تجاهل فشل التنقل واستمر بمحاولة التركيز.
              }

              return client.focus();
            }
          }

          /**
           * إذا لم يكن التطبيق مفتوحًا،
           * افتح الرابط المطلوب.
           */
          if (
            "openWindow" in self.clients
          ) {
            return self.clients.openWindow(
              targetUrl,
            );
          }

          return undefined;
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
