/* eslint-env serviceworker */

/**
 * =========================================================
 * تشكيلات للتسوق
 * Service Worker
 * =========================================================
 */

const CACHE_VERSION = "v6";

const SHELL_CACHE =
  `tashkilat-shell-${CACHE_VERSION}`;

const RUNTIME_CACHE =
  `tashkilat-runtime-${CACHE_VERSION}`;

const OFFLINE_URL =
  "/offline.html";


/**
 * =========================================================
 * الملفات الأساسية التي يتم تخزينها مسبقاً
 * =========================================================
 */

const PRECACHE_URLS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/logo.png",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
];


/**
 * =========================================================
 * Install
 * =========================================================
 */

self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      caches
        .open(SHELL_CACHE)
        .then(async (cache) => {
          for (const url of PRECACHE_URLS) {
            try {
              await cache.add(
                new Request(url, {
                  cache: "reload",
                }),
              );
            } catch (error) {
              console.warn(
                "[Tashkilat SW] Failed to precache:",
                url,
                error,
              );
            }
          }
        })
        .then(() => self.skipWaiting()),
    );
  },
);


/**
 * =========================================================
 * Activate
 * =========================================================
 */

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames
              .filter(
                (cacheName) =>
                  cacheName.startsWith(
                    "tashkilat-",
                  ) &&
                  cacheName !== SHELL_CACHE &&
                  cacheName !== RUNTIME_CACHE,
              )
              .map((cacheName) =>
                caches.delete(cacheName),
              ),
          );
        })
        .then(() => self.clients.claim())
        .then(async () => {
          const clients =
            await self.clients.matchAll({
              type: "window",
              includeUncontrolled: true,
            });

          for (const client of clients) {
            client.postMessage({
              type: "TASHKILAT_SW_UPDATED",
              version: CACHE_VERSION,
            });
          }
        }),
    );
  },
);


/**
 * =========================================================
 * Push Notifications
 * =========================================================
 */

self.addEventListener(
  "push",
  (event) => {
    let data = {};

    if (event.data) {
      try {
        data = event.data.json();
      } catch {
        data = {
          title:
            "إشعار جديد من تشكيلات",

          body:
            event.data.text(),
        };
      }
    }

    const title =
      data.title ||
      "إشعار جديد من تشكيلات";

    const options = {
      body:
        data.body ||
        "لديك تحديث جديد في المتجر",

      icon:
        "/icon-192.png",

      badge:
        "/icon-192.png",

      dir: "rtl",

      lang: "ar",

      data: {
        url:
          data.link_url ||
          "/",
      },
    };

    event.waitUntil(
      self.registration.showNotification(
        title,
        options,
      ),
    );
  },
);


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
      event.notification?.data?.url ||
      "/";

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          for (const client of clientList) {
            if (
              "focus" in client
            ) {
              if (
                "navigate" in client
              ) {
                client.navigate(
                  targetUrl,
                );
              }

              return client.focus();
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

self.addEventListener(
  "fetch",
  (event) => {
    const request =
      event.request;

    /**
     * نتعامل فقط مع GET.
     */
    if (
      request.method !==
      "GET"
    ) {
      return;
    }

    const url =
      new URL(
        request.url,
      );

    /**
     * لا نتعامل مع النطاقات الخارجية.
     */
    if (
      url.origin !==
      self.location.origin
    ) {
      return;
    }

    /**
     * OAuth
     */
    if (
      url.pathname.startsWith(
        "/~oauth",
      )
    ) {
      return;
    }

    /**
     * =======================================================
     * اختبار الاتصال
     * =======================================================
     */

    if (
      url.searchParams.has(
        "connectivity",
      )
    ) {
      event.respondWith(
        fetch(
          request,
          {
            cache:
              "no-store",
          },
        ),
      );

      return;
    }

    /**
     * =======================================================
     * HTML Navigation
     *
     * Network First
     * ↓
     * Runtime Cache
     * ↓
     * Shell Cache
     * ↓
     * Offline Page
     * =======================================================
     */

    if (
      request.mode ===
      "navigate"
    ) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (
              response.ok
            ) {
              const copy =
                response.clone();

              void caches
                .open(
                  RUNTIME_CACHE,
                )
                .then((cache) =>
                  cache.put(
                    request,
                    copy,
                  ),
                );
            }

            return response;
          })
          .catch(async () => {
            const cachedPage =
              await caches.match(
                request,
              );

            if (
              cachedPage
            ) {
              return cachedPage;
            }

            const cachedHome =
              await caches.match(
                "/",
              );

            if (
              cachedHome
            ) {
              return cachedHome;
            }

            const offlinePage =
              await caches.match(
                OFFLINE_URL,
              );

            return (
              offlinePage ||
              new Response(
                "أنت غير متصل بالإنترنت.",
                {
                  status: 503,

                  headers: {
                    "Content-Type":
                      "text/plain; charset=utf-8",
                  },
                },
              )
            );
          }),
      );

      return;
    }

    /**
     * =======================================================
     * Static Assets
     *
     * Cache First
     * ↓
     * Network
     * ↓
     * Runtime Cache
     * =======================================================
     */

    const isStaticAsset =
      /\.(?:js|css|png|jpg|jpeg|webp|svg|gif|ico|woff|woff2|ttf)$/i.test(
        url.pathname,
      );

    if (
      isStaticAsset
    ) {
      event.respondWith(
        caches
          .match(request)
          .then((cachedResponse) => {
            if (
              cachedResponse
            ) {
              return cachedResponse;
            }

            return fetch(
              request,
            )
              .then(
                (response) => {
                  if (
                    response.ok
                  ) {
                    const copy =
                      response.clone();

                    void caches
                      .open(
                        RUNTIME_CACHE,
                      )
                      .then(
                        (cache) =>
                          cache.put(
                            request,
                            copy,
                          ),
                      );
                  }

                  return response;
                },
              )
              .catch(
                () =>
                  Response.error(),
              );
          }),
      );
    }
  },
);
