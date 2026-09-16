import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  MapPin,
  Store,
} from "lucide-react";

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
  is_active: boolean;
  account_enabled: boolean;
};

async function fetchVendor(
  id: string,
): Promise<VendorRow | null> {
  const {
    data,
    error,
  } = await supabase
    .from("vendors")
    .select(
      "id,name,city,logo_url,is_active,account_enabled",
    )
    .eq(
      "id",
      id,
    )
    .maybeSingle<VendorRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export const Route = createFileRoute(
  "/vendor/$id",
)({
  component:
    VendorPage,

  head: () => ({
    meta: [
      {
        title:
          "متجر في شهارة | تسوق بلا حدود",
      },
      {
        name: "description",
        content:
          "تعرّف على المتجر وتصفح جميع منتجاته المتوفرة داخل تطبيق شهارة للتسوق الإلكتروني في اليمن.",
      },
      {
        property:
          "og:title",
        content:
          "متجر في شهارة",
      },
      {
        property:
          "og:description",
        content:
          "تصفح منتجات المتجر داخل تطبيق شهارة.",
      },
      {
        property:
          "og:type",
        content:
          "website",
      },
      {
        name:
          "twitter:card",
        content:
          "summary_large_image",
      },
    ],
  }),
});

function VendorPage() {
  const { id } =
    Route.useParams();

  const {
    data: vendor,
    isLoading:
      vendorLoading,
    isError:
      vendorError,
  } = useQuery({
    queryKey: [
      "vendor",
      id,
    ],

    queryFn: () =>
      fetchVendor(id),

    staleTime:
      5 * 60_000,
  });

  const {
    data: products = [],
    isLoading:
      productsLoading,
  } = useQuery({
    queryKey: [
      "vendor-products",
      id,
    ],

    queryFn: () =>
      fetchProducts({
        vendorId:
          id,
        sort: "best",
      }),

    staleTime:
      60_000,
  });

  const storeUnavailable =
    !vendorLoading &&
    (
      vendorError ||
      !vendor ||
      !vendor.is_active ||
      !vendor.account_enabled
    );

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-28 pt-4 md:max-w-5xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          <ChevronRight className="h-4 w-4" />
          الرئيسية
        </Link>

        <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-secondary">
            {vendor?.logo_url ? (
              <img
                src={
                  vendor.logo_url
                }
                alt={
                  vendor.name
                    ? `شعار ${vendor.name}`
                    : "شعار المتجر"
                }
                className="h-full w-full object-contain p-1.5"
                onError={(
                  event,
                ) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />
            ) : (
              <Store className="h-7 w-7 text-primary" />
            )}
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-foreground">
              {vendorLoading
                ? "جارٍ التحميل…"
                : vendor
                  ? vendor.name
                  : "متجر غير متاح"}
            </h1>

            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />

              {vendor?.city ||
                "اليمن"}
            </p>
          </div>
        </section>

        {storeUnavailable ? (
          <section className="rounded-2xl border border-border bg-card p-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Store className="h-6 w-6" />
            </div>

            <h2 className="text-sm font-bold text-foreground">
              متجر غير متاح
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              هذا المتجر غير متوفر حالياً.
            </p>
          </section>
        ) : null}

        {!storeUnavailable ? (
          <>
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    منتجات المتجر
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    تصفح المنتجات المتوفرة من هذا التاجر
                  </p>
                </div>

                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {
                    products.length
                  }{" "}
                  منتج
                </span>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {productsLoading
                ? Array.from({
                    length: 4,
                  }).map(
                    (
                      _,
                      index,
                    ) => (
                      <ProductCardSkeleton
                        key={
                          index
                        }
                      />
                    ),
                  )
                : products.map(
                    (
                      product,
                    ) => (
                      <ProductCard
                        key={
                          product.id
                        }
                        product={
                          product
                        }
                      />
                    ),
                  )}
            </div>

            {!productsLoading &&
            products.length ===
              0 ? (
              <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                لا توجد منتجات في هذا المتجر حالياً.
              </p>
            ) : null}
          </>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}
