import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock3,
  Flame,
  Percent,
  ShoppingBag,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";
import { useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product-card";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      {
        title: "العروض | شهارة",
      },
      {
        name: "description",
        content:
          "اكتشف أحدث العروض والتخفيضات الحصرية في شهارة.",
      },
    ],
  }),
  component: OffersPage,
});

type OfferProduct = {
  id: string;
  category_id: string;
  vendor_id: string | null;
  name: string;
  description: string;
  price: number;
  old_price: number | null;
  rating: number;
  reviews_count: number;
  sales_count: number;
  city: string;
  images: string[];
  sizes: string[];
  colors: string[];
  badge: string | null;
  is_local: boolean;
  is_active: boolean;
  total_stock: number;
  stock_left: number;
  low_stock_threshold: number;
  created_at: string;
  discount_price?: number | null;
  offer_end_date?: string | null;
};

function OfferTimer({
  endDate,
}: {
  endDate?: string | null;
}) {
  const remaining = useMemo(() => {
    if (!endDate) {
      return null;
    }

    const diff =
      new Date(endDate).getTime() -
      Date.now();

    if (diff <= 0) {
      return null;
    }

    return {
      hours: Math.floor(
        diff / (1000 * 60 * 60),
      ),
      minutes: Math.floor(
        (diff / (1000 * 60)) % 60,
      ),
      seconds: Math.floor(
        (diff / 1000) % 60,
      ),
    };
  }, [endDate]);

  if (!remaining) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-white backdrop-blur">
      <Clock3 className="h-4 w-4 text-[#F6B39B]" />

      <span className="font-mono text-xs font-bold" dir="ltr">
        {String(remaining.hours).padStart(2, "0")}:
        {String(remaining.minutes).padStart(2, "0")}:
        {String(remaining.seconds).padStart(2, "0")}
      </span>
    </div>
  );
}

function OffersPage() {
  const {
    data: products = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["offers-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .or(
          "old_price.not.is.null,discount_price.not.is.null",
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(40);

      if (error) {
        throw error;
      }

      return (data ?? []) as OfferProduct[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const discountA =
        a.old_price && a.old_price > a.price
          ? (a.old_price - a.price) /
            a.old_price
          : 0;

      const discountB =
        b.old_price && b.old_price > b.price
          ? (b.old_price - b.price) /
            b.old_price
          : 0;

      return discountB - discountA;
    });
  }, [products]);

  const featured =
    sortedProducts.slice(0, 4);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FAF9F6] pb-28 text-foreground dark:bg-[#071B24]"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#0E4D64] p-5 text-white shadow-[0_24px_60px_-35px_rgba(14,77,100,0.8)] sm:p-7">
          <div className="absolute -end-16 -top-16 h-48 w-48 rounded-full border border-white/10" />
          <div className="absolute -start-20 -bottom-20 h-52 w-52 rounded-full border border-[#D65A31]/20" />

          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#D65A31]">
                <Percent className="h-5 w-5" />
              </span>

              <div>
                <p className="text-[10px] font-bold text-white/60">
                  شهارة
                </p>

                <p className="text-xs font-bold">
                  تسوق بلا حدود
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-black sm:text-3xl">
                  العروض والتخفيضات
                </h1>

                <p className="mt-2 max-w-xl text-xs leading-6 text-white/70 sm:text-sm">
                  أفضل الأسعار والفرص المختارة لك
                  من متجر شهارة.
                </p>
              </div>

              <Link
                to="/products"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-extrabold text-[#0E4D64] transition active:scale-95"
              >
                تصفح كل المنتجات
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {featured.length > 0 ? (
          <section className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
                <Flame className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-sm font-black">
                  عروض تستحق الانتباه
                </h2>

                <p className="text-[10px] text-muted-foreground">
                  التخفيضات الأعلى أولاً
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {featured.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product as never}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-7">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                <Tag className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-sm font-black">
                  كل العروض
                </h2>

                <p className="text-[10px] text-muted-foreground">
                  اختر عرضك واستفد الآن
                </p>
              </div>
            </div>

            <span className="rounded-full bg-[#D65A31]/10 px-3 py-1 text-[9px] font-bold text-[#D65A31]">
              {products.length.toLocaleString("ar-EG")} عرض
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : null}

          {!isLoading && isError ? (
            <div className="rounded-3xl border border-destructive/15 bg-card p-8 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-destructive" />

              <h2 className="mt-3 text-sm font-bold">
                تعذر تحميل العروض
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                حاول مرة أخرى لاحقاً.
              </p>
            </div>
          ) : null}

          {!isLoading &&
          !isError &&
          sortedProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product as never}
                />
              ))}
            </div>
          ) : null}

          {!isLoading &&
          !isError &&
          sortedProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-[#D65A31]" />

              <h2 className="mt-3 text-sm font-bold">
                لا توجد عروض حالياً
              </h2>

              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                تابع شهارة باستمرار لاكتشاف العروض
                الجديدة.
              </p>

              <Link
                to="/products"
                className="mt-5 inline-flex rounded-xl bg-[#0E4D64] px-5 py-2.5 text-xs font-bold text-white"
              >
                اكتشف المنتجات
              </Link>
            </div>
          ) : null}
        </section>

        {products[0]?.offer_end_date ? (
          <section className="mt-7 overflow-hidden rounded-3xl bg-[#D65A31] p-5 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold text-white/70">
                  عرض لفترة محدودة
                </p>

                <h2 className="mt-1 text-lg font-black">
                  لا تفوّت السعر الخاص
                </h2>
              </div>

              <OfferTimer
                endDate={products[0].offer_end_date}
              />
            </div>
          </section>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}
