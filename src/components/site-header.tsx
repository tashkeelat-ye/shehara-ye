import { Link } from "@tanstack/react-router";
import { Moon, Search, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { NotificationBell } from "@/components/notification-bell";
import { ProductSearch } from "@/components/product-search";
import { SideMenu } from "@/components/side-menu";

const THEME_STORAGE_KEY = "shehara-theme";

export function SiteHeader() {
  const [darkMode, setDarkMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);

      if (saved === "dark" || saved === "light") {
        document.documentElement.classList.toggle("dark", saved === "dark");
        document.documentElement.style.colorScheme = saved;
        document.documentElement.dataset.theme = saved;
        setDarkMode(saved === "dark");
        return;
      }
    } catch {
      // قد لا يكون التخزين المحلي متاحًا في بعض البيئات.
    }

    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }

      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    const theme = next ? "dark" : "light";

    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = theme;
    document.documentElement.dataset.theme = theme;
    setDarkMode(next);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // يستمر تغيير المظهر حتى إذا تعذر حفظ التفضيل.
    }
  };

  return (
    <>
      <header
        dir="rtl"
        className="
          fixed inset-x-0 top-0 z-[100] w-full
          border-b border-[color:var(--border)]/70
          bg-[color:var(--background)]/95
          shadow-[0_8px_24px_-24px_rgba(14,77,100,.65)]
          backdrop-blur-xl
          supports-[backdrop-filter]:bg-[color:var(--background)]/90
        "
      >
        <div className="pt-[env(safe-area-inset-top)]">
          <div
            className="
              mx-auto grid w-full max-w-7xl
              grid-cols-[minmax(0,1fr)_auto]
              grid-rows-[52px_40px]
              items-center gap-x-2 gap-y-1
              px-3 py-1
              sm:px-5
              lg:h-[70px] lg:grid-cols-[minmax(0,1fr)_minmax(280px,560px)_minmax(0,1fr)]
              lg:grid-rows-1 lg:gap-4 lg:px-8 lg:py-0
            "
          >
            <div
              className="
                col-start-1 row-start-1
                flex min-w-0 items-center justify-start gap-2
                lg:col-start-1 lg:row-start-1 lg:gap-3
              "
            >
              <SideMenu />

              <Link
                to="/"
                aria-label="شهارة - الصفحة الرئيسية"
                className="
                  flex min-w-0 items-center gap-2 rounded-xl outline-none
                  focus-visible:ring-2 focus-visible:ring-[#D65A31]/60
                "
              >
                <span
                  className="
                    grid h-9 w-9 shrink-0 place-items-center overflow-hidden
                    rounded-xl border border-[#0E4D64]/10 bg-white shadow-sm
                    sm:h-10 sm:w-10 lg:h-11 lg:w-11
                  "
                >
                  <BrandLogo
                    variant="header"
                    size={40}
                    priority
                    className="h-full w-full"
                  />
                </span>

                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-black leading-5 text-[#0E4D64] dark:text-[#E4F1F4] sm:text-base">
                    شهارة
                  </span>
                  <span
                    dir="ltr"
                    className="truncate text-[9px] font-extrabold tracking-[0.13em] text-[#D65A31] sm:text-[10px]"
                  >
                    SHEHARA
                  </span>
                  <span className="hidden text-[10px] font-medium leading-4 text-[color:var(--muted-foreground)] sm:block">
                    تسوّق بلا حدود
                  </span>
                </span>
              </Link>
            </div>

            <button
              ref={searchRef}
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="البحث عن المنتجات"
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              className="
                col-span-2 col-start-1 row-start-2
                flex h-10 min-w-0 w-full items-center gap-2.5
                overflow-hidden rounded-xl border border-[color:var(--border)]/80
                bg-[color:var(--card)] px-3.5 text-start
                transition-colors hover:border-[#0E4D64]/30
                active:scale-[.99] focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-[#D65A31]/40
                lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:h-11
              "
            >
              <Search
                aria-hidden="true"
                className="h-[18px] w-[18px] shrink-0 text-[#0E4D64] dark:text-[#DDECF0]"
                strokeWidth={2.15}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[color:var(--muted-foreground)] sm:text-sm">
                ابحث عن المنتجات...
              </span>
              <span
                dir="ltr"
                className="
                  hidden shrink-0 rounded-lg border border-[color:var(--border)]
                  px-1.5 py-0.5 text-[10px] font-semibold
                  text-[color:var(--muted-foreground)] lg:inline-flex
                "
              >
                Ctrl K
              </span>
            </button>

            <div
              className="
                col-start-2 row-start-1 flex items-center justify-end gap-1
                lg:col-start-3 lg:row-start-1
              "
            >
              <NotificationBell />

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={darkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
                title={darkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
                className="
                  hidden h-10 w-10 shrink-0 place-items-center rounded-xl
                  text-[#0E4D64] transition-colors hover:bg-[#0E4D64]/[.07]
                  hover:text-[#D65A31] active:scale-95 dark:text-[#DDECF0] lg:grid
                "
              >
                {darkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Keep page content clear of the fixed header on mobile and desktop. */}
      <div
        aria-hidden="true"
        className="h-[104px] sm:h-[108px] lg:h-[calc(70px+env(safe-area-inset-top))]"
      />

      <ProductSearch
        open={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          searchRef.current?.focus();
        }}
      />
    </>
  );
}

export default SiteHeader;
