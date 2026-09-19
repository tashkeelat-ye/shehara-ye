import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Moon,
  Search,
  ShoppingCart,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { SideMenu } from "@/components/side-menu";
import { NotificationBell } from "@/components/notification-bell";
import { BrandLogo } from "@/components/brand-logo";
import { useCart } from "@/lib/cart-context";

const THEME_STORAGE_KEY = "shehara-theme";

export function SiteHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { count, setDrawerOpen } = useCart();

  const [darkMode, setDarkMode] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isHome = location.pathname === "/";

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
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    document.documentElement.dataset.theme = next ? "dark" : "light";
    setDarkMode(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {}
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchValue.trim();

    void navigate(
      query
        ? { to: "/products", search: { q: query } }
        : { to: "/products" },
    );
  };

  return (
    <>
      <header
        className="
          fixed inset-x-0 top-0 z-[100] w-full
          border-b border-[color:var(--border)]/70
          bg-[color:var(--background)]/94
          shadow-[0_10px_30px_-26px_rgba(14,77,100,0.8)]
          backdrop-blur-2xl
          supports-[backdrop-filter]:bg-[color:var(--background)]/82
        "
      >
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="relative mx-auto flex h-[62px] w-full max-w-7xl items-center justify-between px-3 sm:h-[66px] sm:px-5 lg:px-8">
            <div className="flex items-center gap-1">
              <SideMenu />

              <button
                type="button"
                aria-label={darkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
                onClick={toggleDarkMode}
                className="
                  grid h-10 w-10 place-items-center rounded-2xl
                  text-[#0E4D64] transition-all hover:bg-[#0E4D64]/[0.07]
                  hover:text-[#D65A31] active:scale-90 dark:text-[#DDECF0]
                "
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>

            <Link
              to="/"
              aria-label="شهارة - تسوق بلا حدود"
              className="
                absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                rounded-2xl p-1.5 transition-transform hover:scale-[1.03] active:scale-95
              "
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#0E4D64]/[0.06] bg-white shadow-[0_10px_28px_-22px_rgba(14,77,100,0.8)] dark:border-white/[0.07] dark:bg-white/[0.04]">
                <BrandLogo size={46} className="h-10 w-10 sm:h-11 sm:w-11" priority />
              </span>
            </Link>

            <div className="ms-auto flex items-center gap-1">
              <NotificationBell />

              <button
                type="button"
                aria-label={`السلة${count > 0 ? `، ${count} منتجات` : ""}`}
                onClick={() => setDrawerOpen(true)}
                className="
                  relative grid h-10 w-10 place-items-center rounded-2xl
                  text-[#0E4D64] transition-all hover:bg-[#0E4D64]/[0.07]
                  hover:text-[#D65A31] active:scale-90 dark:text-[#DDECF0]
                "
              >
                <ShoppingCart className="h-5 w-5" strokeWidth={2.1} />
                {count > 0 ? (
                  <span className="absolute end-0 top-0 grid min-h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-[color:var(--background)] bg-[#D65A31] px-1 text-[8px] font-black text-white">
                    {count > 99 ? "99+" : count.toLocaleString("ar-EG")}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          {isHome ? (
            <div className="px-3 pb-2.5 sm:px-5 sm:pb-3 lg:px-8">
              <form onSubmit={handleSearch} role="search" className="mx-auto w-full max-w-5xl">
                <div className="group relative flex h-[50px] items-center overflow-hidden rounded-[1.35rem] border border-[#0E4D64]/[0.08] bg-[#F5F8F9] shadow-[0_12px_30px_-26px_rgba(14,77,100,0.8)] transition-all focus-within:border-[#0E4D64]/25 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0E4D64]/[0.05] dark:border-white/[0.08] dark:bg-white/[0.045] dark:focus-within:bg-white/[0.07]">
                  <Search className="pointer-events-none absolute start-4 h-5 w-5 text-[#0E4D64] group-focus-within:text-[#D65A31] dark:text-[#86B8C5]" />
                  <input
                    ref={inputRef}
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    type="search"
                    placeholder="ابحث عن منتج، عسل، بن، عطور، إلكترونيات..."
                    aria-label="البحث عن المنتجات"
                    autoComplete="off"
                    enterKeyHint="search"
                    className="h-full w-full border-0 bg-transparent pe-12 ps-12 text-[13px] font-bold text-foreground outline-none placeholder:text-muted-foreground/75 sm:text-sm"
                  />

                  {searchValue ? (
                    <button
                      type="button"
                      aria-label="مسح البحث"
                      onClick={() => {
                        setSearchValue("");
                        inputRef.current?.focus();
                      }}
                      className="me-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-[#0E4D64]/[0.06]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <kbd className="me-2 hidden shrink-0 rounded-lg border border-border/60 bg-background/70 px-2 py-1 text-[9px] font-bold text-muted-foreground sm:block">
                      /
                    </kbd>
                  )}
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </header>

      <div
        aria-hidden="true"
        className={isHome
          ? "h-[calc(128px+env(safe-area-inset-top))] sm:h-[calc(132px+env(safe-area-inset-top))]"
          : "h-[calc(66px+env(safe-area-inset-top))]"}
      />
    </>
  );
}

export default SiteHeader;
