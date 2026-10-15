import { useMemo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Grid2X2,
  PackageSearch,
  Sparkles,
} from "lucide-react";

import { PromoSlider } from "@/components/promo-slider";
import { StoriesCategories } from "@/components/home/StoriesCategories";
import { FlashSaleSection } from "@/components/home/FlashSaleSection";
import { OffersSection } from "@/components/offers-section";
import { BrandsSection } from "@/components/brands-section";
import { LocalProducts } from "@/components/local-products";
import { TopVendors } from "@/components/home/top-vendors";
import { BannerCarousel4to1 } from "@/components/home/BannerCarousel4to1";
import { DynamicHomeSection } from "@/components/home/DynamicHomeSection";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { BottomNav } from "@/components/bottom-nav";
import { SiteHeader } from "@/components/site-header";
import { fetchCategories, fetchProducts, type Category } from "@/lib/db";
import { fetchHomeSections, type HomeSection } from "@/lib/store";

type SectionMap = Record<string, HomeSection>;
type ProductList = Awaited<ReturnType<typeof fetchProducts>>;

const BUILT_IN_SECTION_KEYS = new Set([
  "stories",
  "hero",
  "categories",
  "popular_categories",
  "flash_sale",
  "offers",
  "banners",
  "best_sellers",
  "new_arrivals",
  "brands",
  "top_vendors",
  "local_products",
  "features",
]);

function SectionSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`
        relative min-w-0 overflow-hidden rounded-3xl
        border border-[#0E4D64]/[0.08] bg-white
        shadow-[0_14px_42px_-32px_rgba(14,77,100,0.48)]
        dark:border-white/[0.07] dark:bg-[#0A2A38]
        ${className}
      `}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-16 -top-16 h-36 w-36 rounded-full bg-[#D65A31]/[0.045] blur-3xl"
      />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  to = "/products",
}: {
  eyebrow: string;
  title: string;
  to?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-4 sm:px-5">
      <div className="min-w-0">
        <p className="mb-1 text-[10px] font-bold text-[#D65A31]">{eyebrow}</p>
        <h2 className="text-base font-black tracking-tight text-[#0E4D64] dark:text-white sm:text-lg">
          {title}
        </h2>
      </div>
      <Link
        to={to}
        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl px-2 text-[10px] font-extrabold text-[#0E4D64] transition-colors hover:bg-[#0E4D64]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31] dark:text-[#E98261]"
      >
        عرض الكل <ArrowLeft className="h-4 w-4" />
      </Link>
    </div>
  );
}

