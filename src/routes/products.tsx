import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Grid2X2, Search, Sparkles, X } from "lucide-react";
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
      { name: "description", content: "تصفح أقسام متجر شهارة وابحث عن المنتجات المتاحة." },
    ],
  }),
  component: ProductsPage,
});

const BRAND = { teal: "#0D3B4D", dark: "#0A2A38", orange: "#E2723A" } as const;
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
    <Link to="/category/$slug" params={{ slug: category.slug }} className="group overflow-hidden rounded-[24px] border border-[#0D3B4D]/10 bg-white shadow-[0_15px_40px_-32px_rgba(13,59,77,.8)] transition hover:-translate-y-1 hover:border-[#E2723A]/30 active:scale-[.985] dark:border-white/[.07] dark:bg-[#0A2A38]">
      <div className="relative aspect-[1.08] overflow-hidden">
        {image ? <img src={image} alt={category.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : (
          <div className="grid h-full place-items-center" style={{ background: `linear-gradient(135deg,${BRAND.teal},${BRAND.dark})` }}>
            <Grid2X2 className="h-8 w-8 text-[#E2723A]" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A2A38]/80 via-transparent to-transparent" />
        <span className="absolute start-3 top-3 grid h-8 min-w-8 place-items-center rounded-xl bg-black/35 px-2 text-[9px] font-black text-white">{String(index + 1).padStart(2, "0")}</span>
        <span className="absolute bottom-3 end-3 flex items-center gap-1 rounded-xl bg-white/95 px-2.5 py-2 text-[9px] font-black text-[#0D3B4D]">استكشف <ArrowLeft className="h-3.5 w-3.5 text-[#E2723A]" /></span>
      </div>
      <div className="px-4 py-4"><h2 className="truncate text-sm font-black text-[#0A2A38] dark:text-white">{category.name}</h2><p className="mt-2 text-[10px] text-slate-400">منتجات القسم</p></div>
    </Link>
  );
}

function CategorySkeleton() {
  return <div className="overflow-hidden rounded-[24px] bg-white dark:bg-[#0A2A38]"><div className="aspect-[1.08] animate-pulse bg-slate-100 dark:bg-white/5" /><div className="space-y-2 p-4"><div className="h-4 w-3/5 animate-pulse rounded bg-slate-100 dark:bg-white/5" /><div className="h-3 w-4/5 animate-pulse rounded bg-slate-100 dark:bg-white/5" /></div></div>;
}

