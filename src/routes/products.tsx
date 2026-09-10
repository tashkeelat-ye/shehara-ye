import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Filter,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";

import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product-card";

import {
  FiltersPanel,
  SortBar,
} from "@/components/product-filters";

import {
  fetchCities,
  fetchProducts,
  type ProductFilters,
  type SortKey,
} from "@/lib/db";

type SearchParams = {
  q?: string | undefined;
  sort?: SortKey | undefined;
  brand?: string | undefined;
  offers?: boolean | undefined;
};

export const Route = createFileRoute("/products")({
  validateSearch: (
    search: Record<string, unknown>,
  ): SearchParams => ({
    q:
      typeof search["q"] === "string" &&
      search["q"].trim()
        ? search["q"].trim()
        : undefined,

    sort:
      typeof search["sort"] === "string" &&
      [
        "best",
        "newest",
        "price_asc",
        "price_desc",
      ].includes(search["sort"])
        ? (search["sort"] as SortKey)
        : undefined,

    brand:
      typeof search["brand"] === "string" &&
      search["brand"].trim()
        ? search["brand"].trim()
        : undefined,

    offers:
      search["offers"] === true ||
      search["offers"] === "true"
        ? true
        : undefined,
  }),

  head: () => ({
    meta: [
      {
        title: "المنتجات | شهارة",
      },
      {
        name: "description",
        content:
          "تصفح منتجات شهارة واستخدم البحث والترتيب والفلاتر للوصول إلى المنتج المناسب بسهولة.",
      },
      {
        property: "og:title",
        content: "المنتجات | شهارة",
      },
      {
        property: "og:description",
        content:
          "تصفح منتجات متجر شهارة واكتشف المنتجات والعروض المتاحة.",
      },
    ],
  }),

  component: ProductsPage,
});

