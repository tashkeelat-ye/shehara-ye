import {
  createFileRoute,
  Link,
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
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Minus,
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
import {
  addFavorite,
  isFavorite,
  removeFavorite,
} from "@/lib/favorites";

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

function ReviewItem({
  review,
}: {
  review: ProductReviewRow;
}) {
  const rating = Math.max(
    0,
    Math.min(5, Number(review.rating) || 0),
  );

  return (
    <article
      className="
        rounded-[20px]
        border
        border-[#0D3B4D]/10
        bg-white
        p-4
      "
    >
      <div className="flex items-start gap-3">
        <div
          className="
            grid
            h-10
            w-10
            shrink-0
            place-items-center
            rounded-xl
            bg-[#0D3B4D]
            text-sm
            font-black
            text-[#E2723A]
          "
        >
          {(review.user_name?.trim().slice(0, 1) || "ع").toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="truncate text-xs font-black text-[#0A2A38]">
              {review.user_name || "عميل شهارة"}
            </h3>

            <div className="flex shrink-0 items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`h-3 w-3 ${
                    index < rating
                      ? "fill-[#E2723A] text-[#E2723A]"
                      : "text-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="mt-2 text-xs leading-6 text-slate-500">
            {review.comment}
          </p>
        </div>
      </div>
    </article>
  );
}

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const {
    addItem,
    getItemQuantity,
  } = useCart();

  const formatPrice = useFormatPrice();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [favorite, setFavorite] = useState(false);

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
    queryFn: async (): Promise<Product[]> => {
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

    setFavorite(isFavorite(product.id));
  }, [product?.id]);

  useEffect(() => {
    const syncFavorite = () => {
      if (!product) {
        return;
      }

      setFavorite(isFavorite(product.id));
    };

    window.addEventListener("storage", syncFavorite);

    window.addEventListener(
      "shehara:favorites-changed",
      syncFavorite,
    );

    return () => {
      window.removeEventListener(
        "storage",
        syncFavorite,
      );

      window.removeEventListener(
        "shehara:favorites-changed",
        syncFavorite,
      );
    };
  }, [product?.id]);

  const images = useMemo(() => {
    if (product?.images?.length) {
      return product.images;
    }

    return ["/placeholder.svg"];
  }, [product?.images]);

  const stockLeft = Math.max(
    0,
    Number(product?.stock_left ?? 0),
  );

  const lowStockThreshold = Math.max(
    1,
    Number(product?.low_stock_threshold ?? 5),
  );

  const isOutOfStock =
    !product ||
    stockLeft <= 0;

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
    hasDiscount && product?.old_price
      ? Math.round(
          ((product.old_price - product.price) /
            product.old_price) *
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
      toast.error("عذراً، المنتج نفد من المخزون.");
      return false;
    }

    if (
      product.sizes?.length > 0 &&
      !selectedSize
    ) {
      toast.error("يرجى اختيار المقاس أو الحجم.");
      return false;
    }

    if (
      product.colors?.length > 0 &&
      !selectedColor
    ) {
      toast.error("يرجى اختيار اللون.");
      return false;
    }

    return true;
  }, [
    product,
    stockLeft,
    selectedSize,
    selectedColor,
  ]);

  const handleAddToCart = useCallback(async () => {
    if (
      !validateSelection() ||
      !product ||
      adding
    ) {
      return;
    }

    setAdding(true);

    try {
      await addItem({
        productId: product.id,
        quantity: 1,
        size: selectedSize,
        color: selectedColor,
        openDrawer: true,
      });

      toast.success("تمت إضافة المنتج إلى السلة.");
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
    adding,
    addItem,
    selectedSize,
    selectedColor,
  ]);

  const handleBuyNow = useCallback(async () => {
    if (
      !validateSelection() ||
      !product ||
      buying
    ) {
      return;
    }

    setBuying(true);

    try {
      await addItem({
        productId: product.id,
        quantity: 1,
        size: selectedSize,
        color: selectedColor,
        openDrawer: false,
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
    buying,
    addItem,
    selectedSize,
    selectedColor,
    navigate,
  ]);

  const handleToggleFavorite = useCallback(() => {
    if (!product) {
      return;
    }

    if (favorite) {
      removeFavorite(product.id);
      setFavorite(false);
      toast.success("تمت إزالة المنتج من المفضلة.");
      return;
    }

    addFavorite(product.id);
    setFavorite(true);
    toast.success("تمت إضافة المنتج إلى المفضلة.");
  }, [product, favorite]);

  const handleShare = useCallback(async () => {
    if (!product || sharing) {
      return;
    }

    setSharing(true);

    const url = window.location.href;

    try {
      if (
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: product.name,
          text: `شاهد هذا المنتج في شهارة: ${product.name}`,
          url,
        });

        return;
      }

      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(url);
        toast.success("تم نسخ رابط المنتج.");
        return;
      }

      const textarea =
        document.createElement("textarea");

      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();

      const copied =
        document.execCommand("copy");

      document.body.removeChild(textarea);

      if (copied) {
        toast.success("تم نسخ رابط المنتج.");
      } else {
        toast.error("تعذر نسخ رابط المنتج.");
      }
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      toast.error("تعذر مشاركة المنتج حالياً.");
    } finally {
      setSharing(false);
    }
  }, [product, sharing]);

  const goHome = useCallback(() => {
    void navigate({
      to: "/",
    });
  }, [navigate]);

  const previousImage = useCallback(() => {
    setActiveImageIndex((current) =>
      current <= 0
        ? images.length - 1
        : current - 1,
    );
  }, [images.length]);

  const nextImage = useCallback(() => {
    setActiveImageIndex((current) =>
      current >= images.length - 1
        ? 0
        : current + 1,
    );
  }, [images.length]);

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

    if (distance > 0) {
      nextImage();
    } else {
      previousImage();
    }
  }, [
    images.length,
    nextImage,
    previousImage,
  ]);

  const handleReviewSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!product || submittingReview) {
      return;
    }

    const comment =
      reviewComment.trim();

    if (comment.length < 3) {
      toast.error("يرجى كتابة تعليق أوضح.");
      return;
    }

    setSubmittingReview(true);

    try {
      const {
        data: { user },
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

      const { error } =
        await supabase
          .from("product_reviews")
          .insert({
            product_id: product.id,
            user_id: user.id,
            user_name: displayName,
            rating: reviewRating,
            comment,
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

  /* Loading */
  if (isLoading) {
    return (
      <div
        dir="rtl"
        className="
          min-h-screen
          bg-[#F6F2EE]
          pb-28
        "
      >
        <div
          className="
            sticky
            top-0
            z-40
            border-b
            border-white/10
            px-4
            py-3
          "
          style={{
            backgroundColor: BRAND.dark,
          }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-white/10" />
            <div className="h-5 w-36 animate-pulse rounded bg-white/10" />
            <div className="h-9 w-9 animate-pulse rounded-xl bg-white/10" />
          </div>
        </div>

        <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
          <div className="aspect-square animate-pulse rounded-[28px] bg-white md:aspect-[4/3]" />

          <div className="space-y-4 rounded-[24px] border border-[#0D3B4D]/10 bg-white p-5">
            <div className="h-5 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-20 w-full animate-pulse rounded bg-slate-100" />
          </div>
        </main>
      </div>
    );
  }

  /* Error */
  if (isError || !product) {
    return (
      <div
        dir="rtl"
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-[#F6F2EE]
          px-5
        "
      >
        <div
          className="
            w-full
            max-w-md
            rounded-[28px]
            border
            border-[#0D3B4D]/10
            bg-white
            p-7
            text-center
            shadow-[0_25px_60px_-40px_rgba(13,59,77,0.8)]
          "
        >
          <div
            className="
              mx-auto
              grid
              h-20
              w-20
              place-items-center
              rounded-[24px]
              bg-[#0D3B4D]/[0.07]
              text-[#0D3B4D]
            "
          >
            <ShoppingBag className="h-9 w-9" />
          </div>

          <h1 className="mt-5 text-xl font-black text-[#0A2A38]">
            المنتج غير متوفر
          </h1>

          <p className="mt-2 text-xs leading-6 text-slate-400">
            قد يكون المنتج قد تم حذفه أو لم يعد متاحاً حالياً.
          </p>

          <button
            type="button"
            onClick={goHome}
            className="
              mt-6
              inline-flex
              min-h-11
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-[#0D3B4D]
              px-6
              text-xs
              font-black
              text-white
            "
          >
            <ArrowLeft className="h-4 w-4" />
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="
        min-h-screen
        bg-[#F6F2EE]
        pb-28
      "
    >
      {/* Top product toolbar */}
      <header
        className="
          sticky
          top-0
          z-40
          border-b
          border-white/10
          shadow-sm
        "
        style={{
          backgroundColor: BRAND.dark,
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <button
            type="button"
            onClick={goHome}
            aria-label="العودة إلى الرئيسية"
            className="
              grid
              h-10
              w-10
              place-items-center
              rounded-xl
              border
              border-white/10
              bg-white/[0.06]
              text-white
              transition
              active:scale-95
            "
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 px-4 text-center">
            <p className="text-[8px] font-bold tracking-[0.2em] text-[#E2723A]">
              SHEHARA
            </p>

            <p className="mt-0.5 truncate text-xs font-black text-white">
              تفاصيل المنتج
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleShare();
            }}
            disabled={sharing}
            aria-label="مشاركة المنتج"
            className="
              grid
              h-10
              w-10
              place-items-center
              rounded-xl
              border
              border-white/10
              bg-white/[0.06]
              text-white
              transition
              active:scale-95
              disabled:opacity-50
            "
          >
            {sharing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Share2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-5">
        {/* Breadcrumb */}
        <nav
          aria-label="مسار التنقل"
          className="mb-4 flex items-center gap-2 text-[10px] text-slate-400"
        >
          <Link
            to="/"
            className="font-bold text-[#0D3B4D]"
          >
            الرئيسية
          </Link>

          <ChevronLeft className="h-3 w-3" />

          <span>تفاصيل المنتج</span>
        </nav>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          {/* Gallery */}
          <section
            className="
              overflow-hidden
              rounded-[28px]
              border
              border-[#0D3B4D]/10
              bg-white
              p-3
              shadow-[0_20px_50px_-40px_rgba(13,59,77,0.8)]
            "
          >
            <div
              className="
                relative
                overflow-hidden
                rounded-[22px]
                bg-[#F6F2EE]
              "
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="aspect-square md:aspect-[4/3]">
                <ProductImage
                  src={images[activeImageIndex]}
                  alt={product.name}
                  eager
                  className="h-full w-full"
                />
              </div>

              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={previousImage}
                    aria-label="الصورة السابقة"
                    className="
                      absolute
                      start-3
                      top-1/2
                      grid
                      h-10
                      w-10
                      -translate-y-1/2
                      place-items-center
                      rounded-full
                      border
                      border-white/30
                      bg-[#0A2A38]/55
                      text-white
                      backdrop-blur-md
                    "
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={nextImage}
                    aria-label="الصورة التالية"
                    className="
                      absolute
                      end-3
                      top-1/2
                      grid
                      h-10
                      w-10
                      -translate-y-1/2
                      place-items-center
                      rounded-full
                      border
                      border-white/30
                      bg-[#0A2A38]/55
                      text-white
                      backdrop-blur-md
                    "
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </>
              ) : null}

              {hasDiscount ? (
                <span
                  className="
                    absolute
                    start-4
                    top-4
                    rounded-xl
                    bg-[#E2723A]
                    px-3
                    py-1.5
                    text-[10px]
                    font-black
                    text-white
                    shadow-lg
                  "
                >
                  خصم {discountPercent}%
                </span>
              ) : null}
            </div>

            {images.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => {
                      setActiveImageIndex(index);
                    }}
                    className={`
                      h-16
                      w-16
                      shrink-0
                      overflow-hidden
                      rounded-xl
                      border-2
                      bg-[#F6F2EE]
                      transition
                      ${
                        activeImageIndex === index
                          ? "border-[#E2723A]"
                          : "border-transparent"
                      }
                    `}
                    aria-label={`عرض الصورة ${index + 1}`}
                  >
                    <ProductImage
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="h-full w-full"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          {/* Product information */}
          <section className="space-y-4">
            <div
              className="
                rounded-[28px]
                border
                border-[#0D3B4D]/10
                bg-white
                p-5
                shadow-[0_20px_50px_-40px_rgba(13,59,77,0.8)]
              "
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[9px] font-black tracking-[0.16em] text-[#E2723A]">
                    SHEHARA PRODUCT
                  </p>

                  <h1 className="mt-2 text-xl font-black leading-8 text-[#0A2A38] md:text-2xl">
                    {product.name}
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  aria-label={
                    favorite
                      ? "إزالة من المفضلة"
                      : "إضافة إلى المفضلة"
                  }
                  className={`
                    grid
                    h-11
                    w-11
                    shrink-0
                    place-items-center
                    rounded-2xl
                    border
                    transition
                    active:scale-95
                    ${
                      favorite
                        ? "border-[#E2723A]/30 bg-[#E2723A]/10 text-[#E2723A]"
                        : "border-[#0D3B4D]/10 bg-[#F6F2EE] text-[#0D3B4D]"
                    }
                  `}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      favorite
                        ? "fill-current"
                        : ""
                    }`}
                  />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-[#E2723A] text-[#E2723A]" />

                  <span className="text-xs font-black text-[#0A2A38]">
                    {averageRating > 0
                      ? averageRating.toFixed(1)
                      : "جديد"}
                  </span>

                  {reviews.length > 0 ? (
                    <span className="text-[10px] text-slate-400">
                      ({reviews.length.toLocaleString("ar-EG")})
                    </span>
                  ) : null}
                </div>

                <span className="h-1 w-1 rounded-full bg-slate-300" />

                <span className="text-[10px] font-bold text-slate-400">
                  {product.sales_count > 0
                    ? `${product.sales_count.toLocaleString("ar-EG")} عملية بيع`
                    : "منتج من شهارة"}
                </span>
              </div>

              <div className="mt-5 flex items-end gap-3">
                <strong className="text-3xl font-black text-[#E2723A]">
                  {formatPrice(product.price)}
                </strong>

                {hasDiscount ? (
                  <del className="pb-1 text-sm font-bold text-slate-400">
                    {formatPrice(product.old_price ?? 0)}
                  </del>
                ) : null}
              </div>

              {/* Stock */}
              <div className="mt-5">
                {isOutOfStock ? (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-black text-red-600">
                    المنتج غير متوفر حالياً
                  </div>
                ) : isLowStock ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-xs font-black text-orange-700">
                    <Zap className="h-4 w-4" />
                    متبقي فقط {stockLeft.toLocaleString("ar-EG")} من المنتج
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    المنتج متوفر في المخزون
                  </div>
                )}
              </div>

              {/* Sizes */}
              {product.sizes.length > 0 ? (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-black text-[#0A2A38]">
                      المقاس / الحجم
                    </h2>

                    <span className="text-[9px] text-slate-400">
                      اختر خياراً
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setSelectedSize(size);
                        }}
                        className={`
                          min-w-12
                          rounded-xl
                          border
                          px-3
                          py-2.5
                          text-xs
                          font-black
                          transition
                          active:scale-95
                          ${
                            selectedSize === size
                              ? "border-[#E2723A] bg-[#E2723A] text-white"
                              : "border-[#0D3B4D]/10 bg-white text-[#0A2A38]"
                          }
                        `}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Colors */}
              {product.colors.length > 0 ? (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-black text-[#0A2A38]">
                      اللون
                    </h2>

                    <span className="text-[9px] text-slate-400">
                      اختر لوناً
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color);
                        }}
                        className={`
                          rounded-xl
                          border
                          px-4
                          py-2.5
                          text-xs
                          font-black
                          transition
                          active:scale-95
                          ${
                            selectedColor === color
                              ? "border-[#E2723A] bg-[#E2723A] text-white"
                              : "border-[#0D3B4D]/10 bg-white text-[#0A2A38]"
                          }
                        `}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Desktop actions */}
              <div className="mt-7 hidden gap-2 md:grid md:grid-cols-[1fr_1.2fr]">
                <button
                  type="button"
                  onClick={() => {
                    void handleAddToCart();
                  }}
                  disabled={
                    isOutOfStock ||
                    adding
                  }
                  className="
                    flex
                    min-h-12
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    border
                    border-[#0D3B4D]/15
                    bg-[#F6F2EE]
                    px-4
                    text-xs
                    font-black
                    text-[#0D3B4D]
                    transition
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {adding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-4 w-4" />
                  )}

                  {cartQuantity > 0
                    ? `في السلة (${cartQuantity})`
                    : "أضف إلى السلة"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleBuyNow();
                  }}
                  disabled={
                    isOutOfStock ||
                    buying
                  }
                  className="
                    flex
                    min-h-12
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-[#E2723A]
                    px-4
                    text-xs
                    font-black
                    text-white
                    shadow-[0_14px_35px_-20px_rgba(226,114,58,0.9)]
                    transition
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {buying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}

                  شراء الآن
                </button>
              </div>
            </div>

            {/* Description */}
            <div
              className="
                rounded-[24px]
                border
                border-[#0D3B4D]/10
                bg-white
                p-5
              "
            >
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0D3B4D] text-[#E2723A]">
                  <Sparkles className="h-4 w-4" />
                </div>

                <h2 className="text-sm font-black text-[#0A2A38]">
                  وصف المنتج
                </h2>
              </div>

              <p className="mt-4 whitespace-pre-line text-xs leading-7 text-slate-500">
                {product.description?.trim() ||
                  "لا يوجد وصف إضافي لهذا المنتج حالياً."}
              </p>
            </div>

            {/* Trust */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="
                  rounded-[20px]
                  border
                  border-[#0D3B4D]/10
                  bg-white
                  p-4
                "
              >
                <div className="text-lg">✓</div>
                <h3 className="mt-2 text-[10px] font-black text-[#0A2A38]">
                  شراء آمن
                </h3>
                <p className="mt-1 text-[9px] leading-5 text-slate-400">
                  تجربة شراء موثوقة عبر شهارة.
                </p>
              </div>

              <div
                className="
                  rounded-[20px]
                  border
                  border-[#0D3B4D]/10
                  bg-white
                  p-4
                "
              >
                <div className="text-lg">🚚</div>
                <h3 className="mt-2 text-[10px] font-black text-[#0A2A38]">
                  توصيل
                </h3>
                <p className="mt-1 text-[9px] leading-5 text-slate-400">
                  خيارات توصيل حسب موقعك.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Reviews */}
        <section className="mt-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black tracking-[0.16em] text-[#E2723A]">
                REVIEWS
              </p>

              <h2 className="mt-1 text-lg font-black text-[#0A2A38]">
                تقييمات العملاء
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-[#E2723A] text-[#E2723A]" />
              <span className="text-xs font-black text-[#0A2A38]">
                {averageRating > 0
                  ? averageRating.toFixed(1)
                  : "جديد"}
              </span>
            </div>
          </div>

          {reviewsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-[20px] bg-white"
                />
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                />
              ))}
            </div>
          ) : (
            <div
              className="
                rounded-[22px]
                border
                border-[#0D3B4D]/10
                bg-white
                p-6
                text-center
              "
            >
              <Star className="mx-auto h-7 w-7 text-slate-300" />

              <p className="mt-3 text-xs font-bold text-[#0A2A38]">
                لا توجد تقييمات بعد
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                كن أول من يقيّم هذا المنتج.
              </p>
            </div>
          )}

          {/* Review form */}
          <form
            onSubmit={handleReviewSubmit}
            className="
              mt-4
              rounded-[24px]
              border
              border-[#0D3B4D]/10
              bg-white
              p-5
            "
          >
            <h3 className="text-sm font-black text-[#0A2A38]">
              أضف تقييمك
            </h3>

            <div className="mt-4 flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, index) => {
                const value = index + 1;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setReviewRating(value);
                    }}
                    aria-label={`تقييم ${value} من 5`}
                    className="transition active:scale-90"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        value <= reviewRating
                          ? "fill-[#E2723A] text-[#E2723A]"
                          : "text-slate-200"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <textarea
              value={reviewComment}
              onChange={(event) => {
                setReviewComment(
                  event.target.value,
                );
              }}
              rows={4}
              maxLength={1000}
              placeholder="اكتب رأيك عن المنتج..."
              className="
                mt-4
                w-full
                resize-none
                rounded-2xl
                border
                border-[#0D3B4D]/10
                bg-[#F6F2EE]
                px-4
                py-3
                text-xs
                leading-6
                text-[#0A2A38]
                outline-none
                transition
                focus:border-[#E2723A]/50
              "
            />

            <button
              type="submit"
              disabled={
                submittingReview ||
                reviewComment.trim().length < 3
              }
              className="
                mt-3
                flex
                min-h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-[#0D3B4D]
                px-5
                text-xs
                font-black
                text-white
                transition
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {submittingReview ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}

              إرسال التقييم
            </button>
          </form>
        </section>

        {/* Similar products */}
        {similarProducts.length > 0 ? (
          <section className="mt-7 pb-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-[9px] font-black tracking-[0.16em] text-[#E2723A]">
                  DISCOVER MORE
                </p>

                <h2 className="mt-1 text-lg font-black text-[#0A2A38]">
                  منتجات مشابهة
                </h2>
              </div>
            </div>

            {similarLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-64 animate-pulse rounded-[20px] bg-white"
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
                  lg:grid-cols-6
                "
              >
                {similarProducts.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>

      {/* Mobile purchase bar — replaces BottomNav on product page */}
      <div
        className="
          fixed
          inset-x-0
          bottom-0
          z-50
          border-t
          border-[#0D3B4D]/10
          bg-white/95
          px-3
          pb-[calc(0.75rem+env(safe-area-inset-bottom))]
          pt-3
          shadow-[0_-15px_40px_-25px_rgba(13,59,77,0.55)]
          backdrop-blur-xl
          md:hidden
        "
      >
        <div className="mx-auto grid max-w-3xl grid-cols-[44px_1fr_1.15fr] gap-2">
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={
              favorite
                ? "إزالة من المفضلة"
                : "إضافة إلى المفضلة"
            }
            className={`
              grid
              h-12
              place-items-center
              rounded-2xl
              border
              ${
                favorite
                  ? "border-[#E2723A]/30 bg-[#E2723A]/10 text-[#E2723A]"
                  : "border-[#0D3B4D]/10 bg-[#F6F2EE] text-[#0D3B4D]"
              }
            `}
          >
            <Heart
              className={`h-5 w-5 ${
                favorite ? "fill-current" : ""
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              void handleAddToCart();
            }}
            disabled={
              isOutOfStock ||
              adding
            }
            className="
              flex
              h-12
              items-center
              justify-center
              gap-2
              rounded-2xl
              border
              border-[#0D3B4D]/10
              bg-[#F6F2EE]
              px-3
              text-[10px]
              font-black
              text-[#0D3B4D]
              disabled:opacity-50
            "
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}

            {cartQuantity > 0
              ? `السلة (${cartQuantity})`
              : "السلة"}
          </button>

          <button
            type="button"
            onClick={() => {
              void handleBuyNow();
            }}
            disabled={
              isOutOfStock ||
              buying
            }
            className="
              flex
              h-12
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-[#E2723A]
              px-3
              text-[10px]
              font-black
              text-white
              shadow-[0_12px_30px_-18px_rgba(226,114,58,0.95)]
              disabled:opacity-50
            "
          >
            {buying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}

            شراء الآن
          </button>
        </div>
      </div>
    </div>
  );
}
