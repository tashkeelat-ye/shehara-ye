import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgePercent,
  Check,
  ChevronLeft,
  Flame,
  PackageOpen,
  Sparkles,
  Tag,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product-card";
import { fetchCategories } from "@/lib/db";
import { fetchOfferProducts } from "@/lib/offers";

const BRAND = {
  teal: "#0D3B4D",
  dark: "#0A2A38",
  orange: "#E2723A",
  cream: "#F6F2EE",
};

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
    isError,
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
    <div
      dir="rtl"
      className="min-h-screen bg-[#F6F2EE] text-[#0A2A38]"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-3 pb-28 pt-3 sm:px-5 sm:pt-5">
        {/* Hero */}
        <section className="relative mb-5 overflow-hidden rounded-[28px] bg-[#0D3B4D] shadow-[0_18px_45px_rgba(13,59,77,0.18)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            aria-hidden="true"
          >
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[32px] border-[#E2723A]" />
            <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full border-[26px] border-white" />
            <div className="absolute right-1/3 top-0 h-full w-px rotate-[28deg] bg-white" />
            <div className="absolute right-1/2 top-0 h-full w-px rotate-[28deg] bg-white" />
          </div>

          <div className="relative flex min-h-[190px] items-center justify-between gap-5 px-5 py-7 sm:min-h-[220px] sm:px-8 sm:py-9">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/90 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-[#E2723A]" />
                عروض شهارة
              </div>

              <h1 className="text-2xl font-black leading-tight text-white sm:text-4xl">
                عروض تستحق
                <span className="block text-[#E2723A]">
                  أن تقتنصها
                </span>
              </h1>

              <p className="mt-2 max-w-md text-xs leading-6 text-white/70 sm:text-sm">
                اكتشف التخفيضات الحالية على المنتجات المتوفرة فعليًا
                في متجر شهارة.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-md">
                  <BadgePercent className="h-4 w-4 text-[#E2723A]" />
                  خصومات حقيقية
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-md">
                  <PackageOpen className="h-4 w-4 text-[#E2723A]" />
                  منتجات متاحة
                </div>
              </div>
            </div>

            <div
              className="hidden shrink-0 sm:grid sm:h-32 sm:w-32 sm:place-items-center sm:rounded-[30px] sm:border sm:border-white/10 sm:bg-white/[0.07]"
              aria-hidden="true"
            >
              <div className="grid h-20 w-20 place-items-center rounded-[24px] bg-[#E2723A] shadow-[0_14px_35px_rgba(226,114,58,0.30)]">
                <Tag className="h-9 w-9 text-white" strokeWidth={2} />
              </div>
            </div>
          </div>
        </section>

        {/* Header */}
        <section className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E2723A]/10 text-[#E2723A]">
                <Flame className="h-[18px] w-[18px]" />
              </span>

              <h2 className="text-lg font-black text-[#0A2A38]">
                العروض الحالية
              </h2>
            </div>

            <p className="pr-11 text-[11px] text-[#0A2A38]/55">
              اختر الفئة واستكشف أفضل الأسعار
            </p>
          </div>

          {!isLoading && !isError && offers.length > 0 && (
            <span className="hidden rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#0D3B4D] shadow-sm sm:block">
              {offers.length} عرض
            </span>
          )}
        </section>

        {/* Categories */}
        {!isLoading && usedCategories.length > 0 && (
          <section className="mb-5 overflow-hidden rounded-2xl border border-[#0D3B4D]/[0.06] bg-white/70 p-2 shadow-[0_8px_28px_rgba(13,59,77,0.06)] backdrop-blur-xl">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              <CategoryButton
                active={active === "all"}
                onClick={() => setActive("all")}
              >
                <Sparkles className="h-3.5 w-3.5" />
                كل العروض
              </CategoryButton>

              {usedCategories.map((category) => (
                <CategoryButton
                  key={category.id}
                  active={active === category.id}
                  onClick={() => setActive(category.id)}
                >
                  {category.name}
                </CategoryButton>
              ))}
            </div>
          </section>
        )}

        {/* Error */}
        {isError && (
          <section className="rounded-[24px] border border-[#E2723A]/15 bg-white p-8 text-center shadow-[0_10px_30px_rgba(13,59,77,0.06)]">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#E2723A]/10 text-[#E2723A]">
              <Tag className="h-6 w-6" />
            </div>

            <h3 className="mt-4 text-base font-black text-[#0A2A38]">
              تعذر تحميل العروض
            </h3>

            <p className="mt-1 text-xs leading-6 text-[#0A2A38]/55">
              حدثت مشكلة مؤقتة أثناء جلب العروض. حاول تحديث الصفحة.
            </p>
          </section>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && list.length === 0 && (
          <section className="relative overflow-hidden rounded-[28px] border border-[#0D3B4D]/[0.06] bg-white px-5 py-14 text-center shadow-[0_12px_35px_rgba(13,59,77,0.06)]">
            <div className="pointer-events-none absolute inset-0 opacity-[0.035]">
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full border-[18px] border-[#0D3B4D]" />
              <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full border-[18px] border-[#E2723A]" />
            </div>

            <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[#F6F2EE] text-[#0D3B4D]">
              <Tag className="h-8 w-8" />
            </div>

            <h3 className="relative mt-5 text-lg font-black">
              لا توجد عروض في هذه الفئة
            </h3>

            <p className="relative mx-auto mt-2 max-w-sm text-xs leading-6 text-[#0A2A38]/55">
              تابعنا باستمرار، فالعروض الجديدة تُضاف من لوحة التحكم
              عند توفرها.
            </p>

            {active !== "all" && (
              <button
                type="button"
                onClick={() => setActive("all")}
                className="relative mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0D3B4D] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#0D3B4D]/15 transition-transform active:scale-95"
              >
                مشاهدة كل العروض
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </section>
        )}

        {/* Products */}
        {!isLoading && !isError && list.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#0A2A38]/55">
                <Check className="h-4 w-4 text-[#E2723A]" />
                منتجات بعروض مفعلة
              </div>

              <span className="text-[11px] font-bold text-[#0A2A38]/45">
                {list.length} منتج
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Bottom reassurance */}
        {!isLoading && !isError && list.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-[24px] border border-[#0D3B4D]/[0.06] bg-white/70 p-4 shadow-[0_8px_28px_rgba(13,59,77,0.05)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0D3B4D] text-white">
                <PackageOpen className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-[#0A2A38]">
                  تسوق بثقة من شهارة
                </h3>
                <p className="mt-0.5 text-[11px] leading-5 text-[#0A2A38]/50">
                  المنتجات والأسعار المعروضة مرتبطة ببيانات المتجر
                  الفعلية.
                </p>
              </div>

              <ArrowLeft className="hidden h-5 w-5 text-[#E2723A] sm:block" />
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[11px] font-black transition-all",
        active
          ? "bg-[#0D3B4D] text-white shadow-[0_6px_18px_rgba(13,59,77,0.18)]"
          : "bg-[#F6F2EE] text-[#0A2A38]/65 hover:bg-[#0D3B4D]/5",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
