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
import { categories } from "@/data/mock";
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
  return (
    <section className="pt-7">
      <SectionHeading title="تصفح حسب الفئة" />
      <div className="no-scrollbar mt-3 flex gap-4 overflow-x-auto px-4 pb-1 md:grid md:grid-cols-8 md:overflow-visible">
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon as keyof typeof iconMap];
          return (
            <button
              key={cat.id}
              type="button"
              className="flex w-16 shrink-0 flex-col items-center gap-2 md:w-auto"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-primary transition-colors active:bg-accent">
                <Icon className="h-7 w-7" strokeWidth={1.7} />
              </span>
              <span className="text-center text-[11px] leading-tight text-foreground">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
