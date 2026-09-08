import { useQuery } from "@tanstack/react-query";

import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { fetchProducts } from "@/lib/db";

/**
 * قسم «منتجات مميزة» في الصفحة الرئيسية.
 * المنتجات تُختار من لوحة التحكم (/admin/featured).
 */
export function FeaturedProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () =>
      fetchProducts({
        featured: true,
        limit: 12,
      }),
    staleTime: 60_000,
  });

  const products = [...(data ?? [])].sort(
    (a, b) => (a.featured_sort ?? 0) - (b.featured_sort ?? 0),
  );

  if (!isLoading && products.length === 0) return null;

  return (
    <section aria-labelledby="featured-products-title" className="space-y-3">
      <div className="px-4">
        <SectionHeading title="منتجات مميزة" to="/products" />
      </div>

      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="w-[168px] shrink-0 snap-start md:w-auto">
                <ProductCardSkeleton />
              </div>
            ))
          : products.map((product) => (
              <div
                key={product.id}
                className="w-[168px] shrink-0 snap-start sm:w-[190px] md:w-auto"
              >
                <ProductCard product={product} />
              </div>
            ))}
      </div>
    </section>
  );
}

export default FeaturedProducts;
