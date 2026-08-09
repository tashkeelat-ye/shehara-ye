import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

type Brand = {
  id: string;
  name: string;
  logo_url: string | null;
};

export function BrandsSection() {
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["brands-section"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      return data as Brand[];
    },
  });

  if (isLoading || brands.length === 0) return null;

  return (
    <section className="py-6 bg-accent/10">
      <div className="container px-4 mx-auto">
        <h2 className="text-xl font-bold mb-4 text-foreground">تسوق حسب الماركات</h2>
        <Carousel
          opts={{ align: "start", loop: true }}
          plugins={[Autoplay({ delay: 3000 })]}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {brands.map((brand) => (
              <CarouselItem key={brand.id} className="pl-2 md:pl-4 basis-1/3 sm:basis-1/4 md:basis-1/6">
                <Link
                  to="/products"
                  search={{ brand: brand.id }}
                  className="flex flex-col items-center justify-center p-4 bg-background border rounded-xl hover:shadow-md transition-shadow text-center h-28 group"
                >
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="h-12 w-auto object-contain mb-2 group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mb-2">
                      {brand.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs font-medium text-foreground line-clamp-1">{brand.name}</span>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