function CategoryShowcase({
  categories,
  loading,
}: {
  categories: Category[];
  loading: boolean;
}) {
  const visible = categories.filter((category) => Boolean(category.name)).slice(0, 8);

  return (
    <SectionSurface className="p-4 sm:p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-bold text-[#D65A31]">اكتشف ما يناسبك</p>
          <h2 className="text-base font-black text-[#0E4D64] dark:text-white sm:text-lg">
            تسوّق حسب القسم
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">وصول أسرع إلى المنتجات التي تبحث عنها</p>
        </div>
        <Link
          to="/products"
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl px-2 text-[10px] font-extrabold text-[#0E4D64] hover:bg-[#0E4D64]/[0.06] dark:text-[#E98261]"
        >
          كل المنتجات <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="aspect-[0.78] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-8">
          {visible.map((category) => (
            <Link
              key={category.id}
              to="/category/$slug"
              params={{ slug: category.slug }}
              className="group min-w-0 rounded-2xl border border-[#0E4D64]/[0.07] bg-[#F8FAFA] p-1.5 text-center transition-colors hover:border-[#D65A31]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31] dark:border-white/[0.06] dark:bg-white/[0.035] sm:p-2"
            >
              <div className="aspect-square overflow-hidden rounded-xl bg-[#EAF1F3] dark:bg-[#123B4A]">
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[#0E4D64] dark:text-[#E98261]">
                    <PackageSearch className="h-6 w-6" strokeWidth={1.6} />
                  </div>
                )}
              </div>
              <span className="mt-2 block truncate text-[10px] font-extrabold text-foreground sm:text-[11px]">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-muted/50 px-3 py-6 text-center text-xs text-muted-foreground">
          ستظهر الأقسام هنا عند توفرها.
        </p>
      )}
    </SectionSurface>
  );
}

function PopularCategories({
  categories,
  products,
}: {
  categories: Category[];
  products: ProductList;
}) {
  const ranked = useMemo(() => {
    const stats = new Map<string, { count: number; sales: number }>();
    for (const product of products) {
      const key = product.category_id;
      const current = stats.get(key) ?? { count: 0, sales: 0 };
      current.count += 1;
      current.sales += Number(product.sales_count) || 0;
      stats.set(key, current);
    }

    return categories
      .map((category) => ({
        ...category,
        productCount: stats.get(category.id)?.count ?? 0,
        salesCount: stats.get(category.id)?.sales ?? 0,
      }))
      .filter((category) => category.productCount > 0)
      .sort(
        (a, b) =>
          b.salesCount - a.salesCount ||
          b.productCount - a.productCount ||
          a.sort_order - b.sort_order,
      )
      .slice(0, 4);
  }, [categories, products]);

  if (!ranked.length) return null;

  return (
    <SectionSurface className="p-4 sm:p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-bold text-[#D65A31]">حسب المنتجات المتاحة</p>
          <h2 className="text-base font-black text-[#0E4D64] dark:text-white sm:text-lg">أقسام تستحق الاستكشاف</h2>
        </div>
        <Link to="/products" className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 text-[10px] font-extrabold text-[#0E4D64] dark:text-[#E98261]">
          استكشف <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {ranked.map((category) => (
          <Link
            key={category.id}
            to="/category/$slug"
            params={{ slug: category.slug }}
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#0E4D64]/[0.07] bg-[#F8FAFA] p-2.5 transition-colors hover:border-[#D65A31]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31] dark:border-white/[0.06] dark:bg-white/[0.035] sm:p-3"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#EAF1F3] dark:bg-[#123B4A]">
              {category.image_url ? (
                <img src={category.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[#0E4D64] dark:text-[#E98261]">
                  <Grid2X2 className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black text-foreground">{category.name}</p>
              <p className="mt-1 text-[9px] text-muted-foreground">
                {category.productCount.toLocaleString("ar-EG")} منتجات
              </p>
            </div>
          </Link>
        ))}
      </div>
    </SectionSurface>
  );
}

function ProductRail({
  title,
  eyebrow,
  products,
  loading,
}: {
  title: string;
  eyebrow: string;
  products: ProductList;
  loading: boolean;
}) {
  return (
    <SectionSurface className="py-4 sm:py-5">
      <div className="mb-4">
        <SectionTitle eyebrow={eyebrow} title={title} />
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden px-4 pb-1 sm:px-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="w-[44%] shrink-0 min-[480px]:w-[31%] sm:w-[220px]">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      ) : products.length ? (
        <>
          <div
            aria-label={title}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 [scrollbar-width:thin] sm:hidden"
          >
            {products.slice(0, 8).map((product) => (
              <div key={product.id} className="w-[44%] min-w-[148px] max-w-[210px] shrink-0 snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
          <div className="hidden grid-cols-2 gap-3 px-4 sm:grid sm:grid-cols-3 sm:px-5 lg:grid-cols-4">
            {products.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      ) : (
        <p className="mx-4 rounded-2xl border border-dashed border-border px-4 py-7 text-center text-xs text-muted-foreground">
          لا توجد منتجات متاحة في هذا القسم حاليًا.
        </p>
      )}
    </SectionSurface>
  );
}

function ServiceHighlights() {
  const items = [
    { title: "خيارات متنوعة", description: "أقسام ومنتجات متعددة", icon: PackageSearch },
    { title: "تجربة تسوق أسهل", description: "تصفح واضح من هاتفك", icon: Sparkles },
    { title: "تجار ومنتجات محلية", description: "اكتشف المنتجات اليمنية", icon: Grid2X2 },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="مميزات شهارة">
      {items.map(({ title, description, icon: Icon }) => (
        <div key={title} className="min-w-0 rounded-2xl border border-[#0E4D64]/[0.07] bg-white/85 px-2 py-3 text-center dark:border-white/[0.07] dark:bg-[#0A2A38]/80 sm:flex sm:items-center sm:gap-3 sm:px-4 sm:text-start">
          <span className="mx-auto grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/[0.08] text-[#0E4D64] dark:bg-white/[0.06] dark:text-[#E98261] sm:mx-0">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="mt-2 truncate text-[10px] font-black text-foreground sm:mt-0 sm:text-xs">{title}</p>
            <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-muted-foreground">{description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomePage() {
  const { data: bestProducts = [], isLoading: bestProductsLoading } = useQuery({
    queryKey: ["products", "best", 24],
    queryFn: () => fetchProducts({ sort: "best", limit: 24 }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const { data: newestProducts = [], isLoading: newestProductsLoading } = useQuery({
    queryKey: ["products", "newest", 8],
    queryFn: () => fetchProducts({ sort: "newest", limit: 8 }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
  });

  const { data: homeSections = [] } = useQuery({
    queryKey: ["home-sections"],
    queryFn: () => fetchHomeSections(false),
    staleTime: 0,
    gcTime: 1000 * 60 * 30,
  });

  const sectionMap = useMemo<SectionMap>(() => {
    const map: SectionMap = {};
    for (const section of homeSections) map[section.section_key] = section;
    return map;
  }, [homeSections]);

  const customSections = useMemo(
    () =>
      homeSections
        .filter(
          (section) =>
            section.section_key.startsWith("custom_") &&
            !BUILT_IN_SECTION_KEYS.has(section.section_key) &&
            section.is_active,
        )
        .sort((a, b) => a.sort_order - b.sort_order),
    [homeSections],
  );

  const orderedSections = useMemo(() => {
    const bestSellers = bestProducts.slice(0, 8);
    const definitions: Array<{ key: string; fallbackOrder: number; content: ReactNode }> = [
      { key: "hero", fallbackOrder: 10, content: <PromoSlider /> },
      { key: "stories", fallbackOrder: 20, content: <StoriesCategories /> },
      { key: "categories", fallbackOrder: 30, content: <CategoryShowcase categories={categories} loading={categoriesLoading} /> },
      { key: "popular_categories", fallbackOrder: 40, content: <PopularCategories categories={categories} products={bestProducts} /> },
      { key: "features", fallbackOrder: 45, content: <ServiceHighlights /> },
      { key: "flash_sale", fallbackOrder: 50, content: <SectionSurface><FlashSaleSection /></SectionSurface> },
      { key: "offers", fallbackOrder: 60, content: <SectionSurface><OffersSection /></SectionSurface> },
      { key: "banners", fallbackOrder: 70, content: <SectionSurface className="border-[#D65A31]/15 bg-[#0E4D64] p-1"><div className="overflow-hidden rounded-[1.4rem]"><BannerCarousel4to1 /></div></SectionSurface> },
      { key: "best_sellers", fallbackOrder: 80, content: <ProductRail title="الأكثر مبيعًا" eyebrow="اختيارات العملاء" products={bestSellers} loading={bestProductsLoading} /> },
      { key: "new_arrivals", fallbackOrder: 90, content: <ProductRail title="وصل حديثًا" eyebrow="أحدث الإضافات" products={newestProducts} loading={newestProductsLoading} /> },
      { key: "brands", fallbackOrder: 100, content: <SectionSurface><BrandsSection /></SectionSurface> },
      { key: "top_vendors", fallbackOrder: 110, content: <SectionSurface><TopVendors /></SectionSurface> },
      { key: "local_products", fallbackOrder: 120, content: <SectionSurface><LocalProducts /></SectionSurface> },
    ];

    return definitions
      .filter(({ key }) => sectionMap[key]?.is_active !== false)
      .map((definition) => ({
        ...definition,
        order: sectionMap[definition.key]?.sort_order ?? definition.fallbackOrder,
      }))
      .concat(
        customSections.map((section) => ({
          key: section.section_key,
          fallbackOrder: section.sort_order,
          order: section.sort_order,
          content: <DynamicHomeSection section={section} />,
        })),
      )
      .sort((a, b) => a.order - b.order || a.fallbackOrder - b.fallbackOrder);
  }, [
    bestProducts,
    bestProductsLoading,
    categories,
    categoriesLoading,
    customSections,
    newestProducts,
    newestProductsLoading,
    sectionMap,
  ]);

  return (
    <div dir="rtl" className="min-h-screen overflow-x-clip bg-[#F6F2EE] text-foreground dark:bg-[#071B24]">
      <div className="relative z-10">
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 pb-28 pt-2 sm:gap-5 sm:px-4 sm:pt-3 lg:px-5">
          {orderedSections.map((section) => (
            <div key={section.key} className="w-full min-w-0">
              {section.content}
            </div>
          ))}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

export default HomePage;
