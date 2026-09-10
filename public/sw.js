const CACHE_NAME =
  "shehara-v11";

const APP_SHELL = [
  "/",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) =>
          cache
            .addAll(APP_SHELL)
            .catch(() => {
              /*
               * لا نمنع تثبيت Service Worker
               * إذا تعذر تخزين أحد الملفات.
               */
            }),
        ),
    );

    self.skipWaiting();
  },
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      Promise.all([
        self.clients.claim(),

        caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter(
                  (key) =>
                    key !==
                    CACHE_NAME,
                )
                .map((key) =>
                  caches.delete(
                    key,
                  ),
                ),
            ),
          ),
      ]),
    );
  },
);

self.addEventListener(
  "fetch",
  (event) => {
    if (
      event.request.method !==
      "GET"
    ) {
      return;
    }

    const url = new URL(
      event.request.url,
    );

    if (
      url.origin !==
      self.location.origin
    ) {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (
            response &&
            response.ok
          ) {
            const copy =
              response.clone();

            void caches
              .open(CACHE_NAME)
              .then((cache) =>
                cache.put(
                  event.request,
                  copy,
                ),
              );
          }

          return response;
        })
        .catch(() =>
          caches.match(
            event.request,
          ),
        ),
    );
  },
);

/*
 * ============================================================
 * WEB PUSH
 * ============================================================
 */

self.addEventListener(
  "push",
  (event) => {
    let data = {};

    try {
      if (event.data) {
        data =
          event.data.json();
      }
    } catch {
      try {
        const text =
          event.data
            ? event.data.text()
            : "";

        if (text) {
          data =
            JSON.parse(text);
        }
      } catch {
        data = {};
      }
    }

    const title =
      data.title ||
      "إشعار من شهارة 🔔";

    const body =
      data.body ||
      "لديك إشعار جديد من شهارة.";

    const linkUrl =
      data.link_url ||
      "/";

    const notificationId =
      data.notification_id ||
      `shehara-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    /*
     * مهم جداً:
     *
     * silent: false
     *
     * يعني أن الإشعار غير صامت،
     * ويترك للمتصفح/Android تشغيل
     * صوت قناة الإشعارات الخاصة به.
     *
     * Web Push لا يسمح بتحديد ملف MP3
     * مخصص من Service Worker.
     */

    const options = {
      body,

      icon:
        "/icon-192.png",

      badge:
        "/icon-192.png",

      dir:
        "rtl",

      lang:
        "ar",

      tag:
        `shehara-${notificationId}`,

      renotify:
        true,

      requireInteraction:
        true,

      silent:
        false,

      vibrate: [
        300,
        150,
        300,
        150,
        700,
      ],

      timestamp:
        Date.now(),

      data: {
        url:
          linkUrl,

        notification_id:
          notificationId,

        kind:
          data.kind ||
          "notification",
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

/*
 * ============================================================
 * فتح الإشعار
 * ============================================================
 */

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const targetUrl =
      event.notification?.data
        ?.url ||
      "/";

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clients) => {
          const target =
            new URL(
              targetUrl,
              self.location.origin,
            );

          for (
            const client of clients
          ) {
            try {
              const clientUrl =
                new URL(
                  client.url,
                );

              if (
                clientUrl.origin ===
                  target.origin &&
                "focus" in client
              ) {
                return client
                  .navigate(
                    target.href,
                  )
                  .then(() =>
                    client.focus(),
                  );
              }
            } catch {
              // تجاهل العميل غير الصالح.
            }
          }

          if (
            self.clients
              .openWindow
          ) {
            return self.clients.openWindow(
              target.href,
            );
          }

          return undefined;
        }),
    );
  },
);
