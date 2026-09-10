/* eslint-env serviceworker */

/**
 * =========================================================
 * شهارة للتسوق
 * Service Worker
 * =========================================================
 */

const CACHE_VERSION = "v9";

const SHELL_CACHE =
  `shehara-shell-${CACHE_VERSION}`;

const RUNTIME_CACHE =
  `shehara-runtime-${CACHE_VERSION}`;

const OFFLINE_URL =
  "/offline.html";


/* =========================================================
 * Install
 * ========================================================= */

self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      caches
        .open(SHELL_CACHE)
        .then((cache) => {
          return cache.add("/");
        })
        .catch(() => {
          // لا تفشل عملية التثبيت بسبب cache.
        })
        .then(() => {
          return self.skipWaiting();
        }),
    );
  },
);


/* =========================================================
 * Activate
 * ========================================================= */

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map(
              (cacheName) => {
                if (
                  cacheName.startsWith(
                    "shehara-",
                  ) &&
                  cacheName !==
                    SHELL_CACHE &&
                  cacheName !==
                    RUNTIME_CACHE
                ) {
                  return caches.delete(
                    cacheName,
                  );
                }

                return Promise.resolve(
                  false,
                );
              },
            ),
          );
        })
        .then(() => {
          return self.clients.claim();
        }),
    );
  },
);


/* =========================================================
 * Web Push
 * ========================================================= */

self.addEventListener(
  "push",
  (event) => {
    let data = {};

    if (event.data) {
      try {
        data =
          event.data.json();
      } catch {
        data = {
          body:
            event.data.text(),
        };
      }
    }

    const title =
      data.title ||
      "طلبية جديدة من شهارة 🛍️";

    const body =
      data.body ||
      "لديك طلبية جديدة في لوحة الإدارة.";

    const notificationUrl =
      data.link_url ||
      data.url ||
      "/admin/orders";

    const notificationTag =
      data.tag ||
      (
        data.notification_id
          ? `notification-${data.notification_id}`
          : `shehara-${Date.now()}`
      );

    const options = {
      body,

      dir: "rtl",

      lang: "ar",

      icon:
        "/icon-192.png",

      badge:
        "/icon-192.png",

      tag:
        notificationTag,

      /*
       * لا تجعل الإشعار صامتًا.
       *
       * الصوت النهائي يخضع لإعدادات
       * Android والمتصفح.
       */
      silent: false,

      renotify: true,

      requireInteraction: true,

      vibrate: [
        250,
        100,
        250,
        100,
        500,
      ],

      timestamp:
        Date.now(),

      data: {
        url:
          notificationUrl,

        notification_id:
          data.notification_id ||
          null,

        kind:
          data.kind ||
          "new_order",
      },
    };

    event.waitUntil(
      self.registration
        .showNotification(
          title,
          options,
        ),
    );
  },
);


/* =========================================================
 * Notification Click
 * ========================================================= */

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const targetUrl =
      event.notification
        ?.data
        ?.url ||
      "/admin/orders";

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(async (clientList) => {
          for (
            const client of clientList
          ) {
            if (
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
                // تجاهل فشل navigate.
              }

              return client.focus();
            }
          }

          if (
            "openWindow" in
            self.clients
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


/* =========================================================
 * Fetch
 * ========================================================= */

self.addEventListener(
  "fetch",
  (event) => {
    const request =
      event.request;

    if (
      request.method !== "GET"
    ) {
      return;
    }

    const url =
      new URL(request.url);

    if (
      url.origin !==
      self.location.origin
    ) {
      return;
    }

    if (
      url.pathname.startsWith(
        "/~oauth",
      )
    ) {
      return;
    }

    if (
      url.searchParams.has(
        "connectivity",
      )
    ) {
      event.respondWith(
        fetch(request, {
          cache: "no-store",
        }),
      );

      return;
    }

    if (
      request.mode ===
      "navigate"
    ) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone =
                response.clone();

              caches
                .open(
                  RUNTIME_CACHE,
                )
                .then((cache) => {
                  return cache.put(
                    request,
                    clone,
                  );
                })
                .catch(() => {});
            }

            return response;
          })
          .catch(async () => {
            const cached =
              await caches.match(
                request,
              );

            if (cached) {
              return cached;
            }

            const home =
              await caches.match(
                "/",
              );

            if (home) {
              return home;
            }

            const offline =
              await caches.match(
                OFFLINE_URL,
              );

            if (offline) {
              return offline;
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

    const isStaticAsset =
      /\.(?:js|css|png|jpg|jpeg|webp|svg|gif|ico|woff|woff2|ttf)$/i.test(
        url.pathname,
      );

    if (isStaticAsset) {
      event.respondWith(
        caches
          .match(request)
          .then(
            (cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }

              return fetch(request)
                .then(
                  (response) => {
                    if (
                      response.ok
                    ) {
                      const clone =
                        response.clone();

                      caches
                        .open(
                          RUNTIME_CACHE,
                        )
                        .then(
                          (cache) => {
                            return cache.put(
                              request,
                              clone,
                            );
                          },
                        )
                        .catch(() => {});
                    }

                    return response;
                  },
                );
            },
          )
          .catch(() =>
            Response.error(),
          ),
      );
    }
  },
);
