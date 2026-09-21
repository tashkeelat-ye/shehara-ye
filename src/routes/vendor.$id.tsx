import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Package,
  Search,
  Store,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product-card";
import { fetchProducts } from "@/lib/db";

type VendorRow = {
  id: string;
  name: string;
  city: string;
  logo_url: string | null;
  profile_logo_url: string | null;
  cover_image_url: string | null;
  description: string;
  is_active: boolean;
  account_enabled: boolean;
  is_verified: boolean;
};

async function fetchVendor(id: string): Promise<VendorRow | null> {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as Partial<VendorRow>;

  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    city: String(row.city ?? "اليمن"),
    logo_url: row.logo_url ?? null,
    profile_logo_url: row.profile_logo_url ?? null,
    cover_image_url: row.cover_image_url ?? null,
    description: String(row.description ?? ""),
    is_active: Boolean(row.is_active),
    account_enabled: Boolean(row.account_enabled),
    is_verified: Boolean(row.is_verified),
  };
}

export const Route = createFileRoute("/vendor/$id")({
  component: VendorPage,
  head: () => ({
    meta: [
      {
        title: "متجر في شهارة | تسوق بلا حدود",
      },
      {
        name: "description",
        content:
          "تعرّف على المتجر وتصفح جميع منتجاته المتوفرة داخل تطبيق شهارة.",
      },
      {
        property: "og:title",
        content: "متجر في شهارة",
      },
      {
        property: "og:description",
        content: "تصفح منتجات المتجر داخل تطبيق شهارة.",
      },
      {
        property: "og:type",
        content: "website",
      },
    ],
  }),
});

