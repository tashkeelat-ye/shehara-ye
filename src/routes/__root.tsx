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
import { reportLovableError } from "../lib/lovable-error-reporting";
import {
  AuthProvider,
  useAuth,
} from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { CartDrawer } from "@/components/cart-drawer";
import { CurrencyProvider } from "@/lib/currency-context";
import { Toaster } from "@/components/ui/sonner";
import { SupportChat } from "@/components/support-chat";
import { PermissionPrompt } from "@/components/permission-prompt";
import { NotificationListener } from "@/components/NotificationListener";
import { OfflineIndicator } from "@/components/offline-indicator";
import { AppSplash } from "@/components/app-splash";
import { registerPushNotifications } from "@/lib/push";

export const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
    },
  },
});

const THEME_STORAGE_KEY = "tashkilat-theme";

function getInitialThemeScript() {
  return `
    (function () {
      try {
        var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
        var theme = stored === "dark" || stored === "light"
          ? stored
          : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.style.colorScheme = theme;
      } catch (_) {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      }
    })();
  `;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">
          404
        </h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">
          الصفحة غير موجودة
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            العودة للرئيسية
          </Link>
        </div>
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

  console.error(error);

  useEffect(() => {
    reportLovableError(error, {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          تعذّر تحميل الصفحة
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          حدث خطأ غير متوقع. يمكنك المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            المحاولة مرة أخرى
          </button>

          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
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
        title: "تشكيلات | متجر يمني إلكتروني",
      },
      {
        name: "description",
        content:
          "تشكيلات — كل ما تحتاجه بتشكيلة واحدة. متجر إلكتروني يمني.",
      },
      {
        name: "theme-color",
        content: "#4a1525",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      {
        name: "format-detection",
        content: "telephone=no",
      },
      {
        property: "og:title",
        content: "تشكيلات | متجر يمني إلكتروني",
      },
      {
        property: "og:description",
        content:
          "تشكيلات — كل ما تحتاجه بتشكيلة واحدة.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
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
          "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap",
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
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
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
      className="tashkilat-app"
    >
      <head>
        <HeadContent />

        <script
          dangerouslySetInnerHTML={{
            __html: getInitialThemeScript(),
          }}
        />
      </head>

      <body
        className="tashkilat-brand-background"
        onContextMenu={(event) => {
          const target = event.target as HTMLElement | null;

          if (
            target?.closest(
              "img, .protected-image, [data-protected-image='true']",
            )
          ) {
            event.preventDefault();
          }
        }}
        onDragStart={(event) => {
          const target = event.target as HTMLElement | null;

          if (
            target?.closest(
              "img, .protected-image, [data-protected-image='true']",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        {children}

        <Scripts />
      </body>
    </html>
  );
}

function ThemeController() {
  useEffect(() => {
    const root = document.documentElement;

    function applyTheme(theme: "dark" | "light") {
      root.classList.toggle("dark", theme === "dark");
      root.style.colorScheme = theme;
    }

    try {
      const stored = localStorage.getItem(
        THEME_STORAGE_KEY,
      );

      if (stored === "dark" || stored === "light") {
        applyTheme(stored);
        return;
      }

      const mediaQuery = window.matchMedia(
        "(prefers-color-scheme: dark)",
      );

      applyTheme(
        mediaQuery.matches
          ? "dark"
          : "light",
      );

      const handleSystemThemeChange = (
        event: MediaQueryListEvent,
      ) => {
        const currentStored =
          localStorage.getItem(
            THEME_STORAGE_KEY,
          );

        if (
          currentStored !== "dark" &&
          currentStored !== "light"
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
      applyTheme("light");
    }
  }, []);

  return null;
}

function ImageProtectionController() {
  useEffect(() => {
    const handleContextMenu = (
      event: MouseEvent,
    ) => {
      const target = event.target as HTMLElement | null;

      if (
        target?.closest(
          "img, .protected-image, [data-protected-image='true']",
        )
      ) {
        event.preventDefault();
      }
    };

    const handleDragStart = (
      event: DragEvent,
    ) => {
      const target = event.target as HTMLElement | null;

      if (
        target?.closest(
          "img, .protected-image, [data-protected-image='true']",
        )
      ) {
        event.preventDefault();
      }
    };

    const handleTouchStart = (
      event: TouchEvent,
    ) => {
      const target = event.target as HTMLElement | null;

      if (
        target?.closest(
          "img, .protected-image, [data-protected-image='true']",
        )
      ) {
        target.classList.add(
          "image-touch-protected",
        );
      }
    };

    const handleTouchEnd = (
      event: TouchEvent,
    ) => {
      const target = event.target as HTMLElement | null;

      if (
        target?.closest(
          "img, .protected-image, [data-protected-image='true']",
        )
      ) {
        target.classList.remove(
          "image-touch-protected",
        );
      }
    };

    document.addEventListener(
      "contextmenu",
      handleContextMenu,
      {
        capture: true,
      },
    );

    document.addEventListener(
      "dragstart",
      handleDragStart,
      {
        capture: true,
      },
    );

    document.addEventListener(
      "touchstart",
      handleTouchStart,
      {
        passive: true,
        capture: true,
      },
    );

    document.addEventListener(
      "touchend",
      handleTouchEnd,
      {
        passive: true,
        capture: true,
      },
    );

    return () => {
      document.removeEventListener(
        "contextmenu",
        handleContextMenu,
        {
          capture: true,
        },
      );

      document.removeEventListener(
        "dragstart",
        handleDragStart,
        {
          capture: true,
        },
      );

      document.removeEventListener(
        "touchstart",
        handleTouchStart,
        {
          capture: true,
        },
      );

      document.removeEventListener(
        "touchend",
        handleTouchEnd,
        {
          capture: true,
        },
      );
    };
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
      if (event.touches.length > 1) {
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
  const isFetching = useIsFetching();

  if (
    isFetching === 0 ||
    (typeof navigator !== "undefined" &&
      !navigator.onLine)
  ) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9990] flex items-center justify-center bg-black/10 backdrop-blur-[1px]"
      aria-hidden="true"
    >
      <div className="rounded-full border border-border/70 bg-card/95 p-3 shadow-lg">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();

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
        currentUserId={user?.id}
      />

      <Outlet />

      <CartDrawer />

      <SupportChat />

      <PermissionPrompt />

      <GlobalFetchingLoader />

      <Toaster position="top-center" />
    </>
  );
}

function RootComponent() {
  const context = Route.useRouteContext();

  const queryClient =
    context?.queryClient ??
    defaultQueryClient;

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      void navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
        })
        .then((registration) => {
          console.log(
            "Tashkilat Service Worker active:",
            registration.scope,
          );

          void registerPushNotifications();
        })
        .catch((error) => {
          console.error(
            "Tashkilat Service Worker registration failed:",
            error,
          );
        });
    };

    if (
      document.readyState === "complete"
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
  }, []);

  return (
    <QueryClientProvider
      client={queryClient}
    >
      <AuthProvider>
        <CurrencyProvider>
          <WishlistProvider>
            <CartProvider>
              <AppSplash duration={2200} />

              <AppContent />
            </CartProvider>
          </WishlistProvider>
        </CurrencyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
