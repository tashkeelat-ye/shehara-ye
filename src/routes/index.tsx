import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
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
import { TopVendors } from "@/components/home/top-vendors";
import { BottomNav } from "@/components/bottom-nav";
import { DynamicHomeSection } from "@/components/home/DynamicHomeSection";
import { BannerCarousel4to1 } from "@/components/home/BannerCarousel4to1";

import {
  fetchCategories,
  fetchProducts,
} from "@/lib/db";
import type { Category } from "@/lib/db";

import {
  fetchHomeSections,
  type HomeSection,
} from "@/lib/store";

type SectionConfig = Record<
  string,
  HomeSection
>;

function HomeSectionWrapper({
  sectionKey,
  sections,
  children,
}: {
  sectionKey: string;
  sections: SectionConfig;
  children: ReactNode;
}) {
  const section = sections[sectionKey];

  if (section && !section.is_active) {
    return null;
  }

  return (
    <div
      style={{
        order: section?.sort_order ?? 999,
      }}
    >
      {children}
    </div>
  );
}

function CustomSectionWrapper({
  section,
}: {
  section: HomeSection;
}) {
  if (!section.is_active) {
    return null;
  }

  return (
    <div
      style={{
        order: section.sort_order,
      }}
    >
      <DynamicHomeSection section={section} />
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "شهارة | متجر يمني إلكتروني لكل احتياجاتك",
      },
      {
        name: "description",
        content:
          "شهارة متجر إلكتروني يمني: أزياء، إلكترونيات، منزل ومطبخ، ومنتجات يمنية محلية كالعسل والبخور والحرف اليدوية مع توصيل لكل المحافظات.",
      },
      {
        property: "og:title",
        content:
          "شهارة | تسوق بلا حدود",
      },
      {
        property: "og:description",
        content:
          "تسوّق أزياء وإلكترونيات ومستلزمات المنزل ومنتجات يمنية أصيلة من متجر شهارة.",
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
          border-[#E2723A]/[0.055]
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
          border-[#0D3B4D]/[0.035]
          dark:border-[#E2723A]/[0.035]
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
          border-[#E2723A]/[0.12]
        "
      />
    </div>
  );
}

function SectionShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`
        relative
        overflow-hidden
        rounded-[1.5rem]
        border
        border-[#0D3B4D]/[0.07]
        bg-white/75
        shadow-[0_18px_55px_-42px_rgba(13,59,77,0.55)]
        backdrop-blur-md
        dark:border-white/[0.06]
        dark:bg-[#0A2A38]/50
        ${className}
      `}
    >
      <HeritagePattern
        className="
          -right-10
          top-4
          opacity-70
        "
      />

      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}

function HorizontalProducts({
  products,
  loading,
}: {
  products: Awaited<
    ReturnType<typeof fetchProducts>
  >;
  loading: boolean;
}) {
  if (loading) {
    return (
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
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="
              w-[174px]
              shrink-0
              snap-start
              sm:w-[190px]
              md:w-auto
            "
          >
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div
        className="
          mx-4
          rounded-2xl
          border
          border-dashed
          border-border
          px-4
          py-8
          text-center
          text-xs
          text-muted-foreground
        "
      >
        لا توجد منتجات متاحة حالياً.
      </div>
    );
  }

  return (
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
      {products.map((product) => (
        <div
          key={product.id}
          className="
            w-[174px]
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
      ))}
    </div>
  );
}

function PopularCategories({
  categories,
  products,
  loading,
}: {
  categories: Category[];
  products: Awaited<
    ReturnType<typeof fetchProducts>
  >;
  loading: boolean;
}) {
  const popularCategories =
    useMemo<PopularCategory[]>(() => {
      if (!categories.length) {
        return [];
      }

      const scores = new Map<
        string,
        {
          productCount: number;
          popularityScore: number;
        }
      >();

      for (const product of products) {
        const current =
          scores.get(
            product.category_id,
          ) ?? {
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
          const score = scores.get(
            category.id,
          );

          return {
            ...category,
            productCount:
              score?.productCount ?? 0,
            popularityScore:
              score?.popularityScore ?? 0,
          };
        })
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

      return ranked;
    }, [categories, products]);

  return (
    <SectionShell className="py-4">
      <div
        className="
          mb-3
          flex
          items-center
          justify-between
          gap-3
          px-4
        "
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="
              grid
              h-10
              w-10
              shrink-0
              place-items-center
              rounded-xl
              bg-[#0D3B4D]
              text-[#E2723A]
              shadow-sm
            "
          >
            <Grid2X2
              className="h-5 w-5"
              strokeWidth={1.8}
            />
          </span>

          <div className="min-w-0">
            <h2
              className="
                text-base
                font-extrabold
                text-[#0D3B4D]
                dark:text-white
                sm:text-lg
              "
            >
              أقسام رائجة
            </h2>

            <p
              className="
                mt-0.5
                text-[10px]
                text-muted-foreground
                sm:text-[11px]
              "
            >
              اكتشف الأكثر طلباً في شهارة
            </p>
          </div>
        </div>

        <a
          href="/products"
          className="
            flex
            shrink-0
            items-center
            gap-0.5
            rounded-xl
            px-2
            py-2
            text-[11px]
            font-bold
            text-[#0D3B4D]
            transition-colors
            hover:bg-[#0D3B4D]/5
            dark:text-[#E2723A]
          "
        >
          الكل
          <ChevronLeft className="h-4 w-4" />
        </a>
      </div>

      {loading ? (
        <div
          className="
            no-scrollbar
            flex
            gap-3
            overflow-x-auto
            px-4
          "
        >
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="
                h-28
                w-24
                shrink-0
                animate-pulse
                rounded-2xl
                bg-muted
              "
            />
          ))}
        </div>
      ) : (
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
                ] ?? Grid2X2;

              return (
                <a
                  key={category.id}
                  href={`/category/${encodeURIComponent(
                    category.slug,
                  )}`}
                  className="
                    group
                    flex
                    w-24
                    shrink-0
                    flex-col
                    items-center
                    rounded-2xl
                    border
                    border-[#0D3B4D]/[0.07]
                    bg-white/80
                    px-2
                    py-3
                    transition-all
                    duration-200
                    hover:-translate-y-1
                    hover:border-[#E2723A]/30
                    hover:shadow-[0_14px_30px_-20px_rgba(13,59,77,0.55)]
                    active:scale-[0.97]
                    dark:bg-white/[0.035]
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
                      bg-[#0D3B4D]/[0.07]
                      text-[#0D3B4D]
                      transition-transform
                      duration-200
                      group-hover:scale-105
                      dark:bg-[#E2723A]/[0.08]
                      dark:text-[#E2723A]
                    "
                  >
                    <Icon
                      className="
                        relative
                        z-10
                        h-6
                        w-6
                      "
                      strokeWidth={1.7}
                    />
                  </span>

                  <span
                    className="
                      mt-2
                      line-clamp-1
                      w-full
                      text-center
                      text-[10px]
                      font-bold
                      text-foreground
                    "
                  >
                    {category.name}
                  </span>

                  {category.productCount >
                    0 && (
                    <span
                      className="
                        mt-1
                        text-[8px]
                        text-muted-foreground
                      "
                    >
                      {category.productCount.toLocaleString(
                        "ar-EG",
                      )}{" "}
                      منتجات
                    </span>
                  )}
                </a>
              );
            },
          )}
        </div>
      )}
    </SectionShell>
  );
}

const BUILT_IN_SECTION_KEYS =
  new Set([
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
  ]);

function Index() {
  const {
    data: bestProducts = [],
    isLoading:
      bestProductsLoading,
  } = useQuery({
    queryKey: [
      "products",
      "best",
      24,
    ],
    queryFn: () =>
      fetchProducts({
        sort: "best",
        limit: 24,
      }),
    staleTime:
      1000 * 60 * 5,
    gcTime:
      1000 * 60 * 30,
  });

  const {
    data: newestProducts = [],
    isLoading:
      newestProductsLoading,
  } = useQuery({
    queryKey: [
      "products",
      "newest",
      8,
    ],
    queryFn: () =>
      fetchProducts({
        sort: "newest",
        limit: 8,
      }),
    staleTime:
      1000 * 60 * 5,
    gcTime:
      1000 * 60 * 30,
  });

  const {
    data: categories = [],
    isLoading:
      categoriesLoading,
  } = useQuery({
    queryKey: [
      "categories",
    ],
    queryFn:
      fetchCategories,
    staleTime:
      1000 * 60 * 10,
    gcTime:
      1000 * 60 * 60,
  });

  const {
    data: homeSections = [],
    isLoading:
      homeSectionsLoading,
  } = useQuery({
    queryKey: [
      "home-sections",
    ],
    queryFn: () =>
      fetchHomeSections(false),
    staleTime: 0,
    gcTime:
      1000 * 60 * 30,
  });

  const bestSellers =
    useMemo(
      () =>
        bestProducts.slice(
          0,
          8,
        ),
      [bestProducts],
    );

  const sectionMap =
    useMemo(() => {
      const map: SectionConfig =
        {};

      for (const section of homeSections) {
        map[
          section.section_key
        ] = section;
      }

      return map;
    }, [homeSections]);

  const customSections =
    useMemo(() => {
      return homeSections
        .filter(
          (section) =>
            section.section_key.startsWith(
              "custom_",
            ) &&
            !BUILT_IN_SECTION_KEYS.has(
              section.section_key,
            ),
        )
        .sort(
          (a, b) =>
            a.sort_order -
            b.sort_order,
        );
    }, [homeSections]);

  return (
    <div
      dir="rtl"
      className="
        relative
        min-h-screen
        overflow-x-hidden
        bg-[#F6F2EE]
        text-foreground
        dark:bg-[#071B24]
      "
    >
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
            -right-32
            top-40
            h-96
            w-96
            rounded-full
            bg-[#0D3B4D]/[0.045]
            blur-3xl
            dark:bg-[#E2723A]/[0.025]
          "
        />

        <div
          className="
            absolute
            -left-32
            top-[48rem]
            h-96
            w-96
            rounded-full
            bg-[#E2723A]/[0.04]
            blur-3xl
            dark:bg-[#0D3B4D]/[0.12]
          "
        />

        <HeritagePattern
          className="
            right-[-55px]
            top-[20rem]
            scale-[1.8]
            opacity-80
          "
        />

        <HeritagePattern
          className="
            left-[-55px]
            top-[70rem]
            scale-[2]
            opacity-60
          "
        />

        <HeritagePattern
          className="
            right-[-40px]
            top-[125rem]
            scale-[1.8]
            opacity-50
          "
        />
      </div>

      <div className="relative z-10">
        <SiteHeader />

        <main
          className="
            mx-auto
            flex
            w-full
            max-w-7xl
            flex-col
            gap-5
            px-3
            pb-28
            pt-2
            sm:gap-7
            sm:px-4
            lg:px-5
          "
        >
          {/* القصص */}
          <HomeSectionWrapper
            sectionKey="stories"
            sections={sectionMap}
          >
            <section className="relative">
              <StoriesCategories />
            </section>
          </HomeSectionWrapper>

          {/* البنر الرئيسي */}
          <HomeSectionWrapper
            sectionKey="hero"
            sections={sectionMap}
          >
            <section
              className="
                relative
                overflow-hidden
                rounded-[1.5rem]
                border
                border-[#E2723A]/20
                bg-[#0D3B4D]
                p-1
                shadow-[0_25px_65px_-35px_rgba(13,59,77,0.65)]
              "
            >
              <div
                className="
                  overflow-hidden
                  rounded-[1.25rem]
                "
              >
                <PromoSlider />
              </div>
            </section>
          </HomeSectionWrapper>

          {/* التصنيفات */}
          <HomeSectionWrapper
            sectionKey="categories"
            sections={sectionMap}
          >
            <SectionShell className="py-2">
              <CategoryStrip />
            </SectionShell>
          </HomeSectionWrapper>

          {/* الأقسام الرائجة */}
          <HomeSectionWrapper
            sectionKey="popular_categories"
            sections={sectionMap}
          >
            <PopularCategories
              categories={categories}
              products={bestProducts}
              loading={
                categoriesLoading
              }
            />
          </HomeSectionWrapper>

          {/* العروض الخاطفة */}
          <HomeSectionWrapper
            sectionKey="flash_sale"
            sections={sectionMap}
          >
            <SectionShell>
              <FlashSaleSection />
            </SectionShell>
          </HomeSectionWrapper>

          {/* العروض */}
          <HomeSectionWrapper
            sectionKey="offers"
            sections={sectionMap}
          >
            <SectionShell>
              <OffersSection />
            </SectionShell>
          </HomeSectionWrapper>

          {/* البنرات الفرعية */}
          <HomeSectionWrapper
            sectionKey="banners"
            sections={sectionMap}
          >
            <section
              className="
                overflow-hidden
                rounded-[1.5rem]
                border
                border-[#E2723A]/15
                bg-[#0D3B4D]
                p-1
                shadow-[0_25px_60px_-38px_rgba(13,59,77,0.65)]
              "
            >
              <div className="overflow-hidden rounded-[1.25rem]">
                <BannerCarousel4to1 />
              </div>
            </section>
          </HomeSectionWrapper>

          {/* الأكثر مبيعاً */}
          <HomeSectionWrapper
            sectionKey="best_sellers"
            sections={sectionMap}
          >
            <SectionShell className="py-4">
              <div className="mb-3 px-4">
                <SectionHeading
                  title="الأكثر مبيعًا"
                  to="/products"
                />
              </div>

              <HorizontalProducts
                products={
                  bestSellers
                }
                loading={
                  bestProductsLoading
                }
              />
            </SectionShell>
          </HomeSectionWrapper>

          {/* أحدث المنتجات */}
          <HomeSectionWrapper
            sectionKey="new_arrivals"
            sections={sectionMap}
          >
            <SectionShell className="py-4">
              <div className="mb-3 px-4">
                <SectionHeading
                  title="وصل حديثًا"
                  to="/products"
                />
              </div>

              <HorizontalProducts
                products={
                  newestProducts
                }
                loading={
                  newestProductsLoading
                }
              />
            </SectionShell>
          </HomeSectionWrapper>

          {/* الماركات */}
          <HomeSectionWrapper
            sectionKey="brands"
            sections={sectionMap}
          >
            <SectionShell>
              <BrandsSection />
            </SectionShell>
          </HomeSectionWrapper>

          {/* التجار */}
          <HomeSectionWrapper
            sectionKey="top_vendors"
            sections={sectionMap}
          >
            <SectionShell>
              <TopVendors />
            </SectionShell>
          </HomeSectionWrapper>

          {/* المنتجات اليمنية */}
          <HomeSectionWrapper
            sectionKey="local_products"
            sections={sectionMap}
          >
            <SectionShell>
              <LocalProducts />
            </SectionShell>
          </HomeSectionWrapper>

          {/* الأقسام التي ينشئها المدير */}
          {!homeSectionsLoading &&
            customSections.map(
              (section) => (
                <CustomSectionWrapper
                  key={section.id}
                  section={section}
                />
              ),
            )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
