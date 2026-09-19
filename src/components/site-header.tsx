import { Search, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SideMenu } from "@/components/side-menu";
import { NotificationBell } from "@/components/notification-bell";
import { ProductSearch } from "@/components/product-search";

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
    } catch {}

    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (
        event.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;

    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    document.documentElement.dataset.theme = next ? "dark" : "light";
    setDarkMode(next);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {}
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[100] w-full border-b border-[color:var(--border)]/70 bg-[color:var(--background)]/94 shadow-[0_10px_30px_-26px_rgba(14,77,100,.8)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[color:var(--background)]/82">
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="relative mx-auto flex h-[62px] w-full max-w-7xl items-center px-3 sm:h-[66px] sm:px-5 lg:px-8">
            {/* أدوات الجهة اليمنى */}
            <div className="flex shrink-0 items-center gap-1">
              <SideMenu />
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={darkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
                className="grid h-10 w-10 place-items-center rounded-2xl text-[#0E4D64] transition-all hover:bg-[#0E4D64]/[.07] hover:text-[#D65A31] active:scale-90 dark:text-[#DDECF0]"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>

            {/* شريط البحث في المنتصف
                left-1/2 مهم هنا لأن start-1/2 مع RTL كان يزيح الشريط خارج الشاشة. */}
            <button
              ref={searchRef}
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="البحث عن المنتجات"
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              className="absolute left-1/2 top-1/2 flex h-10 w-[calc(100%-168px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 overflow-hidden rounded-2xl border border-[color:var(--border)]/80 bg-[color:var(--card)]/90 px-3.5 text-start shadow-[0_8px_24px_-20px_rgba(14,77,100,.7)] transition-all hover:border-[#0E4D64]/20 hover:bg-[color:var(--card)] hover:shadow-[0_10px_28px_-18px_rgba(14,77,100,.24)] active:scale-[.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4D64]/25 sm:h-11 sm:px-4"
            >
              <Search
                className="h-[18px] w-[18px] shrink-0 text-[#0E4D64] dark:text-[#DDECF0]"
                strokeWidth={2.15}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[color:var(--muted-foreground)] sm:text-sm">
                ابحث عن المنتجات...
              </span>
              <span
                className="hidden shrink-0 rounded-lg border border-[color:var(--border)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--muted-foreground)] sm:inline-flex"
                dir="ltr"
              >
                Ctrl K
              </span>
            </button>

            {/* الإشعارات في أقصى الجهة اليسرى */}
            <div className="ms-auto flex shrink-0 items-center">
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>

      <div aria-hidden="true" className="h-[calc(66px+env(safe-area-inset-top))]" />

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
