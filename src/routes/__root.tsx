import {
  QueryClient,
  QueryClientProvider,
  useIsFetching,
} from "@tanstack/react-query";

import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import {
  useEffect,
  type ReactNode,
} from "react";

import appCss from "../styles.css?url";

import {
  reportLovableError,
} from "../lib/lovable-error-reporting";

import {
  AuthProvider,
  useAuth,
} from "@/lib/auth-context";

import {
  CartProvider,
} from "@/lib/cart-context";

import {
  WishlistProvider,
} from "@/lib/wishlist-context";

import {
  CartDrawer,
} from "@/components/cart-drawer";

import {
  CurrencyProvider,
} from "@/lib/currency-context";

import {
  Toaster,
} from "@/components/ui/sonner";

import {
  SupportChat,
} from "@/components/support-chat";

import {
  PermissionPrompt,
} from "@/components/permission-prompt";

import {
  NotificationListener,
} from "@/components/NotificationListener";

import {
  OfflineIndicator,
} from "@/components/offline-indicator";

import {
  AppSplash,
} from "@/components/app-splash";

import {
  registerPushNotifications,
} from "@/lib/push";

/**
 * =========================================================
 * الهوية
 * =========================================================
 */

const BRAND = {
  burgundy:
    "#4A1525",

  burgundyDeep:
    "#35101C",

  gold:
    "#E0B85C",

  goldDeep:
    "#C99A3B",

  cream:
    "#FBF7EF",

  dark:
    "#170C11",
};

/**
 * =========================================================
 * React Query
 * =========================================================
 */

export const defaultQueryClient =
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:
          1000 * 60 * 60 * 24,

        gcTime:
          1000 * 60 * 60 * 24 * 7,

        refetchOnWindowFocus:
          false,

        networkMode:
          "offlineFirst",
      },
    },
  });

const THEME_STORAGE_KEY =
  "shehara-theme";

/**
 * =========================================================
 * Initial Theme
 * =========================================================
 */

function getInitialThemeScript() {
  return `
    (function () {
      try {
        var stored =
          localStorage.getItem("${THEME_STORAGE_KEY}");

        var theme =
          stored === "dark" ||
          stored === "light"
            ? stored
            : (
                window.matchMedia(
                  "(prefers-color-scheme: dark)"
                ).matches
                  ? "dark"
                  : "light"
              );

        document.documentElement.classList.toggle(
          "dark",
          theme === "dark"
        );

        document.documentElement.style.colorScheme =
          theme;

        document.documentElement.dataset.theme =
          theme;
      } catch (_) {
        document.documentElement.classList.remove(
          "dark"
        );

        document.documentElement.style.colorScheme =
          "light";

        document.documentElement.dataset.theme =
          "light";
      }
    })();
  `;
}

/**
 * =========================================================
 * زخارف الهوية
 * =========================================================
 */

