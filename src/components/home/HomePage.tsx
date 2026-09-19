import {
  useMemo,
  type ReactNode,
} from "react";

import {
  Link,
} from "@tanstack/react-router";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  ArrowLeft,
  Grid2X2,
  PackageSearch,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";

import {
  PromoSlider,
} from "@/components/promo-slider";

import {
  StoriesCategories,
} from "@/components/home/StoriesCategories";

import {
  FlashSaleSection,
} from "@/components/home/FlashSaleSection";

import {
  OffersSection,
} from "@/components/offers-section";

import {
  BrandsSection,
} from "@/components/brands-section";

import {
  LocalProducts,
} from "@/components/local-products";

import {
  TopVendors,
} from "@/components/home/top-vendors";

import {
  BannerCarousel4to1,
} from "@/components/home/BannerCarousel4to1";

import {
  DynamicHomeSection,
} from "@/components/home/DynamicHomeSection";

import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product-card";

import {
  SectionHeading,
} from "@/components/section-heading";

import {
  BottomNav,
} from "@/components/bottom-nav";

import {
  SiteHeader,
} from "@/components/site-header";

import {
  fetchCategories,
  fetchProducts,
  type Category,
} from "@/lib/db";

import {
  fetchHomeSections,
  type HomeSection,
} from "@/lib/store";

type SectionMap = Record<
  string,
  HomeSection
>;

type PopularCategory = Category & {
  productCount: number;
  salesCount: number;
};

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

function SectionWrapper({
  sectionKey,
  sections,
  children,
}: {
  sectionKey: string;
  sections: SectionMap;
  children: ReactNode;
}) {
  const section =
    sections[sectionKey];

  if (
    section &&
    !section.is_active
  ) {
    return null;
  }

  return (
    <div
      style={{
        order:
          section?.sort_order ??
          999,
      }}
    >
      {children}
    </div>
  );
}

