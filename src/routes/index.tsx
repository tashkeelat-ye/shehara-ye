import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ChevronLeft,
  CookingPot,
  Grid2X2,
  Landmark,
  Lamp,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Watch,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { PromoSlider } from "@/components/promo-slider";
import { StoriesCategories } from "@/components/home/StoriesCategories";
import { FlashSaleSection } from "@/components/home/FlashSaleSection";
import { CategoryStrip } from "@/components/category-strip";
import { OffersSection } from "@/components/offers-section";
import { BrandsSection } from "@/components/brands-section";
import { SectionHeading } from "@/components/section-heading";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product-card";
import { LocalProducts } from "@/components/local-products";
import { BottomNav } from "@/components/bottom-nav";
import { fetchCategories, fetchProducts } from "@/lib/db";
import type { Category } from "@/lib/db";
import { BannerCarousel4to1 } from "@/components/home/BannerCarousel4to1";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "تشكيلات | متجر يمني إلكتروني لكل احتياجاتك",
      },
      {
        name: "description",
        content:
          "تشكيلات متجر إلكتروني يمني: أزياء، إلكترونيات، منزل ومطبخ، ومنتجات يمنية محلية كالعسل والبخور والحرف اليدوية مع توصيل لكل المحافظات.",
      },
      {
        property: "og:title",
        content:
          "تشكيلات | كل ما تحتاجه... بتشكيلة واحدة",
      },
      {
        property: "og:description",
        content:
          "تسوّق أزياء وإلكترونيات ومستلزمات المنزل ومنتجات يمنية أصيلة من متجر تشكيلات.",
      },
    ],
  }),
  component: Index,
});

const CATEGORY_ICONS = {
  Shirt,
  Smartphone,
  CookingPot,
  Sparkles,
  ShoppingBasket,
  Watch,
  Lamp,
  Landmark,
} as const;

type PopularCategory = Category & {
  productCount: number;
  popularityScore: number;
};

