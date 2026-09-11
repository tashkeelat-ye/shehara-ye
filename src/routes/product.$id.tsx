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
} from "@/lib/db";
import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "@/components/product-image";
import { ProductCard } from "@/components/product-card";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/product/$id")({
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

const BRAND = {
  teal: "#0D3B4D",
  dark: "#0A2A38",
  orange: "#E2723A",
  cream: "#F6F2EE",
} as const;

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

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

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
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ["product-reviews", id],
    queryFn: async (): Promise<ProductReviewRow[]> => {
      const { data, error } = await supabase
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
    Number(product?.stock_left ?? 0),
  );

  const lowStockThreshold = Math.max(
    1,
    Number(product?.low_stock_threshold ?? 5),
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

  const hasDiscount = Boolean(
    product?.old_price &&
      product.old_price > product.price,
  );

  const discountPercent =
    hasDiscount && product
      ? Math.round(
          ((product.old_price! - product.price) /
            product.old_price!) *
            100,
        )
      : 0;

  const averageRating =
    reviews.length > 0
      ? reviews.reduce(
          (sum, review) =>
            sum + Number(review.rating || 0),
          0,
        ) / reviews.length
      : Number(product?.rating ?? 0);

  const validateSelection = useCallback(() => {
    if (!product) {
      toast.error("المنتج غير متوفر.");
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
      toast.error("يرجى اختيار اللون.");
      return false;
    }

    return true;
  }, [
    product,
    selectedSize,
    selectedColor,
    stockLeft,
  ]);

  const handleAddToCart = useCallback(async () => {
    if (!validateSelection() || !product) {
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
            onClick: () => setDrawerOpen(true),
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
    validateSelection,
    product,
    addItem,
    selectedSize,
    selectedColor,
    setDrawerOpen,
  ]);

  const handleBuyNow = useCallback(async () => {
    if (!validateSelection() || !product) {
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
    validateSelection,
    product,
    addItem,
    selectedSize,
    selectedColor,
    navigate,
  ]);

  const handleShare = useCallback(async () => {
    if (!product) {
      return;
    }

    const shareData = {
      title: product.name,
      text: `شاهد هذا المنتج في شهارة: ${product.name}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          window.location.href,
        );

        toast.success(
          "تم نسخ رابط المنتج.",
        );
      }
    } catch {
      // إلغاء نافذة المشاركة ليس خطأ.
    }
  }, [product]);

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      touchStartX.current =
        event.touches[0]?.clientX ?? 0;

      touchEndX.current =
        touchStartX.current;
    },
    [],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      touchEndX.current =
        event.touches[0]?.clientX ??
        touchEndX.current;
    },
    [],
  );

  const handleTouchEnd = useCallback(() => {
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
      activeImageIndex < images.length - 1
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

  const handleReviewSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!product) {
      return;
    }

    const trimmedComment =
      reviewComment.trim();

    if (!trimmedComment) {
      toast.error(
        "اكتب تعليقك أولاً.",
      );
      return;
    }

    if (trimmedComment.length < 3) {
      toast.error(
        "يرجى كتابة تعليق أوضح.",
      );
      return;
    }

    setSubmittingReview(true);

    try {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error(
          "يجب تسجيل الدخول لإضافة تقييم.",
        );
        return;
      }

      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "عميل شهارة";

      const { error } = await supabase
        .from("product_reviews")
        .insert({
          product_id: product.id,
          user_id: user.id,
          user_name: displayName,
          rating: reviewRating,
          comment: trimmedComment,
        });

      if (error) {
        throw error;
      }

      setReviewComment("");
      setReviewRating(5);

      toast.success(
        "تم إرسال تقييمك للمراجعة.",
      );

      await refetchReviews();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر إرسال التقييم.",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#F6F2EE]"
      >
        <header
          className="sticky top-0 z-40 border-b border-white/10 px-4 py-3 shadow-sm"
          style={{
            backgroundColor: BRAND.dark,
          }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="h-9 w-24 animate-pulse rounded-xl bg-white/10" />

            <div className="h-5 w-36 animate-pulse rounded bg-white/10" />

            <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 pb-32">
          <div className="aspect-square animate-pulse rounded-[28px] bg-white shadow-sm md:aspect-[4/3]" />

          <div className="space-y-4 rounded-[24px] border border-[#0D3B4D]/10 bg-white p-5">
            <div className="h-5 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="h-9 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-20 w-full animate-pulse rounded-2xl bg-slate-100" />
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
        className="min-h-screen bg-[#F6F2EE] pb-24"
      >
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
          <div
            className="mb-5 grid h-20 w-20 place-items-center rounded-[24px]"
            style={{
              backgroundColor: `${BRAND.teal}12`,
              color: BRAND.teal,
            }}
          >
            <ShoppingBag className="h-9 w-9" />
          </div>

          <h1
            className="text-xl font-black"
            style={{ color: BRAND.dark }}
          >
            المنتج غير متوفر
          </h1>

          <p className="mt-2 text-sm leading-7 text-slate-500">
            ربما تم حذف المنتج أو لم يعد
            متاحاً حالياً.
          </p>

          <button
            type="button"
            onClick={() =>
              void navigate({ to: "/" })
            }
            className="mt-6 rounded-2xl px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5"
            style={{
              backgroundColor: BRAND.teal,
              boxShadow: `0 10px 25px ${BRAND.teal}25`,
            }}
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
      className="min-h-screen bg-[#F6F2EE]"
      style={
        {
          "--shehara-teal": BRAND.teal,
          "--shehara-dark": BRAND.dark,
          "--shehara-orange": BRAND.orange,
          "--shehara-cream": BRAND.cream,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b border-white/10 shadow-lg backdrop-blur-xl"
        style={{
          backgroundColor: `${BRAND.dark}F5`,
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
            aria-label="العودة"
          >
            <ArrowRight className="h-5 w-5" />
          </button>

          <div className="text-center">
            <div
              className="text-base font-black tracking-wide"
              style={{ color: BRAND.cream }}
            >
              شهارة
            </div>

            <div className="text-[9px] font-medium tracking-[0.25em] text-white/45">
              SHEHARA
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
            aria-label="السلة"
          >
            <ShoppingCart className="h-5 w-5" />

            {count > 0 && (
              <span
                className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full px-1 text-[9px] font-black text-white shadow-md"
                style={{
                  backgroundColor: BRAND.orange,
                }}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-36 pt-4 md:pt-6">
        {/* Breadcrumb */}
        <div className="mb-4 hidden items-center gap-2 text-xs text-slate-500 md:flex">
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="transition hover:text-[#E2723A]"
          >
            الرئيسية
          </button>

          <ChevronLeft className="h-3.5 w-3.5" />

          <span className="max-w-xs truncate text-[#0D3B4D]">
            {product.name}
          </span>
        </div>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,.95fr)] lg:items-start">
          {/* Gallery */}
          <div className="space-y-3">
            <div
              className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white p-2 shadow-[0_20px_60px_rgba(13,59,77,.10)]"
            >
              <div
                className="relative aspect-square overflow-hidden rounded-[22px] bg-[#F8F6F3] md:aspect-[4/3]"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <ProductImage
                  src={images[activeImageIndex]}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />

                {product.badge && (
                  <span
                    className="absolute right-4 top-4 rounded-full px-3 py-1.5 text-[10px] font-black text-white shadow-lg"
                    style={{
                      backgroundColor: BRAND.orange,
                    }}
                  >
                    {product.badge}
                  </span>
                )}

                {hasDiscount && (
                  <span
                    className="absolute left-4 top-4 rounded-full px-3 py-1.5 text-[10px] font-black text-white shadow-lg"
                    style={{
                      backgroundColor: BRAND.teal,
                    }}
                  >
                    -{discountPercent}%
                  </span>
                )}

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex(
                          (value) =>
                            value === 0
                              ? images.length - 1
                              : value - 1,
                        )
                      }
                      className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/85 text-[#0D3B4D] shadow-lg backdrop-blur"
                      aria-label="الصورة السابقة"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveImageIndex(
                          (value) =>
                            value === images.length - 1
                              ? 0
                              : value + 1,
                        )
                      }
                      className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/85 text-[#0D3B4D] shadow-lg backdrop-blur"
                      aria-label="الصورة التالية"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="absolute bottom-4 left-4 grid h-10 w-10 place-items-center rounded-full border border-white/70 bg-white/85 text-[#0D3B4D] shadow-lg backdrop-blur transition hover:scale-105"
                  aria-label="مشاركة المنتج"
                >
                  <Share2 className="h-4 w-4" />
                </button>

                {product.is_local && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full border border-white/60 bg-[#0D3B4D]/90 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur">
                    <Sparkles className="h-3 w-3 text-[#E2723A]" />
                    منتج يمني
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    onClick={() =>
                      setActiveImageIndex(index)
                    }
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white p-1 shadow-sm transition"
                    style={{
                      borderColor:
                        activeImageIndex === index
                          ? BRAND.orange
                          : "transparent",
                    }}
                    aria-label={`الصورة ${index + 1}`}
                  >
                    <ProductImage
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="h-full w-full rounded-xl object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product information */}
          <div className="space-y-4">
            <div className="rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_55px_rgba(13,59,77,.08)] backdrop-blur-xl md:p-6">
              {/* Product meta */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {product.is_local && (
                  <span
                    className="rounded-full px-3 py-1 text-[10px] font-black"
                    style={{
                      backgroundColor: `${BRAND.orange}15`,
                      color: BRAND.orange,
                    }}
                  >
                    صناعة يمنية
                  </span>
                )}

                {product.city && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
                    {product.city}
                  </span>
                )}

                {product.badge && (
                  <span
                    className="rounded-full px-3 py-1 text-[10px] font-black text-white"
                    style={{
                      backgroundColor: BRAND.teal,
                    }}
                  >
                    {product.badge}
                  </span>
                )}
              </div>

              <h1
                className="text-xl font-black leading-9 md:text-2xl"
                style={{ color: BRAND.dark }}
              >
                {product.name}
              </h1>

              {/* Rating */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star
                    className="h-4 w-4 fill-[#E2723A] text-[#E2723A]"
                  />
                  <span className="text-sm font-black text-[#0D3B4D]">
                    {averageRating > 0
                      ? averageRating.toFixed(1)
                      : "جديد"}
                  </span>
                </div>

                <span className="h-4 w-px bg-slate-200" />

                <span className="text-xs font-medium text-slate-500">
                  {reviews.length > 0
                    ? `${reviews.length} تقييم`
                    : product.reviews_count
                      ? `${product.reviews_count} تقييم`
                      : "لا توجد تقييمات بعد"}
                </span>
              </div>

              {/* Price */}
              <div className="mt-5 rounded-2xl bg-[#F6F2EE] p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <span
                    className="text-3xl font-black tracking-tight"
                    style={{ color: BRAND.orange }}
                  >
                    {formatPrice(product.price)}
                  </span>

                  {hasDiscount && (
                    <span className="pb-1 text-sm font-bold text-slate-400 line-through">
                      {formatPrice(product.old_price!)}
                    </span>
                  )}

                  {hasDiscount && (
                    <span
                      className="mb-1 rounded-lg px-2 py-1 text-[10px] font-black text-white"
                      style={{
                        backgroundColor: BRAND.orange,
                      }}
                    >
                      وفر {discountPercent}%
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[10px] font-medium text-slate-400">
                  السعر شامل تفاصيل المنتج المعروضة
                </p>
              </div>

              {/* Stock */}
              <div className="mt-4">
                {isOutOfStock ? (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    غير متوفر حالياً
                  </div>
                ) : isLowStock ? (
                  <div className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2.5 text-xs font-bold text-orange-700">
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      الكمية محدودة
                    </span>

                    <span>
                      متبقي {stockLeft}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    متوفر في المخزون
                  </div>
                )}
              </div>

              {/* Sizes */}
              {product.sizes?.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span
                      className="text-sm font-black"
                      style={{ color: BRAND.dark }}
                    >
                      المقاس / الحجم
                    </span>

                    {selectedSize && (
                      <span className="text-xs font-bold text-slate-400">
                        {selectedSize}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => {
                      const active =
                        selectedSize === size;

                      return (
                        <button
                          type="button"
                          key={size}
                          onClick={() =>
                            setSelectedSize(size)
                          }
                          className="min-w-12 rounded-xl border px-4 py-2.5 text-xs font-black transition"
                          style={{
                            borderColor: active
                              ? BRAND.orange
                              : "#E5E7EB",
                            backgroundColor: active
                              ? `${BRAND.orange}12`
                              : "white",
                            color: active
                              ? BRAND.orange
                              : BRAND.dark,
                          }}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Colors */}
              {product.colors?.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span
                      className="text-sm font-black"
                      style={{ color: BRAND.dark }}
                    >
                      اللون
                    </span>

                    {selectedColor && (
                      <span className="text-xs font-bold text-slate-400">
                        {selectedColor}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((color) => {
                      const active =
                        selectedColor === color;

                      return (
                        <button
                          type="button"
                          key={color}
                          onClick={() =>
                            setSelectedColor(color)
                          }
                          className="rounded-xl border px-4 py-2.5 text-xs font-black transition"
                          style={{
                            borderColor: active
                              ? BRAND.orange
                              : "#E5E7EB",
                            backgroundColor: active
                              ? `${BRAND.orange}12`
                              : "white",
                            color: active
                              ? BRAND.orange
                              : BRAND.dark,
                          }}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cart state */}
              {cartQuantity > 0 && (
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#0D3B4D]/5 px-4 py-3">
                  <span className="text-xs font-bold text-slate-500">
                    في سلتك حالياً
                  </span>

                  <span
                    className="text-sm font-black"
                    style={{ color: BRAND.teal }}
                  >
                    {cartQuantity} قطعة
                  </span>
                </div>
              )}

              {/* Desktop actions */}
              <div className="mt-6 hidden gap-2 sm:grid sm:grid-cols-[1fr_1fr]">
                <button
                  type="button"
                  disabled={
                    adding || isOutOfStock
                  }
                  onClick={() =>
                    void handleAddToCart()
                  }
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 px-4 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: BRAND.teal,
                    color: BRAND.teal,
                  }}
                >
                  {adding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}
                  أضف إلى السلة
                </button>

                <button
                  type="button"
                  disabled={
                    buying || isOutOfStock
                  }
                  onClick={() =>
                    void handleBuyNow()
                  }
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black text-white shadow-[0_12px_30px_rgba(226,114,58,.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    backgroundColor: BRAND.orange,
                  }}
                >
                  {buying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  شراء الآن
                </button>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-[0_15px_40px_rgba(13,59,77,.06)]">
                <div className="mb-3 flex items-center gap-2">
                  <div
                    className="h-8 w-1 rounded-full"
                    style={{
                      backgroundColor: BRAND.orange,
                    }}
                  />

                  <h2
                    className="text-sm font-black"
                    style={{ color: BRAND.dark }}
                  >
                    تفاصيل المنتج
                  </h2>
                </div>

                <p className="whitespace-pre-line text-sm leading-8 text-slate-600">
                  {product.description}
                </p>
              </div>
            )}

            {/* Delivery reassurance */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-3 text-center">
                <div
                  className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl"
                  style={{
                    backgroundColor: `${BRAND.teal}10`,
                    color: BRAND.teal,
                  }}
                >
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <p className="text-[9px] font-bold leading-4 text-slate-500">
                  شراء آمن
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/80 p-3 text-center">
                <div
                  className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl"
                  style={{
                    backgroundColor: `${BRAND.orange}10`,
                    color: BRAND.orange,
                  }}
                >
                  <Zap className="h-4 w-4" />
                </div>
                <p className="text-[9px] font-bold leading-4 text-slate-500">
                  متابعة الطلب
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/80 p-3 text-center">
                <div
                  className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl"
                  style={{
                    backgroundColor: `${BRAND.teal}10`,
                    color: BRAND.teal,
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-[9px] font-bold leading-4 text-slate-500">
                  خدمة شهارة
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="mt-6 rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(13,59,77,.07)] md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="grid h-9 w-9 place-items-center rounded-xl"
                  style={{
                    backgroundColor: `${BRAND.orange}12`,
                    color: BRAND.orange,
                  }}
                >
                  <Star className="h-4 w-4 fill-current" />
                </div>

                <h2
                  className="text-lg font-black"
                  style={{ color: BRAND.dark }}
                >
                  تقييمات العملاء
                </h2>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span
                  className="text-3xl font-black"
                  style={{ color: BRAND.orange }}
                >
                  {averageRating > 0
                    ? averageRating.toFixed(1)
                    : "—"}
                </span>

                <div>
                  <div className="flex gap-0.5">
                    {Array.from({
                      length: 5,
                    }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${
                          index <
                          Math.round(
                            averageRating,
                          )
                            ? "fill-[#E2723A] text-[#E2723A]"
                            : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="mt-1 text-[10px] text-slate-400">
                    {reviews.length} تقييم معتمد
                  </p>
                </div>
              </div>
            </div>

            {/* Review form */}
            <form
              onSubmit={handleReviewSubmit}
              className="w-full rounded-2xl bg-[#F6F2EE] p-4 md:max-w-md"
            >
              <h3
                className="text-xs font-black"
                style={{ color: BRAND.dark }}
              >
                شاركنا رأيك
              </h3>

              <div className="mt-3 flex items-center gap-1">
                {Array.from({
                  length: 5,
                }).map((_, index) => {
                  const value = index + 1;

                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() =>
                        setReviewRating(value)
                      }
                      className="rounded-lg p-1"
                      aria-label={`تقييم ${value} من 5`}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          value <= reviewRating
                            ? "fill-[#E2723A] text-[#E2723A]"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={reviewComment}
                  onChange={(event) =>
                    setReviewComment(
                      event.target.value,
                    )
                  }
                  maxLength={500}
                  placeholder="اكتب تجربتك مع المنتج..."
                  className="min-w-0 flex-1 rounded-xl border border-white bg-white px-3 py-2.5 text-xs outline-none transition placeholder:text-slate-400 focus:border-[#E2723A]"
                />

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-md disabled:opacity-50"
                  style={{
                    backgroundColor: BRAND.orange,
                  }}
                  aria-label="إرسال التقييم"
                >
                  {submittingReview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6">
            {reviewsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2
                  className="h-6 w-6 animate-spin"
                  style={{ color: BRAND.orange }}
                />
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">
                <Star className="mx-auto h-7 w-7 text-slate-300" />

                <p className="mt-2 text-sm font-bold text-slate-500">
                  كن أول من يقيّم هذا المنتج
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  تجربتك تساعد العملاء الآخرين.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-2xl border border-slate-100 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-black text-white"
                          style={{
                            backgroundColor:
                              BRAND.teal,
                          }}
                        >
                          {review.user_name
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h3
                            className="truncate text-xs font-black"
                            style={{
                              color: BRAND.dark,
                            }}
                          >
                            {review.user_name}
                          </h3>

                          <div className="mt-1 flex gap-0.5">
                            {Array.from({
                              length: 5,
                            }).map((_, index) => (
                              <Star
                                key={index}
                                className={`h-3 w-3 ${
                                  index <
                                  Number(
                                    review.rating,
                                  )
                                    ? "fill-[#E2723A] text-[#E2723A]"
                                    : "text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <time className="shrink-0 text-[9px] text-slate-400">
                        {new Date(
                          review.created_at,
                        ).toLocaleDateString(
                          "ar-YE",
                        )}
                      </time>
                    </div>

                    <p className="mt-4 text-xs leading-7 text-slate-600">
                      {review.comment}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Similar products */}
        <section className="mt-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-1 rounded-full"
                  style={{
                    backgroundColor: BRAND.orange,
                  }}
                />

                <h2
                  className="text-lg font-black"
                  style={{ color: BRAND.dark }}
                >
                  منتجات قد تعجبك
                </h2>
              </div>

              <p className="mt-1 text-xs text-slate-400">
                اكتشف منتجات مشابهة لهذا المنتج
              </p>
            </div>
          </div>

          {similarLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 4 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-72 min-w-[190px] animate-pulse rounded-2xl bg-white"
                  />
                ),
              )}
            </div>
          ) : similarProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-5 py-8 text-center text-xs text-slate-400">
              لا توجد منتجات مشابهة حالياً.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {similarProducts.map(
                (similarProduct: Product) => (
                  <ProductCard
                    key={similarProduct.id}
                    product={similarProduct}
                  />
                ),
              )}
            </div>
          )}
        </section>
      </main>

      {/* Mobile purchase bar */}
      <div className="fixed bottom-[68px] left-0 right-0 z-30 border-t border-white/60 bg-white/90 p-3 shadow-[0_-15px_40px_rgba(13,59,77,.12)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-2xl gap-2">
          <button
            type="button"
            disabled={
              adding || isOutOfStock
            }
            onClick={() =>
              void handleAddToCart()
            }
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 text-xs font-black disabled:opacity-50"
            style={{
              borderColor: BRAND.teal,
              color: BRAND.teal,
            }}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            السلة
          </button>

          <button
            type="button"
            disabled={
              buying || isOutOfStock
            }
            onClick={() =>
              void handleBuyNow()
            }
            className="flex min-h-12 flex-[1.35] items-center justify-center gap-2 rounded-2xl text-xs font-black text-white shadow-lg disabled:opacity-50"
            style={{
              backgroundColor: BRAND.orange,
            }}
          >
            {buying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            شراء الآن
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