function CustomSection({
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
      <DynamicHomeSection
        section={section}
      />
    </div>
  );
}

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
        relative
        overflow-hidden
        rounded-[1.75rem]
        border
        border-[#0E4D64]/[0.08]
        bg-white
        shadow-[0_20px_60px_-44px_rgba(14,77,100,0.48)]
        dark:border-white/[0.07]
        dark:bg-[#0A2A38]
        ${className}
      `}
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -end-16
          -top-16
          h-40
          w-40
          rounded-full
          bg-[#D65A31]/[0.045]
          blur-3xl
          dark:bg-[#D65A31]/[0.025]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -start-20
          bottom-0
          h-32
          w-32
          rounded-full
          bg-[#0E4D64]/[0.035]
          blur-3xl
          dark:bg-[#0E4D64]/[0.08]
        "
      />

      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}

function CategoryShowcase({
  categories,
  loading,
}: {
  categories: Category[];
  loading: boolean;
}) {
  const visible =
    categories
      .filter(
        (category) =>
          Boolean(category.name),
      )
      .slice(0, 10);

  return (
    <SectionSurface className="p-4 sm:p-5">
      <div
        className="
          mb-4
          flex
          items-end
          justify-between
          gap-4
        "
      >
        <div>
          <div
            className="
              mb-2
              inline-flex
              items-center
              gap-2
              rounded-full
              bg-[#0E4D64]/[0.07]
              px-3
              py-1.5
              text-[10px]
              font-bold
              text-[#0E4D64]
              dark:bg-white/[0.06]
              dark:text-[#E2723A]
            "
          >
            <Grid2X2 className="h-3.5 w-3.5" />
            استكشف المتجر
          </div>

          <h2
            className="
              text-lg
              font-black
              tracking-tight
              text-[#0E4D64]
              dark:text-white
              sm:text-xl
            "
          >
            تسوق حسب القسم
          </h2>

          <p
            className="
              mt-1
              text-[11px]
              leading-5
              text-muted-foreground
            "
          >
            اختصر الطريق إلى ما تبحث عنه
          </p>
        </div>

        <Link
          to="/products"
          className="
            inline-flex
            shrink-0
            items-center
            gap-1
            rounded-xl
            px-3
            py-2
            text-[11px]
            font-extrabold
            text-[#0E4D64]
            transition-colors
            hover:bg-[#0E4D64]/[0.06]
            dark:text-[#E2723A]
          "
        >
          كل المنتجات
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div
          className="
            grid
            grid-cols-3
            gap-3
            sm:grid-cols-5
            lg:grid-cols-10
          "
        >
          {Array.from({
            length: 10,
          }).map((_, index) => (
            <div
              key={index}
              className="
                h-28
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
            grid
            grid-cols-3
            gap-2.5
            sm:grid-cols-5
            sm:gap-3
            lg:grid-cols-10
          "
        >
          {visible.map(
            (category) => (
              <Link
                key={category.id}
                to="/category/$slug"
                params={{
                  slug: category.slug,
                }}
                className="
                  group
                  min-w-0
                  rounded-2xl
                  border
                  border-[#0E4D64]/[0.07]
                  bg-[#F8FAFA]
                  p-2
                  text-center
                  transition-all
                  duration-200
                  hover:-translate-y-1
                  hover:border-[#D65A31]/25
                  hover:shadow-[0_16px_32px_-24px_rgba(14,77,100,0.65)]
                  active:scale-[0.98]
                  dark:border-white/[0.06]
                  dark:bg-white/[0.035]
                "
              >
                <div
                  className="
                    relative
                    aspect-square
                    overflow-hidden
                    rounded-xl
                    bg-[#EAF1F3]
                    dark:bg-[#123B4A]
                  "
                >
                  {category.image_url ? (
                    <img
                      src={
                        category.image_url
                      }
                      alt={
                        category.name
                      }
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="
                        h-full
                        w-full
                        object-cover
                        transition-transform
                        duration-500
                        group-hover:scale-105
                      "
                    />
                  ) : (
                    <div
                      className="
                        grid
                        h-full
                        w-full
                        place-items-center
                        text-[#0E4D64]
                        dark:text-[#E2723A]
                      "
                    >
                      <PackageSearch
                        className="h-7 w-7"
                        strokeWidth={1.5}
                      />
                    </div>
                  )}
                </div>

                <span
                  className="
                    mt-2
                    block
                    truncate
                    text-[10px]
                    font-extrabold
                    text-foreground
                  "
                >
                  {category.name}
                </span>
              </Link>
            ),
          )}
        </div>
      )}
    </SectionSurface>
  );
}

function PopularCategories({
  categories,
  products,
}: {
  categories: Category[];
  products: Awaited<
    ReturnType<typeof fetchProducts>
  >;
}) {
  const ranked =
    useMemo<PopularCategory[]>(
      () => {
        const map =
          new Map<
            string,
            {
              productCount: number;
              salesCount: number;
            }
          >();

        for (
          const product of products
        ) {
          const current =
            map.get(
              product.category_id,
            ) ?? {
              productCount: 0,
              salesCount: 0,
            };

          current.productCount += 1;
          current.salesCount +=
            Number(
              product.sales_count,
            ) || 0;

          map.set(
            product.category_id,
            current,
          );
        }

        return categories
          .map((category) => {
            const stats =
              map.get(
                category.id,
              );

            return {
              ...category,
              productCount:
                stats?.productCount ??
                0,
              salesCount:
                stats?.salesCount ??
                0,
            };
          })
          .filter(
            (category) =>
              category.productCount >
              0,
          )
          .sort(
            (a, b) =>
              b.salesCount -
              a.salesCount ||
              b.productCount -
                a.productCount ||
              a.sort_order -
                b.sort_order,
          )
          .slice(0, 8);
      },
      [categories, products],
    );

  if (!ranked.length) {
    return null;
  }

  return (
    <SectionSurface className="p-4 sm:p-5">
      <div
        className="
          mb-4
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <div>
          <div
            className="
              mb-1.5
              flex
              items-center
              gap-2
              text-[10px]
              font-bold
              text-[#D65A31]
            "
          >
            <Sparkles className="h-3.5 w-3.5" />
            الأكثر نشاطًا
          </div>

          <h2
            className="
              text-lg
              font-black
              text-[#0E4D64]
              dark:text-white
            "
          >
            أقسام رائجة
          </h2>
        </div>

        <Link
          to="/products"
          className="
            inline-flex
            items-center
            gap-1
            text-[11px]
            font-bold
            text-[#0E4D64]
            dark:text-[#E2723A]
          "
        >
          استكشف
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div
        className="
          grid
          grid-cols-2
          gap-3
          sm:grid-cols-4
          lg:grid-cols-8
        "
      >
        {ranked.map(
          (category, index) => (
            <Link
              key={category.id}
              to="/category/$slug"
              params={{
                slug: category.slug,
              }}
              className="
                group
                relative
                overflow-hidden
                rounded-2xl
                border
                border-[#0E4D64]/[0.07]
                bg-[#F8FAFA]
                p-3
                transition-all
                duration-200
                hover:-translate-y-1
                hover:border-[#D65A31]/25
                dark:border-white/[0.06]
                dark:bg-white/[0.035]
              "
            >
              <span
                className="
                  absolute
                  end-2
                  top-2
                  text-[9px]
                  font-black
                  text-[#D65A31]/70
                "
              >
                {String(
                  index + 1,
                ).padStart(2, "0")}
              </span>

              <div
                className="
                  mb-3
                  aspect-[1.25]
                  overflow-hidden
                  rounded-xl
                  bg-[#EAF1F3]
                  dark:bg-[#123B4A]
                "
              >
                {category.image_url ? (
                  <img
                    src={
                      category.image_url
                    }
                    alt={
                      category.name
                    }
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="
                      h-full
                      w-full
                      object-cover
                      transition-transform
                      duration-500
                      group-hover:scale-105
                    "
                  />
                ) : (
                  <div
                    className="
                      grid
                      h-full
                      w-full
                      place-items-center
                      text-[#0E4D64]
                      dark:text-[#E2723A]
                    "
                  >
                    <Grid2X2 className="h-7 w-7" />
                  </div>
                )}
              </div>

              <p
                className="
                  truncate
                  text-[11px]
                  font-black
                  text-foreground
                "
              >
                {category.name}
              </p>

              <p
                className="
                  mt-1
                  text-[9px]
                  text-muted-foreground
                "
              >
                {category.productCount.toLocaleString(
                  "ar-EG",
                )}{" "}
                منتجات
              </p>
            </Link>
          ),
        )}
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
  products: Awaited<
    ReturnType<typeof fetchProducts>
  >;
  loading: boolean;
}) {
  return (
    <SectionSurface className="py-4 sm:py-5">
      <div
        className="
          mb-4
          flex
          items-end
          justify-between
          gap-4
          px-4
          sm:px-5
        "
      >
        <div>
          <p
            className="
              mb-1
              text-[10px]
              font-bold
              text-[#D65A31]
            "
          >
            {eyebrow}
          </p>

          <SectionHeading
            title={title}
            to="/products"
          />
        </div>

        <Link
          to="/products"
          className="
            hidden
            items-center
            gap-1
            rounded-xl
            px-2
            py-2
            text-[10px]
            font-bold
            text-[#0E4D64]
            hover:bg-[#0E4D64]/[0.05]
            dark:text-[#E2723A]
            sm:inline-flex
          "
        >
          عرض المزيد
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div
          className="
            no-scrollbar
            flex
            gap-3
            overflow-x-auto
            px-4
            pb-1
            sm:px-5
          "
        >
          {Array.from({
            length: 5,
          }).map((_, index) => (
            <div
              key={index}
              className="
                w-[174px]
                shrink-0
                sm:w-[190px]
              "
            >
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      ) : products.length ? (
        <div
          className="
            no-scrollbar
            grid
            grid-cols-2
            gap-3
            px-4
            sm:grid-cols-3
            sm:px-5
            lg:grid-cols-4
          "
        >
          {products
            .slice(0, 8)
            .map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
        </div>
      ) : (
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
          لا توجد منتجات متاحة حاليًا.
        </div>
      )}
    </SectionSurface>
  );
}

function ServiceHighlights() {
  return (
    <div
      className="
        grid
        grid-cols-2
        gap-2.5
        sm:grid-cols-4
      "
    >
      <div
        className="
          rounded-2xl
          border
          border-[#0E4D64]/[0.07]
          bg-white
          p-3
          dark:border-white/[0.06]
          dark:bg-[#0A2A38]
        "
      >
        <PackageSearch
          className="
            mb-2
            h-5
            w-5
            text-[#0E4D64]
            dark:text-[#E2723A]
          "
        />
        <p className="text-[10px] font-black">
          تشكيلة متنوعة
        </p>
        <p className="mt-1 text-[9px] text-muted-foreground">
          منتجات من أقسام متعددة
        </p>
      </div>

      <div
        className="
          rounded-2xl
          border
          border-[#0E4D64]/[0.07]
          bg-white
          p-3
          dark:border-white/[0.06]
          dark:bg-[#0A2A38]
        "
      >
        <Truck
          className="
            mb-2
            h-5
            w-5
            text-[#0E4D64]
            dark:text-[#E2723A]
          "
        />
        <p className="text-[10px] font-black">
          توصيل للمحافظات
        </p>
        <p className="mt-1 text-[9px] text-muted-foreground">
          خيارات توصيل حسب الطلب
        </p>
      </div>

      <div
        className="
          rounded-2xl
          border
          border-[#0E4D64]/[0.07]
          bg-white
          p-3
          dark:border-white/[0.06]
          dark:bg-[#0A2A38]
        "
      >
        <Store
          className="
            mb-2
            h-5
            w-5
            text-[#0E4D64]
            dark:text-[#E2723A]
          "
        />
        <p className="text-[10px] font-black">
          تجار ومنتجات محلية
        </p>
        <p className="mt-1 text-[9px] text-muted-foreground">
          اكتشف المتاجر والمنتجات اليمنية
        </p>
      </div>

      <div
        className="
          rounded-2xl
          border
          border-[#0E4D64]/[0.07]
          bg-white
          p-3
          dark:border-white/[0.06]
          dark:bg-[#0A2A38]
        "
      >
        <Sparkles
          className="
            mb-2
            h-5
            w-5
            text-[#D65A31]
          "
        />
        <p className="text-[10px] font-black">
          عروض متجددة
        </p>
        <p className="mt-1 text-[9px] text-muted-foreground">
          تابع أحدث العروض والمنتجات
        </p>
      </div>
    </div>
  );
}

export function HomePage() {
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

  const sectionMap =
    useMemo<SectionMap>(
      () => {
        const map: SectionMap =
          {};

        for (
          const section of homeSections
        ) {
          map[
            section.section_key
          ] = section;
        }

        return map;
      },
      [homeSections],
    );

  const customSections =
    useMemo(
      () =>
        homeSections
          .filter(
            (section) =>
              section.section_key.startsWith(
                "custom_",
              ) &&
              !BUILT_IN_SECTION_KEYS.has(
                section.section_key,
              ) &&
              section.is_active,
          )
          .sort(
            (a, b) =>
              a.sort_order -
              b.sort_order,
          ),
      [homeSections],
    );

  const bestSellers =
    bestProducts.slice(0, 8);

  return (
    <div
      dir="rtl"
      className="
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
            -end-40
            top-32
            h-96
            w-96
            rounded-full
            bg-[#0E4D64]/[0.045]
            blur-3xl
            dark:bg-[#D65A31]/[0.02]
          "
        />

        <div
          className="
            absolute
            -start-40
            top-[55rem]
            h-96
            w-96
            rounded-full
            bg-[#D65A31]/[0.045]
            blur-3xl
            dark:bg-[#0E4D64]/[0.10]
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
            gap-4
            px-3
            pb-28
            pt-[126px]
            sm:gap-5
            sm:px-4
            sm:pt-[132px]
            lg:px-5
          "
        >
          <SectionWrapper
            sectionKey="stories"
            sections={sectionMap}
          >
            <StoriesCategories />
          </SectionWrapper>

          <SectionWrapper
            sectionKey="hero"
            sections={sectionMap}
          >
            <SectionSurface
              className="
                overflow-hidden
                border-[#D65A31]/20
                bg-[#0E4D64]
                p-1
              "
            >
              <div className="overflow-hidden rounded-[1.45rem]">
                <PromoSlider />
              </div>
            </SectionSurface>
          </SectionWrapper>

          <ServiceHighlights />

          <SectionWrapper
            sectionKey="categories"
            sections={sectionMap}
          >
            <CategoryShowcase
              categories={categories}
              loading={
                categoriesLoading
              }
            />
          </SectionWrapper>

          <SectionWrapper
            sectionKey="popular_categories"
            sections={sectionMap}
          >
            <PopularCategories
              categories={categories}
              products={bestProducts}
            />
          </SectionWrapper>

          <SectionWrapper
            sectionKey="flash_sale"
            sections={sectionMap}
          >
            <SectionSurface>
              <FlashSaleSection />
            </SectionSurface>
          </SectionWrapper>

          <SectionWrapper
            sectionKey="offers"
            sections={sectionMap}
          >
            <SectionSurface>
              <OffersSection />
            </SectionSurface>
          </SectionWrapper>

          <SectionWrapper
            sectionKey="banners"
            sections={sectionMap}
          >
            <SectionSurface
              className="
                overflow-hidden
                border-[#D65A31]/15
                bg-[#0E4D64]
                p-1
              "
            >
              <div className="overflow-hidden rounded-[1.45rem]">
                <BannerCarousel4to1 />
              </div>
            </SectionSurface>
          </SectionWrapper>

          <SectionWrapper
            sectionKey="best_sellers"
            sections={sectionMap}
          >
            <ProductRail
              title="الأكثر مبيعًا"
              eyebrow="اختيارات العملاء"
              products={bestSellers}
              loading={
                bestProductsLoading
              }
            />
          </SectionWrapper>

          <SectionWrapper
            sectionKey="new_arrivals"
            sections={sectionMap}
          >
            <ProductRail
              title="وصل حديثًا"
              eyebrow="أحدث الإضافات"
              products={
                newestProducts
              }
              loading={
                newestProductsLoading
              }
            />
          </SectionWrapper>

          <SectionWrapper
            sectionKey="brands"
            sections={sectionMap}
          >
            <SectionSurface>
              <BrandsSection />
            </SectionSurface>
          </SectionWrapper>

          <SectionWrapper
            sectionKey="top_vendors"
            sections={sectionMap}
          >
            <SectionSurface>
              <TopVendors />
            </SectionSurface>
          </SectionWrapper>

          <SectionWrapper
            sectionKey="local_products"
            sections={sectionMap}
          >
            <SectionSurface>
              <LocalProducts />
            </SectionSurface>
          </SectionWrapper>

          {!homeSectionsLoading &&
            customSections.map(
              (section) => (
                <CustomSection
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