function VendorPage() {
  const { id } = Route.useParams();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "products">(
    "products",
  );

  const {
    data: vendor,
    isLoading: vendorLoading,
    isError: vendorError,
  } = useQuery({
    queryKey: ["vendor", id],
    queryFn: () => fetchVendor(id),
    staleTime: 5 * 60_000,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["vendor-products", id],
    queryFn: () =>
      fetchProducts({
        vendorId: id,
        sort: "best",
        limit: 100,
      }),
    staleTime: 60_000,
  });

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("ar");
    if (!term) return products;

    return products.filter((product) =>
      product.name.toLocaleLowerCase("ar").includes(term),
    );
  }, [products, query]);

  const storeUnavailable =
    !vendorLoading &&
    (vendorError ||
      !vendor ||
      !vendor.is_active ||
      !vendor.account_enabled);

  const productCount = products.length;
  const pageLogo = vendor?.profile_logo_url || vendor?.logo_url || null;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F4F7F8] pb-safe text-foreground dark:bg-[#090909]"
    >
      <SiteHeader />

      {/* SiteHeader already reserves its own fixed-header + safe-area space.
          Do not add another header-height padding here. */}
      <main className="mx-auto w-full max-w-5xl pb-32">
        {storeUnavailable ? (
          <section className="mx-3 mt-4 rounded-[1.75rem] border border-border bg-card p-8 text-center shadow-sm sm:mx-5">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Store className="h-8 w-8" />
            </div>
            <h1 className="text-lg font-black">متجر غير متاح</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              هذا المتجر غير متوفر حالياً.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-1 rounded-xl bg-[#0E4D64] px-5 py-3 text-xs font-black text-white"
            >
              العودة للرئيسية
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <>
            <div className="px-3 pt-3 sm:px-5">
              <Link
                to="/"
                className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 text-xs font-bold text-muted-foreground transition-colors hover:text-[#0E4D64]"
              >
                <ChevronRight className="h-4 w-4" />
                الرئيسية
              </Link>
            </div>

            <section className="relative mt-1 overflow-hidden sm:mx-5 sm:rounded-[2rem]">
              <div className="relative aspect-[16/7] max-h-[260px] min-h-[165px] overflow-hidden bg-[radial-gradient(circle_at_70%_25%,rgba(214,90,49,.38),transparent_28%),linear-gradient(135deg,#082B39,#0E4D64_55%,#D65A31)]">
                {vendor?.cover_image_url ? (
                  <img
                    src={vendor.cover_image_url}
                    alt={`غلاف ${vendor.name}`}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <>
                    <div
                      aria-hidden="true"
                      className="absolute -start-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute -end-20 bottom-[-90px] h-72 w-72 rounded-full bg-black/20 blur-3xl"
                    />
                  </>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/5" />

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-6">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-white/70 sm:text-[10px]">
                      متجر على شهارة
                    </p>

                    <h1 className="mt-1 truncate text-xl font-black text-white sm:text-3xl">
                      {vendorLoading ? "جارٍ التحميل…" : vendor?.name}
                    </h1>

                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-white/80 sm:text-xs">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{vendor?.city || "اليمن"}</span>
                    </div>
                  </div>

                  {vendor?.is_verified ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1.5 text-[9px] font-black text-white backdrop-blur-md sm:px-3 sm:py-2 sm:text-[10px]">
                      <BadgeCheck
                        className="h-4 w-4 fill-[#168BFF] text-white"
                        aria-hidden="true"
                      />
                      موثّق
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="relative mx-3 -mt-9 rounded-[1.5rem] border border-white/[0.08] bg-[#202020] p-3.5 shadow-[0_20px_55px_-25px_rgba(0,0,0,.8)] sm:mx-6 sm:-mt-12 sm:rounded-[1.75rem] sm:p-5">
                <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                  <div className="relative grid h-[68px] w-[68px] shrink-0 place-items-center overflow-hidden rounded-[1.25rem] border-4 border-[#202020] bg-white shadow-xl sm:h-[92px] sm:w-[92px] sm:rounded-2xl">
                    {pageLogo ? (
                      <img
                        src={pageLogo}
                        alt={`شعار ${vendor?.name ?? "التاجر"}`}
                        className="h-full w-full object-contain p-2"
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <Store className="h-8 w-8 text-[#0E4D64] sm:h-9 sm:w-9" />
                    )}

                    {vendor?.is_verified ? (
                      <span
                        className="absolute bottom-0 end-0 grid h-6 w-6 translate-x-1 translate-y-1 place-items-center rounded-full border-2 border-[#202020] bg-[#168BFF] text-white shadow-lg sm:h-7 sm:w-7"
                        title="تاجر موثّق"
                        aria-label="تاجر موثّق"
                      >
                        <BadgeCheck
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                          strokeWidth={2.7}
                        />
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1 text-white">
                    <h2 className="flex min-w-0 items-center gap-1.5 text-[15px] font-black sm:text-xl">
                      <span className="truncate">{vendor?.name}</span>
                      {vendor?.is_verified ? (
                        <BadgeCheck
                          className="h-4 w-4 shrink-0 fill-[#168BFF] text-white sm:h-5 sm:w-5"
                          title="تاجر موثّق"
                          aria-label="تاجر موثّق"
                        />
                      ) : null}
                    </h2>

                    <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-white/60 sm:text-xs">
                      {vendor?.description ||
                        "متجر يقدّم منتجات متنوعة عبر منصة شهارة."}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-1.5 text-[8px] font-bold text-white/75 sm:px-2.5 sm:text-[9px]">
                        <MapPin className="h-3 w-3" />
                        {vendor?.city || "اليمن"}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-1.5 text-[8px] font-bold text-white/75 sm:px-2.5 sm:text-[9px]">
                        <Package className="h-3 w-3" />
                        {productCount.toLocaleString("ar-EG")} منتج
                      </span>

                      {vendor?.is_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#168BFF]/15 px-2 py-1.5 text-[8px] font-black text-[#54B2FF] sm:px-2.5 sm:text-[9px]">
                          <BadgeCheck className="h-3 w-3" />
                          موثّق من شهارة
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-center gap-8 border-t border-white/[0.06] bg-[#242424] px-4 sm:mt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("summary")}
                  className={`relative h-12 px-2 text-[13px] font-black transition-colors sm:h-14 sm:text-sm ${
                    activeTab === "summary"
                      ? "text-[#D65A31]"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  ملخص
                  {activeTab === "summary" ? (
                    <span className="absolute inset-x-1 bottom-0 h-1 rounded-full bg-[#D65A31]" />
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("products")}
                  className={`relative h-12 px-2 text-[13px] font-black transition-colors sm:h-14 sm:text-sm ${
                    activeTab === "products"
                      ? "text-[#D65A31]"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  جميع المنتجات
                  <span className="ms-1 text-[9px] opacity-60 sm:text-[10px]">
                    ({productCount})
                  </span>
                  {activeTab === "products" ? (
                    <span className="absolute inset-x-1 bottom-0 h-1 rounded-full bg-[#D65A31]" />
                  ) : null}
                </button>
              </div>
            </section>

            {activeTab === "summary" ? (
              <section className="mx-3 mt-3 grid grid-cols-2 gap-2.5 sm:mx-5 sm:mt-4 sm:grid-cols-3 sm:gap-3">
                <StatCard
                  icon={<Package className="h-5 w-5" />}
                  value={productCount.toLocaleString("ar-EG")}
                  label="منتجات المتجر"
                />
                <StatCard
                  icon={<MapPin className="h-5 w-5" />}
                  value={vendor?.city || "اليمن"}
                  label="موقع المتجر"
                />
                <StatCard
                  icon={
                    vendor?.is_verified ? (
                      <BadgeCheck className="h-5 w-5" />
                    ) : (
                      <Store className="h-5 w-5" />
                    )
                  }
                  value={vendor?.is_verified ? "موثّق" : "متجر نشط"}
                  label={
                    vendor?.is_verified
                      ? "توثيق شهارة"
                      : "حالة المتجر"
                  }
                />
              </section>
            ) : (
              <section className="mt-3 sm:mt-4">
                <div className="mx-3 rounded-[1.25rem] border border-[#0E4D64]/10 bg-white p-2.5 shadow-[0_15px_40px_-30px_rgba(14,77,100,.7)] dark:border-white/[0.06] dark:bg-[#171717] sm:mx-5 sm:rounded-[1.5rem] sm:p-3">
                  <div className="flex items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="البحث عن منتجات..."
                        aria-label="البحث داخل منتجات التاجر"
                        className="h-11 w-full rounded-xl border border-border bg-secondary/60 ps-10 pe-3 text-xs font-semibold outline-none transition-colors focus:border-[#0E4D64]/30 focus:ring-2 focus:ring-[#0E4D64]/10 sm:h-12 sm:text-sm"
                      />
                    </div>

                    <button
                      type="button"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#D65A31] text-white shadow-sm sm:h-12 sm:w-12"
                      aria-label="خيارات المنتجات"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 px-3 sm:mt-5 sm:px-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-[15px] font-black text-[#17333D] dark:text-white sm:text-lg">
                      منتجات المتجر
                    </h2>
                    <span className="text-[9px] font-bold text-muted-foreground sm:text-[10px]">
                      {filteredProducts.length.toLocaleString("ar-EG")} منتج
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                    {productsLoading
                      ? Array.from({ length: 8 }).map((_, index) => (
                          <ProductCardSkeleton key={index} />
                        ))
                      : filteredProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                          />
                        ))}
                  </div>

                  {!productsLoading && filteredProducts.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card p-8 text-center">
                      <Search className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 text-sm font-bold">
                        لا توجد منتجات مطابقة
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        جرّب البحث باسم منتج آخر.
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-[#0E4D64]/10 bg-white p-3.5 shadow-sm dark:border-white/[0.06] dark:bg-[#171717] sm:p-4">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-[#D65A31]/10 dark:text-[#D65A31] sm:h-11 sm:w-11 sm:rounded-2xl">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black sm:text-base">{value}</p>
          <p className="mt-0.5 text-[9px] font-semibold text-muted-foreground sm:text-[10px]">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

export default VendorPage;
