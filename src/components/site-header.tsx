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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/95 backdrop-blur">
      <AnnouncementBar />
      <div className="mx-auto w-full max-w-6xl px-4 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <BrandLogo size={40} />
            <div className="min-w-0">
              <p className="truncate text-lg leading-tight text-foreground">تشكيلات</p>
              <p className="truncate text-[11px] text-muted-foreground">{STORE_TAGLINE}</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <CurrencySwitcher className="hidden sm:inline-flex" />
            <NotificationBell />
            <Link
              to="/account"
              aria-label="حسابي"
              className="hidden h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent sm:grid"
            >
              <User className="h-5 w-5" />
            </Link>
            <button
              type="button"
              aria-label="سلة التسوق"
              onClick={() => setDrawerOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-accent"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 ? (
                <span className="absolute -top-0.5 left-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent-solid px-1 text-[11px] text-accent-solid-foreground">
                  {count.toLocaleString("ar-EG")}
                </span>
              ) : null}
            </button>
            <SideMenu />
          </div>
        </div>



        <form
          className="relative mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ to: "/products", search: { q: term || undefined } });
          }}
        >
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="ابحث عن منتج، ماركة، أو فئة..."
            aria-label="البحث في المتجر"
            className="h-11 w-full rounded-2xl border border-border bg-secondary pe-10 ps-4 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
        </form>
      </div>
    </header>
  );
}
