import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpLeft,
  Check,
  Grid2X2,
  Search,
  Sparkles,
  X,
  RefreshCw,
  PackageSearch,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { fetchCategories, fetchProducts, type Category, type Product } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/products")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  head: () => ({
    meta: [
      { title: "الأقسام والبحث | شهارة" },
      { name: "description", content: "تصفح أقسام متجر شهارة وابحث عن المنتجات المتاحة بسهولة." },
    ],
  }),
  component: ProductsPage,
});

const PRODUCT_COLUMNS = "id,category_id,vendor_id,name,description,price,old_price,rating,reviews_count,sales_count,city,images,sizes,colors,badge,is_local,is_active,is_featured,featured_sort,total_stock,stock_left,low_stock_threshold,created_at";

async function searchProducts(term: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("is_active", true)
      .ilike("name", `%${term.trim()}%`)
      .order("sales_count", { ascending: false })
      .limit(48)
      .returns<Product[]>();
    if (error) throw error;
    return (data ?? []).map((p) => ({
      ...p,
      price: Number(p.price) || 0,
      old_price: p.old_price == null ? null : Number(p.old_price) || 0,
      rating: Number(p.rating) || 0,
      reviews_count: Number(p.reviews_count) || 0,
      sales_count: Number(p.sales_count) || 0,
      images: Array.isArray(p.images) ? p.images : [],
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      colors: Array.isArray(p.colors) ? p.colors : [],
      is_local: Boolean(p.is_local),
      is_featured: Boolean(p.is_featured),
      is_active: p.is_active !== false,
      total_stock: Number(p.total_stock) || 0,
      stock_left: Number(p.stock_left) || 0,
      low_stock_threshold: Number(p.low_stock_threshold) || 5,
    }));
  } catch (error) {
    console.warn("[Search] تعذر البحث المباشر؛ تتم محاولة البحث في المنتجات المحفوظة.", error);
    const cached = await fetchProducts({ limit: 250 });
    const needle = term.trim().toLocaleLowerCase("ar");
    return cached.filter((p) => p.is_active !== false && (p.name || "").toLocaleLowerCase("ar").includes(needle)).slice(0, 48);
  }
}

