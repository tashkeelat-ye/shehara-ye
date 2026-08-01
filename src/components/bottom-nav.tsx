import { Link } from "@tanstack/react-router";
import { Grid2x2, Home, Package, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function BottomNav() {
  const { count, setDrawerOpen } = useCart();

  return (
    <nav
      aria-label="التنقل السريع"
      className="fixed bottom-0 z-40 w-full border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        <li>
          <Link
            to="/"
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
            className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px]"
          >
            <Home className="h-5 w-5" />
            الرئيسية
          </Link>
        </li>
        <li>
          <Link
            to="/products"
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
            className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px]"
          >
            <Grid2x2 className="h-5 w-5" />
            المنتجات
          </Link>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
          >
            <span className="relative">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 ? (
                <span className="absolute -top-1.5 -left-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent-solid px-1 text-[10px] text-accent-solid-foreground">
                  {count.toLocaleString("ar-EG")}
                </span>
              ) : null}
            </span>
            السلة
          </button>
        </li>
        <li>
          <Link
            to="/orders"
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
            className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px]"
          >
            <Package className="h-5 w-5" />
            طلباتي
          </Link>
        </li>
        <li>
          <Link
            to="/account"
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
            className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px]"
          >
            <User className="h-5 w-5" />
            حسابي
          </Link>
        </li>
      </ul>
    </nav>
  );
}
