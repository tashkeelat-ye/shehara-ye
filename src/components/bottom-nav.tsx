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
  { id: "f1", label: "الرئيسية", path: "/", icon: "home" },
  { id: "f2", label: "المنتجات", path: "/products", icon: "grid" },
  { id: "f3", label: "السلة", path: "#cart", icon: "cart", isCartBadge: true },
  { id: "f4", label: "طلباتي", path: "/orders", icon: "package" },
  { id: "f5", label: "حسابي", path: "/account", icon: "user" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { count, setDrawerOpen } = useCart();
  
  const { data } = useQuery({ 
    queryKey: ["nav-items"], 
    queryFn: () => fetchNavItems(true) 
  });

  const items = data && data.length > 0 ? data : FALLBACK;

  return (
    <nav
      aria-label="التنقل السريع"
      className="fixed bottom-0 z-40 w-full border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item: any) => {
          const Icon = ICONS[item.icon] ?? Home;
          const isCartAction = item.path === "#cart" || item.icon === "cart" || item.isCartBadge;

          // زر السلة (يفتح الـ Drawer)
          if (isCartAction) {
            return (
              <li key={item.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                >
                  <span className="relative">
                    <Icon className="h-5 w-5 shrink-0" />
                    {count > 0 ? (
                      <span className="absolute -top-1.5 -left-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent-solid px-1 text-[10px] text-accent-solid-foreground font-bold">
                        {count.toLocaleString("ar-EG")}
                      </span>
                    ) : null}
                  </span>
                  <span className="max-w-full truncate px-0.5">{item.label}</span>
                </button>
              </li>
            );
          }

          // الأزرار العادية مع التمييز عند التفعيل
          const isActive = location.pathname === item.path;

          return (
            <li key={item.id} className="min-w-0">
              <button
                type="button"
                onClick={() => void navigate({ to: item.path as any })}
                className={`flex w-full flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                  isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
