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
import { SiteFooter } from "@/components/site-footer";
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
    ],

    queryFn: () =>
      fetchProducts({
        sort,
        filters,
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

  const clearFilters =
    () => {
      setFilters({});
    };

  const clearSearch =
    () => {
      void navigate({
        to: "/products",
        search: {
          sort,
          q: undefined,
        },
      });
    };

  const updateSort =
    (nextSort: SortKey) => {
      void navigate({
        to: "/products",
        search: {
          q,
          sort: nextSort,
        },
      });
    };

  return (
    <div
      dir="rtl"
      className="shehara-app min-h-screen bg-background pb-24 md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl pt-4 md:pt-6">
        {/* =====================================================
            رأس الصفحة
            ===================================================== */}

        <section className="px-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg font-extrabold text-foreground md:text-xl">
                  {q
                    ? "نتائج البحث"
                    : "كل المنتجات"}
                </h1>

                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  {q
                    ? `المنتجات المطابقة للبحث عن «${q}»`
                    : "اكتشف منتجات شهارة واختر ما يناسبك"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    (value) =>
                      !value,
                  )
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
                  bg-card
                  px-3
                  text-xs
                  font-semibold
                  text-foreground
                  shadow-sm
                  transition
                  hover:border-primary/30
                  hover:text-primary
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

                {activeFiltersCount >
                0 ? (
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

            {/* =================================================
                البحث الحالي
                ================================================= */}

            {q ? (
              <div
                className="
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
                <div className="flex min-w-0 items-center gap-2">
                  <Search
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />

                  <span className="truncate text-xs font-semibold text-primary">
                    {q}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={
                    clearSearch
                  }
                  className="
                    grid
                    h-7
                    w-7
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
          </div>
        </section>

        {/* =====================================================
            الفلاتر للجوال
            ===================================================== */}

        <div
          id="mobile-product-filters"
          className={
            showFilters
              ? "mt-4 block px-4 md:hidden"
              : "hidden"
          }
        >
          <div className="rounded-2xl border border-border/70 bg-card p-1 shadow-sm">
            <FiltersPanel
              filters={filters}
              onChange={setFilters}
              cities={cities}
            />

            <button
              type="button"
              onClick={() =>
                setShowFilters(false)
              }
              className="
                mt-2
                flex
                min-h-10
                w-full
                items-center
                justify-center
                rounded-xl
                bg-primary
                px-4
                text-xs
                font-bold
                text-primary-foreground
                transition
                hover:bg-primary/90
              "
            >
              عرض النتائج
            </button>
          </div>
        </div>

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

        <section className="mt-4 grid gap-5 px-4 md:grid-cols-[240px_minmax(0,1fr)]">
          {/* الفلاتر - سطح المكتب */}

          <aside className="hidden md:block">
            <div className="sticky top-24">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />

                  <h2 className="text-sm font-bold text-foreground">
                    تصفية المنتجات
                  </h2>
                </div>

                {activeFiltersCount >
                0 ? (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="text-[10px] font-semibold text-primary hover:underline"
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
              النتائج
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
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                  <Search className="h-6 w-6" />
                </div>

                <h2 className="mt-4 text-sm font-bold text-foreground">
                  تعذر تحميل المنتجات
                </h2>

                <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
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

            {/* نتائج فعلية */}

            {!isLoading &&
            !isError &&
            list.length > 0 ? (
              <>
                {isFetching ? (
                  <div className="mb-3 h-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-accent-solid" />
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
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-muted-foreground">
                  <Search className="h-7 w-7" />
                </div>

                <h2 className="mt-4 text-base font-bold text-foreground">
                  لا توجد منتجات مطابقة
                </h2>

                <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
                  جرّب تغيير كلمات البحث أو
                  إزالة بعض الفلاتر للوصول إلى
                  نتائج أكثر.
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {q ? (
                    <button
                      type="button"
                      onClick={
                        clearSearch
                      }
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

                  {activeFiltersCount >
                  0 ? (
                    <button
                      type="button"
                      onClick={
                        clearFilters
                      }
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

      <SiteFooter />

      <BottomNav />
    </div>
  );
}
