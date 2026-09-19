import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Grid2X2, Home, ShoppingCart, Tag, User } from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { OffersDialog } from "@/components/offers-dialog";

export function BottomNav() {
  const location = useLocation();
  const { count, setDrawerOpen } = useCart();
  const [offersOpen, setOffersOpen] = useState(false);

  const pathname = location.pathname;
  const isHome = pathname === "/";
  const isProducts = pathname.startsWith("/products");
  const isAccount = pathname.startsWith("/account");

  const base = `
    group relative flex min-w-0 flex-1 flex-col items-center justify-center
    gap-1 px-1 py-2 text-[10px] font-bold outline-none transition-all
    active:scale-95 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary
  `;

  const icon = (active: boolean) => `
    relative flex h-9 w-[52px] items-center justify-center rounded-[1.15rem]
    transition-all duration-200
    ${active
      ? "bg-[#0E4D64]/[0.10] text-[#0E4D64] shadow-[0_8px_24px_-18px_rgba(14,77,100,0.9)] dark:bg-white/[0.08] dark:text-[#D65A31]"
      : "text-muted-foreground group-hover:bg-muted/70 group-hover:text-foreground"}
  `;

  const label = (active: boolean) =>
    `max-w-full truncate leading-4 ${active ? "font-black text-[#0E4D64] dark:text-[#D65A31]" : "text-muted-foreground"}`;

  return (
    <>
      <nav dir="rtl" aria-label="التنقل الرئيسي" className="fixed inset-x-0 bottom-0 z-[90] w-full md:hidden">
        <div className="relative border-t border-[#0E4D64]/[0.08] bg-[color:var(--background)]/96 shadow-[0_-18px_50px_-32px_rgba(14,77,100,0.65)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[color:var(--background)]/84]">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D65A31]/65 to-transparent" />

          <div className="mx-auto flex w-full max-w-lg items-stretch px-2 pt-1 pb-[max(5px,env(safe-area-inset-bottom))]">
            <Link to="/" aria-current={isHome ? "page" : undefined} className={`${base} ${isHome ? "text-primary" : ""}`}>
              <span className={icon(isHome)}>
                <Home className="h-5 w-5" strokeWidth={isHome ? 2.5 : 2} />
                {isHome ? <span className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-[#D65A31]" /> : null}
              </span>
              <span className={label(isHome)}>الرئيسية</span>
            </Link>

            <Link to="/products" aria-current={isProducts ? "page" : undefined} className={`${base} ${isProducts ? "text-primary" : ""}`}>
              <span className={icon(isProducts)}>
                <Grid2X2 className="h-5 w-5" strokeWidth={isProducts ? 2.5 : 2} />
                {isProducts ? <span className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-[#D65A31]" /> : null}
              </span>
              <span className={label(isProducts)}>الأقسام</span>
            </Link>

            <button type="button" aria-label="العروض" aria-expanded={offersOpen} onClick={() => setOffersOpen(true)} className={`${base} ${offersOpen ? "text-primary" : ""}`}>
              <span className={icon(offersOpen)}>
                <Tag className="h-5 w-5" strokeWidth={offersOpen ? 2.5 : 2} />
                {offersOpen ? <span className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-[#D65A31]" /> : null}
              </span>
              <span className={label(offersOpen)}>العروض</span>
            </button>

            <button type="button" aria-label={`سلة المشتريات${count > 0 ? `، ${count} منتجات` : ""}`} onClick={() => setDrawerOpen(true)} className={base}>
              <span className={icon(false)}>
                <ShoppingCart className="h-5 w-5" strokeWidth={2} />
                {count > 0 ? (
                  <span className="absolute -end-0.5 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-[#D65A31] px-1 text-[8px] font-black leading-none text-white">
                    {count > 99 ? "99+" : count.toLocaleString("ar-EG")}
                  </span>
                ) : null}
              </span>
              <span className={label(false)}>السلة</span>
            </button>

            <Link to="/account" aria-current={isAccount ? "page" : undefined} className={`${base} ${isAccount ? "text-primary" : ""}`}>
              <span className={icon(isAccount)}>
                <User className="h-5 w-5" strokeWidth={isAccount ? 2.5 : 2} />
                {isAccount ? <span className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-[#D65A31]" /> : null}
              </span>
              <span className={label(isAccount)}>حسابي</span>
            </Link>
          </div>
        </div>
      </nav>

      <OffersDialog open={offersOpen} onClose={() => setOffersOpen(false)} />
    </>
  );
}

export default BottomNav;
