import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
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

export const Route = createFileRoute(
  "/products",
)({
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

  const [
    showFilters,
    setShowFilters,
  ] = useState(false);

  /*
   * منع تمرير الصفحة خلف نافذة الفلاتر
   */
  useEffect(() => {
    if (!showFilters) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [showFilters]);

  /*
   * إغلاق نافذة الفلاتر بزر Escape
   */
  useEffect(() => {
    if (!showFilters) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setShowFilters(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [showFilters]);

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
    const all =
      products ?? [];

    if (!normalizedQuery) {
      return all;
    }

    return all.filter((product) => {
      const name =
        product.name
          ?.toLocaleLowerCase("ar") ??
        "";

      const description =
        product.description
          ?.toLocaleLowerCase("ar") ??
        "";

      const city =
        product.city
          ?.toLocaleLowerCase("ar") ??
        "";

      return (
        name.includes(
          normalizedQuery,
        ) ||
        description.includes(
          normalizedQuery,
        ) ||
        city.includes(
          normalizedQuery,
        )
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
      filters.minPrice !==
        undefined,
    ) +
    Number(
      filters.maxPrice !==
        undefined,
    ) +
    Number(
      filters.minRating !==
        undefined,
    ) +
    Number(
      Boolean(filters.city),
    );

  /*
   * هل توجد فلاتر؟
   */
  const hasActiveFilters =
    activeFiltersCount > 0;

  /*
   * مسح جميع الفلاتر
   */
  const clearFilters = () => {
    setFilters({});
  };

  /*
   * إغلاق نافذة الفلاتر
   */
  const closeFilters = () => {
    setShowFilters(false);
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
        brand,
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
        brand,
      },
    });
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
      {/* =====================================================
          الرأس الرئيسي
          ===================================================== */}

      <SiteHeader />

      {/* =====================================================
          المحتوى
          ===================================================== */}

      <main
        className="
          mx-auto
          w-full
          max-w-7xl
          pt-4
          md:pt-6
        "
      >
        {/* ===================================================
            رأس صفحة الأقسام
            =================================================== */}

        <section className="px-4">
          <div
            className="
              flex
              flex-col
              gap-4
              rounded-2xl
              border
              border-border/60
              bg-card/70
              p-4
              shadow-sm
              backdrop-blur-sm
              md:p-5
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-primary/10
                      text-primary
                    "
                  >
                    <GridIcon />
                  </span>

                  <div className="min-w-0">
                    <h1
                      className="
                        truncate
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
                        mt-0.5
                        text-[10px]
                        leading-5
                        text-muted-foreground
                        md:text-[11px]
                      "
                    >
                      {q
                        ? `المنتجات المطابقة للبحث عن «${q}»`
                        : "اكتشف منتجات شهارة واختر ما يناسبك"}
                    </p>
                  </div>
                </div>
              </div>

              {/* زر الفلاتر للجوال */}
              <button
                type="button"
                onClick={() =>
                  setShowFilters(true)
                }
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
                  bg-background
                  px-3
                  text-xs
                  font-bold
                  text-foreground
                  shadow-sm
                  transition-all
                  duration-200
                  hover:border-primary/40
                  hover:bg-primary/5
                  hover:text-primary
                  active:scale-95
                  md:hidden
                "
                aria-expanded={
                  showFilters
                }
                aria-controls="mobile-product-filters"
              >
                <SlidersHorizontal className="h-4 w-4" />

                <span>
                  الفلاتر
                </span>

                {hasActiveFilters ? (
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
                      font-extrabold
                      text-accent-solid-foreground
                      shadow-sm
                    "
                  >
                    {activeFiltersCount}
                  </span>
                ) : null}
              </button>
            </div>

            {/* =================================================
                البحث الحالي
                ================================================= */}

            {q ? (
              <div
                className="
                  flex
                  min-h-11
                  items-center
                  justify-between
                  gap-3
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

                  <div className="min-w-0">
                    <span
                      className="
                        block
                        text-[9px]
                        font-medium
                        text-muted-foreground
                      "
                    >
                      نتائج البحث عن
                    </span>

                    <span
                      className="
                        block
                        truncate
                        text-xs
                        font-bold
                        text-primary
                      "
                    >
                      {q}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    clearSearch
                  }
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

            {/* =================================================
                العلامة التجارية النشطة
                ================================================= */}

            {brand ? (
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  rounded-xl
                  border
                  border-primary/10
                  bg-primary/5
                  px-3
                  py-2.5
                "
              >
                <div className="flex items-center gap-2">
                  <span
                    className="
                      grid
                      h-7
                      w-7
                      place-items-center
                      rounded-lg
                      bg-primary/10
                      text-primary
                    "
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>

                  <div>
                    <p
                      className="
                        text-[9px]
                        text-muted-foreground
                      "
                    >
                      العلامة التجارية
                    </p>

                    <p
                      className="
                        text-xs
                        font-bold
                        text-primary
                      "
                    >
                      {brand}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* =====================================================
            نافذة الفلاتر للجوال
            ===================================================== */}

        {showFilters ? (
          <div
            id="mobile-product-filters"
            className="
              fixed
              inset-0
              z-[120]
              md:hidden
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filters-title"
          >
            {/* الخلفية */}
            <button
              type="button"
              aria-label="إغلاق الفلاتر"
              onClick={
                closeFilters
              }
              className="
                absolute
                inset-0
                h-full
                w-full
                cursor-default
                bg-black/45
                backdrop-blur-[2px]
              "
            />

            {/* Bottom Sheet */}
            <div
              className="
                absolute
                inset-x-0
                bottom-0
                max-h-[88vh]
                overflow-hidden
                rounded-t-[28px]
                border-t
                border-border/70
                bg-background
                shadow-[0_-20px_60px_-25px_rgba(0,0,0,0.7)]
              "
            >
              {/* المقبض */}
              <div className="flex justify-center pt-2.5">
                <span
                  className="
                    h-1
                    w-12
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
                <div className="flex items-center gap-3">
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
                      id="mobile-filters-title"
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
                      خصص النتائج حسب ما يناسبك
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    closeFilters
                  }
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

              {/* أزرار التحكم */}
              <div
                className="
                  border-t
                  border-border/60
                  bg-background/95
                  p-3
                  pb-[max(12px,env(safe-area-inset-bottom))]
                  backdrop-blur-xl
                "
              >
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="
                      flex
                      min-h-11
                      flex-1
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-border
                      bg-secondary/70
                      px-4
                      text-[11px]
                      font-bold
                      text-muted-foreground
                      transition
                      hover:border-primary/30
                      hover:bg-primary/5
                      hover:text-primary
                    "
                  >
                    إعادة التعيين
                  </button>

                  <button
                    type="button"
                    onClick={
                      closeFilters
                    }
                    className="
                      flex
                      min-h-11
                      flex-[1.5]
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-primary
                      px-4
                      text-[11px]
                      font-extrabold
                      text-primary-foreground
                      shadow-[0_8px_25px_-15px_rgba(226,114,58,0.9)]
                      transition
                      hover:bg-primary/90
                      active:scale-[0.98]
                    "
                  >
                    <Check className="h-4 w-4" />

                    عرض
                    {list.length.toLocaleString(
                      "ar-EG",
                    )}
                    نتيجة
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* =====================================================
            شريط الترتيب
            ===================================================== */}

        <section className="mt-4">
          <SortBar
            sort={sort}
            onSortChange={
              updateSort
            }
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
          {/* =================================================
              الفلاتر - سطح المكتب
              ================================================= */}

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
                <div className="flex items-center gap-2">
                  <span
                    className="
                      grid
                      h-8
                      w-8
                      place-items-center
                      rounded-lg
                      bg-primary/10
                      text-primary
                    "
                  >
                    <Filter className="h-4 w-4" />
                  </span>

                  <div>
                    <h2
                      className="
                        text-sm
                        font-extrabold
                        text-foreground
                      "
                    >
                      تصفية المنتجات
                    </h2>

                    <p
                      className="
                        text-[9px]
                        text-muted-foreground
                      "
                    >
                      الوصول السريع للمنتج المناسب
                    </p>
                  </div>
                </div>

                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="
                      rounded-lg
                      px-2
                      py-1.5
                      text-[10px]
                      font-bold
                      text-primary
                      transition
                      hover:bg-primary/5
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

          {/* =================================================
              المنتجات
              ================================================= */}

          <div className="min-w-0">
            {/* حالة التحميل */}
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
                }).map(
                  (_, index) => (
                    <ProductCardSkeleton
                      key={index}
                    />
                  ),
                )}
              </div>
            ) : null}

            {/* حالة الخطأ */}
            {!isLoading &&
            isError ? (
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
                  {list.map(
                    (product) => (
                      <ProductCard
                        key={
                          product.id
                        }
                        product={
                          product
                        }
                      />
                    ),
                  )}
                </div>
              </>
            ) : null}

            {/* لا توجد نتائج */}
            {!isLoading &&
            !isError &&
            list.length ===
              0 ? (
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