function ProductsPage() {
  const {
    q,
    sort: sortParam,
    brand,
  } = Route.useSearch();

  const navigate = useNavigate();

  const sort: SortKey =
    sortParam ?? "best";

  const [filters, setFilters] =
    useState<ProductFilters>({});

  const [showFilters, setShowFilters] =
    useState(false);

  const {
    data: products,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "products",
      "all",
      sort,
      filters,
      brand ?? null,
    ],

    queryFn: () =>
      fetchProducts({
        sort,
        filters,
        brandSlug: brand,
      }),

    staleTime: 1000 * 60 * 2,

    gcTime: 1000 * 60 * 15,
  });

  const {
    data: cities = [],
  } = useQuery({
    queryKey: ["cities"],
    queryFn: fetchCities,

    staleTime:
      1000 * 60 * 60,
  });

  /*
   * البحث النصي
   */
  const normalizedQuery =
    q?.trim().toLocaleLowerCase("ar");

  const list = useMemo(() => {
    const all = products ?? [];

    if (!normalizedQuery) {
      return all;
    }

    return all.filter((product) => {
      const name =
        product.name?.toLocaleLowerCase("ar") ??
        "";

      const description =
        product.description?.toLocaleLowerCase(
          "ar",
        ) ?? "";

      const city =
        product.city?.toLocaleLowerCase("ar") ??
        "";

      return (
        name.includes(normalizedQuery) ||
        description.includes(normalizedQuery) ||
        city.includes(normalizedQuery)
      );
    });
  }, [
    products,
    normalizedQuery,
  ]);

  /*
   * عدد الفلاتر النشطة
   */
  const activeFiltersCount =
    Number(
      filters.minPrice !== undefined,
    ) +
    Number(
      filters.maxPrice !== undefined,
    ) +
    Number(
      filters.minRating !== undefined,
    ) +
    Number(Boolean(filters.city));

  /*
   * مسح الفلاتر
   */
  const clearFilters = () => {
    setFilters({});
  };

  /*
   * مسح البحث
   */
  const clearSearch = () => {
    void navigate({
      to: "/products",
      search: {
        sort,
        q: undefined,
      },
    });
  };

  /*
   * تغيير الترتيب
   */
  const updateSort = (
    nextSort: SortKey,
  ) => {
    void navigate({
      to: "/products",
      search: {
        q,
        sort: nextSort,
      },
    });
  };

  /*
   * فتح الفلاتر
   */
  const openFilters = () => {
    setShowFilters(true);
  };

  /*
   * إغلاق الفلاتر
   */
  const closeFilters = () => {
    setShowFilters(false);
  };

  return (
    <div
      dir="rtl"
      className="
        shehara-app
        min-h-screen
        bg-background
        pb-24
        md:pb-8
      "
    >
      <SiteHeader />

      <main
        className="
          mx-auto
          w-full
          max-w-7xl
          pt-4
          md:pt-6
        "
      >
        {/* =====================================================
            رأس الصفحة
            ===================================================== */}

        <section className="px-4">
          <div
            className="
              flex
              items-center
              justify-between
              gap-3
            "
          >
            <div className="min-w-0">
              <h1
                className="
                  text-lg
                  font-extrabold
                  text-foreground
                  md:text-xl
                "
              >
                {q
                  ? "نتائج البحث"
                  : "كل المنتجات"}
              </h1>

              <p
                className="
                  mt-1
                  text-[11px]
                  leading-5
                  text-muted-foreground
                "
              >
                {q
                  ? `المنتجات المطابقة للبحث عن «${q}»`
                  : "اكتشف منتجات شهارة واختر ما يناسبك"}
              </p>
            </div>

            {/* زر الفلاتر للجوال */}
            <button
              type="button"
              onClick={openFilters}
              className="
                relative
                flex
                min-h-10
                shrink-0
                items-center
                gap-2
                rounded-xl
                border
                border-border
                bg-card
                px-3
                text-xs
                font-semibold
                text-foreground
                shadow-sm
                transition-all
                duration-200
                hover:border-primary/30
                hover:text-primary
                active:scale-95
                md:hidden
              "
              aria-expanded={showFilters}
              aria-controls="mobile-product-filters"
            >
              <SlidersHorizontal className="h-4 w-4" />

              <span>
                الفلاتر
              </span>

              {activeFiltersCount > 0 ? (
                <span
                  className="
                    absolute
                    -end-1.5
                    -top-1.5
                    grid
                    min-h-5
                    min-w-5
                    place-items-center
                    rounded-full
                    bg-accent-solid
                    px-1
                    text-[9px]
                    font-bold
                    text-accent-solid-foreground
                  "
                >
                  {activeFiltersCount}
                </span>
              ) : null}
            </button>
          </div>

          {/* ===================================================
              البحث الحالي
              =================================================== */}

          {q ? (
            <div
              className="
                mt-3
                flex
                min-h-10
                items-center
                justify-between
                gap-2
                rounded-xl
                border
                border-primary/15
                bg-brand-soft
                px-3
              "
            >
              <div
                className="
                  flex
                  min-w-0
                  items-center
                  gap-2
                "
              >
                <Search
                  className="
                    h-4
                    w-4
                    shrink-0
                    text-primary
                  "
                  aria-hidden="true"
                />

                <span
                  className="
                    truncate
                    text-xs
                    font-semibold
                    text-primary
                  "
                >
                  {q}
                </span>
              </div>

              <button
                type="button"
                onClick={clearSearch}
                className="
                  grid
                  h-8
                  w-8
                  shrink-0
                  place-items-center
                  rounded-lg
                  text-muted-foreground
                  transition
                  hover:bg-card
                  hover:text-foreground
                "
                aria-label="إلغاء البحث"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </section>

        {/* =====================================================
            الفلاتر للجوال
            Bottom Sheet
            ===================================================== */}

        {showFilters ? (
          <div
            id="mobile-product-filters"
            className="
              fixed
              inset-0
              z-[100]
              md:hidden
            "
            role="dialog"
            aria-modal="true"
            aria-label="فلاتر المنتجات"
          >
            {/* الخلفية */}
            <div
              className="
                absolute
                inset-0
                bg-black/45
                backdrop-blur-[2px]
              "
              onClick={closeFilters}
              aria-hidden="true"
            />

            {/* نافذة الفلاتر */}
            <section
              className="
                absolute
                inset-x-0
                bottom-0
                max-h-[88vh]
                overflow-hidden
                rounded-t-[26px]
                border-t
                border-border/70
                bg-background
                shadow-[0_-20px_60px_-25px_rgba(0,0,0,0.7)]
              "
            >
              {/* المقبض */}
              <div
                className="
                  flex
                  justify-center
                  pt-2.5
                "
              >
                <span
                  className="
                    h-1
                    w-11
                    rounded-full
                    bg-muted-foreground/25
                  "
                />
              </div>

              {/* رأس النافذة */}
              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-b
                  border-border/60
                  px-4
                  py-4
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <span
                    className="
                      grid
                      h-10
                      w-10
                      place-items-center
                      rounded-xl
                      bg-primary/10
                      text-primary
                    "
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                  </span>

                  <div>
                    <h2
                      className="
                        text-base
                        font-extrabold
                        text-foreground
                      "
                    >
                      تصفية المنتجات
                    </h2>

                    <p
                      className="
                        mt-0.5
                        text-[10px]
                        text-muted-foreground
                      "
                    >
                      حدد الخيارات المناسبة لك
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeFilters}
                  className="
                    grid
                    h-9
                    w-9
                    place-items-center
                    rounded-xl
                    bg-secondary
                    text-muted-foreground
                    transition
                    hover:bg-destructive/10
                    hover:text-destructive
                  "
                  aria-label="إغلاق الفلاتر"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* محتوى الفلاتر */}
              <div
                className="
                  max-h-[calc(88vh-145px)]
                  overflow-y-auto
                  overscroll-contain
                  px-4
                  py-4
                "
              >
                <FiltersPanel
                  filters={filters}
                  onChange={setFilters}
                  cities={cities}
                />
              </div>

              {/* زر تطبيق */}
              <div
                className="
                  border-t
                  border-border/60
                  bg-background
                  p-3
                  pb-[max(12px,env(safe-area-inset-bottom))]
                "
              >
                <button
                  type="button"
                  onClick={closeFilters}
                  className="
                    flex
                    min-h-11
                    w-full
                    items-center
                    justify-center
                    rounded-xl
                    bg-primary
                    px-4
                    text-xs
                    font-extrabold
                    text-primary-foreground
                    shadow-sm
                    transition
                    hover:bg-primary/90
                    active:scale-[0.99]
                  "
                >
                  عرض النتائج
                  {list.length > 0
                    ? ` (${list.length.toLocaleString(
                        "ar-EG",
                      )})`
                    : ""}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {/* =====================================================
            شريط الترتيب
            ===================================================== */}

        <section className="mt-4">
          <SortBar
            sort={sort}
            onSortChange={updateSort}
            countLabel={`${list.length.toLocaleString(
              "ar-EG",
            )} منتج`}
          />
        </section>

        {/* =====================================================
            المحتوى الرئيسي
            ===================================================== */}

        <section
          className="
            mt-4
            grid
            gap-5
            px-4
            md:grid-cols-[240px_minmax(0,1fr)]
          "
        >
          {/* ===================================================
              الفلاتر - سطح المكتب
              =================================================== */}

          <aside className="hidden md:block">
            <div className="sticky top-24">
              <div
                className="
                  mb-3
                  flex
                  items-center
                  justify-between
                  px-1
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Filter
                    className="
                      h-4
                      w-4
                      text-primary
                    "
                  />

                  <h2
                    className="
                      text-sm
                      font-bold
                      text-foreground
                    "
                  >
                    تصفية المنتجات
                  </h2>
                </div>

                {activeFiltersCount > 0 ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="
                      text-[10px]
                      font-semibold
                      text-primary
                      transition
                      hover:underline
                    "
                  >
                    مسح الكل
                  </button>
                ) : null}
              </div>

              <FiltersPanel
                filters={filters}
                onChange={setFilters}
                cities={cities}
              />
            </div>
          </aside>

          {/* ===================================================
              المنتجات
              =================================================== */}

          <div className="min-w-0">
            {/* التحميل */}

            {isLoading ? (
              <div
                className="
                  grid
                  grid-cols-2
                  gap-3
                  sm:grid-cols-3
                  lg:grid-cols-4
                "
                aria-busy="true"
                aria-label="جارٍ تحميل المنتجات"
              >
                {Array.from({
                  length: 8,
                }).map((_, index) => (
                  <ProductCardSkeleton
                    key={index}
                  />
                ))}
              </div>
            ) : null}

            {/* الخطأ */}

            {!isLoading && isError ? (
              <div
                className="
                  flex
                  min-h-[320px]
                  flex-col
                  items-center
                  justify-center
                  rounded-3xl
                  border
                  border-destructive/15
                  bg-card
                  px-6
                  text-center
                "
              >
                <div
                  className="
                    grid
                    h-14
                    w-14
                    place-items-center
                    rounded-2xl
                    bg-destructive/10
                    text-destructive
                  "
                >
                  <Search className="h-6 w-6" />
                </div>

                <h2
                  className="
                    mt-4
                    text-sm
                    font-bold
                    text-foreground
                  "
                >
                  تعذر تحميل المنتجات
                </h2>

                <p
                  className="
                    mt-2
                    max-w-sm
                    text-xs
                    leading-6
                    text-muted-foreground
                  "
                >
                  حدثت مشكلة مؤقتة أثناء
                  تحميل المنتجات. حاول مرة
                  أخرى.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void refetch()
                  }
                  className="
                    mt-5
                    rounded-xl
                    bg-primary
                    px-5
                    py-2.5
                    text-xs
                    font-bold
                    text-primary-foreground
                    transition
                    hover:bg-primary/90
                  "
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : null}

            {/* النتائج */}

            {!isLoading &&
            !isError &&
            list.length > 0 ? (
              <>
                {isFetching ? (
                  <div
                    className="
                      mb-3
                      h-1
                      overflow-hidden
                      rounded-full
                      bg-secondary
                    "
                    aria-hidden="true"
                  >
                    <div
                      className="
                        h-full
                        w-1/3
                        animate-pulse
                        rounded-full
                        bg-accent-solid
                      "
                    />
                  </div>
                ) : null}

                <div
                  className="
                    grid
                    grid-cols-2
                    gap-3
                    sm:grid-cols-3
                    lg:grid-cols-4
                  "
                >
                  {list.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  ))}
                </div>
              </>
            ) : null}

            {/* لا توجد نتائج */}

            {!isLoading &&
            !isError &&
            list.length === 0 ? (
              <div
                className="
                  flex
                  min-h-[360px]
                  flex-col
                  items-center
                  justify-center
                  rounded-3xl
                  border
                  border-border
                  bg-card
                  px-6
                  text-center
                "
              >
                <div
                  className="
                    grid
                    h-16
                    w-16
                    place-items-center
                    rounded-2xl
                    bg-secondary
                    text-muted-foreground
                  "
                >
                  <Search className="h-7 w-7" />
                </div>

                <h2
                  className="
                    mt-4
                    text-base
                    font-bold
                    text-foreground
                  "
                >
                  لا توجد منتجات مطابقة
                </h2>

                <p
                  className="
                    mt-2
                    max-w-sm
                    text-xs
                    leading-6
                    text-muted-foreground
                  "
                >
                  جرّب تغيير كلمات البحث أو
                  إزالة بعض الفلاتر للوصول إلى
                  نتائج أكثر.
                </p>

                <div
                  className="
                    mt-5
                    flex
                    flex-wrap
                    justify-center
                    gap-2
                  "
                >
                  {q ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="
                        rounded-xl
                        border
                        border-border
                        bg-card
                        px-4
                        py-2.5
                        text-xs
                        font-semibold
                        text-foreground
                        transition
                        hover:border-primary/30
                        hover:text-primary
                      "
                    >
                      مسح البحث
                    </button>
                  ) : null}

                  {activeFiltersCount > 0 ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="
                        rounded-xl
                        bg-primary
                        px-4
                        py-2.5
                        text-xs
                        font-bold
                        text-primary-foreground
                        transition
                        hover:bg-primary/90
                      "
                    >
                      إزالة الفلاتر
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      {/* =====================================================
          القائمة السفلية
          ===================================================== */}

      <BottomNav />
    </div>
  );
}
