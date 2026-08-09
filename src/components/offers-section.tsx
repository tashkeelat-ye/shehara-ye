import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

function OfferTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(endDate).getTime() - new Date().getTime();
      if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };

    setTimeLeft(calculateTime());
    const interval = setInterval(() => setTimeLeft(calculateTime()), 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="flex items-center gap-1 text-xs font-mono bg-destructive/10 text-destructive px-2 py-1 rounded-md">
      <span>{String(timeLeft.hours).padStart(2, "0")}h</span>:
      <span>{String(timeLeft.minutes).padStart(2, "0")}m</span>:
      <span>{String(timeLeft.seconds).padStart(2, "0")}s</span>
    </div>
  );
}

export function OffersSection() {
  const { data: offerProducts = [], isLoading } = useQuery({
    queryKey: ["offers-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .or("discount_price.not.is.null,offer_end_date.not.is.null")
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading || offerProducts.length === 0) return null;

  const firstEndingOffer = offerProducts.find((p) => p.offer_end_date);

  return (
    <section className="py-6">
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">العروض والتخفيضات</h2>
            {firstEndingOffer?.offer_end_date && (
              <OfferTimer endDate={firstEndingOffer.offer_end_date} />
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/products" search={{ offers: true }}>
              عرض الكل
            </Link>
          </Button>
        </div>

        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {offerProducts.map((product) => (
            <div key={product.id} className="w-40 shrink-0 sm:w-48">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
