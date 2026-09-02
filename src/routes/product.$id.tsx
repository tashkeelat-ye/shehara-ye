import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type TouchEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Send,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  fetchProduct,
  fetchProducts,
  type Product,
  type Review,
} from "@/lib/db";
import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "@/components/product-image";
import { ProductCard } from "@/components/product-card";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute(
  "/product/$id",
)({
  component: ProductDetail,
});

type ProductReviewRow = {
  id: string;
  product_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const {
    addItem,
    setDrawerOpen,
    count,
    getItemQuantity,
  } = useCart();

  const formatPrice = useFormatPrice();

  const [activeImageIndex, setActiveImageIndex] =
    useState(0);

  const [selectedSize, setSelectedSize] =
    useState<string | null>(null);

  const [selectedColor, setSelectedColor] =
    useState<string | null>(null);

  const [adding, setAdding] =
    useState(false);

  const [buying, setBuying] =
    useState(false);

  const touchStartX =
    useRef(0);

  const touchEndX =
    useRef(0);

  /*
   * المنتج الرئيسي.
   *
   * fetchProduct() يستخدم الأعمدة المحددة الموجودة
   * فعلياً في db.ts، كما يدعم Offline cache.
   */
  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  /*
   * المنتجات المشابهة تعتمد على category_id الحقيقي.
   *
   * لا يوجد category_slug في Product الحالي.
   */
  const {
    data: similarProducts = [],
    isLoading: similarLoading,
  } = useQuery({
    queryKey: [
      "products",
      "similar",
      product?.category_id,
      id,
    ],
    queryFn: async () => {
      if (!product?.category_id) {
        return [];
      }

      const rows = await fetchProducts({
        categoryId:
          product.category_id,
        sort: "best",
        limit: 8,
      });

      return rows
        .filter(
          (item) =>
            item.id !== id,
        )
        .slice(0, 6);
    },
    enabled:
      Boolean(product?.category_id) &&
      Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  /*
   * التقييمات.
   *
   * نحدد الأعمدة بدلاً من select("*").
   */
  const {
    data: reviews = [],
    isLoading: reviewsLoading,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: [
      "product-reviews",
      id,
    ],
    queryFn: async (): Promise<
      ProductReviewRow[]
    > => {
      const { data, error } =
        await supabase
          .from("product_reviews")
          .select(
            "id,product_id,user_name,rating,comment,created_at",
          )
          .eq(
            "product_id",
            id,
          )
          .eq(
            "is_approved",
            true,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .returns<ProductReviewRow[]>();

      if (error) {
        throw error;
      }

      return data ?? [];
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
  });

  /*
   * إعادة ضبط المعرض والخيارات عند تغيير المنتج.
   */
  useEffect(() => {
    if (!product) {
      return;
    }

    setActiveImageIndex(0);

    setSelectedSize(
      product.sizes?.length
        ? product.sizes[0] ?? null
        : null,
    );

    setSelectedColor(
      product.colors?.length
        ? product.colors[0] ?? null
        : null,
    );
  }, [product?.id]);

  const images = useMemo(
    () =>
      product?.images?.length
        ? product.images
        : ["/placeholder.svg"],
    [product?.images],
  );

  const stockLeft = Math.max(
    0,
    Number(
      product?.stock_left ?? 0,
    ),
  );

  const lowStockThreshold =
    Math.max(
      1,
      Number(
        product?.low_stock_threshold ??
          5,
      ),
    );

  const isOutOfStock =
    !product ||
    stockLeft <= 0;

  const isLowStock =
    !isOutOfStock &&
    stockLeft <=
      lowStockThreshold;

  const cartQuantity =
    product
      ? getItemQuantity(
          product.id,
          selectedSize,
          selectedColor,
        )
      : 0;

  const hasDiscount =
    Boolean(
      product?.old_price &&
        product.old_price >
          product.price,
    );

  const discountPercent =
    hasDiscount && product
      ? Math.round(
          ((product.old_price! -
            product.price) /
            product.old_price!) *
            100,
        )
      : 0;

  /*
   * التحقق من الخيارات قبل الإضافة.
   */
  const validateSelection =
    useCallback(() => {
      if (!product) {
        toast.error(
          "المنتج غير متوفر.",
        );
        return false;
      }

      if (stockLeft <= 0) {
        toast.error(
          "عذراً، المنتج نفد من المخزون.",
        );
        return false;
      }

      if (
        product.sizes?.length &&
        !selectedSize
      ) {
        toast.error(
          "يرجى اختيار المقاس أو الحجم.",
        );
        return false;
      }

      if (
        product.colors?.length &&
        !selectedColor
      ) {
        toast.error(
          "يرجى اختيار اللون.",
        );
        return false;
      }

      return true;
    }, [
      product,
      selectedSize,
      selectedColor,
      stockLeft,
    ]);

  /*
   * إضافة للسلة — حقيقية.
   */
  const handleAddToCart =
    useCallback(async () => {
      if (!validateSelection()) {
        return;
      }

      if (!product) {
        return;
      }

      setAdding(true);

      try {
        await addItem({
          productId:
            product.id,
          quantity: 1,
          size:
            selectedSize,
          color:
            selectedColor,
        });

        toast.success(
          "تمت إضافة المنتج إلى السلة",
          {
            action: {
              label: "عرض السلة",
              onClick: () =>
                setDrawerOpen(
                  true,
                ),
            },
          },
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "تعذر إضافة المنتج إلى السلة.";

        toast.error(message);
      } finally {
        setAdding(false);
      }
    }, [
      addItem,
      product,
      selectedSize,
      selectedColor,
      setDrawerOpen,
      validateSelection,
    ]);

  /*
   * شراء الآن — يستخدم نفس السلة ونفس Checkout
   * الموجود فعلياً في المشروع.
   */
  const handleBuyNow =
    useCallback(async () => {
      if (!validateSelection()) {
        return;
      }

      if (!product) {
        return;
      }

      setBuying(true);

      try {
        await addItem({
          productId:
            product.id,
          quantity: 1,
          size:
            selectedSize,
          color:
            selectedColor,
        });

        await navigate({
          to: "/checkout",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "تعذر بدء عملية الشراء.";

        toast.error(message);
        setBuying(false);
      }
    }, [
      addItem,
      navigate,
      product,
      selectedSize,
      selectedColor,
      validateSelection,
    ]);

  /*
   * مشاركة المنتج.
   */
  const handleShare =
    useCallback(async () => {
      if (!product) {
        return;
      }

      const shareData = {
        title:
          product.name,
        text:
          `شاهد هذا المنتج في شهارة: ${product.name}`,
        url:
          window.location.href,
      };

      try {
        if (
          navigator.share
        ) {
          await navigator.share(
            shareData,
          );
          return;
        }

        if (
          navigator.clipboard
        ) {
          await navigator.clipboard.writeText(
            window.location.href,
          );

          toast.success(
            "تم نسخ رابط المنتج.",
          );
        }
      } catch {
        /*
         * إلغاء نافذة المشاركة
         * ليس خطأً للمستخدم.
         */
      }
    }, [product]);

  const handleTouchStart =
    useCallback(
      (
        event: TouchEvent<HTMLDivElement>,
      ) => {
        touchStartX.current =
          event.touches[0]
            ?.clientX ?? 0;

        touchEndX.current =
          touchStartX.current;
      },
      [],
    );

  const handleTouchMove =
    useCallback(
      (
        event: TouchEvent<HTMLDivElement>,
      ) => {
        touchEndX.current =
          event.touches[0]
            ?.clientX ??
          touchEndX.current;
      },
      [],
    );

  const handleTouchEnd =
    useCallback(() => {
      if (
        images.length <= 1
      ) {
        return;
      }

      const distance =
        touchStartX.current -
        touchEndX.current;

      if (
        Math.abs(distance) <
        40
      ) {
        return;
      }

      if (
        distance > 0 &&
        activeImageIndex <
          images.length - 1
      ) {
        setActiveImageIndex(
          (value) =>
            value + 1,
        );
      }

      if (
        distance < 0 &&
        activeImageIndex > 0
      ) {
        setActiveImageIndex(
          (value) =>
            value - 1,
        );
      }
    }, [
      activeImageIndex,
      images.length,
    ]);

  if (isLoading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-background"
      >
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur">
          <div className="h-8 w-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>

        <main className="mx-auto max-w-3xl space-y-4 px-4 py-4 pb-32">
          <div className="aspect-square animate-pulse rounded-3xl bg-muted" />

          <div className="space-y-3 rounded-3xl border border-border bg-card p-5">
            <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-20 w-full animate-pulse rounded-2xl bg-muted" />
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  if (
    isError ||
    !product
  ) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-background pb-24"
      >
        <div className="mx-auto flex min-h-[65vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShoppingBag className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-base font-bold text-foreground">
              المنتج غير متوفر
            </h1>

            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              ربما تم حذف المنتج أو لم يعد
              متاحاً حالياً.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void navigate({
                to: "/",
              })
            }
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
          >
            العودة للمتجر
          </button>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background pb-32 text-foreground"
    >
      {/* =====================================================
          الشريط العلوي
          ===================================================== */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() =>
              window.history.length > 1
                ? window.history.back()
                : void navigate({
                    to: "/",
                  })
            }
            className="flex min-h-9 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="العودة"
          >
            <ArrowRight className="h-4 w-4" />
            العودة
          </button>

          <h1 className="line-clamp-1 max-w-[48%] text-xs font-bold text-foreground">
            {product.name}
          </h1>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                void handleShare()
              }
              className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="مشاركة المنتج"
            >
              <Share2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setDrawerOpen(true)
              }
              className="relative grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="فتح السلة"
            >
              <ShoppingCart className="h-4 w-4" />

              {count > 0 ? (
                <span className="absolute -end-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-accent-solid px-1 text-[8px] font-bold text-accent-solid-foreground">
                  {count > 99
                    ? "99+"
                    : count.toLocaleString(
                        "ar-EG",
                      )}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-4">
        {/* =====================================================
            معرض الصور
            ===================================================== */}
        <section
          aria-label="صور المنتج"
          className="space-y-3"
        >
          <div
            className="relative aspect-square overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card touch-pan-y"
            onTouchStart={
              handleTouchStart
            }
            onTouchMove={
              handleTouchMove
            }
            onTouchEnd={
              handleTouchEnd
            }
          >
            <ProductImage
              src={
                images[
                  activeImageIndex
                ]
              }
              alt={product.name}
              className="h-full w-full"
              eager
            />

            {hasDiscount ? (
              <span className="absolute start-3 top-3 rounded-full bg-destructive px-2.5 py-1.5 text-[10px] font-bold text-destructive-foreground shadow-sm">
                خصم {discountPercent}%
              </span>
            ) : null}

            {product.badge ? (
              <span className="absolute end-3 top-3 max-w-[55%] truncate rounded-full bg-accent-solid px-2.5 py-1.5 text-[10px] font-bold text-accent-solid-foreground shadow-sm">
                {product.badge}
              </span>
            ) : null}

            {images.length > 1 ? (
              <>
                {activeImageIndex >
                0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex(
                        (value) =>
                          value - 1,
                      )
                    }
                    className="absolute end-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-lg backdrop-blur"
                    aria-label="الصورة السابقة"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                ) : null}

                {activeImageIndex <
                images.length -
                  1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex(
                        (value) =>
                          value + 1,
                      )
                    }
                    className="absolute start-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-lg backdrop-blur"
                    aria-label="الصورة التالية"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                ) : null}

                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur-md">
                  {images.map(
                    (_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() =>
                          setActiveImageIndex(
                            index,
                          )
                        }
                        className={`h-1.5 rounded-full transition-all ${
                          activeImageIndex ===
                          index
                            ? "w-5 bg-white"
                            : "w-1.5 bg-white/50"
                        }`}
                        aria-label={`الصورة ${index + 1}`}
                      />
                    ),
                  )}
                </div>
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {images.map(
                (image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() =>
                      setActiveImageIndex(
                        index,
                      )
                    }
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      activeImageIndex ===
                      index
                        ? "border-primary ring-2 ring-primary/15"
                        : "border-border/70 opacity-70"
                    }`}
                    aria-label={`عرض الصورة ${index + 1}`}
                  >
                    <ProductImage
                      src={image}
                      alt=""
                      className="h-full w-full"
                    />
                  </button>
                ),
              )}
            </div>
          ) : null}
        </section>

        {/* =====================================================
            معلومات المنتج
            ===================================================== */}
        <section className="space-y-5 rounded-3xl border border-border/70 bg-card p-4 shadow-card sm:p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {product.is_local ? (
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[9px] font-bold text-primary">
                  منتج يمني
                </span>
              ) : null}

              {product.city ? (
                <span className="text-[10px] text-muted-foreground">
                  {product.city}
                </span>
              ) : null}
            </div>

            <h2 className="text-xl font-bold leading-[1.5] text-foreground">
              {product.name}
            </h2>

            <div className="flex flex-wrap items-end gap-2">
              <span className="text-2xl font-extrabold text-primary">
                {formatPrice(
                  product.price,
                )}
              </span>

              {hasDiscount ? (
                <>
                  <span className="text-xs text-muted-foreground line-through">
                    {formatPrice(
                      product.old_price!,
                    )}
                  </span>

                  <span className="rounded-lg bg-destructive/10 px-1.5 py-1 text-[9px] font-bold text-destructive">
                    وفر {discountPercent}%
                  </span>
                </>
              ) : null}
            </div>

            {product.reviews_count >
            0 ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-accent-solid text-accent-solid" />

                <span className="font-bold text-foreground">
                  {Number(
                    product.rating,
                  ).toLocaleString(
                    "ar-EG",
                  )}
                </span>

                <span>
                  (
                  {Number(
                    product.reviews_count,
                  ).toLocaleString(
                    "ar-EG",
                  )}{" "}
                  تقييم)
                </span>
              </div>
            ) : null}
          </div>

          {/* =================================================
              المخزون
              ================================================= */}
          <div className="rounded-2xl bg-secondary/60 p-3">
            {isOutOfStock ? (
              <div className="flex items-center gap-2 text-xs font-bold text-destructive">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                المنتج غير متوفر حالياً
              </div>
            ) : isLowStock ? (
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-current" />
                متبقي{" "}
                {stockLeft.toLocaleString(
                  "ar-EG",
                )}{" "}
                فقط
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                متوفر للطلب
              </div>
            )}
          </div>

          {/* =================================================
              المقاسات
              ================================================= */}
          {product.sizes?.length >
          0 ? (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  المقاس / الحجم
                </label>

                {selectedSize ? (
                  <span className="text-[10px] text-muted-foreground">
                    {selectedSize}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {product.sizes.map(
                  (size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        setSelectedSize(
                          size,
                        )
                      }
                      className={`min-w-12 rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 ${
                        selectedSize ===
                        size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                      }`}
                    >
                      {size}
                    </button>
                  ),
                )}
              </div>
            </div>
          ) : null}

          {/* =================================================
              الألوان
              ================================================= */}
          {product.colors?.length >
          0 ? (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  اللون
                </label>

                {selectedColor ? (
                  <span className="text-[10px] text-muted-foreground">
                    {selectedColor}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {product.colors.map(
                  (color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setSelectedColor(
                          color,
                        )
                      }
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 ${
                        selectedColor ===
                        color
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                      }`}
                    >
                      {color}
                    </button>
                  ),
                )}
              </div>
            </div>
          ) : null}

          {/* =================================================
              الوصف
              ================================================= */}
          {product.description ? (
            <details
              open
              className="border-t border-border/60 pt-4"
            >
              <summary className="cursor-pointer list-none text-xs font-bold text-foreground">
                تفاصيل المنتج
              </summary>

              <p className="mt-3 whitespace-pre-line text-xs leading-7 text-muted-foreground">
                {product.description}
              </p>
            </details>
          ) : null}
        </section>

        {/* =====================================================
            المنتجات المشابهة
            ===================================================== */}
        {similarLoading ? (
          <section className="space-y-3">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />

            <div className="grid grid-cols-2 gap-3">
              {Array.from({
                length: 4,
              }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="aspect-square animate-pulse bg-muted" />
                  <div className="space-y-2 p-3">
                    <div className="h-3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : similarProducts.length >
          0 ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-brand-soft text-primary">
                <Sparkles className="h-4 w-4" />
              </span>

              <h3 className="text-sm font-bold text-foreground">
                منتجات قد تعجبك
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {similarProducts.map(
                (item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                  />
                ),
              )}
            </div>
          </section>
        ) : null}

        {/* =====================================================
            التقييمات
            ===================================================== */}
        <ProductReviewsSection
          productId={product.id}
          reviews={reviews}
          loading={reviewsLoading}
          onSubmitted={() =>
            void refetchReviews()
          }
        />
      </main>

      {/* =======================================================
          شريط الشراء
          ======================================================= */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 px-3 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] pt-2.5 shadow-2xl backdrop-blur-xl md:pb-3">
        <div className="mx-auto flex max-w-3xl gap-2">
          <button
            type="button"
            disabled={
              adding ||
              buying ||
              isOutOfStock
            }
            onClick={() =>
              void handleAddToCart()
            }
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-primary bg-primary/5 px-3 text-xs font-bold text-primary transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}

            <span>
              {cartQuantity > 0
                ? `في السلة (${cartQuantity.toLocaleString(
                    "ar-EG",
                  )})`
                : "أضف للسلة"}
            </span>
          </button>

          <button
            type="button"
            disabled={
              adding ||
              buying ||
              isOutOfStock
            }
            onClick={() =>
              void handleBuyNow()
            }
            className="flex min-h-12 flex-[1.15] items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {buying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}

            <span>
              {isOutOfStock
                ? "غير متوفر"
                : "شراء الآن"}
            </span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

type ProductReviewsSectionProps = {
  productId: string;
  reviews: ProductReviewRow[];
  loading: boolean;
  onSubmitted: () => void;
};

function ProductReviewsSection({
  productId,
  reviews,
  loading,
  onSubmitted,
}: ProductReviewsSectionProps) {
  const [name, setName] =
    useState("");

  const [comment, setComment] =
    useState("");

  const [rating, setRating] =
    useState(5);

  const [submitting, setSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!name.trim()) {
      toast.error(
        "يرجى إدخال الاسم.",
      );
      return;
    }

    if (!comment.trim()) {
      toast.error(
        "يرجى كتابة تعليقك.",
      );
      return;
    }

    if (
      comment.trim().length < 3
    ) {
      toast.error(
        "التعليق قصير جداً.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const { error } =
        await supabase
          .from(
            "product_reviews",
          )
          .insert({
            product_id:
              productId,
            user_name:
              name.trim(),
            rating,
            comment:
              comment.trim(),
            is_approved:
              true,
          });

      if (error) {
        throw error;
      }

      setName("");
      setComment("");
      setRating(5);

      toast.success(
        "تم إرسال تقييمك بنجاح.",
      );

      onSubmitted();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر إرسال التقييم.";

      toast.error(
        `تعذر إرسال التقييم: ${message}`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="space-y-4 border-t border-border/60 pt-5"
      aria-labelledby="reviews-title"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3
            id="reviews-title"
            className="text-sm font-bold text-foreground"
          >
            آراء العملاء
          </h3>

          <p className="mt-1 text-[10px] text-muted-foreground">
            تجارب المتسوقين مع هذا المنتج
          </p>
        </div>

        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground">
          {reviews.length.toLocaleString(
            "ar-EG",
          )}{" "}
          تقييم
        </span>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-3 rounded-3xl border border-border/70 bg-card p-4"
      >
        <h4 className="text-xs font-bold text-foreground">
          شاركنا تجربتك
        </h4>

        <div
          className="flex items-center gap-1"
          aria-label="اختيار التقييم"
        >
          {[
            1,
            2,
            3,
            4,
            5,
          ].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setRating(
                  value,
                )
              }
              aria-label={`تقييم ${value} من 5`}
              aria-pressed={
                rating ===
                value
              }
              className="rounded-lg p-1 transition-transform active:scale-90"
            >
              <Star
                className={`h-5 w-5 ${
                  value <= rating
                    ? "fill-accent-solid text-accent-solid"
                    : "text-muted-foreground/25"
                }`}
              />
            </button>
          ))}
        </div>

        <input
          type="text"
          value={name}
          maxLength={80}
          onChange={(event) =>
            setName(
              event.target
                .value,
            )
          }
          placeholder="اسمك"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />

        <textarea
          value={comment}
          maxLength={1000}
          onChange={(event) =>
            setComment(
              event.target
                .value,
            )
          }
          rows={4}
          placeholder="اكتب تجربتك مع المنتج..."
          className="w-full resize-none rounded-xl border border-border bg-background p-3 text-xs leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}

          إرسال التقييم
        </button>
      </form>

      {loading ? (
        <div className="space-y-2">
          {Array.from({
            length: 2,
          }).map((_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : reviews.length ===
        0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-7 text-center">
          <Star className="mx-auto h-6 w-6 text-muted-foreground/40" />

          <p className="mt-2 text-xs font-semibold text-foreground">
            لا توجد تقييمات بعد
          </p>

          <p className="mt-1 text-[10px] text-muted-foreground">
            كن أول من يشارك تجربته.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map(
            (review) => (
              <article
                key={review.id}
                className="space-y-2 rounded-2xl border border-border/70 bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">
                      {review.user_name}
                    </p>

                    <time
                      dateTime={
                        review.created_at
                      }
                      className="mt-1 block text-[9px] text-muted-foreground"
                    >
                      {new Date(
                        review.created_at,
                      ).toLocaleDateString(
                        "ar-YE",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </time>
                  </div>

                  <div className="flex shrink-0 gap-0.5">
                    {[
                      1,
                      2,
                      3,
                      4,
                      5,
                    ].map(
                      (star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${
                            star <=
                            Number(
                              review.rating,
                            )
                              ? "fill-accent-solid text-accent-solid"
                              : "text-muted-foreground/20"
                          }`}
                        />
                      ),
                    )}
                  </div>
                </div>

                <p className="whitespace-pre-line text-xs leading-6 text-muted-foreground">
                  {review.comment}
                </p>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}
