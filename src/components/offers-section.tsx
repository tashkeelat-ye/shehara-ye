import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";

import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { fetchOfferProducts } from "@/lib/offers";

function OfferTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };

    setTimeLeft(calculateTime());
    const interval = setInterval(
      () => setTimeLeft(calculateTime()),
      1000,
    );
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 font-mono text-[11px] text-destructive">
      <Clock className="h-3 w-3" />
      <span>{String(timeLeft.hours).padStart(2, "0")}</span>:
      <span>{String(timeLeft.minutes).padStart(2, "0")}</span>:
      <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
    </div>
  );
}

export function OffersSection() {
  const { data: offerProducts = [], isLoading } = useQuery({
    queryKey: ["offers", "home"],
    queryFn: () => fetchOfferProducts(12),
    staleTime: 60_000,
  });

  if (isLoading || offerProducts.length === 0) return null;

  const firstEndingOffer = offerProducts.find(
    (product) => product.offer_end_date,
  );

  return (
    <section className="py-2">
      <div className="px-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-base font-bold text-foreground sm:text-lg">
              العروض اليومية
            </h2>

            {firstEndingOffer?.offer_end_date ? (
              <OfferTimer endDate={firstEndingOffer.offer_end_date} />
            ) : null}
          </div>

          <Button variant="outline" size="sm" asChild>
            <Link to="/offers">عرض الكل</Link>
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
