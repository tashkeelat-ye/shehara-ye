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
  type TouchEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Share2,
  ShoppingCart,
  Star,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  fetchProduct,
  fetchProducts,
  type Product,
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

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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
        categoryId: product.category_id,
        sort: "best",
        limit: 8,
      });

      return rows
        .filter((item) => item.id !== id)
        .slice(0, 6);
    },
    enabled:
      Boolean(product?.category_id) &&
      Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const {
    data: reviews = [],
    isLoading: reviewsLoading,
  } = useQuery({
    queryKey: ["product-reviews", id],
    queryFn: async (): Promise<
      ProductReviewRow[]
    > => {
      const { data, error } =
        await supabase
          .from("product_reviews")
          .select(
            "id,product_id,user_name,rating,comment,created_at",
          )
          .eq("product_id", id)
          .eq("is_approved", true)
          .order("created_at", {
            ascending: false,
          })
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

  useEffect(() => {
    if (!product) {
      return;
    }

    setActiveImageIndex(0);

    setSelectedSize(
      product.sizes?.length
        ? product.sizes[0]
        : null,
    );

    setSelectedColor(
      product.colors?.length
        ? product.colors[0]
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
    Number(product?.stock_left ?? 0),
  );

  const lowStockThreshold = Math.max(
    1,
    Number(
      product?.low_stock_threshold ?? 5,
    ),
  );

  const isOutOfStock =
    !product || stockLeft <= 0;

  const isLowStock =
    !isOutOfStock &&
    stockLeft <= lowStockThreshold;

  const cartQuantity = product
    ? getItemQuantity(
        product.id,
        selectedSize,
        selectedColor,
      )
    : 0;

  const hasDiscount =
    Boolean(
      product?.old_price &&
        product.old_price > product.price,
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

  const averageRating =
    reviews.length > 0
      ? reviews.reduce(
          (sum, review) =>
            sum + Number(review.rating),
          0,
        ) / reviews.length
      : Number(product?.rating ?? 0);

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
      stockLeft,
      selectedSize,
      selectedColor,
    ]);

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
          productId: product.id,
          quantity: 1,
          size: selectedSize,
          color: selectedColor,
        });

        toast.success(
          "تمت إضافة المنتج إلى السلة",
          {
            action: {
              label: "عرض السلة",
              onClick: () =>
                setDrawerOpen(true),
            },
          },
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر إضافة المنتج إلى السلة.",
        );
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
          productId: product.id,
          quantity: 1,
          size: selectedSize,
          color: selectedColor,
        });

        await navigate({
          to: "/checkout",
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر بدء عملية الشراء.",
        );

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

  const handleShare =
    useCallback(async () => {
      if (!product) {
        return;
      }

      const url =
        window.location.href;

      try {
        if (navigator.share) {
          await navigator.share({
            title: product.name,
            text: `شاهد هذا المنتج في شهارة: ${product.name}`,
            url,
          });

          return;
        }

        await navigator.clipboard.writeText(
          url,
        );

        toast.success(
          "تم نسخ رابط المنتج.",
        );
      } catch {
        // المستخدم ألغى المشاركة.
      }
    }, [product]);

  const handleTouchStart =
    useCallback(
      (
        event: TouchEvent<HTMLDivElement>,
      ) => {
        touchStartX.current =
          event.touches[0]?.clientX ?? 0;

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
          event.touches[0]?.clientX ??
          touchEndX.current;
      },
      [],
    );

  const handleTouchEnd =
    useCallback(() => {
      if (images.length <= 1) {
        return;
      }

      const distance =
        touchStartX.current -
        touchEndX.current;

      if (Math.abs(distance) < 40) {
        return;
      }

      if (
        distance > 0 &&
        activeImageIndex <
          images.length - 1
      ) {
        setActiveImageIndex(
          (value) => value + 1,
        );
      }

      if (
        distance < 0 &&
        activeImageIndex > 0
      ) {
        setActiveImageIndex(
          (value) => value - 1,
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
        className="
          min-h-screen
          bg-background
          pb-24
        "
      >
        <div
          className="
            sticky
            top-0
            z-40
            flex
            h-14
            items-center
            justify-between
            border-b
            border-border/60
            bg-background/90
            px-4
            backdrop-blur-xl
          "
        >
          <div className="h-8 w-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>

        <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
          <div className="aspect-square animate-pulse rounded-[1.7rem] bg-muted" />

          <div className="space-y-4 rounded-[1.7rem] border border-border bg-card p-5">
            <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-9 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-16 w-full animate-pulse rounded-2xl bg-muted" />
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div
        dir="rtl"
        className="
          min-h-screen
          bg-background
          pb-24
        "
      >
        <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShoppingCart className="h-7 w-7" />
          </div>

          <h1 className="mt-4 text-base font-black">
            المنتج غير متوفر
          </h1>

          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            ربما تم حذف المنتج أو لم يعد متاحاً.
          </p>

          <button
            type="button"
            onClick={() =>
              void navigate({
                to: "/",
              })
            }
            className="
              mt-5
              rounded-xl
              bg-primary
              px-5
              py-2.5
              text-xs
              font-bold
              text-primary-foreground
            "
          >
            العودة للمتجر
          </button>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="
        min-h-screen
        bg-background
        pb-32
        text-foreground
      "
    >
      {/* شريط التطبيق */}
      <header
        className="
          sticky
          top-0
          z-40
          border-b
          border-border/60
          bg-background/90
          backdrop-blur-xl
        "
      >
        <div
          className="
            mx-auto
            flex
            h-14
            max-w-3xl
            items-center
            justify-between
            px-4
          "
        >
          <button
            type="button"
            onClick={() => {
              if (
                window.history.length > 1
              ) {
                window.history.back();
              } else {
                void navigate({
                  to: "/",
                });
              }
            }}
            className="
              flex
              h-9
              items-center
              gap-1
              rounded-xl
              px-2
              text-xs
              font-bold
              text-muted-foreground
              transition-colors
              hover:bg-secondary
            "
            aria-label="العودة"
          >
            <ArrowRight className="h-4 w-4" />
            العودة
          </button>

          <span
            className="
              max-w-[45%]
              truncate
              text-xs
              font-black
            "
          >
            {product.name}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                void handleShare()
              }
              className="
                grid
                h-9
                w-9
                place-items-center
                rounded-xl
                text-muted-foreground
                transition-colors
                hover:bg-secondary
                active:scale-90
              "
              aria-label="مشاركة المنتج"
            >
              <Share2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setDrawerOpen(true)
              }
              className="
                relative
                grid
                h-9
                w-9
                place-items-center
                rounded-xl
                text-muted-foreground
                active:scale-90
              "
              aria-label="السلة"
            >
              <ShoppingCart className="h-4 w-4" />

              {count > 0 ? (
                <span
                  className="
                    absolute
                    -end-0.5
                    -top-0.5
                    grid
                    min-h-4
                    min-w-4
                    place-items-center
                    rounded-full
                    bg-[#D65A31]
                    px-1
                    text-[8px]
                    font-black
                    text-white
                  "
                >
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

      <main
        className="
          mx-auto
          max-w-3xl
          space-y-5
          px-3
          py-4
          sm:px-5
        "
      >
        {/* معرض الصور */}
        <section>
          <div
            className="
              relative
              aspect-square
              overflow-hidden
              rounded-[1.7rem]
              border
              border-border/70
              bg-card
              shadow-sm
              touch-pan-y
            "
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
              <span
                className="
                  absolute
                  start-3
                  top-3
                  rounded-full
                  bg-[#D65A31]
                  px-3
                  py-1.5
                  text-[9px]
                  font-black
                  text-white
                "
              >
                خصم {discountPercent}%
              </span>
            ) : null}

            {product.badge ? (
              <span
                className="
                  absolute
                  end-3
                  top-3
                  max-w-[50%]
                  truncate
                  rounded-full
                  bg-[#0E4D64]
                  px-3
                  py-1.5
                  text-[9px]
                  font-black
                  text-white
                "
              >
                {product.badge}
              </span>
            ) : null}

            {images.length > 1 &&
            activeImageIndex > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setActiveImageIndex(
                    (value) => value - 1,
                  )
                }
                className="
                  absolute
                  end-3
                  top-1/2
                  grid
                  h-9
                  w-9
                  -translate-y-1/2
                  place-items-center
                  rounded-full
                  bg-background/90
                  shadow-lg
                  backdrop-blur
                "
                aria-label="الصورة السابقة"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            ) : null}

            {images.length > 1 &&
            activeImageIndex <
              images.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setActiveImageIndex(
                    (value) => value + 1,
                  )
                }
                className="
                  absolute
                  start-3
                  top-1/2
                  grid
                  h-9
                  w-9
                  -translate-y-1/2
                  place-items-center
                  rounded-full
                  bg-background/90
                  shadow-lg
                  backdrop-blur
                "
                aria-label="الصورة التالية"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : null}

            {images.length > 1 ? (
              <div
                className="
                  absolute
                  bottom-3
                  left-1/2
                  flex
                  -translate-x-1/2
                  items-center
                  gap-1
                  rounded-full
                  bg-background/80
                  px-2.5
                  py-1.5
                  backdrop-blur
                "
              >
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
                      className={`
                        h-1.5
                        rounded-full
                        transition-all
                        ${
                          index ===
                          activeImageIndex
                            ? "w-5 bg-[#D65A31]"
                            : "w-1.5 bg-foreground/25"
                        }
                      `}
                      aria-label={`عرض الصورة ${index + 1}`}
                    />
                  ),
                )}
              </div>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div
              className="
                mt-3
                flex
                gap-2
                overflow-x-auto
                pb-1
              "
            >
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
                    className={`
                      h-16
                      w-16
                      shrink-0
                      overflow-hidden
                      rounded-xl
                      border-2
                      bg-card
                      ${
                        index ===
                        activeImageIndex
                          ? "border-[#D65A31]"
                          : "border-border"
                      }
                    `}
                    aria-label={`الصورة ${index + 1}`}
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

        {/* معلومات المنتج */}
        <section
          className="
            rounded-[1.7rem]
            border
            border-border/70
            bg-card
            p-4
            shadow-sm
            sm:p-5
          "
        >
          <h1
            className="
              text-lg
              font-black
              leading-8
              tracking-tight
              sm:text-xl
            "
          >
            {product.name}
          </h1>

          <div
            className="
              mt-3
              flex
              flex-wrap
              items-center
              gap-3
            "
          >
            <div className="flex items-center gap-1.5">
              <Star
                className="
                  h-4
                  w-4
                  fill-[#D65A31]
                  text-[#D65A31]
                "
              />

              <span className="text-xs font-black">
                {averageRating > 0
                  ? averageRating.toLocaleString(
                      "ar-EG",
                      {
                        maximumFractionDigits: 1,
                      },
                    )
                  : "جديد"}
              </span>

              <span className="text-[10px] text-muted-foreground">
                {reviews.length > 0
                  ? `(${reviews.length} تقييم)`
                  : ""}
              </span>
            </div>

            {isLowStock ? (
              <span
                className="
                  rounded-full
                  bg-[#D65A31]/10
                  px-2.5
                  py-1
                  text-[9px]
                  font-black
                  text-[#D65A31]
                "
              >
                متبقي {stockLeft} فقط
              </span>
            ) : null}
          </div>

          <div
            className="
              mt-5
              flex
              flex-wrap
              items-end
              gap-3
            "
          >
            <span
              className="
                text-2xl
                font-black
                text-[#0E4D64]
                dark:text-[#9DD5E5]
              "
            >
              {formatPrice(
                product.price,
              )}
            </span>

            {hasDiscount ? (
              <span
                className="
                  mb-1
                  text-xs
                  text-muted-foreground
                  line-through
                "
              >
                {formatPrice(
                  product.old_price!,
                )}
              </span>
            ) : null}
          </div>

          {/* خيارات المقاس */}
          {product.sizes?.length ? (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-black">
                  المقاس / الحجم
                </span>

                {selectedSize ? (
                  <span className="text-[10px] font-bold text-[#0E4D64]">
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
                      className={`
                        min-w-12
                        rounded-xl
                        border
                        px-3
                        py-2.5
                        text-[10px]
                        font-black
                        transition-all
                        active:scale-95
                        ${
                          selectedSize ===
                          size
                            ? "border-[#0E4D64] bg-[#0E4D64] text-white"
                            : "border-border bg-background text-foreground hover:border-[#0E4D64]/30"
                        }
                      `}
                    >
                      {size}
                    </button>
                  ),
                )}
              </div>
            </div>
          ) : null}

          {/* الألوان */}
          {product.colors?.length ? (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-black">
                  اللون
                </span>

                {selectedColor ? (
                  <span className="text-[10px] font-bold text-[#0E4D64]">
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
                      className={`
                        relative
                        rounded-xl
                        border
                        px-3
                        py-2.5
                        text-[10px]
                        font-black
                        transition-all
                        active:scale-95
                        ${
                          selectedColor ===
                          color
                            ? "border-[#D65A31] bg-[#D65A31]/10 text-[#D65A31]"
                            : "border-border bg-background text-foreground"
                        }
                      `}
                    >
                      {selectedColor ===
                      color ? (
                        <Check className="absolute -end-1.5 -top-1.5 h-4 w-4 rounded-full bg-[#D65A31] p-0.5 text-white" />
                      ) : null}

                      {color}
                    </button>
                  ),
                )}
              </div>
            </div>
          ) : null}

          {/* المخزون */}
          <div
            className="
              mt-6
              flex
              items-center
              gap-2
              rounded-2xl
              bg-muted/50
              px-3
              py-3
            "
          >
            <span
              className={`
                h-2
                w-2
                rounded-full
                ${
                  isOutOfStock
                    ? "bg-destructive"
                    : isLowStock
                      ? "bg-[#D65A31]"
                      : "bg-emerald-500"
                }
              `}
            />

            <span className="text-[10px] font-bold">
              {isOutOfStock
                ? "غير متوفر حالياً"
                : isLowStock
                  ? `متبقي ${stockLeft} قطعة`
                  : "متوفر في المخزون"}
            </span>
          </div>

          {/* أزرار الشراء */}
          <div
            className="
              mt-6
              grid
              grid-cols-[1fr_1.35fr]
              gap-2
            "
          >
            <button
              type="button"
              disabled={
                adding ||
                isOutOfStock
              }
              onClick={() =>
                void handleAddToCart()
              }
              className="
                flex
                min-h-12
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-[#0E4D64]
                bg-transparent
                px-3
                text-[10px]
                font-black
                text-[#0E4D64]
                transition-all
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-50
                dark:text-[#9DD5E5]
              "
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}

              <span>
                {cartQuantity > 0
                  ? "إضافة أخرى"
                  : "أضف للسلة"}
              </span>
            </button>

            <button
              type="button"
              disabled={
                buying ||
                isOutOfStock
              }
              onClick={() =>
                void handleBuyNow()
              }
              className="
                flex
                min-h-12
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-[#D65A31]
                px-3
                text-[10px]
                font-black
                text-white
                shadow-sm
                transition-all
                hover:bg-[#B74624]
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {buying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}

              <span>
                شراء الآن
              </span>
            </button>
          </div>
        </section>

        {/* الوصف */}
        {product.description ? (
          <section
            className="
              rounded-[1.7rem]
              border
              border-border/70
              bg-card
              p-4
              shadow-sm
              sm:p-5
            "
          >
            <h2 className="text-sm font-black">
              وصف المنتج
            </h2>

            <div
              className="
                mt-3
                whitespace-pre-line
                text-xs
                leading-7
                text-muted-foreground
              "
            >
              {product.description}
            </div>
          </section>
        ) : null}

        {/* التقييمات */}
        <section
          className="
            rounded-[1.7rem]
            border
            border-border/70
            bg-card
            p-4
            shadow-sm
            sm:p-5
          "
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black">
                تقييمات العملاء
              </h2>

              <p className="mt-1 text-[10px] text-muted-foreground">
                آراء العملاء حول هذا المنتج
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-[#D65A31] text-[#D65A31]" />

              <span className="text-sm font-black">
                {averageRating > 0
                  ? averageRating.toLocaleString(
                      "ar-EG",
                      {
                        maximumFractionDigits: 1,
                      },
                    )
                  : "—"}
              </span>
            </div>
          </div>

          {reviewsLoading ? (
            <div className="mt-5 flex justify-center py-5">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length > 0 ? (
            <div className="mt-5 space-y-3">
              {reviews
                .slice(0, 6)
                .map((review) => (
                  <div
                    key={review.id}
                    className="
                      rounded-2xl
                      bg-muted/40
                      p-3
                    "
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black">
                        {review.user_name}
                      </span>

                      <div className="flex items-center gap-0.5">
                        {Array.from({
                          length: 5,
                        }).map(
                          (_, index) => (
                            <Star
                              key={index}
                              className={`
                                h-3
                                w-3
                                ${
                                  index <
                                  Number(
                                    review.rating,
                                  )
                                    ? "fill-[#D65A31] text-[#D65A31]"
                                    : "text-muted-foreground/30"
                                }
                              `}
                            />
                          ),
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-[10px] leading-6 text-muted-foreground">
                      {review.comment}
                    </p>
                  </div>
                ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-muted/40 px-4 py-6 text-center">
              <Star className="mx-auto h-5 w-5 text-muted-foreground/40" />

              <p className="mt-2 text-[10px] font-bold text-muted-foreground">
                لا توجد تقييمات لهذا المنتج بعد
              </p>
            </div>
          )}
        </section>

        {/* منتجات مشابهة */}
        {(similarLoading ||
          similarProducts.length >
            0) && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#0E4D64] dark:text-[#D9EEF5]">
                  منتجات قد تعجبك
                </h2>

                <div className="mt-1 h-1 w-7 rounded-full bg-[#D65A31]" />
              </div>

              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: "/products",
                  })
                }
                className="text-[10px] font-bold text-[#0E4D64] dark:text-[#9DD5E5]"
              >
                المزيد
              </button>
            </div>

            {similarLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({
                  length: 4,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="
                      aspect-[0.78]
                      animate-pulse
                      rounded-[1.35rem]
                      bg-muted
                    "
                  />
                ))}
              </div>
            ) : (
              <div
                className="
                  grid
                  grid-cols-2
                  gap-3
                  sm:grid-cols-3
                "
              >
                {similarProducts.map(
                  (item) => (
                    <ProductCard
                      key={item.id}
                      product={item}
                    />
                  ),
                )}
              </div>
            )}
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default ProductDetail;
