import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tag } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product-card";
import { fetchCategories } from "@/lib/db";
import { fetchOfferProducts } from "@/lib/offers";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "العروض والتخفيضات | شهارة" },
      {
        name: "description",
        content:
          "تصفح عروض شهارة اليومية والتخفيضات على جميع الفئات: أزياء، إلكترونيات، منزل، ومنتجات يمنية محلية.",
      },
      {
        property: "og:title",
        content: "العروض والتخفيضات | شهارة",
      },
      {
        property: "og:description",
        content:
          "أقوى العروض والتخفيضات في متجر شهارة على جميع الفئات مع توصيل لكل المحافظات.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const [active, setActive] = useState<string>("all");

  const {
    data: offers = [],
    isLoading,
  } = useQuery({
    queryKey: ["offers", "all"],
    queryFn: () => fetchOfferProducts(60),
    staleTime: 60_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 10 * 60_000,
  });

  const usedCategories = useMemo(() => {
    const ids = new Set(offers.map((offer) => offer.category_id));
    return categories.filter((category) => ids.has(category.id));
  }, [offers, categories]);

  const list = useMemo(
    () =>
      active === "all"
        ? offers
        : offers.filter((offer) => offer.category_id === active),
    [offers, active],
  );

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4">
        <header className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Tag className="h-5 w-5" />
          </span>

          <div>
            <h1 className="text-lg font-bold">العروض والتخفيضات</h1>
            <p className="text-xs text-muted-foreground">
              عروض حقيقية على جميع الفئات، تُحدّث من لوحة التحكم
            </p>
          </div>
        </header>

        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActive("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
              active === "all"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-muted text-muted-foreground"
            }`}
          >
            كل العروض
          </button>

          {usedCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActive(category.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                active === category.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-muted text-muted-foreground"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            لا توجد عروض متاحة حالياً — تابعنا قريباً.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}
