import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Minus, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { ProductImage } from "@/components/product-image";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { useCart } from "@/lib/cart-context";
import { fetchProduct, fetchProducts, fetchReviews, formatPrice } from "@/lib/db";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل المنتج | تشكيلات" },
      { name: "description", content: "تفاصيل المنتج، الصور، التقييمات، والسعر في متجر تشكيلات." },
      { property: "og:title", content: "تفاصيل المنتج | تشكيلات" },
      { property: "og:description", content: "تفاصيل المنتج والتقييمات في متجر تشكيلات." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { addItem, setDrawerOpen } = useCart();

  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => fetchReviews(id),
  });
  const { data: related = [] } = useQuery({
    queryKey: ["related", product?.category_id],
    queryFn: () =>
      fetchProducts({ categoryId: product?.category_id, sort: "best", limit: 8 }),
    enabled: Boolean(product?.category_id),
  });

  const images = useMemo(() => product?.images ?? [], [product]);
  const discount =
    product?.old_price && product.old_price > product.price
      ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
      : 0;

  async function handleAdd(then?: "cart" | "checkout") {
    if (!product) return;
    if (product.sizes.length > 0 && !size) {
      toast.error("يرجى اختيار المقاس");
      return;
    }
    if (product.colors.length > 0 && !color) {
      toast.error("يرجى اختيار اللون");
      return;
    }
    setBusy(true);
    try {
      await addItem({ productId: product.id, quantity, size, color });
      if (then === "checkout") {
        void navigate({ to: "/checkout" });
        return;
      }
      toast.success("تمت إضافة المنتج إلى السلة", {
        action: { label: "عرض السلة", onClick: () => setDrawerOpen(true) },
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <SiteHeader />
      <main className="mx-auto max-w-6xl">
        {isLoading ? (
          <div className="p-4">
            <div className="aspect-square w-full animate-pulse rounded-2xl bg-muted" />
          </div>
        ) : !product ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            لم يتم العثور على المنتج.{" "}
            <Link to="/products" className="text-primary">
              تصفح المنتجات
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-6 p-4 md:grid-cols-2">
              <div>
                <div className="relative overflow-hidden rounded-2xl border border-border/70">
                  <ProductImage
                    src={images[imageIndex]}
                    alt={product.name}
                    eager
                    className="aspect-square w-full"
                  />
                  {images.length > 1 ? (
                    <>
                      <button
                        type="button"
                        aria-label="الصورة السابقة"
                        onClick={() =>
                          setImageIndex((i) => (i - 1 + images.length) % images.length)
                        }
                        className="absolute end-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-foreground shadow-card"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="الصورة التالية"
                        onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                        className="absolute start-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-foreground shadow-card"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    </>
                  ) : null}
                </div>
                {images.length > 1 ? (
                  <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                    {images.map((img, i) => (
                      <button
                        key={img + i}
                        type="button"
                        aria-label={`صورة ${i + 1}`}
                        onClick={() => setImageIndex(i)}
                        className={`overflow-hidden rounded-xl border-2 ${
                          i === imageIndex ? "border-primary" : "border-transparent"
                        }`}
                      >
                        <ProductImage src={img} alt={product.name} className="h-16 w-16" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <h1 className="text-xl leading-snug text-foreground">{product.name}</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-accent-solid text-accent-solid" />
                    <span className="text-foreground">
                      {Number(product.rating).toLocaleString("ar-EG")}
                    </span>
                  </span>
                  <span>({product.reviews_count.toLocaleString("ar-EG")} مراجعة)</span>
                  <span>• {product.city}</span>
                </div>

                <div className="flex items-end gap-3">
                  <p className="text-2xl text-primary">{formatPrice(product.price)}</p>
                  {product.old_price ? (
                    <p className="text-sm text-muted-foreground line-through">
                      {formatPrice(product.old_price)}
                    </p>
                  ) : null}
                  {discount > 0 ? (
                    <span className="rounded-full bg-accent-solid px-2 py-0.5 text-[11px] text-accent-solid-foreground">
                      خصم {discount.toLocaleString("ar-EG")}٪
                    </span>
                  ) : null}
                </div>

                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>

                {product.sizes.length > 0 ? (
                  <div>
                    <h2 className="text-sm text-foreground">المقاس</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSize(s)}
                          className={`rounded-xl border px-3 py-2 text-xs ${
                            size === s
                              ? "border-primary bg-brand-soft text-primary"
                              : "border-border text-foreground"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {product.colors.length > 0 ? (
                  <div>
                    <h2 className="text-sm text-foreground">اللون</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`rounded-xl border px-3 py-2 text-xs ${
                            color === c
                              ? "border-primary bg-brand-soft text-primary"
                              : "border-border text-foreground"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground">الكمية</span>
                  <div className="flex items-center gap-1 rounded-xl border border-border">
                    <button
                      type="button"
                      aria-label="تقليل الكمية"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="grid h-10 w-10 place-items-center text-foreground"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-8 text-center text-sm">
                      {quantity.toLocaleString("ar-EG")}
                    </span>
                    <button
                      type="button"
                      aria-label="زيادة الكمية"
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                      className="grid h-10 w-10 place-items-center text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAdd("cart")}
                    className="h-12 flex-1 rounded-2xl bg-primary text-sm text-primary-foreground disabled:opacity-60"
                  >
                    أضف للسلة
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAdd("checkout")}
                    className="h-12 flex-1 rounded-2xl bg-accent-solid text-sm text-accent-solid-foreground disabled:opacity-60"
                  >
                    اشترِ الآن
                  </button>
                </div>
              </div>
            </div>

            <section className="mt-4 px-4">
              <h2 className="text-base text-foreground">تعليقات المستخدمين</h2>
              {reviews.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  لا توجد تعليقات على هذا المنتج بعد.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-border/70 bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-foreground">{r.author_name}</p>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Star className="h-3.5 w-3.5 fill-accent-solid text-accent-solid" />
                          {Number(r.rating).toLocaleString("ar-EG")}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        {r.comment}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-8">
              <SectionHeading title="منتجات مشابهة" />
              <div className="mt-3 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4">
                {related
                  .filter((p) => p.id !== product.id)
                  .slice(0, 4)
                  .map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
