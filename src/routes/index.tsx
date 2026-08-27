import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CookingPot,
  Landmark,
  Lamp,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  TrendingUp,
  Watch,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { PromoSlider } from "@/components/promo-slider";
import { CategoryStrip } from "@/components/category-strip";
import { FlashSaleSection } from "@/components/home/FlashSaleSection";
import { OffersSection } from "@/components/offers-section";
import { BrandsSection } from "@/components/brands-section";
import { SectionHeading } from "@/components/section-heading";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product-card";
import { LocalProducts } from "@/components/local-products";
import { BottomNav } from "@/components/bottom-nav";

import {
  fetchCategories,
  fetchProducts,
} from "@/lib/db";

import type { Category } from "@/lib/db";

export const Route =
  createFileRoute("/")({
    head: () => ({
      meta: [
        {
          title:
            "شهارة | تسوق بلا حدود",
        },
        {
          name: "description",
          content:
            "شهارة — متجر إلكتروني يمني حديث للتسوق من المنتجات المحلية والعالمية، مع العسل والبن والفضيات والإلكترونيات والعطور والمستلزمات المنزلية.",
        },
        {
          property: "og:title",
          content:
            "شهارة | تسوق بلا حدود",
        },
        {
          property:
            "og:description",
          content:
            "تسوّق بسهولة من شهارة، متجرك الإلكتروني اليمني.",
        },
      ],
    }),
    component: HomePage,
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
};

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
      className={`
        pointer-events-none
        absolute
        ${className}
      `}
    >
      <span
        className="
          absolute
          h-24
          w-24
          rotate-45
          rounded-3xl
          border
          border-[#0E4D64]/[0.045]
        "
      />

      <span
        className="
          absolute
          left-4
          top-4
          h-16
          w-16
          rotate-45
          rounded-2xl
          border
          border-[#D65A31]/[0.06]
        "
      />
    </div>
  );
}

function PopularCategories({
  categories,
  bestProducts,
}: {
  categories: Category[];
  bestProducts: Awaited<
    ReturnType<typeof fetchProducts>
  >;
}) {
  const scores =
    new Map<
      string,
      {
        productCount: number;
        popularityScore: number;
      }
    >();

  for (const product of bestProducts) {
    const current =
      scores.get(
        product.category_id,
      ) ?? {
        productCount: 0,
        popularityScore: 0,
      };

    current.productCount += 1;

    current.popularityScore +=
      Number(
        product.sales_count,
      ) || 0;

    scores.set(
      product.category_id,
      current,
    );
  }

  const popular =
    categories
      .map(
        (category) => {
          const score =
            scores.get(
              category.id,
            );

          return {
            ...category,
            productCount:
              score?.productCount ??
              0,
            popularityScore:
              score?.popularityScore ??
              0,
          };
        },
      )
      .sort(
        (a, b) =>
          b.popularityScore -
          a.popularityScore,
      )
      .slice(0, 6) as PopularCategory[];

  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-[1.75rem]
        border
        border-[#0E4D64]/8
        bg-white
        px-4
        py-5
        shadow-[0_12px_35px_-28px_rgba(14,77,100,0.6)]
        dark:bg-card
      "
    >
      <HeritagePattern
        className="
          -end-8
          -top-8
          scale-125
        "
      />

      <div className="relative z-10">
        <SectionHeading
          title="أقسام رائجة"
          action="كل الأقسام"
          to="/products"
        />

        <div
          className="
            mt-4
            grid
            grid-cols-2
            gap-3
            sm:grid-cols-3
            md:grid-cols-6
          "
        >
          {popular.map(
            (category, index) => {
              const Icon =
                CATEGORY_ICONS[
                  category.icon as keyof typeof CATEGORY_ICONS
                ] ?? Shirt;

              const orange =
                index % 3 === 1;

              return (
                <a
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="
                    group
                    flex
                    min-h-[122px]
                    flex-col
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-[#0E4D64]/7
                    bg-[#FAF9F6]
                    p-3
                    text-center
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:shadow-[0_12px_28px_-22px_rgba(14,77,100,0.7)]
                    active:scale-95
                    dark:bg-[#0B2936]
                  "
                >
                  <span
                    className={`
                      grid
                      h-12
                      w-12
                      place-items-center
                      rounded-2xl
                      ${
                        orange
                          ? "bg-[#D65A31]/10 text-[#D65A31]"
                          : "bg-[#0E4D64]/10 text-[#0E4D64]"
                      }
                    `}
                  >
                    <Icon
                      className="h-6 w-6"
                      strokeWidth={1.8}
                    />
                  </span>

                  <span
                    className="
                      mt-2
                      line-clamp-1
                      text-xs
                      font-bold
                      text-foreground
                    "
                  >
                    {category.name}
                  </span>

                  {category.productCount >
                  0 ? (
                    <span
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
                    </span>
                  ) : null}
                </a>
              );
            },
          )}
        </div>
      </div>
    </section>
  );
}

function HomePage() {
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
    data: categories = [],
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime:
      1000 * 60 * 10,
    gcTime:
      1000 * 60 * 60,
  });

  const bestSellers =
    bestProducts.slice(
      0,
      8,
    );

  return (
    <div
      dir="rtl"
      className="
        relative
        min-h-screen
        overflow-x-hidden
        bg-[#FAF9F6]
        pb-24
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
            -end-32
            top-32
            h-72
            w-72
            rounded-full
            bg-[#0E4D64]/[0.025]
            blur-3xl
          "
        />

        <div
          className="
            absolute
            -start-32
            top-[48rem]
            h-80
            w-80
            rounded-full
            bg-[#D65A31]/[0.025]
            blur-3xl
          "
        />

        <HeritagePattern
          className="
            end-0
            top-[22rem]
            scale-[1.7]
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
            space-y-6
            px-3
            py-4
            sm:space-y-8
            sm:px-5
            lg:px-6
          "
        >
          {/* Hero */}
          <section>
            <PromoSlider />
          </section>

          {/* Categories */}
          <CategoryStrip />

          {/* Popular */}
          <PopularCategories
            categories={categories}
            bestProducts={
              bestProducts
            }
          />

          {/* Best sellers */}
          <section className="space-y-4">
            <SectionHeading
              title="الأكثر مبيعاً"
              action="عرض الكل"
              to="/products"
            />

            {bestProductsLoading ? (
              <div
                className="
                  grid
                  grid-cols-2
                  gap-3
                  sm:grid-cols-3
                  md:grid-cols-4
                "
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
            ) : (
              <div
                className="
                  grid
                  grid-cols-2
                  gap-3
                  sm:grid-cols-3
                  md:grid-cols-4
                "
              >
                {bestSellers.map(
                  (product) => (
                    <ProductCard
                      key={product.id}
                      product={
                        product
                      }
                    />
                  ),
                )}
              </div>
            )}
          </section>

          {/* Flash Sale */}
          <FlashSaleSection />

          {/* Offers */}
          <OffersSection />

          {/* Yemeni products */}
          <LocalProducts />

          {/* Brands */}
          <BrandsSection />

          {/* End CTA */}
          <section
            className="
              overflow-hidden
              rounded-[1.75rem]
              bg-[#D65A31]
              px-5
              py-7
              text-white
              shadow-[0_20px_45px_-28px_rgba(214,90,49,0.7)]
            "
          >
            <div
              className="
                max-w-2xl
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-white/80
                "
              >
                <TrendingUp
                  className="h-4 w-4"
                />

                <span
                  className="
                    text-xs
                    font-bold
                  "
                >
                  شهارة
                </span>
              </div>

              <h2
                className="
                  mt-2
                  text-xl
                  font-extrabold
                  sm:text-2xl
                "
              >
                تسوق بلا حدود
              </h2>

              <p
                className="
                  mt-2
                  text-xs
                  leading-6
                  text-white/80
                "
              >
                تجربة تسوق يمنية
                حديثة، سهلة،
                واضحة ومناسبة
                للجميع.
              </p>
            </div>
          </section>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