function ProductsPage() {
  const navigate = useNavigate();
  const { q } = Route.useSearch();
  const term = q.trim();
  const [categoryQuery, setCategoryQuery] = useState("");
  const [searchInput, setSearchInput] = useState(term);
  useEffect(() => setSearchInput(term), [term]);

  const categoriesQuery = useQuery({
    queryKey: ["categories", "directory"],
    queryFn: fetchCategories,
    staleTime: 1_800_000,
    gcTime: 3_600_000,
  });
  const categories = categoriesQuery.data ?? [];
  const filteredCategories = useMemo(() => {
    const needle = categoryQuery.trim().toLocaleLowerCase("ar");
    return needle ? categories.filter((c) => (c.name || "").toLocaleLowerCase("ar").includes(needle) || (c.slug || "").toLocaleLowerCase("ar").includes(needle)) : categories;
  }, [categories, categoryQuery]);

  const productsQuery = useQuery({
    queryKey: ["products", "search-results", term],
    queryFn: () => searchProducts(term),
    enabled: Boolean(term),
    staleTime: 120_000,
    gcTime: 900_000,
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

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F2EE] pb-24 dark:bg-[#071B24] md:pb-8">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl">
        {term ? (
          <>
            <section className="px-3 pb-4 pt-4 sm:px-5 sm:pt-6">
              <div className="relative overflow-hidden rounded-[30px] px-5 py-7 shadow-[0_25px_60px_-40px_rgba(13,59,77,.8)] sm:px-8 sm:py-9" style={{ background: `linear-gradient(135deg,${BRAND.dark},${BRAND.teal})` }}>
                <div className="pointer-events-none absolute -end-20 -top-24 h-60 w-60 rounded-full bg-[#E2723A]/20 blur-3xl" />
                <div className="relative z-10"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3 py-1.5 text-[9px] font-bold text-white/80"><Search className="h-3.5 w-3.5 text-[#E2723A]" /> بحث شهارة</div><h1 className="text-2xl font-black text-white sm:text-3xl">نتائج البحث</h1><p className="mt-2 break-words text-sm font-bold text-white/85">"{term}"</p><p className="mt-2 text-[11px] leading-6 text-white/65">المنتجات المطابقة لعبارة البحث، مرتبة حسب الأكثر مبيعًا.</p></div>
              </div>
            </section>
            <section className="px-3 sm:px-5">
              <form onSubmit={submitSearch} role="search" className="flex min-h-14 items-center gap-2 rounded-[20px] border border-[#0D3B4D]/10 bg-white px-3 shadow-sm dark:border-white/[.07] dark:bg-[#0A2A38]">
                <Search className="ms-1 h-4 w-4 shrink-0 text-[#0D3B4D]/55 dark:text-white/45" aria-hidden="true" />
                <label htmlFor="shehara-results-search" className="sr-only">البحث عن المنتجات</label>
                <input id="shehara-results-search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} type="search" autoComplete="off" placeholder="ابحث عن منتج آخر..." className="min-w-0 flex-1 bg-transparent px-2 text-xs font-semibold outline-none" />
                <button type="submit" className="min-h-10 shrink-0 rounded-xl bg-[#0D3B4D] px-4 text-xs font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2723A]">بحث</button>
                <button type="button" onClick={clearSearch} aria-label="العودة إلى الأقسام" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"><X className="h-4 w-4" /></button>
              </form>
            </section>
            <section className="flex items-center justify-between gap-3 px-3 pb-4 pt-6 sm:px-5"><div><h2 className="text-base font-black text-[#0D3B4D] dark:text-white">المنتجات المطابقة</h2>{!productsQuery.isLoading && !productsQuery.isError ? <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{products.length.toLocaleString("ar-EG")} نتيجة</p> : null}</div><button type="button" onClick={clearSearch} className="min-h-9 rounded-xl px-3 text-[10px] font-black text-[#0D3B4D] dark:text-white">عرض الأقسام</button></section>
            {productsQuery.isLoading ? <section className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 sm:px-5 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</section> : null}
            {productsQuery.isError ? <section className="px-3 sm:px-5"><div className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] bg-white px-6 text-center dark:bg-[#0A2A38]"><Search className="h-8 w-8 text-[#E2723A]" /><h2 className="mt-4 text-sm font-black">تعذر تحميل نتائج البحث</h2><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">تحقق من الاتصال ثم حاول مرة أخرى.</p><button type="button" onClick={() => void productsQuery.refetch()} className="mt-5 rounded-2xl bg-[#0D3B4D] px-5 py-3 text-xs font-black text-white">إعادة المحاولة</button></div></section> : null}
            {!productsQuery.isLoading && !productsQuery.isError && products.length ? <section className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 sm:px-5 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} />)}</section> : null}
            {!productsQuery.isLoading && !productsQuery.isError && !products.length ? <section className="px-3 sm:px-5"><div className="rounded-[28px] bg-white px-6 py-16 text-center dark:bg-[#0A2A38]"><Search className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-4 text-base font-black">لم نعثر على منتجات مطابقة</h2><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">جرّب كلمة أقصر أو اسمًا مختلفًا للمنتج.</p><button type="button" onClick={clearSearch} className="mt-5 rounded-2xl bg-[#E2723A] px-5 py-3 text-xs font-black text-white">تصفح الأقسام</button></div></section> : null}
          </>
        ) : (
          <>
            <section className="px-3 pb-4 pt-4 sm:px-5 sm:pt-6"><div className="relative overflow-hidden rounded-[30px] px-5 py-7 shadow-[0_25px_60px_-40px_rgba(13,59,77,.8)] sm:px-8 sm:py-9" style={{ background: `linear-gradient(135deg,${BRAND.dark},${BRAND.teal})` }}><div className="pointer-events-none absolute -end-20 -top-24 h-60 w-60 rounded-full bg-[#E2723A]/20 blur-3xl" /><div className="relative z-10"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3 py-1.5 text-[9px] font-bold text-white/80"><Sparkles className="h-3.5 w-3.5 text-[#E2723A]" /> تسوق أسهل مع شهارة</div><h1 className="text-2xl font-black text-white sm:text-3xl">اكتشف أقسام شهارة</h1><p className="mt-2 max-w-xl text-[11px] leading-6 text-white/65">اختر القسم الذي تبحث عنه وانتقل مباشرة إلى منتجاته.</p><div className="mt-5 flex gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white/80">{categories.length.toLocaleString("ar-EG")} قسم</span><span className="rounded-full bg-[#E2723A]/15 px-3 py-1.5 text-[10px] font-bold text-[#FFD7C7]">تصفح سريع</span></div></div></div></section>
            <section className="px-3 sm:px-5"><div className="flex h-14 items-center rounded-[20px] border border-[#0D3B4D]/10 bg-white px-3 shadow-sm dark:border-white/[.07] dark:bg-[#0A2A38]"><Search className="ms-2 h-4 w-4 text-[#0D3B4D]/55 dark:text-white/45" /><label htmlFor="shehara-category-search" className="sr-only">البحث داخل الأقسام</label><input id="shehara-category-search" value={categoryQuery} onChange={(e) => setCategoryQuery(e.target.value)} type="search" placeholder="ابحث داخل الأقسام..." className="min-w-0 flex-1 bg-transparent px-3 text-xs font-semibold outline-none" />{categoryQuery ? <button type="button" onClick={() => setCategoryQuery("")} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400" aria-label="مسح البحث"><X className="h-4 w-4" /></button> : null}</div></section>
            <section className="flex items-end justify-between px-3 pb-4 pt-7 sm:px-5"><div><p className="text-[9px] font-black tracking-[.18em] text-[#E2723A]">SHEHARA</p><h2 className="mt-1 text-lg font-black text-[#0D3B4D] dark:text-white">أقسام المتجر</h2></div>{!categoriesQuery.isLoading ? <span className="rounded-full bg-[#0D3B4D]/[.06] px-3 py-1.5 text-[9px] font-black text-[#0D3B4D] dark:bg-white/5 dark:text-white/70">{filteredCategories.length.toLocaleString("ar-EG")} قسم</span> : null}</section>
            {categoriesQuery.isLoading ? <section className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 sm:px-5 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <CategorySkeleton key={i} />)}</section> : null}
            {categoriesQuery.isError ? <section className="px-3 sm:px-5"><div className="flex min-h-[300px] flex-col items-center justify-center rounded-[28px] bg-white px-6 text-center dark:bg-[#0A2A38]"><Grid2X2 className="h-8 w-8 text-[#D65A31]" /><h2 className="mt-4 text-sm font-black">تعذر تحميل الأقسام</h2><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">حدثت مشكلة مؤقتة أثناء تحميل الأقسام.</p><button type="button" onClick={() => void categoriesQuery.refetch()} className="mt-5 rounded-2xl bg-[#0D3B4D] px-5 py-3 text-xs font-black text-white">إعادة المحاولة</button></div></section> : null}
            {!categoriesQuery.isLoading && !categoriesQuery.isError && filteredCategories.length ? <section className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 sm:px-5 lg:grid-cols-4 xl:grid-cols-5">{filteredCategories.map((c, i) => <CategoryCard key={c.id} category={c} index={i} />)}</section> : null}
            {!categoriesQuery.isLoading && !categoriesQuery.isError && !filteredCategories.length ? <section className="px-3 sm:px-5"><div className="rounded-[28px] bg-white px-6 py-16 text-center dark:bg-[#0A2A38]"><Search className="mx-auto h-7 w-7 text-slate-400" /><h2 className="mt-4 text-base font-black">لم نجد هذا القسم</h2><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">جرّب كلمة أخرى للبحث.</p><button type="button" onClick={() => setCategoryQuery("")} className="mt-5 rounded-2xl bg-[#E2723A] px-5 py-3 text-xs font-black text-white">عرض جميع الأقسام</button></div></section> : null}
            {!categoriesQuery.isLoading && !categoriesQuery.isError && categories.length ? <section className="px-3 pb-8 pt-7 sm:px-5"><div className="flex items-center gap-3 rounded-[24px] bg-white p-4 dark:bg-[#0A2A38]"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0D3B4D] text-white"><Check className="h-5 w-5 text-[#E2723A]" /></div><div><h3 className="text-xs font-black">اختر القسم أولاً</h3><p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">بعد اختيار القسم ستظهر منتجاته مع أدوات التصفية والترتيب.</p></div></div></section> : null}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

export default ProductsPage;