function CategoryCard({ category, index }: { category: Category; index: number }) {
  const image = category.image_url?.trim() || (category.icon?.startsWith("http") || category.icon?.startsWith("/") ? category.icon : null);
  return (
    <Link
      to="/category/$slug"
      params={{ slug: category.slug }}
      aria-label={`تصفح قسم ${category.name}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#0E4D64]/[0.09] bg-white shadow-[0_12px_36px_-28px_rgba(14,77,100,.65)] transition duration-300 hover:-translate-y-1 hover:border-[#D65A31]/35 hover:shadow-[0_20px_44px_-28px_rgba(14,77,100,.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31] active:scale-[.99] dark:border-white/[.08] dark:bg-[#0A2A38]"
    >
      <div className="relative aspect-[1.12] overflow-hidden bg-[#EAF1F3] dark:bg-[#123B4A]">
        {image ? (
          <img src={image} alt={category.name} loading={index < 4 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-[#0E4D64] to-[#0A2A38] text-white">
            <Grid2X2 className="h-9 w-9 text-[#D65A31]" strokeWidth={1.6} />
          </div>
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071B24]/75 via-transparent to-transparent" />
        <span className="absolute start-3 top-3 grid h-8 min-w-8 place-items-center rounded-xl border border-white/20 bg-black/30 px-2 text-[10px] font-black text-white backdrop-blur-sm">{String(index + 1).padStart(2, "0")}</span>
        <span className="absolute bottom-3 end-3 inline-flex min-h-8 items-center gap-1.5 rounded-xl bg-white px-3 text-[10px] font-black text-[#0E4D64] shadow-md transition group-hover:bg-[#D65A31] group-hover:text-white">تصفح القسم <ArrowLeft className="h-3.5 w-3.5" /></span>
      </div>
      <div className="flex flex-1 items-center justify-between gap-2 px-3.5 py-3.5 sm:px-4">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-black text-[#17333D] dark:text-white sm:text-sm">{category.name}</h2>
          <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">اكتشف المنتجات</p>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/[.06] text-[#0E4D64] transition group-hover:bg-[#D65A31]/10 group-hover:text-[#D65A31] dark:bg-white/[.06] dark:text-white"><ArrowUpLeft className="h-4 w-4" /></span>
      </div>
    </Link>
  );
}

function CategorySkeleton() {
  return <div className="overflow-hidden rounded-[24px] border border-[#0E4D64]/[.06] bg-white dark:bg-[#0A2A38]"><div className="aspect-[1.12] animate-pulse bg-slate-100 dark:bg-white/[.05]" /><div className="space-y-2 p-4"><div className="h-4 w-3/5 animate-pulse rounded bg-slate-100 dark:bg-white/[.05]" /><div className="h-3 w-2/5 animate-pulse rounded bg-slate-100 dark:bg-white/[.05]" /></div></div>;
}

function SearchField({ value, onChange, onSubmit, onClear, placeholder, id }: {
  value: string; onChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear?: () => void; placeholder: string; id: string;
}) {
  return (
    <form onSubmit={onSubmit} role="search" className="flex min-h-[54px] items-center gap-2 rounded-[19px] border border-[#0E4D64]/10 bg-white px-3 shadow-[0_8px_26px_-22px_rgba(14,77,100,.65)] focus-within:border-[#D65A31]/45 focus-within:ring-2 focus-within:ring-[#D65A31]/10 dark:border-white/[.08] dark:bg-[#0A2A38]">
      <Search className="ms-1 h-4 w-4 shrink-0 text-[#0E4D64]/55 dark:text-white/45" aria-hidden="true" />
      <label htmlFor={id} className="sr-only">{placeholder}</label>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} type="search" autoComplete="off" placeholder={placeholder} className="min-w-0 flex-1 bg-transparent px-2 py-3 text-xs font-semibold text-foreground outline-none placeholder:text-slate-400" />
      {value ? <button type="button" onClick={onClear} aria-label="مسح البحث" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-[#D65A31] dark:hover:bg-white/[.06]"><X className="h-4 w-4" /></button> : null}
      <button type="submit" className="min-h-10 shrink-0 rounded-xl bg-[#0E4D64] px-4 text-[11px] font-black text-white transition hover:bg-[#0A3D50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31]">بحث</button>
    </form>
  );
}

function ProductsPage() {
  const navigate = useNavigate();
  const { q } = Route.useSearch();
  const term = q.trim();
  const [categoryQuery, setCategoryQuery] = useState("");
  const [searchInput, setSearchInput] = useState(term);
  useEffect(() => setSearchInput(term), [term]);

  const categoriesQuery = useQuery({
    queryKey: ["categories", "directory"], queryFn: fetchCategories,
    staleTime: 1_800_000, gcTime: 3_600_000,
  });
  const categories = categoriesQuery.data ?? [];
  const filteredCategories = useMemo(() => {
    const needle = categoryQuery.trim().toLocaleLowerCase("ar");
    return needle ? categories.filter((c) => (c.name || "").toLocaleLowerCase("ar").includes(needle) || (c.slug || "").toLocaleLowerCase("ar").includes(needle)) : categories;
  }, [categories, categoryQuery]);
  const productsQuery = useQuery({
    queryKey: ["products", "search-results", term], queryFn: () => searchProducts(term),
    enabled: Boolean(term), staleTime: 120_000, gcTime: 900_000,
  });
  const products = productsQuery.data ?? [];

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = searchInput.trim();
    if (next) void navigate({ to: "/products", search: { q: next } });
  };
  const clearSearch = () => {
    setSearchInput("");
    void navigate({ to: "/products", search: { q: "" } });
  };
  const submitCategorySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div dir="rtl" className="min-h-screen overflow-x-clip bg-[#F6F2EE] pb-28 text-foreground dark:bg-[#071B24] md:pb-10">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl">
        {term ? (
          <>
            <section className="px-3 pb-4 pt-4 sm:px-5 sm:pt-6">
              <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0A2A38] via-[#0E4D64] to-[#155C70] px-5 py-7 shadow-[0_25px_60px_-40px_rgba(14,77,100,.8)] sm:px-8 sm:py-9">
                <div aria-hidden="true" className="pointer-events-none absolute -end-20 -top-24 h-60 w-60 rounded-full bg-[#D65A31]/20 blur-3xl" />
                <div className="relative z-10"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3 py-1.5 text-[10px] font-bold text-white/85"><Search className="h-3.5 w-3.5 text-[#F28B68]" /> بحث شهارة</div><h1 className="text-2xl font-black text-white sm:text-3xl">نتائج البحث</h1><p className="mt-2 break-words text-sm font-bold text-white/90">«{term}»</p><p className="mt-2 text-[11px] leading-6 text-white/70">ابحث واكتشف المنتجات المناسبة لك.</p></div>
              </div>
            </section>
            <section className="px-3 sm:px-5"><SearchField id="shehara-results-search" value={searchInput} onChange={setSearchInput} onSubmit={submitSearch} onClear={() => setSearchInput("")} placeholder="ابحث عن منتج آخر..." /></section>
            <section className="flex items-end justify-between gap-3 px-3 pb-4 pt-6 sm:px-5"><div><h2 className="text-base font-black text-[#0E4D64] dark:text-white">المنتجات المطابقة</h2>{!productsQuery.isLoading && !productsQuery.isError ? <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{products.length.toLocaleString("ar-EG")} نتيجة</p> : null}</div><button type="button" onClick={clearSearch} className="min-h-9 rounded-xl px-3 text-[10px] font-black text-[#0E4D64] transition hover:bg-[#0E4D64]/[.06] dark:text-white">عرض الأقسام</button></section>
            {productsQuery.isLoading ? <section aria-busy="true" className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 sm:gap-4 sm:px-5 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</section> : null}
            {productsQuery.isError ? <section className="px-3 sm:px-5"><div className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border border-[#0E4D64]/[.07] bg-white px-6 text-center dark:bg-[#0A2A38]"><Search className="h-8 w-8 text-[#D65A31]" /><h2 className="mt-4 text-sm font-black">تعذر تحميل نتائج البحث</h2><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">تحقق من الاتصال ثم حاول مرة أخرى.</p><button type="button" onClick={() => void productsQuery.refetch()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#0E4D64] px-5 text-xs font-black text-white"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button></div></section> : null}
            {!productsQuery.isLoading && !productsQuery.isError && products.length ? <section className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 sm:gap-4 sm:px-5 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} />)}</section> : null}
            {!productsQuery.isLoading && !productsQuery.isError && !products.length ? <section className="px-3 sm:px-5"><div className="rounded-[28px] border border-[#0E4D64]/[.07] bg-white px-6 py-16 text-center dark:bg-[#0A2A38]"><PackageSearch className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-4 text-base font-black">لم نعثر على منتجات مطابقة</h2><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">جرّب كلمة أقصر أو اسمًا مختلفًا للمنتج.</p><button type="button" onClick={clearSearch} className="mt-5 min-h-11 rounded-2xl bg-[#D65A31] px-5 text-xs font-black text-white">تصفح الأقسام</button></div></section> : null}
          </>
        ) : (
          <>
            <section className="px-3 pb-4 pt-4 sm:px-5 sm:pt-6">
              <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0A2A38] via-[#0E4D64] to-[#155C70] px-5 py-7 shadow-[0_25px_60px_-40px_rgba(14,77,100,.8)] sm:px-8 sm:py-9">
                <div aria-hidden="true" className="pointer-events-none absolute -end-20 -top-24 h-60 w-60 rounded-full bg-[#D65A31]/20 blur-3xl" />
                <div className="relative z-10">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3 py-1.5 text-[10px] font-bold text-white/85"><Sparkles className="h-3.5 w-3.5 text-[#F28B68]" /> تسوّق بلا حدود</div>
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">اكتشف أقسام شهارة</h1>
                  <p className="mt-2 max-w-xl text-[11px] leading-6 text-white/70 sm:text-xs">كل ما تبحث عنه يبدأ من هنا. اختر قسمك وانتقل مباشرة إلى منتجاته.</p>
                  <div className="mt-5 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.08] px-3 py-1.5 text-[10px] font-bold text-white/90"><Grid2X2 className="h-3.5 w-3.5 text-[#F28B68]" />{categoriesQuery.isLoading ? "جارٍ تحميل الأقسام" : `${categories.length.toLocaleString("ar-EG")} قسم`}</span><span className="rounded-full bg-[#D65A31]/15 px-3 py-1.5 text-[10px] font-bold text-[#FFD7C7]">تصفح سريع وسهل</span></div>
                </div>
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 start-10 h-32 w-32 rounded-full border border-white/[.08]" />
              </div>
            </section>
            <section className="px-3 sm:px-5">
              <SearchField id="shehara-category-search" value={categoryQuery} onChange={setCategoryQuery} onSubmit={submitCategorySearch} onClear={() => setCategoryQuery("")} placeholder="ابحث عن القسم الذي تريده..." />
            </section>
            <section className="flex items-end justify-between gap-3 px-3 pb-4 pt-7 sm:px-5">
              <div><p className="text-[10px] font-black tracking-[.16em] text-[#D65A31]">SHEHARA STORE</p><h2 className="mt-1 text-lg font-black text-[#0E4D64] dark:text-white sm:text-xl">تسوّق حسب القسم</h2><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">اختر ما يناسبك من الأقسام المتاحة.</p></div>
              {!categoriesQuery.isLoading && !categoriesQuery.isError ? <span className="shrink-0 rounded-full bg-[#0E4D64]/[.07] px-3 py-1.5 text-[10px] font-black text-[#0E4D64] dark:bg-white/[.06] dark:text-white/80">{filteredCategories.length.toLocaleString("ar-EG")} قسم</span> : null}
            </section>
            {categoriesQuery.isLoading ? <section aria-busy="true" className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 sm:gap-4 sm:px-5 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <CategorySkeleton key={i} />)}</section> : null}
            {categoriesQuery.isError ? <section className="px-3 sm:px-5"><div className="flex min-h-[300px] flex-col items-center justify-center rounded-[28px] border border-[#0E4D64]/[.07] bg-white px-6 text-center dark:bg-[#0A2A38]"><Grid2X2 className="h-9 w-9 text-[#D65A31]" /><h2 className="mt-4 text-sm font-black">تعذر تحميل الأقسام</h2><p className="mt-2 max-w-sm text-xs leading-6 text-slate-500 dark:text-slate-400">حدثت مشكلة مؤقتة أثناء تحميل الأقسام. يمكنك المحاولة مجددًا.</p><button type="button" onClick={() => void categoriesQuery.refetch()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#0E4D64] px-5 text-xs font-black text-white"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button></div></section> : null}
            {!categoriesQuery.isLoading && !categoriesQuery.isError && filteredCategories.length ? <section className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 sm:gap-4 sm:px-5 lg:grid-cols-4 xl:grid-cols-5">{filteredCategories.map((category, index) => <CategoryCard key={category.id} category={category} index={index} />)}</section> : null}
            {!categoriesQuery.isLoading && !categoriesQuery.isError && !filteredCategories.length ? <section className="px-3 sm:px-5"><div className="rounded-[28px] border border-[#0E4D64]/[.07] bg-white px-6 py-16 text-center dark:bg-[#0A2A38]"><Search className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-4 text-base font-black">لم نجد هذا القسم</h2><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">جرّب كلمة أخرى أو اعرض جميع الأقسام.</p><button type="button" onClick={() => setCategoryQuery("")} className="mt-5 min-h-11 rounded-2xl bg-[#D65A31] px-5 text-xs font-black text-white">عرض جميع الأقسام</button></div></section> : null}
            {!categoriesQuery.isLoading && !categoriesQuery.isError && categories.length ? <section className="px-3 pb-8 pt-7 sm:px-5"><div className="flex items-center gap-3 rounded-[24px] border border-[#0E4D64]/[.07] bg-white p-4 shadow-[0_12px_35px_-30px_rgba(14,77,100,.65)] dark:bg-[#0A2A38]"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0E4D64] text-white"><Check className="h-5 w-5 text-[#D65A31]" /></div><div><h3 className="text-xs font-black">اختر القسم ثم اكتشف منتجاته</h3><p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">يمكنك ترتيب المنتجات وتصفيتها داخل كل قسم للوصول إلى ما يناسبك.</p></div></div></section> : null}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

export default ProductsPage;
