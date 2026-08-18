import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Moon,
  Search,
  ShoppingCart,
  Sun,
  User,
  X,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { BrandLogo } from "@/components/brand-logo";
import { STORE_TAGLINE } from "@/lib/logo";
import { SideMenu } from "@/components/side-menu";
import { NotificationBell } from "@/components/notification-bell";
import { CurrencySwitcher } from "@/lib/currency-context";
import { AnnouncementBar } from "@/components/announcement-bar";

const THEME_STORAGE_KEY = "tashkilat-theme";

export function SiteHeader() {
  const { count, setDrawerOpen } = useCart();
  const [term, setTerm] = useState("");
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const root = document.documentElement;

    const current =
      root.classList.contains("dark");

    setIsDark(current);
  }, []);

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";

    document.documentElement.classList.toggle(
      "dark",
      nextTheme === "dark",
    );

    document.documentElement.style.colorScheme =
      nextTheme;

    localStorage.setItem(
      THEME_STORAGE_KEY,
      nextTheme,
    );

    setIsDark(nextTheme === "dark");
  }

  function clearSearch() {
    setTerm("");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-card/85">
      <AnnouncementBar />

      <div className="mx-auto w-full max-w-6xl px-3 pb-2.5 pt-2 sm:px-4 sm:py-3">
        <div className="flex min-h-10 items-center justify-between gap-2 sm:min-h-11 sm:gap-3">
          <Link
            to="/"
            aria-label="العودة إلى الصفحة الرئيسية"
            className="group flex min-w-0 items-center gap-2 rounded-xl outline-none transition-opacity active:opacity-70 focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <BrandLogo
              size={36}
              className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
            />

            <div className="min-w-0">
              <p className="truncate text-[15px] font-extrabold leading-tight text-foreground transition-colors group-hover:text-primary sm:text-lg">
                تشكيلات
              </p>

              <p className="hidden truncate text-[10px] leading-tight text-muted-foreground sm:block sm:text-[11px]">
                {STORE_TAGLINE}
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <CurrencySwitcher className="hidden sm:inline-flex" />

            <NotificationBell />

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                isDark
                  ? "تفعيل الوضع النهاري"
                  : "تفعيل الوضع الليلي"
              }
              title={
                isDark
                  ? "الوضع النهاري"
                  : "الوضع الليلي"
              }
              className="grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {isDark ? (
                <Sun
                  aria-hidden="true"
                  className="h-[19px] w-[19px]"
                  strokeWidth={2}
                />
              ) : (
                <Moon
                  aria-hidden="true"
                  className="h-[19px] w-[19px]"
                  strokeWidth={2}
                />
              )}
            </button>

            <Link
              to="/account"
              aria-label="حسابي"
              className="grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <User
                className="h-[19px] w-[19px]"
                strokeWidth={2}
              />
            </Link>

            <button
              type="button"
              aria-label="فتح سلة التسوق"
              onClick={() => setDrawerOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <ShoppingCart
                className="h-[19px] w-[19px]"
                strokeWidth={2}
              />

              {count > 0 ? (
                <span
                  aria-label={`${count.toLocaleString("ar-EG")} منتجات في السلة`}
                  className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[9px] font-extrabold leading-none text-primary-foreground shadow-sm ring-2 ring-card"
                >
                  {count > 99
                    ? "99+"
                    : count.toLocaleString("ar-EG")}
                </span>
              ) : null}
            </button>

            <SideMenu />
          </div>
        </div>

        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();

            const query = term.trim();

            void navigate({
              to: "/products",
              search: {
                q: query || undefined,
              },
            });
          }}
          className="mt-2.5 sm:mt-3"
        >
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
            />

            <input
              type="search"
              inputMode="search"
              value={term}
              onChange={(event) =>
                setTerm(event.target.value)
              }
              placeholder="ابحث عن منتج أو ماركة أو فئة..."
              aria-label="البحث في متجر تشكيلات"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-full rounded-2xl border border-border/80 bg-secondary/55 ps-10 pe-10 text-[13px] text-foreground outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-muted-foreground/75 focus:border-primary/60 focus:bg-background focus:ring-2 focus:ring-primary/15 sm:h-11 sm:text-sm"
            />

            {term.length > 0 ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="مسح البحث"
                className="absolute end-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X
                  aria-hidden="true"
                  className="h-4 w-4"
                  strokeWidth={2}
                />
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </header>
  );
}
