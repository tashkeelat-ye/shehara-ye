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
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

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
      <SectionHeading title="تسوق حسب الفئات" to="/products" />
      <div className="mt-3 px-4">
        <Carousel
          opts={{ align: "start", loop: true }}
          plugins={[Autoplay({ delay: 3500, stopOnInteraction: false })]}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {categories.map((cat) => {
              const Icon = iconMap[cat.icon as keyof typeof iconMap] ?? Shirt;
              const hasCustomImage = Boolean(cat.image_url);

              return (
                <CarouselItem key={cat.id} className="pl-3 basis-1/4 sm:basis-1/6 md:basis-1/8">
                  <Link
                    to="/category/$slug"
                    params={{ slug: cat.slug }}
                    className="flex flex-col items-center gap-2 group text-center"
                  >
                    <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-brand-soft text-primary transition-all duration-300 group-hover:scale-105 active:bg-accent border border-border/50">
                      {hasCustomImage ? (
                        <img
                          src={cat.image_url!}
                          alt={cat.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Icon className="h-7 w-7" strokeWidth={1.7} />
                      )}
                    </span>
                    <span className="text-[11px] font-medium leading-tight text-foreground line-clamp-1">
                      {cat.name}
                    </span>
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
