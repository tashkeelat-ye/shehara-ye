import { Link } from "@tanstack/react-router";
import {
  CookingPot,
  Landmark,
  Lamp,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Watch,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/lib/db";
import { SectionHeading } from "./section-heading";

const iconMap = {
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
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  return (
    <section className="pt-7">
      <SectionHeading title="تصفح حسب الفئة" to="/products" />
      <div className="no-scrollbar mt-3 flex gap-4 overflow-x-auto px-4 pb-1 md:grid md:grid-cols-8 md:overflow-visible">
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon as keyof typeof iconMap] ?? Shirt;
          return (
            <Link
              key={cat.id}
              to="/category/$slug"
              params={{ slug: cat.slug }}
              className="flex w-16 shrink-0 flex-col items-center gap-2 md:w-auto"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-primary transition-colors active:bg-accent">
                <Icon className="h-7 w-7" strokeWidth={1.7} />
              </span>
              <span className="text-center text-[11px] leading-tight text-foreground">
                {cat.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
