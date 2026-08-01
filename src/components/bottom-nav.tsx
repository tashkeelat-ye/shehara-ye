import { Grid2x2, Heart, Home, ShoppingCart, User } from "lucide-react";

const items = [
  { id: "home", label: "الرئيسية", Icon: Home, active: true },
  { id: "cats", label: "الفئات", Icon: Grid2x2 },
  { id: "cart", label: "السلة", Icon: ShoppingCart, badge: "٣" },
  { id: "fav", label: "المفضلة", Icon: Heart },
  { id: "me", label: "حسابي", Icon: User },
];

export function BottomNav() {
  return (
    <nav
      aria-label="التنقل السريع"
      className="fixed bottom-0 z-40 w-full border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ id, label, Icon, active, badge }) => (
          <li key={id}>
            <button
              type="button"
              className={`flex w-full flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                {badge ? (
                  <span className="absolute -top-1.5 -left-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent-solid px-1 text-[10px] text-accent-solid-foreground">
                    {badge}
                  </span>
                ) : null}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
