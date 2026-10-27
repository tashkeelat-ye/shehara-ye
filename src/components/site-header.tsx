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
      // تجاهل أخطاء التخزين المحلي
    }
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
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
      // تجاهل
    }
  };

  return (
    <>
      <header
        dir="rtl"
        className="fixed inset-x-0 top-0 z-[100] w-full border-b border-[#0E4D64]/10 bg-[color:var(--background)]/90 backdrop-blur-xl shadow-sm supports-[backdrop-filter]:bg-[color:var(--background)]/85 dark:border-white/10"
      >
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-[62px] w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
            
            {/* الشعار والقائمة الجانبية */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <SideMenu />
              <Link
                to="/"
                aria-label="شهارة - الرئيسية"
                className="flex items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#0E4D64]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#0E4D64]/10 bg-white shadow-sm p-0.5">
                  <BrandLogo variant="header" size={38} priority className="h-full w-full object-contain" />
                </span>
                <div className="flex flex-col">
                  <span className="text-base font-black leading-none text-[#0E4D64] dark:text-[#E4F1F4]">
                    شهارة
                  </span>
                  <span dir="ltr" className="text-[9px] font-extrabold tracking-widest text-[#D65A31]">
                    SHEHARA
                  </span>
                </div>
              </Link>
            </div>

            {/* شريط البحث الفوري التفاعلي */}
            <button
              ref={searchRef}
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="البحث عن المنتجات"
              className="flex h-10 flex-1 max-w-md items-center gap-2.5 rounded-xl border border-[#0E4D64]/15 bg-[#EBF2F5]/60 px-3.5 text-start transition-all hover:border-[#0E4D64]/40 hover:bg-[#EBF2F5] active:scale-[0.99] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <Search className="h-4 w-4 shrink-0 text-[#0E4D64] dark:text-[#D65A31]" strokeWidth={2.3} />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
                ابحث عن منتج أو متجر...
              </span>
              <span dir="ltr" className="hidden shrink-0 rounded-md border border-[#0E4D64]/15 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-flex">
                Ctrl K
              </span>
            </button>

            {/* الإجراءات: التنبيهات والوضع الليلي */}
            <div className="flex shrink-0 items-center gap-1">
              <NotificationBell />
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={darkMode ? "الوضع الفاتح" : "الوضع الداكن"}
                className="grid h-9 w-9 place-items-center rounded-xl text-[#0E4D64] transition-colors hover:bg-[#0E4D64]/10 hover:text-[#D65A31] active:scale-95 dark:text-white/80 dark:hover:bg-white/10"
              >
                {darkMode ? <Sun className="h-4 w-4 text-[#D65A31]" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* مساحة تعويضية للهيدر الثابت */}
      <div aria-hidden="true" className="h-[calc(62px+env(safe-area-inset-top))]" />

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
