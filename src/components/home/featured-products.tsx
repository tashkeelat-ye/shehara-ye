import { useQuery } from "@tanstack/react-query";

import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product-card";

import { SectionHeading } from "@/components/section-heading";
import { fetchProducts } from "@/lib/db";
import { AutoScrollRow } from "@/components/home/auto-scroll-row";

export function FeaturedProducts() {
  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: [
      "featured-products",
    ],
    queryFn: () =>
      fetchProducts({
        featured: true,
        limit: 12,
      }),
    staleTime: 60_000,
  });

  const products = [
    ...(data ?? []),
  ].sort(
    (a, b) =>
      (a.featured_sort ?? 0) -
      (b.featured_sort ?? 0),
  );

  if (
    !isLoading &&
    products.length === 0
  ) {
    return null;
  }

  return (
    <section
      aria-label="منتجات مميزة"
      className="
        relative
        space-y-4
        overflow-hidden
        py-1
      "
    >
      <div className="px-4">
        <SectionHeading
          title="منتجات مميزة"
          to="/products"
        />
      </div>

      <AutoScrollRow
        speed={0.34}
        ariaLabel="المنتجات المميزة"
        className="px-4 pb-2"
      >
        {isLoading
          ? Array.from({
              length: 5,
            }).map((_, index) => (
              <div
                key={index}
                className="
                  w-[168px]
                  shrink-0
                  sm:w-[190px]
                "
              >
                <ProductCardSkeleton />
              </div>
            ))
          : products.map(
              (product) => (
                <div
                  key={product.id}
                  className="
                    w-[168px]
                    shrink-0
                    sm:w-[190px]
                  "
                >
                  <ProductCard
                    product={product}
                  />
                </div>
              ),
            )}
      </AutoScrollRow>
    </section>
  );
}

export default FeaturedProducts;
