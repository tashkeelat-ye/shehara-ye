import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { PromoSlider } from "@/components/promo-slider";
import { StoriesCategories } from "@/components/home/StoriesCategories";
import { FlashSaleSection } from "@/components/home/FlashSaleSection";
import { CategoryStrip } from "@/components/category-strip";
import { OffersSection } from "@/components/offers-section";
import { BrandsSection } from "@/components/brands-section";
import { SectionHeading } from "@/components/section-heading";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { LocalProducts } from "@/components/local-products";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { fetchProducts } from "@/lib/db";
import { BannerCarousel4to1 } from "@/components/home/BannerCarousel4to1"; // <--- استدعاء المكون الجديد

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "تشكيلات | متجر يمني إلكتروني لكل احتياجاتك" },
      {
        name: "description",
        content:
          "تشكيلات متجر إلكتروني يمني: أزياء، إلكترونيات، منزل ومطبخ، ومنتجات يمنية محلية كالعسل والبخور والحرف اليدوية مع توصيل لكل المحافظات.",
      },
      { property: "og:title", content: "تشكيلات | كل ما تحتاجه... بتشكيلة واحدة" },
      {
        property: "og:description",
        content:
          "تسوّق أزياء وإلكترونيات ومستلزمات المنزل ومنتجات يمنية أصيلة من متجر تشكيلات.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: bestSellers, isLoading } = useQuery({
    queryKey: ["products", "best", 8],
    queryFn: () => fetchProducts({ sort: "best", limit: 8 }),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      {/* قسم ستوريات التصنيفات بالنمط الجديد */}
      <StoriesCategories />

      <main className="mx-auto max-w-6xl pb-4 space-y-6">
        {/* البنرات الرئيسية */}
        <PromoSlider />
        
        {/* شريط التصنيفات التقليدي */}
        <CategoryStrip />

        {/* قسم العروض الخاطفة الجديدة بالعداد التنازلي */}
        <FlashSaleSection />
        
        {/* قسم العروض والتخفيضات */}
        <OffersSection />

        {/* ================= كتل الإعلانات 4:1 المضافة حديثاً ================= */}
        <BannerCarousel4to1 />

        {/* قسم الأكثر مبيعاً */}
        <section className="mt-8">
          <SectionHeading title="الأكثر مبيعًا" to="/products" />
          <div className="mt-3 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : (bestSellers ?? []).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
          </div>
        </section>

        {/* قسم تسوق حسب الماركات */}
        <BrandsSection />

        {/* قسم المنتجات المحلية */}
        <LocalProducts />
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}

