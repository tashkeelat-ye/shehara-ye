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

const BRAND = {
  blue: "#0E4D64",
  blueDeep: "#0A3D50",
  orange: "#D65A31",
  orangeDeep: "#B74624",
  cream: "#FAF9F6",
  dark: "#071B24",
};

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
  "tashkilat-theme";

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

function NotFoundComponent() {
  return (
    <div
      className="
        flex
        min-h-screen
        items-center
        justify-center
        bg-[#FAF9F6]
        px-4
        dark:bg-[#071B24]
      "
    >
      <div
        className="
          w-full
          max-w-md
          rounded-3xl
          border
          border-[#0E4D64]/10
          bg-white
          p-8
          text-center
          shadow-[0_25px_70px_-35px_rgba(14,77,100,0.55)]
          dark:bg-card
        "
      >
        <div
          className="
            mx-auto
            grid
            h-20
            w-20
            place-items-center
            rounded-2xl
            bg-[#0E4D64]
            text-2xl
            font-extrabold
            text-white
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
          الصفحة التي تبحث عنها
          غير موجودة أو تم نقلها.
        </p>

        <Link
          to="/"
          className="
            mt-6
            inline-flex
            min-h-11
            items-center
            justify-center
            rounded-xl
            bg-[#D65A31]
            px-6
            text-sm
            font-bold
            text-white
            transition-all
            hover:bg-[#B74624]
            active:scale-95
          "
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, {
      boundary:
        "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <div
      className="
        flex
        min-h-screen
        items-center
        justify-center
        bg-[#FAF9F6]
        px-4
        dark:bg-[#071B24]
      "
    >
      <div
        className="
          w-full
          max-w-md
          rounded-3xl
          border
          border-[#0E4D64]/10
          bg-white
          p-7
          text-center
          shadow-[0_25px_70px_-35px_rgba(14,77,100,0.55)]
          dark:bg-card
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
            bg-[#D65A31]/10
            font-extrabold
            text-[#D65A31]
          "
        >
          !
        </div>

        <h1
          className="
            mt-5
            text-xl
            font-extrabold
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
          أو العودة إلى الصفحة
          الرئيسية.
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
              bg-[#0E4D64]
              px-5
              text-sm
              font-bold
              text-white
              transition-all
              hover:bg-[#0A3D50]
              active:scale-95
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
              border-[#0E4D64]/15
              bg-background
              px-5
              text-sm
              font-bold
              text-[#0E4D64]
              transition-all
              hover:bg-[#0E4D64]/5
              active:scale-95
            "
          >
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route =
  createRootRouteWithContext<{
    queryClient: QueryClient;
  }>()({
    head: () => ({
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover",
        },
        {
          title:
            "شهارة | تسوق بلا حدود",
        },
        {
          name: "description",
          content:
            "شهارة — متجر إلكتروني يمني حديث. تسوق بلا حدود.",
        },
        {
          name: "theme-color",
          content: BRAND.blue,
        },
        {
          name:
            "apple-mobile-web-app-capable",
          content: "yes",
        },
        {
          name:
            "mobile-web-app-capable",
          content: "yes",
        },
        {
          name:
            "apple-mobile-web-app-status-bar-style",
          content:
            "black-translucent",
        },
        {
          name: "format-detection",
          content: "telephone=no",
        },
        {
          property: "og:title",
          content:
            "شهارة | تسوق بلا حدود",
        },
        {
          property:
            "og:description",
          content:
            "شهارة — متجرك الإلكتروني اليمني.",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          name: "twitter:card",
          content:
            "summary_large_image",
        },
      ],

      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        {
          rel: "preconnect",
          href: "https://fonts.googleapis.com",
        },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href:
            "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap",
        },
        {
          rel: "icon",
          href: "/favicon.png",
          type: "image/png",
        },
        {
          rel: "apple-touch-icon",
          href: "/icon-192.png",
        },
        {
          rel: "manifest",
          href: "/manifest.webmanifest",
        },
      ],
    }),

    shellComponent: RootShell,

    component: RootComponent,

    notFoundComponent:
      NotFoundComponent,

    errorComponent:
      ErrorComponent,
  });

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
        tashkilat-app
        bg-[#FAF9F6]
        dark:bg-[#071B24]
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
          bg-[#FAF9F6]
          text-[#081D27]
          antialiased
          selection:bg-[#D65A31]/20
          selection:text-[#0A3D50]
          dark:bg-[#071B24]
          dark:text-[#F5FAFC]
        "
      >
        <div
          className="
            relative
            min-h-screen
            overflow-x-hidden
          "
        >
          {children}
        </div>

        <Scripts />
      </body>
    </html>
  );
}

function ThemeController() {
  useEffect(() => {
    const root =
      document.documentElement;

    const applyTheme = (
      theme: "dark" | "light",
    ) => {
      root.classList.toggle(
        "dark",
        theme === "dark",
      );

      root.style.colorScheme =
        theme;

      root.dataset.theme =
        theme;
    };

    try {
      const stored =
        localStorage.getItem(
          THEME_STORAGE_KEY,
        );

      if (
        stored === "dark" ||
        stored === "light"
      ) {
        applyTheme(stored);
        return;
      }

      const media =
        window.matchMedia(
          "(prefers-color-scheme: dark)",
        );

      applyTheme(
        media.matches
          ? "dark"
          : "light",
      );

      const listener = (
        event: MediaQueryListEvent,
      ) => {
        const current =
          localStorage.getItem(
            THEME_STORAGE_KEY,
          );

        if (
          current !== "dark" &&
          current !== "light"
        ) {
          applyTheme(
            event.matches
              ? "dark"
              : "light",
          );
        }
      };

      media.addEventListener(
        "change",
        listener,
      );

      return () =>
        media.removeEventListener(
          "change",
          listener,
        );
    } catch {
      applyTheme("light");
    }
  }, []);

  return null;
}

function ViewportProtectionController() {
  useEffect(() => {
    const preventGesture = (
      event: Event,
    ) => {
      event.preventDefault();
    };

    const preventCtrlWheelZoom = (
      event: WheelEvent,
    ) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };

    const preventMultiTouchZoom = (
      event: TouchEvent,
    ) => {
      if (
        event.touches.length > 1
      ) {
        event.preventDefault();
      }
    };

    document.addEventListener(
      "gesturestart",
      preventGesture,
      {
        passive: false,
      },
    );

    document.addEventListener(
      "gesturechange",
      preventGesture,
      {
        passive: false,
      },
    );

    document.addEventListener(
      "gestureend",
      preventGesture,
      {
        passive: false,
      },
    );

    document.addEventListener(
      "wheel",
      preventCtrlWheelZoom,
      {
        passive: false,
      },
    );

    document.addEventListener(
      "touchmove",
      preventMultiTouchZoom,
      {
        passive: false,
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
        bg-[#0E4D64]/[0.035]
        backdrop-blur-[1px]
      "
      aria-hidden="true"
    >
      <div
        className="
          rounded-2xl
          border
          border-[#D65A31]/20
          bg-[#FAF9F6]/95
          p-3
          shadow-[0_15px_45px_-25px_rgba(14,77,100,0.55)]
          dark:bg-[#0B2936]/95
        "
      >
        <div
          className="
            h-6
            w-6
            animate-spin
            rounded-full
            border-2
            border-[#D65A31]/20
            border-t-[#0E4D64]
            dark:border-t-[#D65A31]
          "
        />
      </div>
    </div>
  );
}

function AppContent() {
  const { user } =
    useAuth();

  useEffect(() => {
    void registerPushNotifications();
  }, []);

  return (
    <>
      <ThemeController />

      <ViewportProtectionController />

      <OfflineIndicator />

      <NotificationListener
        currentUserId={user?.id}
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

function RootComponent() {
  const context =
    Route.useRouteContext();

  const queryClient =
    context?.queryClient ??
    defaultQueryClient;

  useEffect(() => {
    if (
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const register = () => {
      void navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
        })
        .then(
          (registration) => {
            console.log(
              "Shehara Service Worker active:",
              registration.scope,
            );

            void registerPushNotifications();
          },
        )
        .catch((error) => {
          console.error(
            "Shehara Service Worker registration failed:",
            error,
          );
        });
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
          once: true,
        },
      );
    }

    return () =>
      window.removeEventListener(
        "load",
        register,
      );
  }, []);

  return (
    <QueryClientProvider
      client={queryClient}
    >
      <AuthProvider>
        <CurrencyProvider>
          <WishlistProvider>
            <CartProvider>
              <AppSplash
                duration={2200}
              />

              <AppContent />
            </CartProvider>
          </WishlistProvider>
        </CurrencyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