function HeritageWatermark() {
  return (
    <div
      aria-hidden="true"
      className="
        pointer-events-none
        fixed
        inset-0
        z-0
        overflow-hidden
        select-none
      "
    >
      {/* ===================================================
          العلامة المائية اليمنى
          =================================================== */}

      <div
        className="
          absolute
          -right-28
          top-24
          h-80
          w-80
          rotate-45
          opacity-[0.035]
          dark:opacity-[0.025]
        "
      >
        <div
          className="
            absolute
            inset-0
            rounded-[4rem]
            border-[2px]
            border-[#E0B85C]
          "
        />

        <div
          className="
            absolute
            inset-8
            rotate-45
            rounded-[2.5rem]
            border
            border-[#E0B85C]
          "
        />

        <div
          className="
            absolute
            inset-20
            rounded-2xl
            border
            border-[#E0B85C]
          "
        />

        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-20
            w-20
            -translate-x-1/2
            -translate-y-1/2
            rotate-45
            border-2
            border-[#E0B85C]
          "
        />
      </div>

      {/* ===================================================
          العلامة المائية اليسرى
          =================================================== */}

      <div
        className="
          absolute
          -left-36
          top-[52%]
          h-96
          w-96
          -rotate-45
          opacity-[0.025]
          dark:opacity-[0.018]
        "
      >
        <div
          className="
            absolute
            inset-0
            rounded-[5rem]
            border-[2px]
            border-[#4A1525]
            dark:border-[#E0B85C]
          "
        />

        <div
          className="
            absolute
            inset-10
            rounded-[4rem]
            border
            border-[#4A1525]
            dark:border-[#E0B85C]
          "
        />

        <div
          className="
            absolute
            inset-24
            rounded-[3rem]
            border
            border-[#4A1525]
            dark:border-[#E0B85C]
          "
        />
      </div>

      {/* ===================================================
          الخطوط الهندسية
          =================================================== */}

      <div
        className="
          absolute
          inset-x-0
          top-0
          h-32
          opacity-[0.035]
          dark:opacity-[0.025]
        "
      >
        <div
          className="
            absolute
            inset-x-0
            top-6
            h-px
            bg-gradient-to-r
            from-transparent
            via-[#E0B85C]
            to-transparent
          "
        />

        <div
          className="
            absolute
            inset-x-12
            top-12
            h-px
            bg-gradient-to-r
            from-transparent
            via-[#4A1525]
            to-transparent
            dark:via-[#E0B85C]
          "
        />

        <div
          className="
            absolute
            inset-x-24
            top-20
            h-px
            bg-gradient-to-r
            from-transparent
            via-[#E0B85C]
            to-transparent
          "
        />
      </div>

      {/* ===================================================
          زخارف الزوايا
          =================================================== */}

      <div
        className="
          absolute
          right-5
          top-28
          h-10
          w-10
          rotate-45
          border
          border-[#E0B85C]/[0.08]
        "
      />

      <div
        className="
          absolute
          left-5
          top-[45%]
          h-8
          w-8
          rotate-45
          border
          border-[#E0B85C]/[0.06]
        "
      />

      <div
        className="
          absolute
          bottom-28
          right-10
          h-6
          w-6
          rotate-45
          border
          border-[#E0B85C]/[0.06]
        "
      />
    </div>
  );
}

/**
 * =========================================================
 * صفحة 404
 * =========================================================
 */

function NotFoundComponent() {
  return (
    <div
      className="
        relative
        z-10
        flex
        min-h-screen
        items-center
        justify-center
        bg-background
        px-4
      "
    >
      <div
        className="
          relative
          w-full
          max-w-md
          overflow-hidden
          rounded-3xl
          border
          border-[#E0B85C]/20
          bg-card
          p-8
          text-center
          shadow-[0_25px_70px_-35px_rgba(74,21,37,0.55)]
        "
      >
        <div
          aria-hidden="true"
          className="
            absolute
            -right-12
            -top-12
            h-28
            w-28
            rotate-45
            border
            border-[#E0B85C]/10
          "
        />

        <div
          className="
            relative
            mx-auto
            grid
            h-20
            w-20
            place-items-center
            rounded-2xl
            bg-[#4A1525]
            text-3xl
            font-extrabold
            text-[#E0B85C]
            shadow-lg
          "
        >
          404
        </div>

        <h1
          className="
            mt-6
            text-xl
            font-extrabold
            text-foreground
          "
        >
          الصفحة غير موجودة
        </h1>

        <p
          className="
            mt-2
            text-sm
            leading-7
            text-muted-foreground
          "
        >
          الصفحة التي تبحث عنها غير موجودة
          أو تم نقلها.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="
              inline-flex
              min-h-11
              items-center
              justify-center
              rounded-xl
              bg-[#4A1525]
              px-6
              text-sm
              font-bold
              text-white
              transition-all
              hover:bg-[#6A263A]
              active:scale-[0.98]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#E0B85C]
              dark:bg-[#E0B85C]
              dark:text-[#35101C]
            "
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * =========================================================
 * Error Boundary
 * =========================================================
 */

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router =
    useRouter();

  console.error(error);

  useEffect(() => {
    reportLovableError(
      error,
      {
        boundary:
          "tanstack_root_error_component",
      },
    );
  }, [error]);

  return (
    <div
      className="
        relative
        z-10
        flex
        min-h-screen
        items-center
        justify-center
        bg-background
        px-4
      "
    >
      <div
        className="
          w-full
          max-w-md
          rounded-3xl
          border
          border-[#E0B85C]/20
          bg-card
          p-7
          text-center
          shadow-[0_25px_70px_-35px_rgba(74,21,37,0.55)]
        "
      >
        <div
          className="
            mx-auto
            grid
            h-14
            w-14
            place-items-center
            rounded-2xl
            bg-[#4A1525]/10
            text-[#4A1525]
            dark:bg-[#E0B85C]/10
            dark:text-[#E0B85C]
          "
        >
          !
        </div>

        <h1
          className="
            mt-5
            text-xl
            font-extrabold
            tracking-tight
            text-foreground
          "
        >
          تعذّر تحميل الصفحة
        </h1>

        <p
          className="
            mt-2
            text-sm
            leading-7
            text-muted-foreground
          "
        >
          حدث خطأ غير متوقع.
          يمكنك المحاولة مرة أخرى
          أو العودة إلى الصفحة الرئيسية.
        </p>

        <div
          className="
            mt-6
            flex
            flex-wrap
            justify-center
            gap-2
          "
        >
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="
              inline-flex
              min-h-11
              items-center
              justify-center
              rounded-xl
              bg-[#4A1525]
              px-5
              text-sm
              font-bold
              text-white
              transition-all
              hover:bg-[#6A263A]
              active:scale-[0.98]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#E0B85C]
              dark:bg-[#E0B85C]
              dark:text-[#35101C]
            "
          >
            المحاولة مرة أخرى
          </button>

          <Link
            to="/"
            className="
              inline-flex
              min-h-11
              items-center
              justify-center
              rounded-xl
              border
              border-[#E0B85C]/20
              bg-background
              px-5
              text-sm
              font-bold
              text-foreground
              transition-all
              hover:bg-[#4A1525]/[0.04]
              active:scale-[0.98]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#E0B85C]
            "
          >
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * =========================================================
 * Root Route
 * =========================================================
 */

export const Route =
  createRootRouteWithContext<{
    queryClient: QueryClient;
  }>()({
    head: () => ({
      meta: [
        {
          charSet:
            "utf-8",
        },

        {
          name:
            "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover",
        },

        {
          title:
            "شهارة | متجر يمني إلكتروني",
        },

        {
          name:
            "description",
          content:
            "شهارة — كل ما تحتاجه بتشكيلة واحدة. متجر إلكتروني يمني.",
        },

        {
          name:
            "theme-color",
          content:
            BRAND.burgundy,
        },

        {
          name:
            "apple-mobile-web-app-capable",
          content:
            "yes",
        },

        {
          name:
            "mobile-web-app-capable",
          content:
            "yes",
        },

        {
          name:
            "apple-mobile-web-app-status-bar-style",
          content:
            "black-translucent",
        },

        {
          name:
            "format-detection",
          content:
            "telephone=no",
        },

        {
          property:
            "og:title",
          content:
            "شهارة | متجر يمني إلكتروني",
        },

        {
          property:
            "og:description",
          content:
            "شهارة — كل ما تحتاجه بتشكيلة واحدة.",
        },

        {
          property:
            "og:type",
          content:
            "website",
        },

        {
          name:
            "twitter:card",
          content:
            "summary_large_image",
        },
      ],

      links: [
        {
          rel:
            "stylesheet",
          href:
            appCss,
        },

        {
          rel:
            "preconnect",
          href:
            "https://fonts.googleapis.com",
        },

        {
          rel:
            "preconnect",
          href:
            "https://fonts.gstatic.com",
          crossOrigin:
            "anonymous",
        },

        {
          rel:
            "stylesheet",
          href:
            "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap",
        },

        {
          rel:
            "icon",
          href:
            "/favicon.png",
          type:
            "image/png",
        },

        {
          rel:
            "apple-touch-icon",
          href:
            "/icon-192.png",
        },

        {
          rel:
            "manifest",
          href:
            "/manifest.webmanifest",
        },
      ],
    }),

    shellComponent:
      RootShell,

    component:
      RootComponent,

    notFoundComponent:
      NotFoundComponent,

    errorComponent:
      ErrorComponent,
  });

/**
 * =========================================================
 * Root Shell
 * =========================================================
 */

function RootShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className="
        shehara-app
        bg-[#FBF7EF]
        dark:bg-[#170C11]
      "
    >
      <head>
        <HeadContent />

        <script
          dangerouslySetInnerHTML={{
            __html:
              getInitialThemeScript(),
          }}
        />
      </head>

      <body
        className="
          min-h-screen
          overflow-x-hidden
          bg-[#FBF7EF]
          text-[#35101C]
          antialiased
          selection:bg-[#E0B85C]/30
          selection:text-[#35101C]
          dark:bg-[#170C11]
          dark:text-[#FBF7EF]
          dark:selection:bg-[#E0B85C]/30
          dark:selection:text-[#FBF7EF]
        "
        onContextMenu={(event) => {
          const target =
            event.target as
              | HTMLElement
              | null;

          if (
            target?.closest(
              "img, .protected-image, [data-protected-image='true']",
            )
          ) {
            event.preventDefault();
          }
        }}
        onDragStart={(event) => {
          const target =
            event.target as
              | HTMLElement
              | null;

          if (
            target?.closest(
              "img, .protected-image, [data-protected-image='true']",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <div
          className="
            relative
            min-h-screen
            overflow-x-hidden
            bg-[#FBF7EF]
            dark:bg-[#170C11]
          "
        >
          <HeritageWatermark />

          <div
            className="
              relative
              z-10
              min-h-screen
            "
          >
            {children}
          </div>
        </div>

        <Scripts />
      </body>
    </html>
  );
}

/**
 * =========================================================
 * Theme Controller
 * =========================================================
 */

function ThemeController() {
  useEffect(() => {
    const root =
      document.documentElement;

    function applyTheme(
      theme:
        | "dark"
        | "light",
    ) {
      root.classList.toggle(
        "dark",
        theme === "dark",
      );

      root.style.colorScheme =
        theme;

      root.dataset["theme"] =
        theme;
    }

    try {
      const stored =
        localStorage.getItem(
          THEME_STORAGE_KEY,
        );

      if (
        stored === "dark" ||
        stored === "light"
      ) {
        applyTheme(
          stored,
        );

        return undefined;
      }

      const mediaQuery =
        window.matchMedia(
          "(prefers-color-scheme: dark)",
        );

      applyTheme(
        mediaQuery.matches
          ? "dark"
          : "light",
      );

      const handleSystemThemeChange =
        (
          event: MediaQueryListEvent,
        ) => {
          const currentStored =
            localStorage.getItem(
              THEME_STORAGE_KEY,
            );

          if (
            currentStored !==
              "dark" &&
            currentStored !==
              "light"
          ) {
            applyTheme(
              event.matches
                ? "dark"
                : "light",
            );
          }
        };

      mediaQuery.addEventListener(
        "change",
        handleSystemThemeChange,
      );

      return () => {
        mediaQuery.removeEventListener(
          "change",
          handleSystemThemeChange,
        );
      };
    } catch {
      applyTheme(
        "light",
      );

      return undefined;
    }
  }, []);

  return null;
}

/**
 * =========================================================
 * Image Protection
 * =========================================================
 */

function ImageProtectionController() {
  useEffect(() => {
    const selector =
      "img, .protected-image, [data-protected-image='true']";

    const handleContextMenu =
      (
        event: MouseEvent,
      ) => {
        const target =
          event.target as
            | HTMLElement
            | null;

        if (
          target?.closest(
            selector,
          )
        ) {
          event.preventDefault();
        }
      };

    const handleDragStart =
      (
        event: DragEvent,
      ) => {
        const target =
          event.target as
            | HTMLElement
            | null;

        if (
          target?.closest(
            selector,
          )
        ) {
          event.preventDefault();
        }
      };

    const handleTouchStart =
      (
        event: TouchEvent,
      ) => {
        const target =
          event.target as
            | HTMLElement
            | null;

        const image =
          target?.closest(
            selector,
          );

        if (image) {
          image.classList.add(
            "image-touch-protected",
          );
        }
      };

    const handleTouchEnd =
      (
        event: TouchEvent,
      ) => {
        const target =
          event.target as
            | HTMLElement
            | null;

        const image =
          target?.closest(
            selector,
          );

        if (image) {
          image.classList.remove(
            "image-touch-protected",
          );
        }
      };

    document.addEventListener(
      "contextmenu",
      handleContextMenu,
      {
        capture:
          true,
      },
    );

    document.addEventListener(
      "dragstart",
      handleDragStart,
      {
        capture:
          true,
      },
    );

    document.addEventListener(
      "touchstart",
      handleTouchStart,
      {
        passive:
          true,
        capture:
          true,
      },
    );

    document.addEventListener(
      "touchend",
      handleTouchEnd,
      {
        passive:
          true,
        capture:
          true,
      },
    );

    return () => {
      document.removeEventListener(
        "contextmenu",
        handleContextMenu,
        {
          capture:
            true,
        },
      );

      document.removeEventListener(
        "dragstart",
        handleDragStart,
        {
          capture:
            true,
        },
      );

      document.removeEventListener(
        "touchstart",
        handleTouchStart,
        {
          capture:
            true,
        },
      );

      document.removeEventListener(
        "touchend",
        handleTouchEnd,
        {
          capture:
            true,
        },
      );
    };
  }, []);

  return null;
}

/**
 * =========================================================
 * Viewport Protection
 * =========================================================
 */

function ViewportProtectionController() {
  useEffect(() => {
    const preventGesture =
      (
        event: Event,
      ) => {
        event.preventDefault();
      };

    const preventCtrlWheelZoom =
      (
        event: WheelEvent,
      ) => {
        if (
          event.ctrlKey
        ) {
          event.preventDefault();
        }
      };

    const preventMultiTouchZoom =
      (
        event: TouchEvent,
      ) => {
        if (
          event.touches
            .length > 1
        ) {
          event.preventDefault();
        }
      };

    document.addEventListener(
      "gesturestart",
      preventGesture,
      {
        passive:
          false,
      },
    );

    document.addEventListener(
      "gesturechange",
      preventGesture,
      {
        passive:
          false,
      },
    );

    document.addEventListener(
      "gestureend",
      preventGesture,
      {
        passive:
          false,
      },
    );

    document.addEventListener(
      "wheel",
      preventCtrlWheelZoom,
      {
        passive:
          false,
      },
    );

    document.addEventListener(
      "touchmove",
      preventMultiTouchZoom,
      {
        passive:
          false,
      },
    );

    return () => {
      document.removeEventListener(
        "gesturestart",
        preventGesture,
      );

      document.removeEventListener(
        "gesturechange",
        preventGesture,
      );

      document.removeEventListener(
        "gestureend",
        preventGesture,
      );

      document.removeEventListener(
        "wheel",
        preventCtrlWheelZoom,
      );

      document.removeEventListener(
        "touchmove",
        preventMultiTouchZoom,
      );
    };
  }, []);

  return null;
}

/**
 * =========================================================
 * Global Fetching Loader
 * =========================================================
 */

function GlobalFetchingLoader() {
  const isFetching =
    useIsFetching();

  if (
    isFetching === 0 ||
    (
      typeof navigator !==
        "undefined" &&
      !navigator.onLine
    )
  ) {
    return null;
  }

  return (
    <div
      className="
        pointer-events-none
        fixed
        inset-0
        z-[9990]
        flex
        items-center
        justify-center
        bg-[#35101C]/[0.035]
        backdrop-blur-[1px]
      "
      aria-hidden="true"
    >
      <div
        className="
          rounded-2xl
          border
          border-[#E0B85C]/20
          bg-[#FBF7EF]/95
          p-3
          shadow-[0_15px_45px_-25px_rgba(74,21,37,0.55)]
          dark:bg-[#211117]/95
        "
      >
        <div
          className="
            h-6
            w-6
            animate-spin
            rounded-full
            border-2
            border-[#E0B85C]/20
            border-t-[#4A1525]
            dark:border-t-[#E0B85C]
          "
        />
      </div>
    </div>
  );
}

/**
 * =========================================================
 * App Content
 * =========================================================
 */

function AppContent() {
  const {
    user,
  } = useAuth();

  useEffect(() => {
    void registerPushNotifications();
  }, []);

  return (
    <>
      <ThemeController />

      <ImageProtectionController />

      <ViewportProtectionController />

      <OfflineIndicator />

      <NotificationListener
        {...(user?.id
          ? { currentUserId: user.id }
          : {})}
      />

      <Outlet />

      <CartDrawer />

      <SupportChat />

      <PermissionPrompt />

      <GlobalFetchingLoader />

      <Toaster
        position="top-center"
      />
    </>
  );
}

/**
 * =========================================================
 * Root Component
 * =========================================================
 */

function RootComponent() {
  const context =
    Route.useRouteContext();

  const queryClient =
    context?.queryClient ??
    defaultQueryClient;

  /**
   * تسجيل Service Worker.
   */

  useEffect(() => {
    if (
      !(
        "serviceWorker" in
        navigator
      )
    ) {
      return;
    }

    const register =
      () => {
        void navigator.serviceWorker
          .register(
            "/sw.js",
            {
              scope: "/",
            },
          )
          .then(
            (
              registration,
            ) => {
              console.log(
                "Shehara Service Worker active:",
                registration.scope,
              );

              void registerPushNotifications();
            },
          )
          .catch(
            (
              error,
            ) => {
              console.error(
                "Shehara Service Worker registration failed:",
                error,
              );
            },
          );
      };

    if (
      document.readyState ===
      "complete"
    ) {
      register();
    } else {
      window.addEventListener(
        "load",
        register,
        {
          once:
            true,
        },
      );
    }

    return () => {
      window.removeEventListener(
        "load",
        register,
      );
    };
  }, []);

  return (
    <QueryClientProvider
      client={
        queryClient
      }
    >
      <AuthProvider>
        <CurrencyProvider>
          <WishlistProvider>
            <CartProvider>
              <AppSplash
                duration={
                  2200
                }
              />

              <AppContent />
            </CartProvider>
          </WishlistProvider>
        </CurrencyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
