import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CookingPot,
  Grid2X2,
  Lamp,
  Landmark,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Watch,
  Layers,
} from "lucide-react";

import { fetchCategories } from "@/lib/db";

const iconMap: Record<string, any> = {
  Shirt,
  Smartphone,
  CookingPot,
  Sparkles,
  ShoppingBasket,
  Watch,
  Lamp,
  Landmark,
};

export function CategoryStrip() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="h-16 w-16 animate-pulse rounded-2xl bg-[#0E4D64]/10" />
            <div className="h-3 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="w-full py-1" aria-label="أقسام المتجر">
      <div className="flex items-center gap-3 overflow-x-auto px-1 py-1 no-scrollbar scroll-smooth">
        
        {/* زر عرض كل الأقسام */}
        <Link
          to="/products"
          className="group flex flex-col items-center gap-1.5 shrink-0 text-center"
        >
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[#0E4D64]/15 bg-[#EBF2F5] transition-all duration-200 group-hover:scale-105 group-hover:bg-[#0E4D64] group-hover:text-white dark:border-white/10 dark:bg-white/5 text-[#0E4D64]">
            <Grid2X2 className="h-7 w-7 transition-colors" strokeWidth={1.8} />
          </div>
          <span className="text-xs font-bold text-foreground">الكل</span>
        </Link>

        {/* بقية الأقسام */}
        {categories.map((cat) => {
          const IconComponent = cat.icon && iconMap[cat.icon] ? iconMap[cat.icon] : Layers;

          return (
            <Link
              key={cat.id}
              to="/category/$slug"
              params={{ slug: cat.slug }}
              className="group flex flex-col items-center gap-1.5 shrink-0 text-center"
            >
              <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-[#0E4D64]/10 bg-[#EBF2F5]/70 transition-all duration-200 group-hover:scale-105 group-hover:border-[#D65A31]/40 group-hover:bg-[#EBF2F5] dark:border-white/10 dark:bg-white/5">
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <IconComponent className="h-7 w-7 text-[#0E4D64] dark:text-[#D65A31]" strokeWidth={1.8} />
                )}
              </div>
              <span className="max-w-[70px] truncate text-xs font-semibold text-foreground/90">
                {cat.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default CategoryStrip;
