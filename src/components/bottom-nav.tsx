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
        px-2
        pb-[env(safe-area-inset-bottom)]
        md:hidden
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-md
          overflow-visible
          rounded-t-[1.65rem]
          border
          border-b-0
          border-[#0E4D64]/10
          bg-white/96
          shadow-[0_-18px_55px_-28px_rgba(14,77,100,0.65)]
          backdrop-blur-2xl
          dark:border-white/10
          dark:bg-[#0B2936]/96
        "
      >
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
            min-h-[72px]
            grid-cols-5
            items-stretch
            px-1
            pt-1
          "
        >
          {/* الرئيسية */}
          <NavButton
            item={NAV_ITEMS[0]}
            active={isActive(
              NAV_ITEMS[0],
            )}
            onClick={() =>
              void navigate({
                to: NAV_ITEMS[0].path as never,
              })
            }
          />

          {/* الأقسام */}
          <NavButton
            item={NAV_ITEMS[1]}
            active={isActive(
              NAV_ITEMS[1],
            )}
            onClick={() =>
              void navigate({
                to: NAV_ITEMS[1].path as never,
              })
            }
          />

          {/* السلة المركزية */}
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
              aria-label="السلة"
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
                border-[5px]
                border-[#FAF9F6]
                bg-[#0E4D64]
                text-white
                shadow-[0_14px_30px_-12px_rgba(14,77,100,0.75)]
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:bg-[#0A3D50]
                active:scale-90
                dark:border-[#071B24]
              "
            >
              <ShoppingCart
                className="h-6 w-6"
                strokeWidth={2.1}
              />

              {count > 0 ? (
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
              ) : null}
            </button>

            <span
              className="
                mt-9
                text-[10px]
                font-bold
                text-muted-foreground
              "
            >
              السلة
            </span>
          </div>

          {/* طلباتي */}
          <NavButton
            item={NAV_ITEMS[2]}
            active={isActive(
              NAV_ITEMS[2],
            )}
            onClick={() =>
              void navigate({
                to: NAV_ITEMS[2].path as never,
              })
            }
          />

          {/* حسابي */}
          <NavButton
            item={NAV_ITEMS[3]}
            active={isActive(
              NAV_ITEMS[3],
            )}
            onClick={() =>
              void navigate({
                to: NAV_ITEMS[3].path as never,
              })
            }
          />
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
        active ? "page" : undefined
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
        gap-1
        rounded-2xl
        px-1
        py-2
        transition-all
        duration-200
        active:scale-90
        ${
          active
            ? "font-black text-[#D65A31]"
            : "font-medium text-muted-foreground"
        }
      `}
    >
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
              : "group-hover:bg-[#0E4D64]/5"
          }
        `}
      >
        <Icon
          className="h-[21px] w-[21px]"
          strokeWidth={
            active ? 2.3 : 1.8
          }
        />
      </span>

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

      {active ? (
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
      ) : null}
    </button>
  );
}

export default BottomNav;
