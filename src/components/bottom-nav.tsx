import { useState } from "react";
import {
  Link,
  useLocation,
} from "@tanstack/react-router";

import {
  Grid2X2,
  Home,
  ShoppingCart,
  Tag,
  User,
} from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { OffersDialog } from "@/components/offers-dialog";

export function BottomNav() {
  const location = useLocation();

  const {
    count,
    setDrawerOpen,
  } = useCart();

  const [
    offersOpen,
    setOffersOpen,
  ] = useState(false);

  const pathname =
    location.pathname;

  const isHome =
    pathname === "/";

  const isProducts =
    pathname.startsWith(
      "/products",
    );

  const isAccount =
    pathname.startsWith(
      "/account",
    );

  const itemBase = `
    group
    relative
    flex
    min-w-0
    flex-1
    flex-col
    items-center
    justify-center
    gap-1
    px-1
    py-2
    text-[10px]
    font-medium
    outline-none
    transition-all
    duration-300
    active:scale-95
    focus-visible:ring-2
    focus-visible:ring-inset
    focus-visible:ring-primary
  `;

  const iconContainer = (
    active: boolean,
  ) => `
    relative
    flex
    h-9
    w-12
    items-center
    justify-center
    rounded-2xl
    transition-all
    duration-300
    ${
      active
        ? `
          bg-primary/12
          text-primary
          shadow-[0_6px_20px_-14px_rgba(226,114,58,0.9)]
        `
        : `
          text-muted-foreground
          group-hover:bg-muted/70
          group-hover:text-foreground
        `
    }
  `;

  const labelClass = (
    active: boolean,
  ) => `
    max-w-full
    truncate
    leading-4
    transition-colors
    duration-300
    ${
      active
        ? "font-extrabold text-primary"
        : "text-muted-foreground"
    }
  `;

  return (
    <>
      <nav
        dir="rtl"
        aria-label="التنقل الرئيسي"
        className="
          fixed
          inset-x-0
          bottom-0
          z-[90]
          w-full
          md:hidden
        "
      >
        <div
          className="
            relative
            w-full
            border-t
            border-border/70
            bg-background/96
            shadow-[0_-18px_45px_-30px_rgba(0,0,0,0.65)]
            backdrop-blur-2xl
            supports-[backdrop-filter]:bg-background/82
          "
        >
          {/* خط الهوية */}
          <div
            aria-hidden="true"
            className="
              absolute
              inset-x-0
              top-0
              h-[2px]
              overflow-hidden
              bg-gradient-to-r
              from-transparent
              via-primary/70
              to-transparent
            "
          />

          <div
            className="
              mx-auto
              flex
              w-full
              max-w-lg
              items-stretch
              px-2
              pt-1
              pb-[max(5px,env(safe-area-inset-bottom))]
            "
          >
            {/* الرئيسية */}
            <Link
              to="/"
              aria-current={
                isHome
                  ? "page"
                  : undefined
              }
              className={`${itemBase} ${
                isHome
                  ? "text-primary"
                  : ""
              }`}
            >
              <span
                className={iconContainer(
                  isHome,
                )}
              >
                {isHome ? (
                  <span
                    aria-hidden="true"
                    className="
                      absolute
                      inset-1
                      rounded-xl
                      bg-primary/7
                    "
                  />
                ) : null}

                <Home
                  className="
                    relative
                    z-10
                    h-[20px]
                    w-[20px]
                  "
                  strokeWidth={
                    isHome ? 2.5 : 2
                  }
                />
              </span>

              <span
                className={labelClass(
                  isHome,
                )}
              >
                الرئيسية
              </span>

              {isHome ? (
                <span
                  aria-hidden="true"
                  className="
                    absolute
                    bottom-0.5
                    h-1
                    w-5
                    rounded-full
                    bg-primary
                  "
                />
              ) : null}
            </Link>

            {/* الأقسام */}
            <Link
              to="/products"
              aria-current={
                isProducts
                  ? "page"
                  : undefined
              }
              className={`${itemBase} ${
                isProducts
                  ? "text-primary"
                  : ""
              }`}
            >
              <span
                className={iconContainer(
                  isProducts,
                )}
              >
                <Grid2X2
                  className="
                    h-[20px]
                    w-[20px]
                  "
                  strokeWidth={
                    isProducts
                      ? 2.5
                      : 2
                  }
                />
              </span>

              <span
                className={labelClass(
                  isProducts,
                )}
              >
                الأقسام
              </span>

              {isProducts ? (
                <span
                  aria-hidden="true"
                  className="
                    absolute
                    bottom-0.5
                    h-1
                    w-5
                    rounded-full
                    bg-primary
                  "
                />
              ) : null}
            </Link>

            {/* العروض */}
            <button
              type="button"
              aria-label="العروض"
              aria-expanded={
                offersOpen
              }
              onClick={() =>
                setOffersOpen(true)
              }
              className={`${itemBase} ${
                offersOpen
                  ? "text-primary"
                  : ""
              }`}
            >
              <span
                className={iconContainer(
                  offersOpen,
                )}
              >
                <Tag
                  className="
                    h-[20px]
                    w-[20px]
                  "
                  strokeWidth={
                    offersOpen
                      ? 2.5
                      : 2
                  }
                />
              </span>

              <span
                className={labelClass(
                  offersOpen,
                )}
              >
                العروض
              </span>

              {offersOpen ? (
                <span
                  aria-hidden="true"
                  className="
                    absolute
                    bottom-0.5
                    h-1
                    w-5
                    rounded-full
                    bg-primary
                  "
                />
              ) : null}
            </button>

            {/* السلة */}
            <button
              type="button"
              aria-label={`سلة المشتريات${
                count > 0
                  ? `، ${count} منتجات`
                  : ""
              }`}
              onClick={() =>
                setDrawerOpen(true)
              }
              className={itemBase}
            >
              <span
                className={iconContainer(
                  false,
                )}
              >
                <ShoppingCart
                  className="
                    h-[20px]
                    w-[20px]
                  "
                  strokeWidth={2}
                />

                {count > 0 ? (
                  <span
                    aria-label={`${count} في السلة`}
                    className="
                      absolute
                      -end-0.5
                      -top-1
                      flex
                      min-h-[18px]
                      min-w-[18px]
                      items-center
                      justify-center
                      rounded-full
                      border-2
                      border-background
                      bg-primary
                      px-1
                      text-[8px]
                      font-extrabold
                      leading-none
                      text-primary-foreground
                      shadow-sm
                    "
                  >
                    {count > 99
                      ? "99+"
                      : count}
                  </span>
                ) : null}
              </span>

              <span
                className={labelClass(
                  false,
                )}
              >
                السلة
              </span>
            </button>

            {/* حسابي */}
            <Link
              to="/account"
              aria-current={
                isAccount
                  ? "page"
                  : undefined
              }
              className={`${itemBase} ${
                isAccount
                  ? "text-primary"
                  : ""
              }`}
            >
              <span
                className={iconContainer(
                  isAccount,
                )}
              >
                <User
                  className="
                    h-[20px]
                    w-[20px]
                  "
                  strokeWidth={
                    isAccount ? 2.5 : 2
                  }
                />
              </span>

              <span
                className={labelClass(
                  isAccount,
                )}
              >
                حسابي
              </span>

              {isAccount ? (
                <span
                  aria-hidden="true"
                  className="
                    absolute
                    bottom-0.5
                    h-1
                    w-5
                    rounded-full
                    bg-primary
                  "
                />
              ) : null}
            </Link>
          </div>
        </div>
      </nav>

      <OffersDialog
        open={offersOpen}
        onClose={() =>
          setOffersOpen(false)
        }
      />
    </>
  );
}
