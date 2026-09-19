import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  MapPin,
  Package,
  Store,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

type TopVendor = {
  id: string;
  name: string;
  city: string;
  logo_url: string | null;
  is_active: boolean;
  account_enabled: boolean;
  productCount: number;
};

async function fetchTopVendors(): Promise<TopVendor[]> {
  const { data: vendors, error: vendorsError } = await supabase
    .from("vendors")
    .select("id,name,city,logo_url,is_active,account_enabled")
    .eq("is_active", true)
    .eq("account_enabled", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (vendorsError) throw vendorsError;

  const list = vendors ?? [];
  if (!list.length) return [];

  const vendorIds = list.map((vendor) => vendor.id);

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("vendor_id")
    .eq("is_active", true)
    .in("vendor_id", vendorIds);

  if (productsError) {
    console.warn("[TopVendors] Failed to load product counts:", productsError);
  }

  const counts = new Map<string, number>();

  for (const row of products ?? []) {
    if (!row.vendor_id) continue;
    counts.set(row.vendor_id, (counts.get(row.vendor_id) ?? 0) + 1);
  }

  return list
    .map((vendor) => ({
      ...vendor,
      productCount: counts.get(vendor.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.productCount - a.productCount ||
        a.name.localeCompare(b.name, "ar"),
    )
    .slice(0, 10);
}

function VendorLogo({ vendor }: { vendor: TopVendor }) {
  return (
    <div
      className="
        relative grid h-[82px] w-full place-items-center overflow-hidden
        rounded-[1.25rem] border border-[#0E4D64]/[0.06]
        bg-gradient-to-br from-[#F7FAFA] to-[#EAF1F3]
        dark:border-white/[0.06] dark:from-[#123B4A] dark:to-[#0A2A38]
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -end-6 -top-7
          h-20 w-20 rounded-full bg-[#D65A31]/[0.07] blur-2xl
        "
      />

      {vendor.logo_url ? (
        <img
          src={vendor.logo_url}
          alt={`شعار ${vendor.name}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="
            relative z-10 h-full w-full object-contain p-3
            transition-transform duration-500 group-hover:scale-105
          "
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div
          className="
            relative z-10 grid h-12 w-12 place-items-center rounded-2xl
            bg-[#0E4D64]/[0.08] text-[#0E4D64]
            dark:bg-white/[0.07] dark:text-[#D65A31]
          "
        >
          <Store className="h-6 w-6" strokeWidth={1.8} />
        </div>
      )}
    </div>
  );
}

function VendorCard({
  vendor,
  index,
}: {
  vendor: TopVendor;
  index: number;
}) {
  return (
    <Link
      to="/vendor/$id"
      params={{ id: vendor.id }}
      aria-label={`فتح متجر ${vendor.name}`}
      className="
        group relative flex w-[178px] shrink-0 flex-col overflow-hidden
        rounded-[1.5rem] border border-[#0E4D64]/[0.08] bg-white p-2.5
        shadow-[0_12px_34px_-26px_rgba(14,77,100,0.65)]
        outline-none transition-all duration-300
        hover:-translate-y-1 hover:border-[#D65A31]/25
        hover:shadow-[0_22px_45px_-28px_rgba(14,77,100,0.75)]
        active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#D65A31]
        dark:border-white/[0.07] dark:bg-[#0A2A38] sm:w-[190px]
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -end-10 -top-10
          h-24 w-24 rounded-full bg-[#0E4D64]/[0.035] blur-3xl
          dark:bg-[#D65A31]/[0.035]
        "
      />

      <div className="relative">
        <VendorLogo vendor={vendor} />

        <span
          className="
            absolute start-2 top-2 grid h-7 min-w-7 place-items-center
            rounded-full border border-white/80 bg-white/90 px-1.5
            text-[9px] font-black text-[#0E4D64] shadow-sm backdrop-blur-md
            dark:border-white/10 dark:bg-[#0A2A38]/90 dark:text-[#D65A31]
          "
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="relative min-w-0 px-1 pt-3">
        <h3
          className="
            truncate text-[13px] font-black leading-5 text-[#17333D]
            transition-colors group-hover:text-[#0E4D64]
            dark:text-white dark:group-hover:text-[#D65A31]
          "
        >
          {vendor.name}
        </h3>

        <div
          className="
            mt-1.5 flex min-w-0 items-center gap-1
            text-[9px] font-medium text-muted-foreground
          "
        >
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{vendor.city || "اليمن"}</span>
        </div>

        <div
          className="
            mt-3 flex items-center justify-between gap-2 rounded-xl
            bg-[#F6F9F9] px-2.5 py-2 dark:bg-white/[0.045]
          "
        >
          <span
            className="
              inline-flex min-w-0 items-center gap-1.5
              text-[9px] font-black text-[#0E4D64] dark:text-[#D65A31]
            "
          >
            <Package className="h-3.5 w-3.5 shrink-0" />
            {vendor.productCount.toLocaleString("ar-EG")}
            <span className="font-bold text-muted-foreground">منتج</span>
          </span>

          <ArrowLeft
            className="
              h-3.5 w-3.5 shrink-0 text-muted-foreground
              transition-transform duration-200 group-hover:-translate-x-0.5
            "
          />
        </div>
      </div>
    </Link>
  );
}

export function TopVendors() {
  const {
    data: vendors = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["top-vendors"],
    queryFn: fetchTopVendors,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });

  if (isError || (!isLoading && vendors.length === 0)) return null;

  return (
    <section
      aria-labelledby="top-vendors-title"
      className="
        relative overflow-hidden rounded-[1.75rem]
        border border-[#0E4D64]/[0.08] bg-white py-4
        shadow-[0_20px_55px_-42px_rgba(14,77,100,0.65)]
        dark:border-white/[0.07] dark:bg-[#0A2A38] sm:py-5
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -end-20 -top-20
          h-44 w-44 rounded-full bg-[#D65A31]/[0.045] blur-3xl
          dark:bg-[#D65A31]/[0.025]
        "
      />

      <div
        className="
          relative z-10 mb-4 flex items-end justify-between gap-3 px-4 sm:px-5
        "
      >
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black text-[#D65A31]">
            <Store className="h-3.5 w-3.5" />
            متاجر مختارة
          </div>

          <h2
            id="top-vendors-title"
            className="text-lg font-black tracking-tight text-[#0E4D64] dark:text-white sm:text-xl"
          >
            أبرز التجار
          </h2>

          <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
            اكتشف متاجر نشطة ومنتجات متنوعة
          </p>
        </div>

        <span
          className="
            hidden shrink-0 rounded-full bg-[#0E4D64]/[0.06]
            px-3 py-1.5 text-[9px] font-black text-[#0E4D64]
            dark:bg-white/[0.06] dark:text-[#D65A31] sm:inline-flex
          "
        >
          {isLoading
            ? "جارٍ التحميل"
            : `${vendors.length.toLocaleString("ar-EG")} متاجر`}
        </span>
      </div>

      {isLoading ? (
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 sm:px-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="
                w-[178px] shrink-0 overflow-hidden rounded-[1.5rem]
                border border-border bg-card p-2.5 sm:w-[190px]
              "
            >
              <div className="h-[82px] animate-pulse rounded-[1.25rem] bg-muted" />
              <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-8 animate-pulse rounded-xl bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="
            no-scrollbar relative z-10 flex gap-3 overflow-x-auto px-4 pb-1
            sm:gap-3.5 sm:px-5
          "
        >
          {vendors.map((vendor, index) => (
            <VendorCard key={vendor.id} vendor={vendor} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}

export default TopVendors;
