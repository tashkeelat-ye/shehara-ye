import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { BrandLogo } from "@/components/brand-logo";
import { STORE_TAGLINE } from "@/lib/logo";
import { SideMenu } from "@/components/side-menu";
import { NotificationBell } from "@/components/notification-bell";
import { CurrencySwitcher } from "@/lib/currency-context";
import { AnnouncementBar } from "@/components/announcement-bar";

export function SiteHeader() {
  const { count, setDrawerOpen } = useCart();
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <AnnouncementBar />
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* الشعار واسم المتجر */}
          <Link to="/" className="flex min-w-0 items-center gap-2 group">
            <BrandLogo size={36} className="shrink-0 sm:w-[40px] sm:h-[40px]" />
            <div className="min-w-0">
              <p className="truncate text-base sm:text-lg font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
                تشكيلات
              </p>
              <p className="truncate text-[10px] sm:text-[11px] text-muted-foreground">
                {STORE_TAGLINE}
              </p>
            </div>
          </Link>

          {/* أزرار الإجراءات السريعة */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <CurrencySwitcher className="hidden sm:inline-flex" />
            <NotificationBell />
            
            <Link
              to="/account"
              aria-label="حسابي"
              className="hidden h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent active:scale-95 sm:grid"
            >
              <User className="h-5 w-5" />
            </Link>

            <button
              type="button"
              aria-label="سلة التسوق"
              onClick={() => setDrawerOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent active:scale-95"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs">
                  {count.toLocaleString("ar-EG")}
                </span>
              ) : null}
            </button>

            <SideMenu />
          </div>
        </div>

        {/* حقل البحث */}
        <form
          className="relative mt-2.5 sm:mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ to: "/products", search: { q: term || undefined } });
          }}
        >
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="ابحث عن منتج، ماركة، أو فئة..."
            aria-label="البحث في المتجر"
            enterKeyHint="search"
            autoComplete="off"
            className="h-10 sm:h-11 w-full rounded-2xl border border-border bg-secondary/60 ps-10 pe-4 text-xs sm:text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/80 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20"
          />
        </form>
      </div>
    </header>
  );
}
