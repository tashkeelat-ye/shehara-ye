import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
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
  is_verified: boolean;
  productCount: number;
};

async function fetchTopVendors(): Promise<TopVendor[]> {
  const { data: vendors, error: vendorsError } = await supabase
    .from("vendors")
    .select("*")
    .eq("is_active", true)
    .eq("account_enabled", true)
    .limit(20);

  if (vendorsError) throw vendorsError;

  const list = [...(vendors ?? [])].sort(
    (a, b) =>
      new Date(
        String((b as unknown as { created_at?: string }).created_at ?? 0),
      ).getTime() -
      new Date(
        String((a as unknown as { created_at?: string }).created_at ?? 0),
      ).getTime(),
  );

  if (!list.length) return [];

  const vendorIds = list.map((vendor) => vendor.id);

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("vendor_id")
    .eq("is_active", true)
    .in("vendor_id", vendorIds);

  if (productsError) {
    console.warn(
      "[TopVendors] Failed to load product counts:",
      productsError,
    );
  }

  const counts = new Map<string, number>();

  for (const row of products ?? []) {
    if (!row.vendor_id) continue;
    counts.set(
      row.vendor_id,
      (counts.get(row.vendor_id) ?? 0) + 1,
    );
  }

  return list
    .map((vendor) => ({
      ...vendor,
      is_verified: Boolean(
        (vendor as unknown as { is_verified?: boolean }).is_verified,
      ),
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
    <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-[1.25rem] border border-[#0E4D64]/[0.06] bg-gradient-to-br from-[#F7FAFA] to-[#EAF1F3] dark:border-white/[0.06] dark:from-[#123B4A] dark:to-[#0A2A38]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-6 -top-7 h-20 w-20 rounded-full bg-[#D65A31]/[0.07] blur-2xl"
      />

      {vendor.logo_url ? (
        <img
          src={vendor.logo_url}
          alt={`صورة العلامة ${vendor.name}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="relative z-10 h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="relative z-10 grid h-12 w-12 place-items-center rounded-2xl bg-[#0E4D64]/[0.08] text-[#0E4D64] dark:bg-white/[0.07] dark:text-[#D65A31]">
          <Store className="h-6 w-6" strokeWidth={1.8} />
        </div>
      )}

      {vendor.is_verified ? (
        <span
          className="absolute end-2 top-2 z-20 grid h-7 w-7 place-items-center rounded-full bg-[#168BFF] text-white shadow-md ring-2 ring-white dark:ring-[#0A2A38]"
          title="تاجر موثّق"
          aria-label="تاجر موثّق"
        >
          <BadgeCheck className="h-4 w-4" strokeWidth={2.7} />
        </span>
      ) : null}
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
      className="group relative flex w-[148px] shrink-0 flex-col overflow-hidden rounded-[1.4rem] border border-[#0E4D64]/[0.08] bg-white p-2.5 shadow-[0_12px_34px_-26px_rgba(14,77,100,0.65)] outline-none transition-all duration-300 hover:-translate-y-1 hover:border-[#D65A31]/25 hover:shadow-[0_22px_45px_-28px_rgba(14,77,100,0.75)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#D65A31] dark:border-white/[0.07] dark:bg-[#0A2A38] sm:w-[174px]"
    >
      <div className="relative">
        <VendorLogo vendor={vendor} />
        <span className="absolute start-2 top-2 grid h-6 min-w-6 place-items-center rounded-full border border-white/80 bg-white/90 px-1 text-[8px] font-black text-[#0E4D64] shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#0A2A38]/90 dark:text-[#D65A31]">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="relative min-w-0 px-1 pt-2.5">
        <h3 className="flex min-w-0 items-center gap-1 truncate text-[12px] font-black leading-5 text-[#17333D] transition-colors group-hover:text-[#0E4D64] dark:text-white dark:group-hover:text-[#D65A31]">
          <span className="truncate">{vendor.name}</span>
          {vendor.is_verified ? (
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-[#168BFF] text-white" />
          ) : null}
        </h3>

        <div className="mt-1 flex min-w-0 items-center gap-1 text-[8px] font-medium text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{vendor.city || "اليمن"}</span>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-[#F6F9F9] px-2 py-1.5 dark:bg-white/[0.045]">
          <span className="inline-flex min-w-0 items-center gap-1 text-[8px] font-black text-[#0E4D64] dark:text-[#D65A31]">
            <Package className="h-3 w-3 shrink-0" />
            {vendor.productCount.toLocaleString("ar-EG")}
            <span className="font-bold text-muted-foreground">منتج</span>
          </span>
          <ArrowLeft className="h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-x-0.5" />
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
      className="relative overflow-hidden rounded-[1.75rem] border border-[#0E4D64]/[0.08] bg-white py-4 shadow-[0_20px_55px_-42px_rgba(14,77,100,0.65)] dark:border-white/[0.07] dark:bg-[#0A2A38] sm:py-5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-20 -top-20 h-44 w-44 rounded-full bg-[#D65A31]/[0.045] blur-3xl dark:bg-[#D65A31]/[0.025]"
      />

      <div className="relative z-10 mb-4 flex items-end justify-between gap-3 px-4 sm:px-5">
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

        <span className="hidden shrink-0 rounded-full bg-[#0E4D64]/[0.06] px-3 py-1.5 text-[9px] font-black text-[#0E4D64] dark:bg-white/[0.06] dark:text-[#D65A31] sm:inline-flex">
          {isLoading
            ? "جارٍ التحميل"
            : `${vendors.length.toLocaleString("ar-EG")} متاجر`}
        </span>
      </div>

      {isLoading ? (
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-1 sm:gap-3 sm:px-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="w-[148px] shrink-0 overflow-hidden rounded-[1.4rem] border border-border bg-card p-2.5 sm:w-[174px]"
            >
              <div className="aspect-square animate-pulse rounded-[1.25rem] bg-muted" />
              <div className="mt-2.5 h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
              <div className="mt-2.5 h-7 animate-pulse rounded-xl bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div className="no-scrollbar relative z-10 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:gap-3 sm:px-5">
          {vendors.map((vendor, index) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              index={index}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default TopVendors;
