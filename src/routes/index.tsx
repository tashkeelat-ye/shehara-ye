import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
   Home background
   ========================================================= */

function HomeBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute -right-40 top-24 h-80 w-80 rounded-full blur-3xl"
        style={{
          background:
            "rgb(14 77 100 / 4%)",
        }}
      />

      <div
        className="absolute -left-40 top-[42rem] h-96 w-96 rounded-full blur-3xl"
        style={{
          background:
            "rgb(214 90 49 / 3%)",
        }}
      />

      <div
        className="absolute right-[20%] top-[75rem] h-64 w-64 rounded-full blur-3xl"
        style={{
          background:
            "rgb(14 77 100 / 2%)",
        }}
      />
    </div>
  );
}

/* =========================================================
   Quick actions
   ========================================================= */

function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
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
      className="group flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center transition-transform duration-200 active:scale-95"
      style={{
        border:
          "1px solid var(--shehara-border-soft, var(--border))",
        background:
          "var(--shehara-surface, var(--color-surface))",
        boxShadow:
          "var(--shehara-shadow-xs, 0 2px 8px rgb(8 29 39 / 5%))",
      }}
    >
      <span
        className="grid h-10 w-10 place-items-center rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5"
        style={{
          background:
            "rgb(14 77 100 / 8%)",
          color:
            "var(--shehara-teal, var(--color-primary))",
        }}
      >
        <span className="h-5 w-5">
          {icon}
        </span>
      </span>

      <span
        className="text-[10px] font-bold leading-4"
        style={{
          color:
            "var(--shehara-text, var(--color-foreground))",
        }}
      >
        {label}
      </span>
    </Link>
  );
}

/* =========================================================
   Popular categories
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
      const score = scores.get(category.id);

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
    <section className="shehara-surface overflow-hidden p-4">
      <SectionHeader
        title="الأقسام الرائجة"
        action="كل الأقسام"
        href="/products"
      />

      <div className="shehara-horizontal mt-4">
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
              className="group flex w-[82px] shrink-0 flex-col items-center text-center active:scale-95"
            >
              <span
                className="grid h-[68px] w-[68px] place-items-center rounded-[1.35rem] transition-transform duration-200 group-hover:-translate-y-0.5"
                style={{
                  border:
                    "1px solid var(--shehara-border-soft, var(--border))",
                  background:
                    "rgb(14 77 100 / 6%)",
                  color:
                    "var(--shehara-teal, var(--color-primary))",
                }}
              >
                <Icon
                  className="h-7 w-7"
                  strokeWidth={1.65}
                />
              </span>

              <span
                className="mt-2 line-clamp-1 w-full text-[10px] font-bold"
                style={{
                  color:
                    "var(--shehara-text, var(--color-foreground))",
                }}
              >
                {category.name}
              </span>

              {category.productCount > 0 ? (
                <span
                  className="mt-0.5 text-[8px]"
                  style={{
                    color:
                      "var(--shehara-muted, var(--color-muted))",
                  }}
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
    </section>
  );
}

/* =========================================================
   Section header
   ========================================================= */

function SectionHeader({
  title,
  action,
  href,
}: {
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2
          className="text-[17px] font-extrabold tracking-tight"
          style={{
            color:
              "var(--shehara-text, var(--color-foreground))",
          }}
        >
          {title}
        </h2>

        <div
          className="mt-1.5 h-1 w-7 rounded-full"
          style={{
            background:
              "var(--shehara-orange, var(--color-accent))",
          }}
        />
      </div>

      {action && href ? (
        <Link
          to={href}
          className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 text-[10px] font-bold transition-transform active:scale-95"
          style={{
            color:
              "var(--shehara-teal, var(--color-primary))",
          }}
        >
          {action}

          <ChevronLeft
            className="h-3.5 w-3.5"
            strokeWidth={2.2}
          />
        </Link>
      ) : null}
    </div>
  );
}

/* =========================================================
   Product section
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
      <SectionHeader
        title={title}
        action={action}
        href="/products"
      />

      <div className="mt-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({
              length: 8,
            }).map((_, index) => (
              <ProductCardSkeleton
                key={index}
              />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="shehara-product-grid sm:grid-cols-3 md:grid-cols-4">
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
            className="rounded-2xl px-5 py-10 text-center"
            style={{
              border:
                "1px dashed var(--shehara-border, var(--border))",
              background:
                "var(--shehara-surface, var(--color-surface))",
            }}
          >
            <div
              className="mx-auto grid h-12 w-12 place-items-center rounded-2xl"
              style={{
                background:
                  "rgb(14 77 100 / 7%)",
                color:
                  "var(--shehara-teal, var(--color-primary))",
              }}
            >
              <Package className="h-5 w-5" />
            </div>

            <p
              className="mt-3 text-xs font-bold"
              style={{
                color:
                  "var(--shehara-text, var(--color-foreground))",
              }}
            >
              لا توجد منتجات متاحة حالياً
            </p>

            <p
              className="mt-1 text-[10px]"
              style={{
                color:
                  "var(--shehara-muted, var(--color-muted))",
              }}
            >
              سنضيف منتجات جديدة قريباً.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   Trust bar
   ========================================================= */

