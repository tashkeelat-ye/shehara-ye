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
  const {
    data: categories = [],
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  return (
    <section className="space-y-4">
      <SectionHeading
        title="تسوق حسب الفئات"
        action="عرض الكل"
        to="/products"
      />

      <div
        className="
          no-scrollbar
          grid
          grid-cols-3
          gap-3
          px-4
          sm:grid-cols-4
          md:grid-cols-6
          lg:grid-cols-8
        "
      >
        {categories.map(
          (cat, index) => {
            const Icon =
              iconMap[
                cat.icon as keyof typeof iconMap
              ] ?? Shirt;

            const hasImage =
              Boolean(cat.image_url);

            const orange =
              index % 3 === 1;

            return (
              <Link
                key={cat.id}
                to="/category/$slug"
                params={{
                  slug: cat.slug,
                }}
                className="
                  group
                  flex
                  min-w-0
                  flex-col
                  items-center
                  gap-2
                  rounded-2xl
                  p-2
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-white
                  hover:shadow-[0_10px_30px_-25px_rgba(14,77,100,0.65)]
                  active:scale-95
                "
              >
                <span
                  className={`
                    relative
                    grid
                    h-[68px]
                    w-[68px]
                    place-items-center
                    overflow-hidden
                    rounded-full
                    border
                    shadow-sm
                    transition-all
                    duration-200
                    group-hover:scale-105
                    ${
                      orange
                        ? "border-[#D65A31]/15 bg-[#D65A31]/10 text-[#D65A31]"
                        : "border-[#0E4D64]/12 bg-[#0E4D64]/7 text-[#0E4D64]"
                    }
                  `}
                >
                  {hasImage ? (
                    <img
                      src={
                        cat.image_url!
                      }
                      alt={cat.name}
                      className="
                        h-full
                        w-full
                        object-cover
                      "
                    />
                  ) : (
                    <Icon
                      className="h-7 w-7"
                      strokeWidth={1.8}
                    />
                  )}
                </span>

                <span
                  className="
                    line-clamp-2
                    min-h-[2rem]
                    text-center
                    text-[11px]
                    font-semibold
                    leading-4
                    text-foreground
                  "
                >
                  {cat.name}
                </span>
              </Link>
            );
          },
        )}
      </div>
    </section>
  );
}
