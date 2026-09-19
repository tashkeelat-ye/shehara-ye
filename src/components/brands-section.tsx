import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  Store,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AutoScrollRow } from "@/components/home/auto-scroll-row";

type Brand = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number | null;
};

function BrandLogo({ brand }: { brand: Brand }) {
  return (
    <div
      className="
        relative flex h-[72px] w-full items-center justify-center
        overflow-hidden rounded-[1.35rem]
        border border-[#0E4D64]/[0.06]
        bg-gradient-to-br from-[#F8FAFA] to-[#EAF1F3]
        dark:border-white/[0.06]
        dark:from-[#123B4A] dark:to-[#0A2A38]
      "
    >
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute -end-8 -top-8
          h-20 w-20 rounded-full
          bg-[#D65A31]/[0.07] blur-2xl
          transition-transform duration-500
          group-hover:scale-125
        "
      />

      {brand.logo_url ? (
        <img
          src={brand.logo_url}
          alt={`شعار ${brand.name}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="
            relative z-10 max-h-[52px] max-w-[82%]
            object-contain transition-transform duration-500
            group-hover:scale-105
          "
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span
          className="
            relative z-10 max-w-[90%] truncate px-2
            text-center text-[13px] font-black
            text-[#0E4D64] dark:text-white
          "
        >
          {brand.name}
        </span>
      )}
    </div>
  );
}

function BrandCard({ brand, index }: { brand: Brand; index: number }) {
  return (
    <Link
      to="/products"
      search={{ brand: brand.slug ?? undefined }}
      aria-label={`تصفح منتجات ماركة ${brand.name}`}
      className="
        group relative flex w-[174px] shrink-0 flex-col
        overflow-hidden rounded-[1.5rem]
        border border-[#0E4D64]/[0.08]
        bg-white p-2.5
        shadow-[0_12px_35px_-28px_rgba(14,77,100,0.7)]
        outline-none transition-all duration-300
        hover:-translate-y-1 hover:border-[#D65A31]/25
        hover:shadow-[0_22px_45px_-28px_rgba(14,77,100,0.72)]
        active:scale-[0.98]
        focus-visible:ring-2 focus-visible:ring-[#D65A31]
        dark:border-white/[0.07] dark:bg-[#0A2A38]
        sm:w-[188px]
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -start-8 -bottom-8
          h-20 w-20 rounded-full
          bg-[#0E4D64]/[0.035] blur-2xl
          transition-transform duration-500
          group-hover:scale-125
          dark:bg-[#D65A31]/[0.025]
        "
      />

      <div className="relative">
        <BrandLogo brand={brand} />

        <span
          className="
            absolute start-2 top-2 grid h-6 min-w-6
            place-items-center rounded-full
            bg-white/90 px-1.5 text-[8px] font-black
            text-[#0E4D64] shadow-sm backdrop-blur-md
            dark:bg-[#0A2A38]/90 dark:text-[#D65A31]
          "
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <span
          className="
            absolute end-2 top-2 grid h-6 w-6 place-items-center
            rounded-full bg-[#0E4D64]/[0.07]
            text-[#0E4D64]
            dark:bg-white/[0.06] dark:text-[#D65A31]
          "
          title="ماركة"
        >
          <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
      </div>

      <div className="relative flex items-center justify-between gap-2 px-1 pt-3">
        <div className="min-w-0">
          <h3
            className="
              truncate text-[12px] font-black
              text-[#17333D] transition-colors
              group-hover:text-[#0E4D64]
              dark:text-white dark:group-hover:text-[#D65A31]
            "
          >
            {brand.name}
          </h3>

          <p className="mt-1 text-[8px] font-bold text-muted-foreground">
            تصفح المنتجات
          </p>
        </div>

        <span
          className="
            grid h-7 w-7 shrink-0 place-items-center rounded-full
            bg-[#F3F7F8] text-[#0E4D64]
            transition-all duration-300
            group-hover:bg-[#0E4D64] group-hover:text-white
            dark:bg-white/[0.06] dark:text-[#D65A31]
            dark:group-hover:bg-[#D65A31] dark:group-hover:text-white
          "
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

export function BrandsSection() {
  const {
    data: brands = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["brands"],
    queryFn: async (): Promise<Brand[]> => {
      const { data, error } = await supabase
        .from("brands")
        .select("id,name,slug,logo_url,is_active,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return (data ?? []) as Brand[];
    },
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });

  if (isError || (!isLoading && brands.length === 0)) {
    return null;
  }

  return (
    <section
      dir="rtl"
      aria-labelledby="brands-section-title"
      className="
        relative overflow-hidden rounded-[1.75rem]
        border border-[#0E4D64]/[0.08]
        bg-white py-4
        shadow-[0_20px_55px_-42px_rgba(14,77,100,0.65)]
        dark:border-white/[0.07] dark:bg-[#0A2A38]
        sm:py-5
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -start-20 -top-20
          h-44 w-44 rounded-full
          bg-[#0E4D64]/[0.045] blur-3xl
          dark:bg-[#D65A31]/[0.025]
        "
      />

      <div
        className="
          relative z-10 mb-4 flex items-end
          justify-between gap-3 px-4 sm:px-5
        "
      >
        <div>
          <div
            className="
              mb-1.5 flex items-center gap-2
              text-[10px] font-black text-[#D65A31]
            "
          >
            <Store className="h-3.5 w-3.5" />
            علامات تجارية
          </div>

          <h2
            id="brands-section-title"
            className="
              text-lg font-black tracking-tight
              text-[#0E4D64] dark:text-white sm:text-xl
            "
          >
            تصفح حسب الماركة
          </h2>

          <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
            اكتشف منتجاتك المفضلة من أشهر العلامات
          </p>
        </div>

        <Link
          to="/products"
          className="
            inline-flex shrink-0 items-center gap-1
            rounded-xl px-2 py-2
            text-[10px] font-black
            text-[#0E4D64] transition-colors
            hover:bg-[#0E4D64]/[0.06]
            dark:text-[#D65A31]
          "
        >
          كل الماركات
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      {isLoading ? (
        <AutoScrollRow
          speed={0.18}
          ariaLabel="جارٍ تحميل الماركات"
          className="px-4 pb-1 sm:px-5"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="
                w-[174px] shrink-0 rounded-[1.5rem]
                border border-border bg-card p-2.5 sm:w-[188px]
              "
            >
              <div className="h-[72px] animate-pulse rounded-[1.35rem] bg-muted" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </AutoScrollRow>
      ) : (
        <AutoScrollRow
          speed={0.18}
          ariaLabel="ماركات المتجر"
          className="px-4 pb-1 sm:px-5"
        >
          {brands.map((brand, index) => (
            <BrandCard
              key={brand.id}
              brand={brand}
              index={index}
            />
          ))}
        </AutoScrollRow>
      )}

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-y-0 start-0 z-20
          w-10 bg-gradient-to-r from-white to-transparent
          dark:from-[#0A2A38]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-y-0 end-0 z-20
          w-10 bg-gradient-to-l from-white to-transparent
          dark:from-[#0A2A38]
        "
      />
    </section>
  );
}

export default BrandsSection;