function HomeTrustBar() {
  return (
    <div
      className="grid grid-cols-3 overflow-hidden rounded-2xl"
      style={{
        border:
          "1px solid var(--shehara-border-soft, var(--border))",
        background:
          "var(--shehara-surface, var(--color-surface))",
      }}
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
      className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 px-2 text-center"
      style={{
        borderInlineStart:
          "1px solid var(--shehara-border-soft, var(--border))",
      }}
    >
      <span
        style={{
          color:
            "var(--shehara-orange, var(--color-accent))",
        }}
      >
        <span className="block h-4 w-4">
          {icon}
        </span>
      </span>

      <span
        className="text-[9px] font-bold"
        style={{
          color:
            "var(--shehara-text, var(--color-foreground))",
        }}
      >
        {title}
      </span>
    </div>
  );
}

/* =========================================================
   Brand CTA
   ========================================================= */

function FinalBrandCard() {
  return (
    <section
      className="relative overflow-hidden rounded-[1.7rem] px-5 py-7 text-white"
      style={{
        background:
          "var(--shehara-teal, var(--color-primary))",
        boxShadow:
          "var(--shehara-shadow-brand, 0 22px 55px -32px rgb(14 77 100 / 45%))",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-16 -top-20 h-48 w-48 rounded-full"
        style={{
          border:
            "1px solid rgb(255 255 255 / 8%)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-8 -top-12 h-32 w-32 rounded-full"
        style={{
          border:
            "1px solid rgb(214 90 49 / 20%)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -start-12 h-44 w-44 rounded-full"
        style={{
          border:
            "1px solid rgb(255 255 255 / 6%)",
        }}
      />

      <div className="relative z-10">
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold"
          style={{
            background:
              "rgb(255 255 255 / 9%)",
            color:
              "rgb(255 255 255 / 92%)",
          }}
        >
          <TrendingUp className="h-3 w-3" />

          شهارة
        </div>

        <h2 className="mt-4 text-2xl font-black tracking-tight">
          تسوق بلا حدود
        </h2>

        <p
          className="mt-2 max-w-md text-xs leading-6"
          style={{
            color:
              "rgb(255 255 255 / 72%)",
          }}
        >
          تجربة تسوق إلكترونية يمنية
          حديثة تجمع لك المنتجات
          والعروض في مكان واحد.
        </p>

        <Link
          to="/products"
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-extrabold text-white transition-transform active:scale-95"
          style={{
            background:
              "var(--shehara-orange, var(--color-accent))",
          }}
        >
          ابدأ التسوق

          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* =========================================================
   Home page
   ========================================================= */

function HomePage() {
  const {
    data: bestProducts = [],
    isLoading: bestProductsLoading,
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
    data: latestProducts = [],
    isLoading: latestProductsLoading,
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
    staleTime:
      1000 * 60 * 5,
    gcTime:
      1000 * 60 * 30,
  });

  const {
    data: categories = [],
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

  return (
    <div
      dir="rtl"
      className="shehara-app relative overflow-x-hidden"
    >
      <HomeBackground />

      <div className="relative z-10">
        <SiteHeader />

        <main className="mx-auto w-full max-w-6xl px-3 pb-8 pt-3 sm:px-5 sm:pt-5 lg:px-6">
          {/* =================================================
              Hero
             ================================================= */}
          <section className="mb-5">
            <PromoSlider />
          </section>

          {/* =================================================
              Quick actions
             ================================================= */}
          <section className="mb-6">
            <QuickActions />
          </section>

          {/* =================================================
              Popular categories
             ================================================= */}
          <section className="mb-7">
            <PopularCategories
              categories={categories}
              bestProducts={bestProducts}
            />
          </section>

          {/* =================================================
              Trust
             ================================================= */}
          <section className="mb-8">
            <HomeTrustBar />
          </section>

          {/* =================================================
              Best sellers
             ================================================= */}
          <section className="mb-9">
            <ProductSection
              title="الأكثر مبيعاً"
              products={bestProducts}
              loading={
                bestProductsLoading
              }
            />
          </section>

          {/* =================================================
              Flash sales
             ================================================= */}
          <section className="mb-9">
            <FlashSaleSection />
          </section>

          {/* =================================================
              Offers
             ================================================= */}
          <section className="mb-9">
            <OffersSection />
          </section>

          {/* =================================================
              Latest products
             ================================================= */}
          <section className="mb-9">
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
              Local products
             ================================================= */}
          <section className="mb-9">
            <LocalProducts />
          </section>

          {/* =================================================
              Brands
             ================================================= */}
          <section className="mb-9">
            <BrandsSection />
          </section>

          {/* =================================================
              Shehara CTA
             ================================================= */}
          <FinalBrandCard />
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

export default HomePage;
