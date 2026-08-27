import {
  useLocation,
  useNavigate,
} from "@tanstack/react-router";

import {
  Grid2X2,
  Home,
  Package,
  ShoppingBag,
  User,
} from "lucide-react";

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
    label: "الأقسام",
    path: "/products",
    icon: Grid2X2,
  },
  {
    id: "offers",
    label: "العروض",
    path: "/offers",
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

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed inset-x-0 bottom-0 z-50 px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-t-[1.6rem] border border-b-0 border-[#0E4D64]/10 bg-white/95 shadow-[0_-18px_45px_-28px_rgba(14,77,100,0.65)] backdrop-blur-xl dark:bg-[#0B2936]/95">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#D65A31] to-transparent" />

        <ul className="grid min-h-[72px] grid-cols-5 px-1 pt-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <li
                key={item.id}
                className="flex"
              >
                <button
                  type="button"
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                  aria-label={item.label}
                  onClick={() =>
                    void navigate({
                      to: item.path as never,
                    })
                  }
                  className={`group relative flex min-h-[68px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] transition-all duration-200 active:scale-90 ${
                    active
                      ? "font-black text-[#D65A31]"
                      : "font-medium text-muted-foreground"
                  }`}
                >
                  <span
                    className={`grid h-9 w-12 place-items-center rounded-xl transition-all ${
                      active
                        ? "bg-[#D65A31]/10"
                        : "group-hover:bg-[#0E4D64]/5"
                    }`}
                  >
                    <Icon
                      className="h-[21px] w-[21px]"
                      strokeWidth={
                        active ? 2.3 : 1.8
                      }
                    />
                  </span>

                  <span className="max-w-full truncate leading-4">
                    {item.label}
                  </span>

                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#D65A31]"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
