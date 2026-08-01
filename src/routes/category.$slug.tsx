import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { FiltersPanel, SortBar } from "@/components/product-filters";
import {
  fetchCategoryBySlug,
  fetchCities,
  fetchProducts,
  type ProductFilters,
  type SortKey,
} from "@/lib/db";

export const Route = createFileRoute("/category/$slug")({
  head: () => ({
    meta: [
      { title: "تصفح الفئة | تشكيلات" },
      {
        name: "description",
        content: "منتجات الفئة مع ترتيب حسب الأكثر مبيعًا أو الأحدث أو السعر وفلاتر جانبية.",
      },
      { property: "og:title", content: "تصفح الفئة | تشكيلات" },
      { property: "og:description", content: "منتجات الفئة في متجر تشكيلات." },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const [sort, setSort] = useState<SortKey>("best");
  const [filters, setFilters] = useState<ProductFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: () => fetchCategoryBySlug(slug),
  });
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "category", category?.id, sort, filters],
    queryFn: () => fetchProducts({ categoryId: category?.id, sort, filters }),
    enabled: Boolean(category?.id),
  });
  const { data: cities = [] } = useQuery({ queryKey: ["cities"], queryFn: fetchCities });

  const list = products ?? [];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <SiteHeader />
      <main className="mx-auto max-w-6xl pt-5">
        <nav className="px-4 text-[11px] text-muted-foreground">
          <Link to="/" className="text-primary">
            الرئيسية
          </Link>{" "}
          / {category?.name ?? "الفئة"}
        </nav>
        <div className="mt-1 flex items-center justify-between gap-2 px-4">
          <h1 className="text-lg text-foreground">{category?.name ?? "الفئة"}</h1>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs text-foreground md:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            الفلاتر
          </button>
        </div>

        <div className="mt-3">
          <SortBar
            sort={sort}
            onSortChange={setSort}
            countLabel={`${list.length.toLocaleString("ar-EG")} منتج`}
          />
        </div>

        <div className="mt-4 grid gap-4 px-4 md:grid-cols-[240px_minmax(0,1fr)]">
          <div className={showFilters ? "block" : "hidden md:block"}>
            <FiltersPanel filters={filters} onChange={setFilters} cities={cities} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
            ) : list.length === 0 ? (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                لا توجد منتجات في هذه الفئة حاليًا
              </p>
            ) : (
              list.map((p) => <ProductCard key={p.id} product={p} />)
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
