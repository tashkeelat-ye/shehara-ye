import { useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Grid2x2,
  Heart,
  Home,
  Info,
  Package,
  Phone,
  ShoppingCart,
  User,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { fetchNavItems } from "@/lib/nav";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  grid: Grid2x2,
  package: Package,
  user: User,
  cart: ShoppingCart,
  wallet: Wallet,
  heart: Heart,
  bell: Bell,
  phone: Phone,
  info: Info,
};

const FALLBACK = [
  {
    id: "f1",
    label: "الرئيسية",
    path: "/",
    icon: "home",
  },
  {
    id: "f2",
    label: "المنتجات",
    path: "/products",
    icon: "grid",
  },
  {
    id: "f3",
    label: "المفضلة",
    path: "/favorites",
    icon: "heart",
  },
  {
    id: "f4",
    label: "السلة",
    path: "#cart",
    icon: "cart",
    isCartBadge: true,
  },
  {
    id: "f5",
    label: "حسابي",
    path: "/account",
    icon: "user",
  },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { count, setDrawerOpen } = useCart();

  const { data } = useQuery({
    queryKey: ["nav-items"],
    queryFn: () => fetchNavItems(true),
    staleTime: 1000 * 60 * 10,
  });

  const items =
    data && data.length > 0 ? data : FALLBACK;

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="
        fixed
        inset-x-0
        bottom-0
        z-50
        md:hidden
        px-2
        pb-[env(safe-area-inset-bottom)]
      "
    >
      {/* =====================================================
          الحاوية الرئيسية
          ===================================================== */}

      <div
        className="
          relative
          mx-auto
          w-full
          max-w-md
          overflow-hidden
          rounded-t-[1.35rem]
          border
          border-b-0
          border-[color:var(--brand-gold)]/20
          bg-[color:var(--card)]/96
          shadow-[0_-12px_35px_-24px_color-mix(in_srgb,var(--brand-burgundy)_70%,transparent)]
          backdrop-blur-2xl
          supports-[backdrop-filter]:bg-[color:var(--card)]/82
        "
      >
        {/* ===================================================
            الخط الذهبي العلوي
            =================================================== */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-x-0
            top-0
            h-px
            bg-gradient-to-r
            from-transparent
            via-[color:var(--brand-gold)]/70
            to-transparent
          "
        />

        {/* ===================================================
            زخرفة تراثية خفيفة
            =================================================== */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            left-1/2
            top-[-18px]
            h-10
            w-10
            -translate-x-1/2
            rotate-45
            border
            border-[color:var(--brand-gold)]/[0.07]
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            left-1/2
            top-[-9px]
            h-5
            w-5
            -translate-x-1/2
            rotate-45
            border
            border-[color:var(--brand-gold)]/[0.09]
          "
        />

        {/* ===================================================
            التنقل
            =================================================== */}

        <ul
          className="
            relative
            grid
            min-h-[68px]
            w-full
            px-1
            pt-1
          "
          style={{
            gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          }}
        >
          {items.map((item: any) => {
            const Icon =
              ICONS[item.icon] ?? Home;

            const isCartAction =
              item.path === "#cart" ||
              item.icon === "cart" ||
              item.isCartBadge;

            /*
             * =================================================
             * السلة
             * =================================================
             */

            if (isCartAction) {
              return (
                <li
                  key={item.id}
                  className="
                    flex
                    min-w-0
                    items-stretch
                  "
                >
                  <button
                    type="button"
                    aria-label={`${item.label}${
                      count > 0
                        ? `، ${count} منتجات`
                        : ""
                    }`}
                    onClick={() =>
                      setDrawerOpen(true)
                    }
                    className="
                      group
                      relative
                      flex
                      min-h-[64px]
                      w-full
                      touch-manipulation
                      flex-col
                      items-center
                      justify-center
                      gap-1
                      rounded-xl
                      px-1
                      py-2
                      text-[10px]
                      font-medium
                      text-muted-foreground
                      outline-none
                      transition-all
                      duration-200
                      active:scale-[0.94]
                      focus-visible:ring-2
                      focus-visible:ring-[color:var(--brand-gold)]
                      focus-visible:ring-offset-1
                      hover:text-[color:var(--brand-burgundy)]
                      dark:hover:text-[color:var(--brand-gold)]
                    "
                  >
                    <span
                      className="
                        relative
                        flex
                        h-9
                        w-12
                        items-center
                        justify-center
                        rounded-xl
                        transition-all
                        duration-200
                        group-hover:bg-[color:var(--brand-gold)]/10
                        group-active:bg-[color:var(--brand-gold)]/15
                      "
                    >
                      <Icon
                        className="
                          h-[21px]
                          w-[21px]
                          shrink-0
                          transition-transform
                          duration-200
                          group-hover:scale-105
                        "
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />

                      {count > 0 ? (
                        <span
                          aria-hidden="true"
                          className="
                            absolute
                            -right-0.5
                            -top-1
                            grid
                            min-h-[18px]
                            min-w-[18px]
                            place-items-center
                            rounded-full
                            border
                            border-[color:var(--brand-cream)]
                            bg-[color:var(--brand-burgundy)]
                            px-1
                            text-[9px]
                            font-bold
                            leading-none
                            text-[color:var(--brand-gold-soft)]
                            shadow-sm
                            dark:border-[color:var(--brand-burgundy-deep)]
                          "
                        >
                          {count.toLocaleString(
                            "ar-EG",
                          )}
                        </span>
                      ) : null}
                    </span>

                    <span
                      className="
                        max-w-full
                        truncate
                        px-0.5
                        leading-4
                      "
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            }

            /*
             * =================================================
             * العناصر العادية
             * =================================================
             */

            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname ===
                    item.path ||
                  location.pathname.startsWith(
                    `${item.path}/`,
                  );

            return (
              <li
                key={item.id}
                className="
                  flex
                  min-w-0
                  items-stretch
                "
              >
                <button
                  type="button"
                  aria-current={
                    isActive
                      ? "page"
                      : undefined
                  }
                  aria-label={item.label}
                  onClick={() =>
                    void navigate({
                      to: item.path as any,
                    })
                  }
                  className={`
                    group
                    relative
                    flex
                    min-h-[64px]
                    w-full
                    touch-manipulation
                    flex-col
                    items-center
                    justify-center
                    gap-1
                    rounded-xl
                    px-1
                    py-2
                    text-[10px]
                    outline-none
                    transition-all
                    duration-200
                    active:scale-[0.94]
                    focus-visible:ring-2
                    focus-visible:ring-[color:var(--brand-gold)]
                    focus-visible:ring-offset-1
                    ${
                      isActive
                        ? "font-bold text-[color:var(--brand-burgundy)] dark:text-[color:var(--brand-gold)]"
                        : "font-medium text-muted-foreground hover:text-[color:var(--brand-burgundy)] dark:hover:text-[color:var(--brand-gold)]"
                    }
                  `}
                >
                  <span
                    aria-hidden="true"
                    className={`
                      relative
                      flex
                      h-9
                      w-12
                      items-center
                      justify-center
                      rounded-xl
                      transition-all
                      duration-200
                      ${
                        isActive
                          ? "bg-[color:var(--brand-gold)]/14 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-gold)_10%,transparent)]"
                          : "group-hover:bg-[color:var(--brand-gold)]/8 group-active:bg-[color:var(--brand-gold)]/12"
                      }
                    `}
                  >
                    <Icon
                      className={`
                        h-[21px]
                        w-[21px]
                        shrink-0
                        transition-all
                        duration-200
                        ${
                          isActive
                            ? "scale-105"
                            : "group-hover:scale-105"
                        }
                      `}
                      strokeWidth={
                        isActive ? 2.2 : 1.8
                      }
                    />

                    {isActive ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="
                            absolute
                            -bottom-1
                            h-1
                            w-1
                            rounded-full
                            bg-[color:var(--brand-gold-deep)]
                            shadow-[0_0_8px_color-mix(in_srgb,var(--brand-gold)_60%,transparent)]
                          "
                        />

                        <span
                          aria-hidden="true"
                          className="
                            absolute
                            inset-x-3
                            bottom-0
                            h-px
                            bg-gradient-to-r
                            from-transparent
                            via-[color:var(--brand-gold)]/35
                            to-transparent
                          "
                        />
                      </>
                    ) : null}
                  </span>

                  <span
                    className="
                      max-w-full
                      truncate
                      px-0.5
                      leading-4
                    "
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
