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

  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    city: String(data.city ?? "اليمن"),
    logo_url: data.logo_url ?? null,
    description: String(data.description ?? ""),
    is_active: Boolean(data.is_active),
    account_enabled: Boolean(data.account_enabled),
    is_verified: Boolean(
      (data as unknown as { is_verified?: boolean }).is_verified,
    ),
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

  const {
    data: products = [],
    isLoading: productsLoading,
  } = useQuery({
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

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F4F7F8] text-foreground dark:bg-[#090909]"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl pb-32 pt-[calc(66px+env(safe-area-inset-top))]">
        {storeUnavailable ? (
          <section className="mx-4 mt-5 rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Store className="h-8 w-8" />
            </div>

            <h1 className="text-lg font-black">
              متجر غير متاح
            </h1>

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
            {/* زر الرجوع */}
            <div className="px-4 pt-3 sm:px-6">
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-[#0E4D64]"
              >
                <ChevronRight className="h-4 w-4" />
                الرئيسية
              </Link>
            </div>

            {/* واجهة المتجر */}
            <section className="relative mt-3 overflow-hidden bg-[#111] shadow-sm sm:rounded-[2rem]">
              {/* غلاف بصري مبني على هوية المتجر دون صورة وهمية */}
              <div className="relative h-[180px] overflow-hidden bg-[radial-gradient(circle_at_70%_25%,rgba(214,90,49,.38),transparent_28%),linear-gradient(135deg,#082B39,#0E4D64_55%,#D65A31)] sm:h-[230px]">
                <div
                  aria-hidden="true"
                  className="absolute -start-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="absolute -end-20 bottom-[-90px] h-72 w-72 rounded-full bg-black/20 blur-3xl"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-6">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white/65">
                      متجر على شهارة
                    </p>

                    <h1 className="mt-1 truncate text-xl font-black text-white sm:text-3xl">
                      {vendorLoading ? "جارٍ التحميل…" : vendor?.name}
                    </h1>

                    <div className="mt-2 flex items-center gap-2 text-xs text-white/75">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{vendor?.city || "اليمن"}</span>
                    </div>
                  </div>

                  {vendor?.is_verified ? (
                    <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black text-white backdrop-blur-md sm:inline-flex">
                      <BadgeCheck
                        className="h-4 w-4 fill-[#168BFF] text-white"
                        aria-hidden="true"
                      />
                      متجر موثّق
                    </span>
                  ) : null}
                </div>
              </div>

              {/* بطاقة التاجر المتداخلة مع الغلاف */}
              <div className="relative mx-4 -mt-10 rounded-[1.75rem] border border-white/[0.08] bg-[#202020] p-4 shadow-[0_20px_55px_-25px_rgba(0,0,0,.8)] sm:mx-6 sm:-mt-12 sm:p-5">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-[#202020] bg-white shadow-xl sm:h-[92px] sm:w-[92px]">
                    {vendor?.logo_url ? (
                      <img
                        src={vendor.logo_url}
                        alt={`شعار ${vendor.name}`}
                        className="h-full w-full object-contain p-2"
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <Store className="h-9 w-9 text-[#0E4D64]" />
                    )}

                    {vendor?.is_verified ? (
                      <span
                        className="absolute bottom-0 end-0 grid h-7 w-7 translate-x-1 translate-y-1 place-items-center rounded-full border-2 border-[#202020] bg-[#168BFF] text-white shadow-lg"
                        title="تاجر موثّق"
                        aria-label="تاجر موثّق"
                      >
                        <BadgeCheck
                          className="h-4 w-4"
                          strokeWidth={2.7}
                        />
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1 text-white">
                    <h2 className="flex min-w-0 items-center gap-1.5 text-base font-black sm:text-xl">
                      <span className="truncate">
                        {vendor?.name}
                      </span>

                      {vendor?.is_verified ? (
                        <BadgeCheck
                          className="h-5 w-5 shrink-0 fill-[#168BFF] text-white"
                          title="تاجر موثّق"
                          aria-label="تاجر موثّق"
                        />
                      ) : null}
                    </h2>

                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/60 sm:text-xs">
                      {vendor?.description ||
                        "متجر يقدّم منتجات متنوعة عبر منصة شهارة."}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2.5 py-1.5 text-[9px] font-bold text-white/75">
                        <MapPin className="h-3 w-3" />
                        {vendor?.city || "اليمن"}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2.5 py-1.5 text-[9px] font-bold text-white/75">
                        <Package className="h-3 w-3" />
                        {productCount.toLocaleString("ar-EG")} منتج
                      </span>

                      {vendor?.is_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#168BFF]/15 px-2.5 py-1.5 text-[9px] font-black text-[#54B2FF]">
                          <BadgeCheck className="h-3 w-3" />
                          موثّق من شهارة
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* التبويبات */}
              <div className="mt-3 flex items-center justify-center gap-8 border-t border-white/[0.06] bg-[#242424] px-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("summary")}
                  className={`relative h-14 px-2 text-sm font-black transition-colors ${
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
                  className={`relative h-14 px-2 text-sm font-black transition-colors ${
                    activeTab === "products"
                      ? "text-[#D65A31]"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  جميع المنتجات
                  <span className="ms-1 text-[10px] opacity-60">
                    ({productCount})
                  </span>
                  {activeTab === "products" ? (
                    <span className="absolute inset-x-1 bottom-0 h-1 rounded-full bg-[#D65A31]" />
                  ) : null}
                </button>
              </div>
            </section>

            {activeTab === "summary" ? (
              <section className="mx-4 mt-4 grid gap-3 sm:mx-6 sm:grid-cols-3">
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
              <section className="mt-4">
                {/* البحث والفلاتر */}
                <div className="mx-4 rounded-[1.5rem] border border-[#0E4D64]/10 bg-white p-3 shadow-[0_15px_40px_-30px_rgba(14,77,100,.7)] dark:border-white/[0.06] dark:bg-[#171717] sm:mx-6">
                  <div className="flex items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                      <input
                        value={query}
                        onChange={(event) =>
                          setQuery(event.target.value)
                        }
                        placeholder="البحث عن منتجات..."
                        aria-label="البحث داخل منتجات التاجر"
                        className="h-11 w-full rounded-xl border border-border bg-secondary/60 ps-10 pe-3 text-xs font-semibold outline-none transition-colors focus:border-[#0E4D64]/30 focus:ring-2 focus:ring-[#0E4D64]/10"
                      />
                    </div>

                    <button
                      type="button"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#D65A31] text-white shadow-sm"
                      aria-label="خيارات المنتجات"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 px-4 sm:px-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-base font-black text-[#17333D] dark:text-white sm:text-lg">
                      المنتجات الموصى بها
                    </h2>

                    <span className="text-[10px] font-bold text-muted-foreground">
                      {filteredProducts.length.toLocaleString("ar-EG")} منتج
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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

            {activeTab === "products" && !productsLoading ? null : null}
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
    <div className="rounded-2xl border border-[#0E4D64]/10 bg-white p-4 shadow-sm dark:border-white/[0.06] dark:bg-[#171717]">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-[#D65A31]/10 dark:text-[#D65A31]">
          {icon}
        </span>

        <div className="min-w-0">
          <p className="truncate text-base font-black">
            {value}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
