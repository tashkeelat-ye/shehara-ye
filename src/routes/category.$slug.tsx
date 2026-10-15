import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  Filter,
  Grid2X2,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { FiltersPanel, SortBar } from "@/components/product-filters";
import {
  fetchCategories,
  fetchCategoryBySlug,
  fetchCities,
  fetchProducts,
  type ProductFilters,
  type SortKey,
} from "@/lib/db";
import { getCategorySeo } from "@/lib/seo.functions";
import { buildHead, breadcrumb } from "@/lib/seo";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => getCategorySeo({ data: { id: params.slug } }).catch(() => null),
  head: ({ loaderData, params }) => {
    const name = loaderData?.title ?? "تصفح القسم";
    const path = `/category/${params.slug}`;
    return buildHead({
      path,
      title: `${name} | شهارة`,
      description: loaderData?.description ?? "تصفح منتجات القسم في متجر شهارة مع خيارات الترتيب والفلاتر.",
      image: loaderData?.image ?? null,
      jsonLd: [breadcrumb([{ name: "الرئيسية", path: "/" }, { name: "الأقسام", path: "/products" }, { name, path }])],
    });
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const [sort, setSort] = useState<SortKey>("best");
  const [filters, setFilters] = useState<ProductFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const categoryQuery = useQuery({
    queryKey: ["category", slug], queryFn: () => fetchCategoryBySlug(slug),
    staleTime: 1000 * 60 * 10, gcTime: 1000 * 60 * 30,
  });
  const category = categoryQuery.data;
  const categoriesQuery = useQuery({
    queryKey: ["categories", "directory"], queryFn: fetchCategories,
    staleTime: 1000 * 60 * 30, gcTime: 1000 * 60 * 60,
  });
  const productsQuery = useQuery({
    queryKey: ["products", "category", category?.id, sort, filters],
    queryFn: () => fetchProducts({ categoryId: category?.id, sort, filters }),
    enabled: Boolean(category?.id), staleTime: 1000 * 60 * 2, gcTime: 1000 * 60 * 15,
  });
  const citiesQuery = useQuery({
    queryKey: ["cities"], queryFn: fetchCities, staleTime: 1000 * 60 * 60,
  });
  const list = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const cities = citiesQuery.data ?? [];
  const activeFiltersCount = useMemo(() =>
    Number(filters.minPrice !== undefined) +
    Number(filters.maxPrice !== undefined) +
    Number(filters.minRating !== undefined) +
    Number(Boolean(filters.city)), [filters]);
  const clearFilters = () => setFilters({});
  const categoryImage = category?.image_url?.trim() || (category?.icon?.startsWith("http") || category?.icon?.startsWith("/") ? category.icon : null);

  if (categoryQuery.isLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#F6F2EE] pb-28 dark:bg-[#071B24] md:pb-8">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-3 pt-5 sm:px-5">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          <div className="mt-5 h-40 animate-pulse rounded-[28px] bg-slate-200 dark:bg-white/[.06]" />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (categoryQuery.isError || !category) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#F6F2EE] pb-28 dark:bg-[#071B24] md:pb-8">
        <SiteHeader />
        <main className="mx-auto flex min-h-[65vh] max-w-md flex-col items-center justify-center px-6 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#0E4D64]/[.08] text-[#D65A31]"><Filter className="h-7 w-7" /></div>
          <h1 className="mt-4 text-base font-black text-[#0E4D64] dark:text-white">القسم غير متوفر</h1>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">قد يكون القسم قد حُذف أو لم يعد متاحًا حاليًا.</p>
          <Link to="/products" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0E4D64] px-5 text-xs font-black text-white">تصفح جميع الأقسام <ArrowLeft className="h-4 w-4" /></Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen overflow-x-clip bg-[#F6F2EE] pb-28 text-foreground dark:bg-[#071B24] md:pb-8">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl pt-4 md:pt-6">
        <nav aria-label="مسار التنقل" className="flex items-center gap-2 px-3 text-[10px] text-slate-500 sm:px-5">
          <Link to="/" className="font-bold text-[#0E4D64] hover:text-[#D65A31] dark:text-white">الرئيسية</Link>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <Link to="/products" className="font-bold text-[#0E4D64] hover:text-[#D65A31] dark:text-white">الأقسام</Link>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="truncate font-semibold text-slate-600 dark:text-slate-300">{category.name}</span>
        </nav>

        <section className="px-3 pt-4 sm:px-5">
          <div className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0A2A38] via-[#0E4D64] to-[#155C70] p-5 shadow-[0_24px_60px_-38px_rgba(14,77,100,.75)] sm:p-7">
            {categoryImage ? <img src={categoryImage} alt="" aria-hidden="true" className="absolute inset-y-0 start-0 h-full w-2/5 object-cover opacity-25 [mask-image:linear-gradient(to_left,black,transparent)]" /> : null}
            <div aria-hidden="true" className="absolute -end-16 -top-20 -z-10 h-52 w-52 rounded-full bg-[#D65A31]/20 blur-3xl" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-6">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white shadow-lg sm:h-20 sm:w-20">
                {categoryImage ? <img src={categoryImage} alt="" className="h-full w-full object-cover" /> : <Grid2X2 className="h-8 w-8 text-[#F28B68]" strokeWidth={1.6} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black tracking-[.14em] text-[#F28B68]">SHEHARA · الأقسام</p>
                <h1 className="mt-1.5 text-xl font-black leading-tight text-white sm:text-2xl">{category.name}</h1>
                <p className="mt-2 text-[10px] leading-5 text-white/70 sm:text-xs">اكتشف المنتجات المتاحة في هذا القسم واختر ما يناسبك.</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.08] px-3 py-1.5 text-[10px] font-bold text-white/90">
                  <Grid2X2 className="h-3.5 w-3.5 text-[#F28B68]" />
                  {productsQuery.isLoading ? "جارٍ تحميل المنتجات" : `${list.length.toLocaleString("ar-EG")} منتج ظاهر`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {categories.length > 1 ? (
          <section aria-label="تصفح الأقسام الأخرى" className="mt-4 px-3 sm:px-5">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
              <Link to="/products" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#0E4D64]/10 bg-white px-3 text-[10px] font-bold text-[#0E4D64] transition hover:border-[#D65A31]/40 dark:bg-[#0A2A38] dark:text-white"><Grid2X2 className="h-3.5 w-3.5" /> كل الأقسام</Link>
              {categories.map((item) => (
                <Link key={item.id} to="/category/$slug" params={{ slug: item.slug }} aria-current={item.slug === slug ? "page" : undefined} className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-[10px] font-bold transition ${item.slug === slug ? "border-[#0E4D64] bg-[#0E4D64] text-white" : "border-[#0E4D64]/10 bg-white text-[#0E4D64] hover:border-[#D65A31]/40 dark:bg-[#0A2A38] dark:text-white"}`}>{item.name}</Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-5">
          <div className="flex items-center justify-between gap-3 px-3 sm:px-5">
            <div><h2 className="text-base font-black text-[#0E4D64] dark:text-white sm:text-lg">منتجات القسم</h2><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">رتّب النتائج أو استخدم الفلاتر للوصول إلى ما تريد.</p></div>
            <button type="button" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters} aria-controls="category-mobile-filters" className="relative inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-[#0E4D64]/10 bg-white px-3 text-[11px] font-black text-[#0E4D64] shadow-sm transition hover:border-[#D65A31]/40 dark:bg-[#0A2A38] dark:text-white md:hidden"><SlidersHorizontal className="h-4 w-4" /> الفلاتر{activeFiltersCount > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#D65A31] px-1 text-[9px] font-black text-white">{activeFiltersCount}</span> : null}</button>
          </div>
        </section>

        <div id="category-mobile-filters" className={showFilters ? "mt-3 px-3 md:hidden" : "hidden"}>
          <div className="rounded-2xl border border-[#0E4D64]/10 bg-white p-2 dark:bg-[#0A2A38]"><FiltersPanel filters={filters} onChange={setFilters} cities={cities} /><button type="button" onClick={() => setShowFilters(false)} className="mt-2 min-h-11 w-full rounded-xl bg-[#0E4D64] text-xs font-black text-white">عرض المنتجات</button></div>
        </div>

        <section className="mt-4">
          <SortBar sort={sort} onSortChange={setSort} countLabel={productsQuery.isLoading ? "جارٍ تحميل النتائج…" : `${list.length.toLocaleString("ar-EG")} منتج`} />
        </section>

        <section className="mt-4 grid gap-5 px-3 sm:px-5 md:grid-cols-[230px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden md:block">
            <div className="sticky top-24">
              <div className="mb-3 flex items-center justify-between px-1"><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-[#D65A31]" /><h2 className="text-sm font-black text-[#0E4D64] dark:text-white">تصفية النتائج</h2></div>{activeFiltersCount > 0 ? <button type="button" onClick={clearFilters} className="text-[10px] font-bold text-[#D65A31] hover:underline">مسح الكل</button> : null}</div>
              <FiltersPanel filters={filters} onChange={setFilters} cities={cities} />
            </div>
          </aside>

          <div className="min-w-0">
            {productsQuery.isFetching && !productsQuery.isLoading ? <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#0E4D64]/10"><div className="h-full w-1/3 animate-pulse rounded-full bg-[#D65A31]" /></div> : null}
            {productsQuery.isLoading ? <div aria-busy="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div> : null}
            {!productsQuery.isLoading && productsQuery.isError ? <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[28px] border border-[#0E4D64]/10 bg-white px-6 text-center dark:bg-[#0A2A38]"><RefreshCw className="h-8 w-8 text-[#D65A31]" /><h2 className="mt-4 text-sm font-black">تعذر تحميل منتجات القسم</h2><p className="mt-2 max-w-sm text-xs leading-6 text-slate-500 dark:text-slate-400">حدثت مشكلة مؤقتة. تحقق من الاتصال ثم أعد المحاولة.</p><button type="button" onClick={() => void productsQuery.refetch()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0E4D64] px-5 text-xs font-black text-white"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button></div> : null}
            {!productsQuery.isLoading && !productsQuery.isError && list.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{list.map((product) => <ProductCard key={product.id} product={product} />)}</div> : null}
            {!productsQuery.isLoading && !productsQuery.isError && list.length === 0 ? <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-[#0E4D64]/10 bg-white px-6 text-center dark:bg-[#0A2A38]"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0E4D64]/[.07] text-[#D65A31]"><Filter className="h-6 w-6" /></div><h2 className="mt-4 text-base font-black text-[#0E4D64] dark:text-white">لا توجد منتجات مطابقة</h2><p className="mt-2 max-w-sm text-xs leading-6 text-slate-500 dark:text-slate-400">{activeFiltersCount > 0 ? "جرّب تعديل الفلاتر أو إزالتها لعرض المزيد من المنتجات." : "لا توجد منتجات متاحة في هذا القسم حاليًا."}</p>{activeFiltersCount > 0 ? <button type="button" onClick={clearFilters} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D65A31] px-5 text-xs font-black text-white"><X className="h-4 w-4" /> إزالة الفلاتر</button> : <Link to="/products" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0E4D64] px-5 text-xs font-black text-white">استكشف الأقسام <ArrowLeft className="h-4 w-4" /></Link>}</div> : null}
          </div>
        </section>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
