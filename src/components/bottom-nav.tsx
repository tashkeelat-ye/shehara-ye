import {
  useLocation,
  useNavigate,
} from "@tanstack/react-router";

import {
  Grid2X2,
  Home,
  Package,
  ShoppingCart,
  User,
} from "lucide-react";

import { useCart } from "@/lib/cart-context";

type BottomNavItem = {
  id:
    | "home"
    | "categories"
    | "orders"
    | "account";
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
    id: "categories",
    label: "الأقسام",
    path: "/products",
    icon: Grid2X2,
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

  const {
    count,
    setDrawerOpen,
  } = useCart();

  const isActive = (
    item: BottomNavItem,
  ) => {
    if (item.id === "home") {
      return location.pathname === "/";
    }

    return (
      location.pathname === item.path ||
      location.pathname.startsWith(
        `${item.path}/`,
      )
    );
  };

  const goTo = (path: string) => {
    void navigate({
      to: path as never,
    });
  };

  const openCart = () => {
    setDrawerOpen(true);
  };

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="
        fixed
        inset-x-0
        bottom-0
        z-[60]
        md:hidden
      "
    >
      {/* Safe area */}
      <div
        className="
          bg-transparent
          pb-[env(safe-area-inset-bottom)]
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-lg
            border-t
            border-[#0E4D64]/10
            bg-[#FAF9F6]/96
            shadow-[0_-12px_40px_-25px_rgba(14,77,100,0.55)]
            backdrop-blur-2xl
            dark:border-white/10
            dark:bg-[#071B24]/96
          "
        >
          {/* Brand accent */}
          <div
            aria-hidden="true"
            className="
              h-[2px]
              w-full
              bg-gradient-to-r
              from-transparent
              via-[#D65A31]
              to-transparent
            "
          />

          <div
            className="
              relative
              grid
              h-[70px]
              grid-cols-5
              items-stretch
              px-1
            "
          >
            {/* ===============================
                HOME
               =============================== */}

            <NavButton
              item={NAV_ITEMS[0]}
              active={isActive(
                NAV_ITEMS[0],
              )}
              onClick={() =>
                goTo(
                  NAV_ITEMS[0].path,
                )
              }
            />

            {/* ===============================
                CATEGORIES
               =============================== */}

            <NavButton
              item={NAV_ITEMS[1]}
              active={isActive(
                NAV_ITEMS[1],
              )}
              onClick={() =>
                goTo(
                  NAV_ITEMS[1].path,
                )
              }
            />

            {/* ===============================
                CART
               =============================== */}

            <div
              className="
                relative
                flex
                items-center
                justify-center
              "
            >
              <button
                type="button"
                aria-label="فتح السلة"
                onClick={openCart}
                className="
                  absolute
                  -top-5
                  flex
                  h-[58px]
                  w-[58px]
                  items-center
                  justify-center
                  rounded-full
                  border-[4px]
                  border-[#FAF9F6]
                  bg-[#0E4D64]
                  text-white
                  shadow-[0_12px_28px_-10px_rgba(14,77,100,0.8)]
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-[#0A3D50]
                  active:scale-[0.88]
                  dark:border-[#071B24]
                "
              >
                <ShoppingCart
                  className="h-6 w-6"
                  strokeWidth={2}
                />

                {count > 0 && (
                  <span
                    aria-label={`${count} منتج في السلة`}
                    className="
                      absolute
                      -end-1
                      -top-1
                      grid
                      min-h-5
                      min-w-5
                      place-items-center
                      rounded-full
                      border-2
                      border-white
                      bg-[#D65A31]
                      px-1
                      text-[9px]
                      font-black
                      leading-none
                      text-white
                      dark:border-[#0B2936]
                    "
                  >
                    {count > 99
                      ? "99+"
                      : count.toLocaleString(
                          "ar-EG",
                        )}
                  </span>
                )}
              </button>

              <span
                className="
                  mt-9
                  text-[10px]
                  font-bold
                  leading-4
                  text-[#5D7078]
                  dark:text-[#9EB1B9]
                "
              >
                السلة
              </span>
            </div>

            {/* ===============================
                ORDERS
               =============================== */}

            <NavButton
              item={NAV_ITEMS[2]}
              active={isActive(
                NAV_ITEMS[2],
              )}
              onClick={() =>
                goTo(
                  NAV_ITEMS[2].path,
                )
              }
            />

            {/* ===============================
                ACCOUNT
               =============================== */}

            <NavButton
              item={NAV_ITEMS[3]}
              active={isActive(
                NAV_ITEMS[3],
              )}
              onClick={() =>
                goTo(
                  NAV_ITEMS[3].path,
                )
              }
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: BottomNavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      aria-current={
        active
          ? "page"
          : undefined
      }
      aria-label={item.label}
      onClick={onClick}
      className={`
        group
        relative
        flex
        min-h-[68px]
        w-full
        flex-col
        items-center
        justify-center
        gap-0.5
        rounded-2xl
        px-1
        py-2
        transition-all
        duration-200
        active:scale-[0.90]
        ${
          active
            ? "font-black text-[#D65A31]"
            : "font-medium text-[#657A83] dark:text-[#91A7B0]"
        }
      `}
    >
      {/* Icon container */}

      <span
        className={`
          grid
          h-9
          w-11
          place-items-center
          rounded-xl
          transition-all
          duration-200
          ${
            active
              ? "bg-[#D65A31]/10"
              : "group-hover:bg-[#0E4D64]/5 dark:group-hover:bg-white/5"
          }
        `}
      >
        <Icon
          className="
            h-[21px]
            w-[21px]
          "
          strokeWidth={
            active
              ? 2.35
              : 1.85
          }
        />
      </span>

      {/* Label */}

      <span
        className="
          max-w-full
          truncate
          text-[10px]
          leading-4
        "
      >
        {item.label}
      </span>

      {/* Active indicator */}

      {active && (
        <span
          aria-hidden="true"
          className="
            absolute
            bottom-0.5
            h-1
            w-1
            rounded-full
            bg-[#D65A31]
          "
        />
      )}
    </button>
  );
}

export default BottomNav;
