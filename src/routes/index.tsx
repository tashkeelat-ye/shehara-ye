import React from "react";
import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  CookingPot,
  Grid2X2,
  Landmark,
  Lamp,
  Package,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Watch,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { PromoSlider } from "@/components/promo-slider";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "شهارة | تسوق بلا حدود",
      },
      {
        name: "description",
        content:
          "شهارة — متجر إلكتروني يمني حديث للتسوق من المنتجات المحلية والعالمية.",
      },
      {
        property: "og:title",
        content: "شهارة | تسوق بلا حدود",
      },
      {
        property: "og:description",
        content:
          "تسوّق بسهولة من شهارة، متجرك الإلكتروني اليمني.",
      },
    ],
    component: HomePage,
  }),
});

/* =========================================================
   CATEGORY ICONS
   ========================================================= */

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

/* =========================================================
   HOME BACKGROUND
   ========================================================= */

function HomeBackground() {
  return (
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
          top-24
          h-72
          w-72
          rounded-full
          bg-[#0E4D64]/[0.035]
          blur-3xl
        "
      />

      <div
        className="
          absolute
          -start-40
          top-[42rem]
          h-80
          w-80
          rounded-full
          bg-[#D65A31]/[0.025]
          blur-3xl
        "
      />

      <div
        className="
          absolute
          end-[15%]
          top-[78rem]
          h-64
          w-64
          rounded-full
          bg-[#0E4D64]/[0.02]
          blur-3xl
        "
      />
    </div>
  );
}

/* =========================================================
   SECTION CARD
   ========================================================= */

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`
        relative
        overflow-hidden
        rounded-[1.6rem]
        border
        border-[#0E4D64]/10
        bg-white
        shadow-[0_14px_45px_-35px_rgba(14,77,100,0.18)]
        dark:border-white/10
        dark:bg-[#0B2936]
        ${className}
      `}
    >
      {children}
    </section>
  );
}

/* =========================================================
   QUICK ACTIONS
   ========================================================= */

function QuickActions() {
  return (
    <div
      className="
        grid
        grid-cols-4
        gap-2
        sm:gap-3
      "
    >
      <QuickAction
        icon={<Grid2X2 />}
        label="الأقسام"
        href="/products"
      />

      <QuickAction
        icon={<Tag />}
        label="العروض"
        href="/products"
      />

      <QuickAction
        icon={<Package />}
        label="طلباتي"
        href="/orders"
      />

      <QuickAction
        icon={<Star />}
        label="الأعلى تقييماً"
        href="/products"
      />
    </div>
  );
}

