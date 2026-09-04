import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Grid2X2,
  Home,
  ShoppingCart,
  Tag,
  User,
} from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { OffersDialog } from "@/components/offers-dialog";

/**
 * القائمة السفلية للتطبيق.
 *
 * كل زر يعمل فعلياً:
 * - الرئيسية / الأقسام / حسابي: تنقل حقيقي.
 * - العروض: نافذة عروض جميع الفئات.
 * - السلة: تفتح درج السلة مع عدّاد حقيقي.
 */
export function BottomNav() {
  const location = useLocation();
  const { count, setDrawerOpen } = useCart();
  const [offersOpen, setOffersOpen] = useState(false);

  const pathname = location.pathname;

  const isActive = (path: string, exact = false) =>
    exact ? pathname === path : pathname.startsWith(path);

  const itemCls = (active: boolean) => `
    group relative flex min-h-[62px] w-full flex-col items-center justify-center
    gap-1 rounded-2xl px-1 py-1.5 text-[10px] transition-all duration-200
    active:scale-90
    ${active ? "font-bold text-primary" : "font-medium text-muted-foreground"}
  `;

  const iconWrap = (active: boolean) => `
    relative grid h-8 w-11 place-items-center rounded-xl transition-all duration-200
    ${active ? "bg-primary/12" : "group-hover:bg-foreground/5"}
  `;

  return (
    <>
      <nav
        dir="rtl"
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-[90] px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-t-[1.6rem] border border-b-0 border-border bg-card/95 shadow-[0_-15px_40px_-25px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div
            aria-hidden="true"
            className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent"
          />

          <ul className="grid min-h-[66px] grid-cols-5 px-1 pt-1">
            <li className="flex">
              <Link to="/" className={itemCls(isActive("/", true))}>
                <span className={iconWrap(isActive("/", true))}>
                  <Home className="h-[20px] w-[20px]" />
                </span>
                <span className="truncate leading-4">الرئيسية</span>
              </Link>
            </li>

            <li className="flex">
              <Link
                to="/products"
                className={itemCls(isActive("/products"))}
              >
                <span className={iconWrap(isActive("/products"))}>
                  <Grid2X2 className="h-[20px] w-[20px]" />
                </span>
                <span className="truncate leading-4">الأقسام</span>
              </Link>
            </li>

            <li className="flex">
              <button
                type="button"
                aria-label="العروض"
                onClick={() => setOffersOpen(true)}
                className={itemCls(offersOpen || isActive("/offers"))}
              >
                <span className={iconWrap(offersOpen || isActive("/offers"))}>
                  <Tag className="h-[20px] w-[20px]" />
                </span>
                <span className="truncate leading-4">العروض</span>
              </button>
            </li>

            <li className="flex">
              <button
                type="button"
                aria-label="سلة المشتريات"
                onClick={() => setDrawerOpen(true)}
                className={itemCls(false)}
              >
                <span className={iconWrap(false)}>
                  <ShoppingCart className="h-[20px] w-[20px]" />

                  {count > 0 ? (
                    <span className="absolute -top-1 left-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </span>
                <span className="truncate leading-4">السلة</span>
              </button>
            </li>

            <li className="flex">
              <Link
                to="/account"
                className={itemCls(isActive("/account"))}
              >
                <span className={iconWrap(isActive("/account"))}>
                  <User className="h-[20px] w-[20px]" />
                </span>
                <span className="truncate leading-4">حسابي</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      <OffersDialog
        open={offersOpen}
        onClose={() => setOffersOpen(false)}
      />
    </>
  );
}
