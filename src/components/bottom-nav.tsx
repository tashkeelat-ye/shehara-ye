import { useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Grid2X2, Home, ShoppingCart, Tag, User } from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { OffersDialog } from "@/components/offers-dialog";

type NavItemProps = {
  active: boolean;
  label: string;
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
};

function NavItem({
  active,
  label,
  children,
  onClick,
  ariaLabel,
}: NavItemProps) {
  const content = (
    <>
      <span
        className={`relative grid h-9 w-12 place-items-center rounded-2xl transition-all duration-200 ${
          active
            ? "bg-[#0E4D64]/[0.10] text-[#0E4D64] dark:bg-white/[0.08] dark:text-[#D65A31]"
            : "text-muted-foreground group-hover:bg-[#0E4D64]/[0.055] group-hover:text-[#0E4D64] dark:group-hover:bg-white/[0.06] dark:group-hover:text-white"
        }`}
      >
        {children}
        {active ? (
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-[#D65A31]"
          />
        ) : null}
      </span>
      <span
        className={`max-w-full truncate leading-4 transition-colors ${
          active
            ? "font-black text-[#0E4D64] dark:text-[#D65A31]"
            : "font-bold text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={ariaLabel ?? label}
        aria-pressed={active}
        onClick={onClick}
        className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] outline-none transition-transform duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#0E4D64]"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px]">
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
        <div className="relative mx-auto w-full max-w-lg px-2 pb-[max(5px,env(safe-area-inset-bottom))]">
          {/* الخلفية مع فتحة دائرية انسيابية للزر الأوسط */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[76px] rounded-t-[1.8rem] border-t border-[#0E4D64]/[0.08] bg-[color:var(--background)]/96 shadow-[0_-18px_50px_-32px_rgba(14,77,100,0.65)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[color:var(--background)]/84 dark:border-white/[0.07]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D65A31]/55 to-transparent" />
            <div
              className="absolute left-1/2 top-[-31px] h-[78px] w-[78px] -translate-x-1/2 rounded-full bg-[color:var(--background)]"
            />
          </div>

          <div className="relative z-10 grid h-[82px] grid-cols-[1fr_1fr_82px_1fr_1fr] items-end">
            {/* الرئيسية — أقصى اليمين */}
            <NavItem active={isHome} label="الرئيسية">
              <Link
                to="/"
                aria-current={isHome ? "page" : undefined}
                aria-label="الرئيسية"
                className="absolute inset-0 z-20 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#0E4D64]"
              />
              <Home className="h-5 w-5" strokeWidth={isHome ? 2.6 : 2} />
            </NavItem>

            {/* السلة */}
            <NavItem
              active={isCart}
              label="السلة"
              ariaLabel={`سلة المشتريات${count > 0 ? `، ${count} منتجات` : ""}`}
              onClick={() => setDrawerOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={isCart ? 2.6 : 2} />
              {count > 0 ? (
                <span className="absolute -end-0.5 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[color:var(--background)] bg-[#D65A31] px-1 text-[8px] font-black leading-none text-white">
                  {count > 99 ? "99+" : count.toLocaleString("ar-EG")}
                </span>
              ) : null}
            </NavItem>

            {/* الأقسام: زر دائري عائم */}
            <div className="relative flex h-full items-end justify-center">
              <Link
                to="/products"
                aria-current={isCategories ? "page" : undefined}
                aria-label="الأقسام"
                className={`absolute bottom-[30px] z-30 grid h-[66px] w-[66px] place-items-center rounded-full border-[5px] border-[color:var(--background)] outline-none transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#D65A31] focus-visible:ring-offset-2 ${
                  isCategories
                    ? "bg-[#0E4D64] text-white shadow-[0_14px_34px_-10px_rgba(14,77,100,0.85)] dark:bg-[#D65A31]"
                    : "bg-[#0E4D64] text-white shadow-[0_14px_34px_-10px_rgba(14,77,100,0.72)] hover:-translate-y-0.5 dark:bg-[#D65A31]"
                }`}
              >
                <span className="absolute inset-[5px] rounded-full border border-white/20" />
                <Grid2X2 className="relative h-7 w-7" strokeWidth={2.15} />
                <span className="absolute -bottom-[25px] whitespace-nowrap text-[10px] font-black text-[#0E4D64] dark:text-[#D65A31]">
                  الأقسام
                </span>
              </Link>
            </div>

            {/* العروض */}
            <NavItem
              active={offersOpen}
              label="العروض"
              ariaLabel="العروض"
              onClick={() => setOffersOpen(true)}
            >
              <Tag className="h-5 w-5" strokeWidth={offersOpen ? 2.6 : 2} />
            </NavItem>

            {/* حسابي — أقصى اليسار */}
            <NavItem active={isAccount} label="حسابي">
              <Link
                to="/account"
                aria-current={isAccount ? "page" : undefined}
                aria-label="حسابي"
                className="absolute inset-0 z-20 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#0E4D64]"
              />
              <User className="h-5 w-5" strokeWidth={isAccount ? 2.6 : 2} />
            </NavItem>
          </div>
        </div>
      </nav>

      <OffersDialog open={offersOpen} onClose={() => setOffersOpen(false)} />
    </>
  );
}

export default BottomNav;
