import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
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
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { fetchCategories } from "@/lib/db";
import { fetchOfferProducts } from "@/lib/offers";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "العروض والتخفيضات | شهارة" },
      {
        name: "description",
        content:
          "تصفح عروض شهارة اليومية والتخفيضات على المنتجات المتوفرة فعليًا.",
      },
    ],
  }),
  component: OffersPage,
});

function Filter({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-black transition active:scale-95 ${
        active
          ? "bg-[#0E4D64] text-white shadow-md dark:bg-[#125B75]"
          : "bg-muted/70 text-foreground/80 hover:bg-muted dark:bg-white/5 dark:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function OffersPage() {
  const [active, setActive] = useState("all");

  const {
    data: offers = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["offers", "all"],
    queryFn: () => fetchOfferProducts(60),
    staleTime: 60000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 600000,
  });

  const used = useMemo(() => {
    const ids = new Set(offers.map((o) => o.category_id));
    return categories.filter((c) => ids.has(c.id));
  }, [offers, categories]);

  const list = useMemo(
    () => (active === "all" ? offers : offers.filter((o) => o.category_id === active)),
    [offers, active]
  );

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-28 text-foreground transition-colors">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-3 pb-6 pt-3 sm:px-5 sm:pt-6">
        {/* بنر العروض الترويجي */}
        <section className="relative mb-5 overflow-hidden rounded-[26px] bg-gradient-to-l from-[#0E4D64] to-[#082C38] px-5 py-7 text-white shadow-lg sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -end-20 -top-24 h-64 w-64 rounded-full border-[30px] border-[#D65A31]/20" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full border-[24px] border-white/10" />

          <div className="relative max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#D65A31]" />
              عروض وتخفيضات شهارة
            </span>

            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
              اكتشف أقوى التخفيضات{" "}
              <span className="block text-[#D65A31]">بأسعار تنافسية</span>
            </h1>

            <p className="mt-2 text-xs leading-5 text-white/80 sm:text-sm">
              منتجات أصلية بعروض حصرية ومحدثة بشكل فوري ومباشر.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
                <BadgePercent className="h-4 w-4 text-[#D65A31]" />
                خصومات فورية
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
                <PackageOpen className="h-4 w-4 text-[#D65A31]" />
                {offers.length.toLocaleString("ar-YE")} منتج متوفر
              </span>
            </div>
          </div>
        </section>

        {/* شريط الفئات السريع */}
        {!isLoading && used.length ? (
          <section className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
            <Filter active={active === "all"} onClick={() => setActive("all")}>
              <Sparkles className="h-3.5 w-3.5" />
              كل العروض
            </Filter>
            {used.map((c) => (
              <Filter
                key={c.id}
                active={active === c.id}
                onClick={() => setActive(c.id)}
              >
                {c.name}
              </Filter>
            ))}
          </section>
        ) : null}

        {/* ترويسة المنتجات */}
        <section className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
              <Flame className="h-4 w-4" />
            </span>
            <h2 className="text-base font-black sm:text-lg">المنتجات المخفضة</h2>
          </div>
          {!isLoading && !isError ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              {list.length.toLocaleString("ar-YE")} منتج
            </span>
          ) : null}
        </section>

        {/* حالة الخطأ */}
        {isError ? (
          <section className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <Tag className="mx-auto h-7 w-7 text-[#D65A31]" />
            <h3 className="mt-3 text-base font-black">تعذر تحميل العروض</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              حدثت مشكلة مؤقتة أثناء جلب العروض من الخادم.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 rounded-xl bg-[#0E4D64] px-5 py-2.5 text-xs font-black text-white transition hover:bg-[#0E4D64]/90"
            >
              إعادة المحاولة
            </button>
          </section>
        ) : null}

        {/* حالة التحميل */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : null}

        {/* حالة عدم توفر منتجات */}
        {!isLoading && !isError && !list.length ? (
          <section className="rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center">
            <Tag className="mx-auto h-8 w-8 text-[#D65A31]" />
            <h3 className="mt-4 text-base font-black">لا توجد عروض في هذه الفئة</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              تابعنا باستمرار للاطلاع على التخفيضات الجديدة حال توفرها.
            </p>
            {active !== "all" ? (
              <button
                type="button"
                onClick={() => setActive("all")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0E4D64] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0E4D64]/90"
              >
                مشاهدة كل العروض
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null}
          </section>
        ) : null}

        {/* شبكة المنتجات */}
        {!isLoading && !isError && list.length ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            <section className="mt-8 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0E4D64] text-white">
                  <PackageOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black sm:text-sm">
                    تسوق بثقة وضمان من شهارة
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    جميع الأسعار والعروض حقيقية ومربوطة مباشرة بمخزون التجار.
                  </p>
                </div>
                <ArrowLeft className="ms-auto hidden h-4 w-4 text-[#D65A31] sm:block" />
              </div>
            </section>
          </>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}

export default OffersPage;
