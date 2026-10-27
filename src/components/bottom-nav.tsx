import { useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Grid2X2, Home, ShoppingBag, Sparkles, User } from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { OffersDialog } from "@/components/offers-dialog";

type NavItemProps = {
  active: boolean;
  label: string;
  badge?: number | string | null;
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
};

function NavItem({
  active,
  label,
  badge,
  children,
  onClick,
  ariaLabel,
}: NavItemProps) {
  const content = (
    <>
      <span
        className={`relative grid h-8 w-11 place-items-center rounded-xl transition-all duration-300 ${
          active
            ? "bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-[#D65A31]/20 dark:text-[#D65A31]"
            : "text-muted-foreground group-hover:text-[#0E4D64] dark:group-hover:text-white"
        }`}
      >
        {children}
        {badge ? (
          <span className="absolute -end-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[color:var(--background)] bg-[#D65A31] px-1 text-[9px] font-black leading-none text-white shadow-sm animate-in zoom-in-75 duration-200">
            {badge}
          </span>
        ) : null}
      </span>
      <span
        className={`max-w-full truncate text-[11px] leading-tight transition-colors duration-200 ${
          active
            ? "font-black text-[#0E4D64] dark:text-[#D65A31]"
            : "font-semibold text-muted-foreground/80"
        }`}
      >
        {label}
      </span>
      {active && (
        <span
          aria-hidden="true"
          className="absolute bottom-1 h-1 w-4 rounded-full bg-[#D65A31] transition-all duration-300"
        />
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={ariaLabel ?? label}
        aria-pressed={active}
        onClick={onClick}
        className="group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 text-center outline-none transition-transform duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#0E4D64] rounded-lg"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 text-center">
      {content}
    </div>
  );
}

export function BottomNav() {
  const location = useLocation();
  const { count, drawerOpen, setDrawerOpen } = useCart();
  const [offersOpen, setOffersOpen] = useState(false);

  const pathname = location.pathname;
  const isHome = pathname === "/";
  const isCategories = pathname.startsWith("/products");
  const isAccount = pathname.startsWith("/account");
  const isCart = drawerOpen;

  return (
    <>
      <nav
        dir="rtl"
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-[90] w-full md:hidden"
      >
        <div className="mx-auto w-full max-w-lg px-2 pb-[max(6px,env(safe-area-inset-bottom))]">
          {/* شريط الملاحة العصري بتأثير زجاجي وتصميم Native PWA */}
          <div className="relative flex h-[68px] items-center justify-between rounded-2xl border border-[#0E4D64]/10 bg-[color:var(--background)]/90 px-1 shadow-[0_-10px_35px_-15px_rgba(14,77,100,0.25)] backdrop-blur-xl supports-[backdrop-filter]:bg-[color:var(--background)]/85 dark:border-white/10 dark:shadow-[0_-10px_35px_-15px_rgba(0,0,0,0.6)]">
            
            {/* 1. الرئيسية */}
            <NavItem active={isHome} label="الرئيسية">
              <Link
                to="/"
                aria-current={isHome ? "page" : undefined}
                aria-label="الرئيسية"
                className="absolute inset-0 z-20 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#0E4D64]"
              />
              <Home className="h-5 w-5" strokeWidth={isHome ? 2.5 : 1.9} />
            </NavItem>

            {/* 2. الأقسام */}
            <NavItem active={isCategories} label="الأقسام">
              <Link
                to="/products"
                aria-current={isCategories ? "page" : undefined}
                aria-label="الأقسام"
                className="absolute inset-0 z-20 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#0E4D64]"
              />
              <Grid2X2 className="h-5 w-5" strokeWidth={isCategories ? 2.5 : 1.9} />
            </NavItem>

            {/* 3. العروض الحصرية (أيقونة مميزة) */}
            <NavItem
              active={offersOpen}
              label="العروض"
              ariaLabel="العروض الخاصة والتخفيضات"
              onClick={() => setOffersOpen(true)}
            >
              <Sparkles className="h-5 w-5 text-[#D65A31]" strokeWidth={offersOpen ? 2.5 : 2} />
            </NavItem>

            {/* 4. السلة مع شارة العدد الفورية */}
            <NavItem
              active={isCart}
              label="السلة"
              badge={count > 0 ? (count > 99 ? "99+" : count.toLocaleString("ar-EG")) : null}
              ariaLabel={`سلة المشتريات${count > 0 ? `، ${count} منتجات` : ""}`}
              onClick={() => setDrawerOpen(true)}
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={isCart ? 2.5 : 1.9} />
            </NavItem>

            {/* 5. حسابي */}
            <NavItem active={isAccount} label="حسابي">
              <Link
                to="/account"
                aria-current={isAccount ? "page" : undefined}
                aria-label="حسابي"
                className="absolute inset-0 z-20 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#0E4D64]"
              />
              <User className="h-5 w-5" strokeWidth={isAccount ? 2.5 : 1.9} />
            </NavItem>

          </div>
        </div>
      </nav>

      {/* نافذة العروض الترويجية المنبثقة */}
      <OffersDialog open={offersOpen} onClose={() => setOffersOpen(false)} />
    </>
  );
}

export default BottomNav;
