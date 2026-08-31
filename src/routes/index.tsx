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

function HomeBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ background: 'transparent' }}
    >
      <div
        style={{
          position: 'absolute',
          right: '-10rem',
          top: '6rem',
          height: '20rem',
          width: '20rem',
          borderRadius: '9999px',
          backgroundColor: 'var(--color-primary)',
          opacity: 0.035,
          filter: 'blur(48px)'
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: '-10rem',
          top: '42rem',
          height: '24rem',
          width: '24rem',
          borderRadius: '9999px',
          backgroundColor: 'var(--color-accent)',
          opacity: 0.025,
          filter: 'blur(48px)'
        }}
      />

      <div
        style={{
          position: 'absolute',
          right: '20%',
          top: '75rem',
          height: '16rem',
          width: '16rem',
          borderRadius: '9999px',
          backgroundColor: 'var(--color-primary)',
          opacity: 0.02,
          filter: 'blur(48px)'
        }}
      />
    </div>
  );
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[1.6rem] ${className}`}
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--color-surface)',
        boxShadow: '0 14px 45px -35px rgba(14,77,100,0.06)'
      }}
    >
      {children}
    </section>
  );
}

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
      className="group flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center transition-all duration-200 active:scale-95"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--color-surface)'
      }}
    >
      <span
        className="grid h-10 w-10 place-items-center rounded-xl transition-all"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
          color: 'var(--color-primary)'
        }}
      >
        <span className="h-5 w-5">{icon}</span>
      </span>

      <span className="text-[10px] font-bold leading-4" style={{ color: 'var(--color-foreground)' }}>
        {label}
      </span>
    </Link>
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

    scores.set(product.category_id, current);
  }

  const popular = categories
    .map((category) => {
      const score = scores.get(category.id);

      return {
        ...category,
        productCount: score?.productCount ?? 0,
        popularityScore: score?.popularityScore ?? 0,
      };
    })
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 8) as PopularCategory[];

  if (popular.length === 0) {
    return null;
  }

  return (
    <SectionCard className="p-4">
      <SectionHeading title="الأقسام الرائجة" action="كل الأقسام" to="/products" />

      <div className="mt-4 flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {popular.map((category, index) => {
          const Icon =
            CATEGORY_ICONS[category.icon as keyof typeof CATEGORY_ICONS] ?? Shirt;

          return (
            <Link
              key={category.id}
              to="/category/$slug"
              params={{ slug: category.slug }}
              className="group flex w-[88px] shrink-0 flex-col items-center text-center active:scale-95"
            >
              <span
                className="grid h-[68px] w-[68px] place-items-center rounded-[1.35rem] transition-all duration-200 group-hover:-translate-y-0.5"
                style={{
                  border: '1px solid var(--border)',
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 7%, transparent)',
                  color: 'var(--color-primary)'
                }}
              >
                <Icon className="h-7 w-7" strokeWidth={1.65} />
              </span>

              <span className="mt-2 line-clamp-1 w-full text-[10px] font-bold" style={{ color: 'var(--color-foreground)' }}>
                {category.name}
              </span>

              {category.productCount > 0 ? (
                <span className="mt-0.5 text-[8px]" style={{ color: 'var(--color-muted)'}}>
                  {category.productCount.toLocaleString("ar-EG")} منتج
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}

function ProductSection({
  title,
  products,
  loading,
  action = "عرض الكل",
}: {
  title: string;
  products: Awaited<ReturnType<typeof fetchProducts>>;
  loading: boolean;
  action?: string;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold tracking-tight sm:text-lg" style={{ color: 'var(--color-primary)' }}>
            {title}
          </h2>

          <div style={{ marginTop: 4, height: 4, width: 28, borderRadius: 9999, backgroundColor: 'var(--color-accent)' }} />
        </div>

        <Link to="/products" className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold" style={{ color: 'var(--color-primary)'}}>
          {action}

          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl px-5 py-10 text-center" style={{ border: '1px dashed var(--border)', backgroundColor: 'var(--color-surface)'}}>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', color: 'var(--color-primary)'}}>
            <Package className="h-5 w-5" />
          </div>

          <p className="mt-3 text-xs font-bold" style={{ color: 'var(--color-foreground)'}}>
            لا توجد منتجات متاحة حالياً
          </p>

          <p className="mt-1 text-[10px]" style={{ color: 'var(--color-muted)'}}>
            سنضيف منتجات جديدة قريباً.
          </p>
        </div>
      )}
    </section>
  );
}

function HomeTrustBar() {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-2xl" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--color-surface)'}}>
      <TrustItem icon={<Package />} title="توصيل موثوق" />

      <TrustItem icon={<ShoppingBasket />} title="تسوق بسهولة" />

      <TrustItem icon={<Sparkles />} title="تجربة شهارة" />
    </div>
  );
}

function TrustItem({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 px-2 text-center" style={{ borderInlineStart: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--color-accent)'}}>
        <span className="block h-4 w-4">{icon}</span>
      </span>

      <span className="text-[9px] font-bold" style={{ color: 'var(--color-foreground)'}}>
        {title}
      </span>
    </div>
  );
}

function FinalBrandCard() {
  return (
    <section className="relative overflow-hidden rounded-[1.7rem] px-5 py-7 text-white" style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 22px 55px -32px rgba(14,77,100,0.45)'}}>
      <div aria-hidden className="pointer-events-none absolute -end-16 -top-20 h-48 w-48 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.08)'}} />

      <div aria-hidden className="pointer-events-none absolute -end-8 -top-12 h-32 w-32 rounded-full" style={{ border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)'}} />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.9)'}}>
          <TrendingUp className="h-3 w-3" />
          شهارة
        </div>

        <h2 className="mt-4 text-2xl font-black tracking-tight">تسوق بلا حدود</h2>

        <p className="mt-2 max-w-md text-xs leading-6" style={{ color: 'rgba(255,255,255,0.7)'}}>
          تجربة تسوق إلكترونية
          يمنية حديثة تجمع لك
          المنتجات والعروض في
          مكان واحد.
        </p>

        <Link to="/products" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-extrabold text-white" style={{ backgroundColor: 'var(--color-accent)'}}>
          ابدأ التسوق
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function HomePage() {
  const { data: bestProducts = [], isLoading: bestProductsLoading } = useQuery({
    queryKey: ["products", "best", 24],
    queryFn: () =>
      fetchProducts({
        sort: "best",
        limit: 24,
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const { data: latestProducts = [], isLoading: latestProductsLoading } = useQuery({
    queryKey: ["products", "latest", 24],
    queryFn: () =>
      fetchProducts({
        sort: "newest",
        limit: 24,
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
  });

  return (
    <div dir="rtl" style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh' }} className="relative overflow-x-hidden pb-24 text-foreground">
      <HomeBackground />

      <div className="relative z-10">
        <SiteHeader />

        <main className="mx-auto w-full max-w-6xl px-3 pb-8 pt-3 sm:px-5 sm:pt-5 lg:px-6">
          {/* hero */}
          <section className="mb-4">
            <PromoSlider />
          </section>

          {/* quick actions */}
          <section className="mb-5">
            <QuickActions />
          </section>

          {/* popular categories */}
          <section className="mb-6">
            <PopularCategories categories={categories} bestProducts={bestProducts} />
          </section>

          {/* trust */}
          <section className="mb-7">
            <HomeTrustBar />
          </section>

          {/* best sellers */}
          <section className="mb-8">
            <ProductSection title="الأكثر مبيعاً" products={bestProducts} loading={bestProductsLoading} />
          </section>

          {/* flash sales */}
          <section className="mb-8">
            <FlashSaleSection />
          </section>

          {/* offers */}
          <section className="mb-8">
            <OffersSection />
          </section>

          {/* latest */}
          <section className="mb-8">
            <ProductSection title="وصل حديثاً" products={latestProducts} loading={latestProductsLoading} action="كل المنتجات" />
          </section>

          {/* local */}
          <section className="mb-8">
            <LocalProducts />
          </section>

          {/* brands */}
          <section className="mb-8">
            <BrandsSection />
          </section>

          {/* call to action */}
          <FinalBrandCard />
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

export default HomePage;
