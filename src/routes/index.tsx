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
          "تشكيلات | كل ما تحتاجه... في مكان واحد",
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

/**
 * زخرفة هندسية خفيفة مستوحاة من الزخارف
 * التراثية اليمنية.
 *
 * لا تعتمد على صورة خارجية حتى لا تزيد حجم
 * الصفحة أو تؤثر على سرعة التحميل.
 */
function HeritagePattern({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
    >
      <div
        className="
          absolute
          h-28
          w-28
          rotate-45
          rounded-[1.25rem]
          border
          border-[#E0B85C]/[0.055]
        "
      />

      <div
        className="
          absolute
          left-4
          top-4
          h-20
          w-20
          rotate-45
          rounded-[0.9rem]
          border
          border-[#4A1525]/[0.035]
          dark:border-[#E0B85C]/[0.035]
        "
      />

      <div
        className="
          absolute
          left-[38px]
          top-[38px]
          h-4
          w-4
          rotate-45
          border
          border-[#E0B85C]/[0.12]
        "
      />
    </div>
  );
}

/**
 * إطار هوية خفيف للأقسام الكبيرة.
 */
function HeritageSectionFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        relative
        overflow-hidden
        ${className}
      `}
    >
      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-4
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-[#E0B85C]/20
          to-transparent
        "
      />

      <HeritagePattern
        className="
          -right-8
          top-4
          opacity-70
        "
      />

      <HeritagePattern
        className="
          -left-10
          bottom-0
          scale-75
          opacity-50
        "
      />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

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
  const popularCategories = useMemo<PopularCategory[]>(
    () => {
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
        const current =
          scores.get(product.category_id) ?? {
            productCount: 0,
            popularityScore: 0,
          };

        current.productCount += 1;

        current.popularityScore +=
          Number(product.sales_count) || 0;

        scores.set(
          product.category_id,
          current,
        );
      }

      const ranked = categories
        .map((category) => {
          const score =
            scores.get(category.id);

          return {
            ...category,
            productCount:
              score?.productCount ?? 0,
            popularityScore:
              score?.popularityScore ?? 0,
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
    },
    [bestProducts, categories],
  );

  return (
    <div
      dir="rtl"
      className="
        relative
        min-h-screen
        overflow-x-hidden
        bg-[#FBF7EF]
        text-foreground
        dark:bg-[#170C11]
      "
    >
      {/* =====================================================
          طبقة العلامة المائية الخلفية
          ===================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          fixed
          inset-0
          z-0
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            -right-24
            top-32
            h-72
            w-72
            rounded-full
            bg-[#4A1525]/[0.025]
            blur-3xl
            dark:bg-[#E0B85C]/[0.025]
          "
        />

        <div
          className="
            absolute
            -left-24
            top-[42rem]
            h-80
            w-80
            rounded-full
            bg-[#E0B85C]/[0.035]
            blur-3xl
            dark:bg-[#4A1525]/[0.08]
          "
        />

        <HeritagePattern
          className="
            right-[-50px]
            top-[18rem]
            scale-[1.8]
            opacity-80
          "
        />

        <HeritagePattern
          className="
            left-[-50px]
            top-[68rem]
            scale-[2.1]
            opacity-70
          "
        />

        <HeritagePattern
          className="
            right-[-30px]
            top-[125rem]
            scale-[1.7]
            opacity-60
          "
        />
      </div>

      <div className="relative z-10">
        <SiteHeader />

        <main
          className="
            mx-auto
            w-full
            max-w-6xl
            space-y-7
            pb-24
            sm:space-y-8
          "
        >
          {/* =====================================================
              القصص
              ===================================================== */}

          <section
            className="
              relative
              overflow-hidden
              pt-1
            "
          >
            <HeritagePattern
              className="
                right-[-70px]
                top-[-45px]
                scale-75
                opacity-50
              "
            />

            <div className="relative z-10">
              <StoriesCategories />
            </div>
          </section>

          {/* =====================================================
              البنر الرئيسي
              ===================================================== */}

          <HeritageSectionFrame
            className="
              mx-0
              rounded-[1.75rem]
              sm:mx-4
            "
          >
            <div
              className="
                overflow-hidden
                rounded-[1.75rem]
                border
                border-[#E0B85C]/20
                bg-white/50
                p-1
                shadow-[0_14px_45px_-28px_rgba(74,21,37,0.45)]
                dark:bg-white/[0.025]
              "
            >
              <PromoSlider />
            </div>
          </HeritageSectionFrame>

          {/* =====================================================
              التصنيفات الأساسية
              ===================================================== */}

          <HeritageSectionFrame>
            <CategoryStrip />
          </HeritageSectionFrame>

          {/* =====================================================
              الأقسام الرائجة
              ===================================================== */}

          <HeritageSectionFrame
            className="
              rounded-[1.75rem]
              border
              border-[#E0B85C]/10
              bg-white/30
              py-4
              dark:bg-white/[0.015]
            "
          >
            <section
              aria-labelledby="popular-categories-title"
              className="space-y-3"
            >
              <div className="flex items-center justify-between gap-3 px-4">
                <div className="min-w-0">
                  <h2
                    id="popular-categories-title"
                    className="
                      flex
                      items-center
                      gap-2
                      text-base
                      font-bold
                      text-foreground
                      sm:text-lg
                    "
                  >
                    <span
                      className="
                        relative
                        grid
                        h-8
                        w-8
                        shrink-0
                        place-items-center
                        overflow-hidden
                        rounded-xl
                        bg-[#4A1525]
                        text-[#E0B85C]
                        shadow-sm
                        dark:bg-[#35101C]
                      "
                    >
                      <span
                        aria-hidden="true"
                        className="
                          absolute
                          h-5
                          w-5
                          rotate-45
                          border
                          border-[#E0B85C]/30
                        "
                      />

                      <Grid2X2
                        className="
                          relative
                          z-10
                          h-4
                          w-4
                        "
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
                  className="
                    flex
                    shrink-0
                    items-center
                    gap-0.5
                    rounded-lg
                    px-2
                    py-1
                    text-xs
                    font-medium
                    text-[#4A1525]
                    transition-colors
                    hover:bg-[#4A1525]/5
                    dark:text-[#E0B85C]
                  "
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
                      className="
                        h-[118px]
                        w-[92px]
                        shrink-0
                        animate-pulse
                        rounded-2xl
                        bg-muted
                      "
                    />
                  ))}
                </div>
              ) : popularCategories.length > 0 ? (
                <div
                  className="
                    no-scrollbar
                    flex
                    gap-3
                    overflow-x-auto
                    px-4
                    pb-1
                    md:grid
                    md:grid-cols-4
                    md:overflow-visible
                    lg:grid-cols-8
                  "
                >
                  {popularCategories.map(
                    (category) => {
                      const Icon =
                        CATEGORY_ICONS[
                          category.icon as keyof typeof CATEGORY_ICONS
                        ] ??
                        Grid2X2;

                      return (
                        <a
                          key={category.id}
                          href={`/category/${encodeURIComponent(
                            category.slug,
                          )}`}
                          className="
                            group
                            flex
                            w-[92px]
                            shrink-0
                            flex-col
                            items-center
                            rounded-2xl
                            border
                            border-[#E0B85C]/15
                            bg-white/70
                            px-2
                            py-3
                            shadow-[0_8px_25px_-20px_rgba(74,21,37,0.7)]
                            transition-all
                            duration-200
                            hover:-translate-y-0.5
                            hover:border-[#E0B85C]/35
                            hover:shadow-md
                            active:scale-[0.97]
                            dark:bg-[#35101C]/30
                            md:w-auto
                          "
                        >
                          <span
                            className="
                              relative
                              grid
                              h-14
                              w-14
                              place-items-center
                              overflow-hidden
                              rounded-2xl
                              bg-[#4A1525]/[0.07]
                              text-[#4A1525]
                              transition-transform
                              duration-200
                              group-hover:scale-105
                              dark:bg-[#E0B85C]/[0.08]
                              dark:text-[#E0B85C]
                            "
                          >
                            <span
                              aria-hidden="true"
                              className="
                                absolute
                                -right-2
                                -top-2
                                h-8
                                w-8
                                rotate-45
                                border
                                border-[#E0B85C]/20
                              "
                            />

                            <Icon
                              className="
                                relative
                                z-10
                                h-6
                                w-6
                              "
                              strokeWidth={1.7}
                              aria-hidden="true"
                            />
                          </span>

                          <span className="mt-2 line-clamp-1 w-full text-center text-[11px] font-semibold text-foreground">
                            {category.name}
                          </span>

                          {category.productCount > 0 ? (
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
          </HeritageSectionFrame>

          {/* =====================================================
              العروض الخاطفة
              ===================================================== */}

          <HeritageSectionFrame>
            <FlashSaleSection />
          </HeritageSectionFrame>

          {/* =====================================================
              العروض والتخفيضات
              ===================================================== */}

          <HeritageSectionFrame>
            <OffersSection />
          </HeritageSectionFrame>

          {/* =====================================================
              البنرات الإضافية
              ===================================================== */}

          <HeritageSectionFrame
            className="
              mx-0
              sm:mx-4
            "
          >
            <div
              className="
                overflow-hidden
                rounded-[1.5rem]
                border
                border-[#E0B85C]/15
                bg-white/40
                shadow-[0_14px_40px_-30px_rgba(74,21,37,0.55)]
                dark:bg-white/[0.02]
              "
            >
              <BannerCarousel4to1 />
            </div>
          </HeritageSectionFrame>

          {/* =====================================================
              الأكثر مبيعاً
              ===================================================== */}

          <HeritageSectionFrame
            className="
              rounded-[1.75rem]
              border
              border-[#E0B85C]/10
              bg-white/25
              py-4
              dark:bg-white/[0.012]
            "
          >
            <section
              aria-labelledby="best-sellers-title"
              className="space-y-3"
            >
              <div className="px-4">
                <SectionHeading
                  title="الأكثر مبيعًا"
                  to="/products"
                />
              </div>

              <div
                className="
                  no-scrollbar
                  flex
                  snap-x
                  snap-mandatory
                  gap-3
                  overflow-x-auto
                  px-4
                  pb-2
                  md:grid
                  md:grid-cols-3
                  md:overflow-visible
                  lg:grid-cols-4
                "
              >
                {bestProductsLoading
                  ? Array.from({
                      length: 4,
                    }).map((_, index) => (
                      <div
                        key={index}
                        className="
                          w-[168px]
                          shrink-0
                          snap-start
                          md:w-auto
                        "
                      >
                        <ProductCardSkeleton />
                      </div>
                    ))
                  : bestSellers.map(
                      (product) => (
                        <div
                          key={product.id}
                          className="
                            w-[168px]
                            shrink-0
                            snap-start
                            sm:w-[190px]
                            md:w-auto
                          "
                        >
                          <ProductCard
                            product={product}
                          />
                        </div>
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
          </HeritageSectionFrame>

          {/* =====================================================
              أحدث المنتجات
              تعتمد على created_at الحقيقي
              ===================================================== */}

          <HeritageSectionFrame
            className="
              rounded-[1.75rem]
              border
              border-[#E0B85C]/10
              bg-white/25
              py-4
              dark:bg-white/[0.012]
            "
          >
            <section
              aria-labelledby="new-products-title"
              className="space-y-3"
            >
              <div className="px-4">
                <SectionHeading
                  title="أحدث المنتجات"
                  to="/products"
                />
              </div>

              <div
                className="
                  no-scrollbar
                  flex
                  snap-x
                  snap-mandatory
                  gap-3
                  overflow-x-auto
                  px-4
                  pb-2
                  md:grid
                  md:grid-cols-3
                  md:overflow-visible
                  lg:grid-cols-4
                "
              >
                {newestProductsLoading
                  ? Array.from({
                      length: 4,
                    }).map((_, index) => (
                      <div
                        key={index}
                        className="
                          w-[168px]
                          shrink-0
                          snap-start
                          md:w-auto
                        "
                      >
                        <ProductCardSkeleton />
                      </div>
                    ))
                  : newestProducts.map(
                      (product) => (
                        <div
                          key={product.id}
                          className="
                            w-[168px]
                            shrink-0
                            snap-start
                            sm:w-[190px]
                            md:w-auto
                          "
                        >
                          <ProductCard
                            product={product}
                          />
                        </div>
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
          </HeritageSectionFrame>

          {/* =====================================================
              الماركات
              ===================================================== */}

          <HeritageSectionFrame>
            <BrandsSection />
          </HeritageSectionFrame>

          {/* =====================================================
              المنتجات المحلية
              ===================================================== */}

          <HeritageSectionFrame>
            <LocalProducts />
          </HeritageSectionFrame>
        </main>

        {/* =====================================================
            Bottom Navigation
            ===================================================== */}

        <BottomNav />
      </div>
    </div>
  );
}
