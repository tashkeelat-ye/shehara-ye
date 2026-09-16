import { useQuery } from "@tanstack/react-query";
import {
  Grid2X2,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  BannerCarousel4to1,
} from "@/components/home/BannerCarousel4to1";
import { PromoSlider } from "@/components/promo-slider";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { fetchCategories, fetchProducts } from "@/lib/db";
import type { Category } from "@/lib/db";
import type {
  HomeSection,
  HomeSectionType,
} from "@/lib/store";

type DynamicHomeSectionProps = {
  section: HomeSection;
};

type PopularCategory = Category & {
  productCount: number;
  popularityScore: number;
};

function SectionShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section
      className="
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
      "
    >
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}

function ProductsGrid({
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
          grid
          grid-cols-2
          gap-3
          px-4
          md:grid-cols-3
          lg:grid-cols-4
        "
      >
        {Array.from({ length: 8 }).map(
          (_, index) => (
            <ProductCardSkeleton
              key={index}
            />
          ),
        )}
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
          py-10
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
        grid
        grid-cols-2
        gap-3
        px-4
        md:grid-cols-3
        lg:grid-cols-4
      "
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
        />
      ))}
    </div>
  );
}

function BestSellersSection({
  title,
}: {
  title: string;
}) {
  const {
    data: products = [],
    isLoading,
  } = useQuery({
    queryKey: [
      "dynamic-home-products",
      "best",
    ],
    queryFn: () =>
      fetchProducts({
        sort: "best",
        limit: 8,
      }),
    staleTime: 60_000,
  });

  return (
    <SectionShell>
      <div className="mb-4 px-4 pt-4">
        <SectionHeading
          title={title}
          to="/products"
        />
      </div>

      <ProductsGrid
        products={products}
        loading={isLoading}
      />

      <div className="h-4" />
    </SectionShell>
  );
}

function NewProductsSection({
  title,
}: {
  title: string;
}) {
  const {
    data: products = [],
    isLoading,
  } = useQuery({
    queryKey: [
      "dynamic-home-products",
      "new",
    ],
    queryFn: () =>
      fetchProducts({
        sort: "newest",
        limit: 8,
      }),
    staleTime: 60_000,
  });

  return (
    <SectionShell>
      <div className="mb-4 px-4 pt-4">
        <SectionHeading
          title={title}
          to="/products"
        />
      </div>

      <ProductsGrid
        products={products}
        loading={isLoading}
      />

      <div className="h-4" />
    </SectionShell>
  );
}

function PopularCategoriesSection({
  title,
}: {
  title: string;
}) {
  const {
    data: products = [],
  } = useQuery({
    queryKey: [
      "dynamic-home-category-products",
    ],
    queryFn: () =>
      fetchProducts({
        sort: "best",
        limit: 24,
      }),
    staleTime: 60_000,
  });

  const {
    data: categories = [],
    isLoading,
  } = useQuery({
    queryKey: [
      "dynamic-home-categories",
    ],
    queryFn: fetchCategories,
    staleTime: 60_000,
  });

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

  const popularCategories: PopularCategory[] =
    categories
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

  return (
    <SectionShell>
      <div className="mb-4 flex items-center gap-3 px-4 pt-4">
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
          "
        >
          <Grid2X2
            className="h-5 w-5"
            strokeWidth={1.8}
          />
        </span>

        <div>
          <h2
            className="
              text-base
              font-extrabold
              text-[#0D3B4D]
              dark:text-white
              sm:text-lg
            "
          >
            {title}
          </h2>

          <p className="mt-0.5 text-[10px] text-muted-foreground">
            اكتشف الأقسام الأكثر طلباً
          </p>
        </div>
      </div>

      {isLoading ? (
        <div
          className="
            grid
            grid-cols-4
            gap-3
            px-4
            pb-4
          "
        >
          {Array.from({
            length: 8,
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
            grid
            grid-cols-4
            gap-3
            px-4
            pb-4
            sm:grid-cols-6
            lg:grid-cols-8
          "
        >
          {popularCategories.map(
            (category) => (
              <a
                key={category.id}
                href={`/category/${encodeURIComponent(
                  category.slug,
                )}`}
                className="
                  group
                  flex
                  min-w-0
                  flex-col
                  items-center
                  rounded-2xl
                  border
                  border-[#0D3B4D]/[0.07]
                  bg-white/80
                  px-2
                  py-3
                  transition-all
                  hover:-translate-y-1
                  hover:border-[#E2723A]/30
                  hover:shadow-md
                  dark:bg-white/[0.035]
                "
              >
                <span
                  className="
                    grid
                    h-12
                    w-12
                    place-items-center
                    rounded-2xl
                    bg-[#0D3B4D]/[0.07]
                    text-[#0D3B4D]
                    transition-transform
                    group-hover:scale-105
                    dark:bg-[#E2723A]/[0.08]
                    dark:text-[#E2723A]
                  "
                >
                  <Grid2X2
                    className="h-6 w-6"
                    strokeWidth={1.7}
                  />
                </span>

                <span
                  className="
                    mt-2
                    w-full
                    truncate
                    text-center
                    text-[9px]
                    font-bold
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
            ),
          )}
        </div>
      )}
    </SectionShell>
  );
}

function BannerSubSection({
  title,
}: {
  title: string;
}) {
  return (
    <div className="space-y-3">
      {title && (
        <div className="px-1">
          <SectionHeading
            title={title}
          />
        </div>
      )}

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
    </div>
  );
}

function MainBannerCopySection({
  title,
}: {
  title: string;
}) {
  return (
    <div className="space-y-3">
      {title && (
        <div className="px-1">
          <SectionHeading
            title={title}
          />
        </div>
      )}

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
          <PromoSlider />
        </div>
      </section>
    </div>
  );
}

export function DynamicHomeSection({
  section,
}: DynamicHomeSectionProps) {
  if (!section.is_active) {
    return null;
  }

  const type: HomeSectionType =
    section.section_type;

  switch (type) {
    case "banner_sub":
      return (
        <BannerSubSection
          title={section.title}
        />
      );

    case "banner_main_copy":
      return (
        <MainBannerCopySection
          title={section.title}
        />
      );

    case "best_sellers":
      return (
        <BestSellersSection
          title={section.title}
        />
      );

    case "new_products":
      return (
        <NewProductsSection
          title={section.title}
        />
      );

    case "popular_categories":
      return (
        <PopularCategoriesSection
          title={section.title}
        />
      );

    default:
      return null;
  }
}
