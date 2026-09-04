import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Clock3,
  Flame,
  ShoppingCart,
  Tag,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import {
  fetchOfferProducts,
  offerBasePrice,
  offerPercent,
  offerPrice,
  type OfferProduct,
} from "@/lib/offers";
import { formatPrice } from "@/lib/db";

function OfferTimer({
  endDate,
}: {
  endDate: string;
}) {
  const calculate = () => {
    const diff =
      new Date(endDate).getTime() -
      Date.now();

    if (diff <= 0) {
      return {
        expired: true,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }

    return {
      expired: false,
      days: Math.floor(
        diff / (1000 * 60 * 60 * 24),
      ),
      hours: Math.floor(
        (diff / (1000 * 60 * 60)) % 24,
      ),
      minutes: Math.floor(
        (diff / (1000 * 60)) % 60,
      ),
      seconds: Math.floor(
        (diff / 1000) % 60,
      ),
    };
  };

  const [time, setTime] = useState(calculate);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(calculate());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [endDate]);

  if (time.expired) {
    return (
      <span className="text-xs font-semibold text-destructive">
        انتهى العرض
      </span>
    );
  }

  return (
    <span
      dir="ltr"
      className="
        inline-flex
        items-center
        gap-1
        rounded-lg
        bg-[#D65A31]/10
        px-2.5
        py-1
        font-mono
        text-xs
        font-bold
        text-[#D65A31]
      "
    >
      {time.days > 0 && (
        <>
          {String(time.days).padStart(2, "0")}d :
        </>
      )}
      {String(time.hours).padStart(2, "0")}h :
      {String(time.minutes).padStart(2, "0")}m :
      {String(time.seconds).padStart(2, "0")}s
    </span>
  );
}

function OfferHero({
  offer,
}: {
  offer: OfferProduct;
}) {
  const basePrice = offerBasePrice(offer);
  const currentPrice = offerPrice(offer);
  const percent = offerPercent(offer);

  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-[1.75rem]
        bg-[#0E4D64]
        p-5
        text-white
        shadow-[0_20px_60px_-30px_rgba(14,77,100,0.8)]
      "
    >
      <div
        aria-hidden="true"
        className="
          absolute
          -right-20
          -top-20
          h-52
          w-52
          rounded-full
          bg-[#D65A31]/20
          blur-2xl
        "
      />

      <div
        aria-hidden="true"
        className="
          absolute
          -bottom-24
          -left-16
          h-48
          w-48
          rounded-full
          bg-white/10
          blur-3xl
        "
      />

      <div className="relative z-10">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-full
              bg-[#D65A31]
              px-3
              py-1
              text-xs
              font-bold
            "
          >
            <Flame className="h-3.5 w-3.5" />
            عرض مميز
          </span>

          {percent > 0 && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              خصم {percent}%
            </span>
          )}
        </div>

        <h2 className="line-clamp-2 text-xl font-black">
          {offer.name}
        </h2>

        <div className="mt-4 flex items-end gap-3">
          <span className="text-2xl font-black">
            {formatPrice(currentPrice)}
          </span>

          {basePrice > currentPrice && (
            <span className="pb-0.5 text-sm text-white/55 line-through">
              {formatPrice(basePrice)}
            </span>
          )}
        </div>

        {offer.offer_end_date && (
          <div className="mt-4 flex items-center gap-2 text-white/80">
            <Clock3 className="h-4 w-4" />
            <span className="text-xs">
              ينتهي العرض خلال
            </span>

            <OfferTimer
              endDate={offer.offer_end_date}
            />
          </div>
        )}

        <div className="mt-5">
          <Button
            asChild
            className="
              bg-white
              text-[#0E4D64]
              hover:bg-white/90
            "
          >
            <Link
              to="/products/$id"
              params={{ id: offer.id }}
            >
              مشاهدة المنتج
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OffersPage() {
  const {
    data: offers = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["shehara-offers"],
    queryFn: () => fetchOfferProducts(60),
    staleTime: 30_000,
  });

  const [sort, setSort] = useState<
    "discount" | "price" | "newest"
  >("discount");

  const sortedOffers = useMemo(() => {
    const result = [...offers];

    if (sort === "discount") {
      result.sort(
        (a, b) =>
          offerPercent(b) -
          offerPercent(a),
      );
    }

    if (sort === "price") {
      result.sort(
        (a, b) =>
          offerPrice(a) -
          offerPrice(b),
      );
    }

    if (sort === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime(),
      );
    }

    return result;
  }, [offers, sort]);

  const featuredOffer =
    sortedOffers[0] ?? null;

  const remainingOffers =
    featuredOffer
      ? sortedOffers.slice(1)
      : [];

  if (isLoading) {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 h-9 w-40 animate-pulse rounded-lg bg-muted" />

          <div className="h-64 animate-pulse rounded-[1.75rem] bg-muted" />

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="aspect-[0.72] animate-pulse rounded-2xl bg-muted"
                />
              ),
            )}
          </div>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-xl rounded-3xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10">
            <Tag className="h-7 w-7 text-destructive" />
          </div>

          <h1 className="text-xl font-bold">
            تعذر تحميل العروض
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            حدثت مشكلة أثناء الاتصال بقاعدة
            البيانات.
          </p>

          <Button
            onClick={() => void refetch()}
            className="mt-5"
          >
            إعادة المحاولة
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="
        min-h-screen
        px-4
        pb-28
        pt-5
        sm:px-6
        lg:px-8
      "
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <div className="flex items-center gap-2">
            <div
              className="
                grid
                h-11
                w-11
                place-items-center
                rounded-2xl
                bg-[#D65A31]/10
              "
            >
              <Flame className="h-6 w-6 text-[#D65A31]" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-[#0E4D64] dark:text-white">
                العروض والتخفيضات
              </h1>

              <p className="mt-0.5 text-sm text-muted-foreground">
                أفضل الأسعار المتاحة الآن في شهارة
              </p>
            </div>
          </div>
        </header>

        {offers.length === 0 ? (
          <section className="rounded-[1.75rem] border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#0E4D64]/10">
              <ShoppingCart className="h-7 w-7 text-[#0E4D64]" />
            </div>

            <h2 className="mt-5 text-xl font-bold">
              لا توجد عروض متاحة حاليًا
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              تابع شهارة باستمرار لاكتشاف العروض
              الجديدة.
            </p>

            <Button
              asChild
              variant="outline"
              className="mt-5"
            >
              <Link to="/products">
                تصفح المنتجات
              </Link>
            </Button>
          </section>
        ) : (
          <>
            {featuredOffer && (
              <OfferHero
                offer={featuredOffer}
              />
            )}

            <div
              className="
                mt-7
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div>
                <h2 className="text-lg font-black">
                  كل العروض
                </h2>

                <p className="text-xs text-muted-foreground">
                  {offers.length} منتج ضمن العروض
                </p>
              </div>

              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    sort === "discount"
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    setSort("discount")
                  }
                >
                  الخصم
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={
                    sort === "price"
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    setSort("price")
                  }
                >
                  السعر
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={
                    sort === "newest"
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    setSort("newest")
                  }
                >
                  الأحدث
                </Button>
              </div>
            </div>

            {remainingOffers.length > 0 && (
              <div
                className="
                  mt-5
                  grid
                  grid-cols-2
                  gap-3
                  sm:grid-cols-3
                  lg:grid-cols-4
                "
              >
                {remainingOffers.map(
                  (product) => (
                    <div
                      key={product.id}
                      className="relative"
                    >
                      <div
                        className="
                          pointer-events-none
                          absolute
                          right-2
                          top-2
                          z-10
                          rounded-full
                          bg-[#D65A31]
                          px-2
                          py-1
                          text-[10px]
                          font-black
                          text-white
                          shadow-sm
                        "
                      >
                        خصم {offerPercent(product)}%
                      </div>

                      <ProductCard
                        product={
                          product as never
                        }
                      />
                    </div>
                  ),
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