function Index() {
  /*
   * نستفيد من استعلام واحد للمنتجات الأكثر مبيعاً:
   *
   * - أول 8 منتجات تُعرض في قسم الأكثر مبيعاً.
   * - أول 24 منتجاً تُستخدم أيضاً لحساب الأقسام الرائجة.
   *
   * بهذه الطريقة لا نحتاج إلى استعلام منفصل لكل قسم.
   */
  const {
    data: bestProducts = [],
    isLoading: bestProductsLoading,
  } = useQuery({
    queryKey: ["products", "best", 24],
    queryFn: () =>
      fetchProducts({
        sort: "best",
        limit: 24,
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  /*
   * أحدث المنتجات تعتمد مباشرة على created_at في قاعدة البيانات.
   */
  const {
    data: newestProducts = [],
    isLoading: newestProductsLoading,
  } = useQuery({
    queryKey: ["products", "newest", 8],
    queryFn: () =>
      fetchProducts({
        sort: "newest",
        limit: 8,
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  /*
   * التصنيفات الحقيقية من Supabase.
   *
   * CategoryStrip يستخدم نفس queryKey،
   * لذلك React Query يستطيع مشاركة النتيجة
   * بدلاً من تحميل نفس البيانات مرتين.
   */
  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
  });

  const bestSellers = useMemo(
    () => bestProducts.slice(0, 8),
    [bestProducts],
  );

  /*
   * حساب الأقسام الرائجة فعلياً:
   *
   * نعتمد على sales_count للمنتجات الموجودة فعلياً.
   *
   * لا نضيف أي بيانات وهمية.
   */
  const popularCategories = useMemo<PopularCategory[]>(() => {
    if (categories.length === 0) {
      return [];
    }

    const scores = new Map<
      string,
      {
        productCount: number;
        popularityScore: number;
      }
    >();

    for (const product of bestProducts) {
      const current = scores.get(product.category_id) ?? {
        productCount: 0,
        popularityScore: 0,
      };

      current.productCount += 1;
      current.popularityScore +=
        Number(product.sales_count) || 0;

      scores.set(product.category_id, current);
    }

    const ranked = categories
      .map((category) => {
        const score = scores.get(category.id);

        return {
          ...category,
          productCount: score?.productCount ?? 0,
          popularityScore: score?.popularityScore ?? 0,
        };
      })
      .filter(
        (category) =>
          category.productCount > 0,
      )
      .sort((a, b) => {
        if (
          b.popularityScore !==
          a.popularityScore
        ) {
          return (
            b.popularityScore -
            a.popularityScore
          );
        }

        if (
          b.productCount !==
          a.productCount
        ) {
          return (
            b.productCount -
            a.productCount
          );
        }

        return (
          a.sort_order -
          b.sort_order
        );
      })
      .slice(0, 8);

    /*
     * في حالة عدم وجود مبيعات كافية حتى الآن،
     * لا نخفي القسم بالكامل.
     *
     * نعرض أفضل التصنيفات حسب ترتيب الإدارة
     * باستخدام بيانات حقيقية من categories.
     */
    if (ranked.length === 0) {
      return categories
        .slice()
        .sort(
          (a, b) =>
            a.sort_order -
            b.sort_order,
        )
        .slice(0, 8)
        .map((category) => ({
          ...category,
          productCount: 0,
          popularityScore: 0,
        }));
    }

    return ranked;
  }, [bestProducts, categories]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl space-y-7 pb-24 sm:space-y-8">
        {/* =====================================================
            القصص
            ===================================================== */}
        <StoriesCategories />

        {/* =====================================================
            البنر الرئيسي
            ===================================================== */}
        <PromoSlider />

        {/* =====================================================
            التصنيفات الأساسية
            ===================================================== */}
        <CategoryStrip />

        {/* =====================================================
            الأقسام الرائجة
            تعتمد على المبيعات الحقيقية
            ===================================================== */}
        <section
          aria-labelledby="popular-categories-title"
          className="space-y-3"
        >
          <div className="flex items-center justify-between gap-3 px-4">
            <div className="min-w-0">
              <h2
                id="popular-categories-title"
                className="flex items-center gap-2 text-base font-bold text-foreground sm:text-lg"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-brand-soft text-primary">
                  <Grid2X2
                    className="h-4 w-4"
                    strokeWidth={1.8}
                  />
                </span>

                <span>
                  أقسام رائجة
                </span>
              </h2>

              <p className="mt-1 text-[11px] text-muted-foreground">
                الأكثر اهتماماً وطلباً من متسوقي تشكيلات
              </p>
            </div>

            <a
              href="/products"
              className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary"
            >
              كل الأقسام
              <ChevronLeft
                className="h-4 w-4"
                aria-hidden="true"
              />
            </a>
          </div>

          {categoriesLoading ? (
            <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
              {Array.from({
                length: 5,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-[118px] w-[92px] shrink-0 animate-pulse rounded-2xl bg-muted"
                />
              ))}
            </div>
          ) : popularCategories.length > 0 ? (
            <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 md:grid md:grid-cols-4 lg:grid-cols-8 md:overflow-visible">
              {popularCategories.map(
                (category) => {
                  const Icon =
                    CATEGORY_ICONS[
                      category.icon as keyof typeof CATEGORY_ICONS
                    ] ?? Grid2X2;

                  return (
                    <a
                      key={category.id}
                      href={`/category/${encodeURIComponent(
                        category.slug,
                      )}`}
                      className="group flex w-[92px] shrink-0 flex-col items-center rounded-2xl border border-border/70 bg-card px-2 py-3 shadow-card transition-transform active:scale-[0.97] md:w-auto"
                    >
                      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-primary transition-transform duration-200 group-hover:scale-105">
                        <Icon
                          className="h-6 w-6"
                          strokeWidth={1.7}
                          aria-hidden="true"
                        />
                      </span>

                      <span className="mt-2 line-clamp-1 w-full text-center text-[11px] font-semibold text-foreground">
                        {category.name}
                      </span>

                      {category.productCount >
                      0 ? (
                        <span className="mt-0.5 text-[9px] text-muted-foreground">
                          {category.productCount.toLocaleString(
                            "ar-EG",
                          )}{" "}
                          منتجات رائجة
                        </span>
                      ) : null}
                    </a>
                  );
                },
              )}
            </div>
          ) : (
            <div className="mx-4 rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
              ستظهر الأقسام الرائجة هنا عند توفر المنتجات.
            </div>
          )}
        </section>

        {/* =====================================================
            العروض الخاطفة
            ===================================================== */}
        <FlashSaleSection />

        {/* =====================================================
            العروض والتخفيضات
            ===================================================== */}
        <OffersSection />

        {/* =====================================================
            البنرات الإضافية
            ===================================================== */}
        <BannerCarousel4to1 />

        {/* =====================================================
            الأكثر مبيعاً
            ===================================================== */}
        <section
          aria-labelledby="best-sellers-title"
          className="space-y-3"
        >
          <SectionHeading
            title="الأكثر مبيعًا"
            to="/products"
          />

          <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4">
            {bestProductsLoading
              ? Array.from({
                  length: 4,
                }).map((_, index) => (
                  <ProductCardSkeleton
                    key={index}
                  />
                ))
              : bestSellers.map(
                  (product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  ),
                )}
          </div>

          {!bestProductsLoading &&
          bestSellers.length === 0 ? (
            <div className="mx-4 rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-xs text-muted-foreground">
              لا توجد منتجات متاحة حالياً.
            </div>
          ) : null}
        </section>

        {/* =====================================================
            أحدث المنتجات
            تعتمد على created_at الحقيقي
            ===================================================== */}
        <section
          aria-labelledby="new-products-title"
          className="space-y-3"
        >
          <SectionHeading
            title="أحدث المنتجات"
            to="/products"
          />

          <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4">
            {newestProductsLoading
              ? Array.from({
                  length: 4,
                }).map((_, index) => (
                  <ProductCardSkeleton
                    key={index}
                  />
                ))
              : newestProducts.map(
                  (product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  ),
                )}
          </div>

          {!newestProductsLoading &&
          newestProducts.length === 0 ? (
            <div className="mx-4 rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-xs text-muted-foreground">
              لا توجد منتجات جديدة حالياً.
            </div>
          ) : null}
        </section>

        {/* =====================================================
            الماركات
            ===================================================== */}
        <BrandsSection />

        {/* =====================================================
            المنتجات المحلية
            ===================================================== */}
        <LocalProducts />
      </main>

      {/*
       * تم إزالة SiteFooter من الصفحة الرئيسية عمداً.
       *
       * الصفحات الداخلية مثل:
       * - من نحن
       * - الأسئلة الشائعة
       * - السياسات
       *
       * يمكنها الاحتفاظ بالتذييل عند الحاجة.
       *
       * أما Home فتستخدم BottomNav لتبدو كتطبيق PWA حقيقي.
       */}
      <BottomNav />
    </div>
  );
}
