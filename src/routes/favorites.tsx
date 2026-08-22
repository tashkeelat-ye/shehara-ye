import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Loader2, ShoppingBag } from "lucide-react";

import { ProductCard } from "@/components/product-card";
import { useWishlist } from "@/lib/wishlist-context";
import { fetchProductsByIds } from "@/lib/db";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      {
        title: "المفضلة | تشكيلات",
      },
      {
        name: "description",
        content:
          "المنتجات التي أضفتها إلى المفضلة في متجر تشكيلات.",
      },
      {
        name: "robots",
        content: "noindex, follow",
      },
    ],
  }),

  component: FavoritesPage,
});

function FavoritesPage() {
  const {
    wishlistIds,
    loading: wishlistLoading,
    refreshWishlist,
  } = useWishlist();

  const {
    data: products = [],
    isLoading: productsLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["favorite-products", wishlistIds],
    queryFn: () => fetchProductsByIds(wishlistIds),
    enabled: wishlistIds.length > 0,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (wishlistIds.length === 0) {
      return;
    }

    void refetch();
  }, [wishlistIds, refetch]);

  const isLoading =
    wishlistLoading || productsLoading;

  return (
    <main
      dir="rtl"
      className="tashkilat-brand-background min-h-screen pb-28"
    >
      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-[color:var(--brand-gold)]/25 bg-card shadow-card">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,color-mix(in_srgb,var(--brand-gold)_10%,transparent),transparent_30%)]"
          />

          <div className="relative z-10 flex items-center gap-4 p-5 sm:p-6">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[color:var(--brand-burgundy)] text-[color:var(--brand-gold)] shadow-[0_8px_24px_-12px_color-mix(in_srgb,var(--brand-burgundy)_70%,transparent)]">
              <Heart
                className="h-7 w-7"
                fill="currentColor"
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">
                تشكيلات للتسوق
              </p>

              <h1 className="mt-0.5 text-xl font-extrabold text-foreground sm:text-2xl">
                المفضلة
              </h1>

              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                المنتجات التي اخترتها للعودة إليها لاحقاً.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2
              className="h-8 w-8 animate-spin text-[color:var(--brand-gold-deep)]"
              aria-hidden="true"
            />

            <p className="text-sm font-semibold">
              جارٍ تحميل المفضلة...
            </p>
          </div>
        ) : wishlistIds.length === 0 ? (
          <div className="mx-auto mt-8 flex min-h-[42vh] max-w-lg flex-col items-center justify-center rounded-[1.5rem] border border-[color:var(--brand-gold)]/20 bg-card px-6 py-12 text-center shadow-card">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[color:var(--brand-gold)]/10 text-[color:var(--brand-gold-deep)]">
              <Heart
                className="h-9 w-9"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>

            <h2 className="mt-5 text-lg font-extrabold text-foreground">
              المفضلة فارغة
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              لم تضف أي منتجات إلى المفضلة بعد. استكشف منتجات تشكيلات وأضف
              المنتجات التي ترغب في الرجوع إليها لاحقاً.
            </p>

            <Link
              to="/products"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-burgundy)] px-5 text-sm font-bold text-white shadow-[0_8px_24px_-12px_color-mix(in_srgb,var(--brand-burgundy)_70%,transparent)] transition-transform duration-150 hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)] focus-visible:ring-offset-2"
            >
              <ShoppingBag
                className="h-4 w-4"
                aria-hidden="true"
              />

              <span>تصفح المنتجات</span>
            </Link>
          </div>
        ) : products.length === 0 ? (
          <div className="mx-auto mt-8 flex min-h-[35vh] max-w-lg flex-col items-center justify-center rounded-[1.5rem] border border-destructive/20 bg-card px-6 py-10 text-center shadow-card">
            <Heart
              className="h-10 w-10 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden="true"
            />

            <h2 className="mt-4 text-lg font-extrabold text-foreground">
              تعذر تحميل المنتجات
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              قد تكون بعض المنتجات قد أصبحت غير متاحة حالياً.
            </p>

            <button
              type="button"
              onClick={() => {
                void refreshWishlist();
                void refetch();
              }}
              className="mt-5 rounded-xl bg-[color:var(--brand-burgundy)] px-5 py-2.5 text-sm font-bold text-white transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="tashkilat-section-accent">
                <h2 className="text-base font-extrabold text-foreground sm:text-lg">
                  منتجاتك المفضلة
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {products.length.toLocaleString("ar-EG")}{" "}
                  {products.length === 1
                    ? "منتج"
                    : "منتجات"}
                </p>
              </div>

              {isFetching ? (
                <Loader2
                  className="h-4 w-4 animate-spin text-[color:var(--brand-gold-deep)]"
                  aria-label="جارٍ التحديث"
                />
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
