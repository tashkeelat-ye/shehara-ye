import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  Grid2x2,
  Home,
  Package,
  ShoppingBag,
  User,
} from "lucide-react";

import { useCart } from "@/lib/cart-context";

type BottomNavItem = {
  id: string;
  label: string;
  path: string;
  icon: typeof Home;
};

const NAV_ITEMS: BottomNavItem[] = [
  {
    id: "home",
    label: "الرئيسية",
    path: "/",
    icon: Home,
  },
  {
    id: "products",
    label: "المنتجات",
    path: "/products",
    icon: Grid2x2,
  },
  {
    id: "offers",
    label: "العروض",
    path: "/products?offers=true",
    icon: ShoppingBag,
  },
  {
    id: "orders",
    label: "طلباتي",
    path: "/orders",
    icon: Package,
  },
  {
    id: "account",
    label: "حسابي",
    path: "/account",
    icon: User,
  },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useCart();

  const isActive = (item: BottomNavItem) => {
    if (item.id === "home") {
      return location.pathname === "/";
    }

    if (item.id === "offers") {
      return (
        location.pathname === "/products" &&
        new URLSearchParams(
          location.search,
        ).get("offers") === "true"
      );
    }

    return (
      location.pathname === item.path ||
      location.pathname.startsWith(
        `${item.path}/`,
      )
    );
  };

  const handleNavigation = (item: BottomNavItem) => {
    if (item.id === "offers") {
      void navigate({
        to: "/products",
        search: {
          offers: true,
        },
      } as never);

      return;
    }

    void navigate({
      to: item.path as never,
    });
  };

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
        {/* الخط الذهبي العلوي */}

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

        {/* الزخرفة التراثية */}

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
            عناصر القائمة
            =================================================== */}

        <ul
          className="
            relative
            grid
            min-h-[68px]
            w-full
            grid-cols-5
            px-1
            pt-1
          "
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

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
                    active ? "page" : undefined
                  }
                  aria-label={item.label}
                  onClick={() =>
                    handleNavigation(item)
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
                      active
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
                        active
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
                          active
                            ? "scale-105"
                            : "group-hover:scale-105"
                        }
                      `}
                      strokeWidth={
                        active ? 2.2 : 1.8
                      }
                    />

                    {/* عداد السلة لم يعد عنصرًا في القائمة،
                        لكن نحافظ على عدم إظهار أي عداد
                        على عناصر التنقل الأخرى. */}

                    {item.id === "orders" &&
                    count > 0 ? null : null}

                    {active ? (
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