function QuickAction({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="
        group
        flex
        min-h-[82px]
        flex-col
        items-center
        justify-center
        gap-2
        rounded-2xl
        border
        border-[#0E4D64]/10
        bg-white
        px-2
        py-3
        text-center
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-[#D65A31]/20
        hover:shadow-[0_12px_30px_-24px_rgba(14,77,100,0.5)]
        active:scale-95
        dark:border-white/10
        dark:bg-[#0B2936]
      "
    >
      <span
        className="
          grid
          h-10
          w-10
          place-items-center
          rounded-xl
          bg-[#0E4D64]/[0.07]
          text-[#0E4D64]
          transition-all
          duration-200
          group-hover:bg-[#D65A31]/10
          group-hover:text-[#D65A31]
          dark:bg-white/[0.06]
          dark:text-[#D9EEF5]
        "
      >
        <span className="h-5 w-5">
          {icon}
        </span>
      </span>

      <span
        className="
          text-[10px]
          font-bold
          leading-4
          text-[#132D38]
          dark:text-white
        "
      >
        {label}
      </span>
    </Link>
  );
}

/* =========================================================
   POPULAR CATEGORIES
   ========================================================= */

function PopularCategories({
  categories,
  bestProducts,
}: {
  categories: Category[];
  bestProducts: Awaited<
    ReturnType<typeof fetchProducts>
  >;
}) {
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

  const popular = categories
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
    .sort(
      (a, b) =>
        b.popularityScore -
        a.popularityScore,
    )
    .slice(0, 8) as PopularCategory[];

  if (popular.length === 0) {
    return null;
  }

  return (
    <SectionCard className="p-4">
      <SectionHeading
        title="الأقسام الرائجة"
        action="كل الأقسام"
        to="/products"
      />

      <div
        className="
          mt-4
          flex
          gap-3
          overflow-x-auto
          pb-1
          scrollbar-none
        "
      >
        {popular.map((category) => {
          const Icon =
            CATEGORY_ICONS[
              category.icon as keyof typeof CATEGORY_ICONS
            ] ?? Shirt;

          return (
            <Link
              key={category.id}
              to="/category/$slug"
              params={{
                slug: category.slug,
              }}
              className="
                group
                flex
                w-[88px]
                shrink-0
                flex-col
                items-center
                text-center
                active:scale-95
              "
            >
              <span
                className="
                  grid
                  h-[68px]
                  w-[68px]
                  place-items-center
                  rounded-[1.35rem]
                  border
                  border-[#0E4D64]/10
                  bg-[#0E4D64]/[0.055]
                  text-[#0E4D64]
                  transition-all
                  duration-200
                  group-hover:-translate-y-1
                  group-hover:border-[#D65A31]/20
                  group-hover:bg-[#D65A31]/10
                  group-hover:text-[#D65A31]
                  dark:border-white/10
                  dark:bg-white/[0.05]
                  dark:text-[#D9EEF5]
                "
              >
                <Icon
                  className="h-7 w-7"
                  strokeWidth={1.65}
                />
              </span>

              <span
                className="
                  mt-2
                  line-clamp-1
                  w-full
                  text-[10px]
                  font-bold
                  text-[#132D38]
                  dark:text-white
                "
              >
                {category.name}
              </span>

              {category.productCount >
              0 ? (
                <span
                  className="
                    mt-0.5
                    text-[8px]
                    text-[#71858E]
                    dark:text-[#8EA4AE]
                  "
                >
                  {category.productCount.toLocaleString(
                    "ar-EG",
                  )}{" "}
                  منتج
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* =========================================================
   PRODUCT SECTION
   ========================================================= */

function ProductSection({
  title,
  products,
  loading,
  action = "عرض الكل",
}: {
  title: string;
  products: Awaited<
    ReturnType<typeof fetchProducts>
  >;
  loading: boolean;
  action?: string;
}) {
  return (
    <section>
      <div
        className="
          mb-4
          flex
          items-end
          justify-between
          gap-3
        "
      >
        <div>
          <h2
            className="
              text-base
              font-extrabold
              tracking-tight
              text-[#0E4D64]
              sm:text-lg
              dark:text-[#D9EEF5]
            "
          >
            {title}
          </h2>

          <div
            className="
              mt-1
              h-1
              w-8
              rounded-full
              bg-[#D65A31]
            "
          />
        </div>

        <Link
          to="/products"
          className="
            inline-flex
            min-h-9
            shrink-0
            items-center
            gap-1
            rounded-xl
            px-2
            text-[10px]
            font-bold
            text-[#0E4D64]
            transition-colors
            hover:bg-[#0E4D64]/5
            dark:text-[#D9EEF5]
          "
        >
          {action}

          <ChevronLeft
            className="h-3.5 w-3.5"
            strokeWidth={2.2}
          />
        </Link>
      </div>

      {loading ? (
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
          }).map((_, index) => (
            <ProductCardSkeleton
              key={index}
            />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div
          className="
            grid
            grid-cols-2
            gap-3
            sm:grid-cols-3
            md:grid-cols-4
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
            rounded-2xl
            border
            border-dashed
            border-[#0E4D64]/15
            bg-white
            px-5
            py-10
            text-center
            dark:border-white/10
            dark:bg-[#0B2936]
          "
        >
          <div
            className="
              mx-auto
              grid
              h-12
              w-12
              place-items-center
              rounded-2xl
              bg-[#0E4D64]/[0.06]
              text-[#0E4D64]
              dark:bg-white/[0.06]
              dark:text-[#D9EEF5]
            "
          >
            <Package className="h-5 w-5" />
          </div>

          <p
            className="
              mt-3
              text-xs
              font-bold
              text-[#132D38]
              dark:text-white
            "
          >
            لا توجد منتجات متاحة حالياً
          </p>

          <p
            className="
              mt-1
              text-[10px]
              text-[#71858E]
              dark:text-[#8EA4AE]
            "
          >
            سنضيف منتجات جديدة قريباً.
          </p>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   TRUST BAR
   ========================================================= */

function HomeTrustBar() {
  return (
    <div
      className="
        grid
        grid-cols-3
        overflow-hidden
        rounded-2xl
        border
        border-[#0E4D64]/10
        bg-white
        dark:border-white/10
        dark:bg-[#0B2936]
      "
    >
      <TrustItem
        icon={<Package />}
        title="توصيل موثوق"
      />

      <TrustItem
        icon={<ShoppingBasket />}
        title="تسوق بسهولة"
      />

      <TrustItem
        icon={<Sparkles />}
        title="تجربة شهارة"
      />
    </div>
  );
}

function TrustItem({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div
      className="
        flex
        min-h-[72px]
        flex-col
        items-center
        justify-center
        gap-1.5
        px-2
        text-center
        [&+div]:border-s
        [&+div]:border-[#0E4D64]/10
        dark:[&+div]:border-white/10
      "
    >
      <span className="text-[#D65A31]">
        <span className="block h-4 w-4">
          {icon}
        </span>
      </span>

      <span
        className="
          text-[9px]
          font-bold
          text-[#132D38]
          dark:text-white
        "
      >
        {title}
      </span>
    </div>
  );
}

/* =========================================================
   BRAND CTA
   ========================================================= */

function FinalBrandCard() {
  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-[1.7rem]
        bg-[#0E4D64]
        px-5
        py-7
        text-white
        shadow-[0_22px_55px_-32px_rgba(14,77,100,0.65)]
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -end-16
          -top-20
          h-48
          w-48
          rounded-full
          border
          border-white/[0.08]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -end-8
          -top-12
          h-32
          w-32
          rounded-full
          border
          border-[#D65A31]/20
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -start-16
          -bottom-24
          h-40
          w-40
          rounded-full
          bg-[#D65A31]/10
          blur-2xl
        "
      />

      <div className="relative z-10">
        <div
          className="
            inline-flex
            items-center
            gap-1.5
            rounded-full
            bg-white/[0.08]
            px-3
            py-1.5
            text-[9px]
            font-bold
            text-white/90
          "
        >
          <TrendingUp className="h-3 w-3" />

          شهارة
        </div>

        <h2
          className="
            mt-4
            text-2xl
            font-black
            tracking-tight
          "
        >
          تسوق بلا حدود
        </h2>

        <p
          className="
            mt-2
            max-w-md
            text-xs
            leading-6
            text-white/70
          "
        >
          تجربة تسوق إلكترونية
          يمنية حديثة تجمع لك
          المنتجات والعروض في
          مكان واحد.
        </p>

        <Link
          to="/products"
          className="
            mt-5
            inline-flex
            min-h-10
            items-center
            gap-2
            rounded-xl
            bg-[#D65A31]
            px-4
            text-xs
            font-extrabold
            text-white
            transition-all
            duration-200
            hover:bg-[#C9502B]
            active:scale-95
          "
        >
          ابدأ التسوق

          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* =========================================================
   HOME PAGE
   ========================================================= */

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
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const {
    data: latestProducts = [],
    isLoading:
      latestProductsLoading,
  } = useQuery({
    queryKey: [
      "products",
      "latest",
      24,
    ],
    queryFn: () =>
      fetchProducts({
        sort: "newest",
        limit: 24,
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const {
    data: categories = [],
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
  });

  return (
    <div
      dir="rtl"
      className="
        relative
        min-h-screen
        overflow-x-hidden
        bg-[#FAF9F6]
        pb-24
        text-[#132D38]
        dark:bg-[#071B24]
        dark:text-white
      "
    >
      <HomeBackground />

      <div className="relative z-10">
        {/* =================================================
            HEADER
           ================================================= */}

        <SiteHeader />

        <main
          className="
            mx-auto
            w-full
            max-w-6xl
            px-3
            pb-8
            pt-3
            sm:px-5
            sm:pt-5
            lg:px-6
          "
        >
          {/* =================================================
              HERO
             ================================================= */}

          <section
            aria-label="العروض الرئيسية"
            className="mb-4"
          >
            <PromoSlider />
          </section>

          {/* =================================================
              QUICK ACTIONS
             ================================================= */}

          <section
            aria-label="اختصارات"
            className="mb-5"
          >
            <QuickActions />
          </section>

          {/* =================================================
              POPULAR CATEGORIES
             ================================================= */}

          <section
            aria-label="الأقسام الرائجة"
            className="mb-6"
          >
            <PopularCategories
              categories={categories}
              bestProducts={
                bestProducts
              }
            />
          </section>

          {/* =================================================
              TRUST
             ================================================= */}

          <section
            aria-label="مزايا شهارة"
            className="mb-7"
          >
            <HomeTrustBar />
          </section>

          {/* =================================================
              BEST SELLERS
             ================================================= */}

          <section
            aria-label="الأكثر مبيعاً"
            className="mb-8"
          >
            <ProductSection
              title="الأكثر مبيعاً"
              products={bestProducts}
              loading={
                bestProductsLoading
              }
            />
          </section>

          {/* =================================================
              FLASH SALES
             ================================================= */}

          <section
            aria-label="العروض السريعة"
            className="mb-8"
          >
            <FlashSaleSection />
          </section>

          {/* =================================================
              OFFERS
             ================================================= */}

          <section
            aria-label="العروض"
            className="mb-8"
          >
            <OffersSection />
          </section>

          {/* =================================================
              LATEST PRODUCTS
             ================================================= */}

          <section
            aria-label="وصل حديثاً"
            className="mb-8"
          >
            <ProductSection
              title="وصل حديثاً"
              products={
                latestProducts
              }
              loading={
                latestProductsLoading
              }
              action="كل المنتجات"
            />
          </section>

          {/* =================================================
              LOCAL PRODUCTS
             ================================================= */}

          <section
            aria-label="المنتجات المحلية"
            className="mb-8"
          >
            <LocalProducts />
          </section>

          {/* =================================================
              BRANDS
             ================================================= */}

          <section
            aria-label="العلامات التجارية"
            className="mb-8"
          >
            <BrandsSection />
          </section>

          {/* =================================================
              FINAL CTA
             ================================================= */}

          <FinalBrandCard />
        </main>

        {/* ===================================================
            MOBILE NAVIGATION
           =================================================== */}

        <BottomNav />
      </div>
    </div>
  );
}

export default HomePage;
