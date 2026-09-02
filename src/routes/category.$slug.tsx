import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Filter,
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
  fetchCategoryBySlug,
  fetchCities,
  fetchProducts,
  type ProductFilters,
  type SortKey,
} from "@/lib/db";

export const Route =
  createFileRoute(
    "/category/$slug",
  )({
    head: () => ({
      meta: [
        {
          title:
            "تصفح الفئة | شهارة",
        },
        {
          name: "description",
          content:
            "تصفح منتجات الفئة في متجر شهارة مع خيارات الترتيب والفلاتر.",
        },
      ],
    }),

    component:
      CategoryPage,
  });

function CategoryPage() {
  const { slug } =
    Route.useParams();

  const [sort, setSort] =
    useState<SortKey>(
      "best",
    );

  const [filters, setFilters] =
    useState<ProductFilters>({});

  const [
    showFilters,
    setShowFilters,
  ] = useState(false);

  const {
    data: category,
    isLoading:
      categoryLoading,
    isError:
      categoryError,
  } = useQuery({
    queryKey: [
      "category",
      slug,
    ],

    queryFn: () =>
      fetchCategoryBySlug(
        slug,
      ),

    staleTime:
      1000 * 60 * 10,

    gcTime:
      1000 * 60 * 30,
  });

  const {
    data: products,
    isLoading:
      productsLoading,
    isFetching,
    isError:
      productsError,
    refetch,
  } = useQuery({
    queryKey: [
      "products",
      "category",
      category?.id,
      sort,
      filters,
    ],

    queryFn: () =>
      fetchProducts({
        categoryId:
          category?.id,
        sort,
        filters,
      }),

    enabled:
      Boolean(
        category?.id,
      ),

    staleTime:
      1000 * 60 * 2,

    gcTime:
      1000 * 60 * 15,
  });

  const {
    data: cities = [],
  } = useQuery({
    queryKey: ["cities"],
    queryFn: fetchCities,

    staleTime:
      1000 * 60 * 60,
  });

  const list =
    products ?? [];

  const activeFiltersCount =
    useMemo(
      () =>
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
          Boolean(
            filters.city,
          ),
        ),
      [filters],
    );

  const clearFilters =
    () =>
      setFilters({});

  if (
    categoryLoading
  ) {
    return (
      <div
        dir="rtl"
        className="shehara-app min-h-screen bg-background pb-24"
      >
        <SiteHeader />

        <main className="mx-auto max-w-7xl px-4 pt-6">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />

          <div className="mt-3 h-7 w-40 animate-pulse rounded bg-muted" />

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
        </main>

        <BottomNav />
      </div>
    );
  }

  if (
    categoryError ||
    !category
  ) {
    return (
      <div
        dir="rtl"
        className="shehara-app min-h-screen bg-background pb-24"
      >
        <SiteHeader />

        <main className="mx-auto flex min-h-[65vh] max-w-md flex-col items-center justify-center px-6 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <Filter className="h-7 w-7" />
          </div>

          <h1 className="mt-4 text-base font-bold text-foreground">
            الفئة غير متوفرة
          </h1>

          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            قد تكون الفئة قد حُذفت أو لم
            تعد متاحة حالياً.
          </p>

          <Link
            to="/products"
            className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
          >
            تصفح جميع المنتجات
          </Link>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="shehara-app min-h-screen bg-background pb-24 md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl pt-4 md:pt-6">
        {/* =====================================================
            Breadcrumb
            ===================================================== */}

        <nav
          aria-label="مسار التنقل"
          className="px-4 text-[11px] text-muted-foreground"
        >
          <Link
            to="/"
            className="font-semibold text-primary hover:underline"
          >
            الرئيسية
          </Link>

          <span
            className="mx-1"
            aria-hidden="true"
          >
            /
          </span>

          <span>
            {category.name}
          </span>
        </nav>

        {/* =====================================================
            عنوان الفئة
            ===================================================== */}

        <section className="mt-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-foreground">
                {category.name}
              </h1>

              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                اكتشف أفضل المنتجات في هذه الفئة
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
                md:hidden
              "
              aria-expanded={
                showFilters
              }
              aria-controls="category-mobile-filters"
            >
              <SlidersHorizontal className="h-4 w-4" />

              الفلاتر

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
                  {
                    activeFiltersCount
                  }
                </span>
              ) : null}
            </button>
          </div>
        </section>

        {/* =====================================================
            فلاتر الهاتف
            ===================================================== */}

        <div
          id="category-mobile-filters"
          className={
            showFilters
              ? "mt-4 block px-4 md:hidden"
              : "hidden"
          }
        >
          <div className="rounded-2xl border border-border/70 bg-card p-1">
            <FiltersPanel
              filters={filters}
              onChange={
                setFilters
              }
              cities={cities}
            />

            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  false,
                )
              }
              className="mt-2 min-h-10 w-full rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
            >
              عرض المنتجات
            </button>
          </div>
        </div>

        {/* =====================================================
            الترتيب
            ===================================================== */}

        <section className="mt-4">
          <SortBar
            sort={sort}
            onSortChange={
              setSort
            }
            countLabel={`${list.length.toLocaleString(
              "ar-EG",
            )} منتج`}
          />
        </section>

        {/* =====================================================
            المحتوى
            ===================================================== */}

        <section className="mt-4 grid gap-5 px-4 md:grid-cols-[240px_minmax(0,1fr)]">
          {/* فلاتر سطح المكتب */}

          <aside className="hidden md:block">
            <div className="sticky top-24">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />

                  <h2 className="text-sm font-bold text-foreground">
                    تصفية
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
                onChange={
                  setFilters
                }
                cities={cities}
              />
            </div>
          </aside>

          {/* النتائج */}

          <div className="min-w-0">
            {productsLoading ? (
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                aria-busy="true"
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

            {!productsLoading &&
            productsError ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-destructive/15 bg-card px-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                  <Filter className="h-6 w-6" />
                </div>

                <h2 className="mt-4 text-sm font-bold text-foreground">
                  تعذر تحميل منتجات الفئة
                </h2>

                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  حدثت مشكلة مؤقتة. حاول
                  مرة أخرى.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void refetch()
                  }
                  className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : null}

            {!productsLoading &&
            !productsError &&
            list.length > 0 ? (
              <>
                {isFetching ? (
                  <div className="mb-3 h-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-accent-solid" />
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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

            {!productsLoading &&
            !productsError &&
            list.length ===
              0 ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center rounded-3xl border border-border bg-card px-6 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-muted-foreground">
                  <Filter className="h-7 w-7" />
                </div>

                <h2 className="mt-4 text-base font-bold text-foreground">
                  لا توجد منتجات
                </h2>

                <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
                  لا توجد منتجات مطابقة للفلاتر
                  الحالية في هذه الفئة.
                </p>

                {activeFiltersCount >
                0 ? (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
                  >
                    إزالة الفلاتر
                  </button>
                ) : null}
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
