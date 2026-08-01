import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { FiltersPanel, SortBar } from "@/components/product-filters";
import {
  fetchCities,
  fetchProducts,
  type ProductFilters,
  type SortKey,
} from "@/lib/db";

type Search = { q?: string | undefined; sort?: SortKey | undefined };

export const Route = createFileRoute("/products")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    sort: typeof search.sort === "string" ? (search.sort as SortKey) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "كل المنتجات | تشكيلات" },
      {
        name: "description",
        content: "تصفح كل منتجات تشكيلات مع ترتيب حسب الأكثر مبيعًا أو السعر وفلاتر متقدمة.",
      },
      { property: "og:title", content: "كل المنتجات | تشكيلات" },
      { property: "og:description", content: "تصفح كل منتجات متجر تشكيلات مع فلاتر وترتيب." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { q, sort: sortParam } = Route.useSearch();
  const navigate = useNavigate();
  const sort: SortKey = sortParam ?? "best";
  const [filters, setFilters] = useState<ProductFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "all", sort, filters],
    queryFn: () => fetchProducts({ sort, filters }),
  });
  const { data: cities = [] } = useQuery({ queryKey: ["cities"], queryFn: fetchCities });

  const list = useMemo(() => {
    const all = products ?? [];
    if (!q) return all;
    const term = q.trim();
    return all.filter(
      (p) => p.name.includes(term) || p.description.includes(term) || p.city.includes(term),
    );
  }, [products, q]);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <SiteHeader />
      <main className="mx-auto max-w-6xl pt-5">
        <div className="flex items-center justify-between gap-2 px-4">
          <h1 className="text-lg text-foreground">
            {q ? `نتائج البحث: ${q}` : "كل المنتجات"}
          </h1>
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
            onSortChange={(s) => void navigate({ to: "/products", search: { q, sort: s } })}
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
                لا توجد منتجات مطابقة
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
