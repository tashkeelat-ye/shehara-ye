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
import {
  useQuery,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
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
import {
  toast,
} from "sonner";

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

export const Route =
  createFileRoute(
    "/product/$id",
  )({
    component:
      ProductDetail,
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
};

function ProductReviewRowView({
  review,
}: {
  review: ProductReviewRow;
}) {
  return (
    <article className="
      rounded-[20px]
      border
      border-[#0D3B4D]/10
      bg-white
      p-4
    ">
      <div className="flex items-start gap-3">
        <div className="
          grid
          h-10
          w-10
          shrink-0
          place-items-center
          rounded-xl
          bg-[#0D3B4D]
          text-xs
          font-black
          text-[#E2723A]
        ">
          {review.user_name
            ?.slice(0, 1)
            ?.toUpperCase() || "ع"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="
              truncate
              text-xs
              font-black
              text-[#0A2A38]
            ">
              {review.user_name}
            </h3>

            <div className="flex items-center gap-0.5">
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

          <p className="
            mt-2
            text-xs
            leading-6
            text-slate-500
          ">
            {review.comment}
          </p>
        </div>
      </div>
    </article>
  );
}

function ProductDetail() {
  const { id } =
    Route.useParams();

  const navigate =
    useNavigate();

  const {
    addItem,
    setDrawerOpen,
    getItemQuantity,
  } = useCart();

  const formatPrice =
    useFormatPrice();

  const [
    activeImageIndex,
    setActiveImageIndex,
  ] = useState(0);

  const [
    selectedSize,
    setSelectedSize,
  ] = useState<string | null>(
    null,
  );

  const [
    selectedColor,
    setSelectedColor,
  ] = useState<string | null>(
    null,
  );

  const [
    adding,
    setAdding,
  ] = useState(false);

  const [
    buying,
    setBuying,
  ] = useState(false);

  const [
    sharing,
    setSharing,
  ] = useState(false);

  const [
    favorite,
    setFavorite,
  ] = useState(false);

  const [
    reviewRating,
    setReviewRating,
  ] = useState(5);

  const [
    reviewComment,
    setReviewComment,
  ] = useState("");

  const [
    submittingReview,
    setSubmittingReview,
  ] = useState(false);

  const touchStartX =
    useRef(0);

  const touchEndX =
    useRef(0);

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "product",
      id,
    ],
    queryFn: () =>
      fetchProduct(id),
    enabled:
      Boolean(id),
    staleTime:
      1000 * 60 * 5,
    gcTime:
      1000 * 60 * 30,
  });

  const {
    data:
      similarProducts = [],
    isLoading:
      similarLoading,
  } = useQuery({
    queryKey: [
      "products",
      "similar",
      product?.category_id,
      id,
    ],
    queryFn: async () => {
      if (
        !product?.category_id
      ) {
        return [];
      }

      const rows =
        await fetchProducts({
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
      Boolean(
        product?.category_id,
      ) &&
      Boolean(id),
    staleTime:
      1000 * 60 * 5,
    gcTime:
      1000 * 60 * 30,
  });

  const {
    data: reviews = [],
    isLoading:
      reviewsLoading,
    refetch:
      refetchReviews,
  } = useQuery({
    queryKey: [
      "product-reviews",
      id,
    ],
    queryFn:
      async (): Promise<
        ProductReviewRow[]
      > => {
        const {
          data,
          error,
        } = await supabase
          .from(
            "product_reviews",
          )
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
    enabled:
      Boolean(id),
    staleTime:
      1000 * 60 * 2,
    gcTime:
      1000 * 60 * 15,
  });

  useEffect(() => {
    if (!product) {
      return;
    }

    setActiveImageIndex(
      0,
    );

    setSelectedSize(
      product.sizes?.length
        ? product.sizes[0] ??
            null
        : null,
    );

    setSelectedColor(
      product.colors?.length
        ? product.colors[0] ??
            null
        : null,
    );

    setFavorite(
      isFavorite(product.id),
    );
  }, [product?.id]);

  useEffect(() => {
    const syncFavorite =
      () => {
        if (!product) {
          return;
        }

        setFavorite(
          isFavorite(
            product.id,
          ),
        );
      };

    window.addEventListener(
      "storage",
      syncFavorite,
    );

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

  const images = useMemo(
    () =>
      product?.images?.length
        ? product.images
        : ["/placeholder.svg"],
    [product?.images],
  );

  const stockLeft =
    Math.max(
      0,
      Number(
        product?.stock_left ??
          0,
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
    hasDiscount &&
    product
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
          (
            sum,
            review,
          ) =>
            sum +
            Number(
              review.rating ||
                0,
            ),
          0,
        ) / reviews.length
      : Number(
          product?.rating ??
            0,
        );

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
        product.sizes
          ?.length &&
        !selectedSize
      ) {
        toast.error(
          "يرجى اختيار المقاس أو الحجم.",
        );
        return false;
      }

      if (
        product.colors
          ?.length &&
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

  const handleAddToCart =
    useCallback(
      async () => {
        if (
          !validateSelection() ||
          !product
        ) {
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
            openDrawer: true,
          });

          toast.success(
            "تمت إضافة المنتج إلى السلة.",
          );
        } catch (error) {
          toast.error(
            error instanceof
              Error
              ? error.message
              : "تعذر إضافة المنتج إلى السلة.",
          );
        } finally {
          setAdding(false);
        }
      },
      [
        validateSelection,
        product,
        addItem,
        selectedSize,
        selectedColor,
      ],
    );

  const handleBuyNow =
    useCallback(
      async () => {
        if (
          !validateSelection() ||
          !product
        ) {
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
            openDrawer: false,
          });

          await navigate({
            to: "/checkout",
          });
        } catch (error) {
          toast.error(
            error instanceof
              Error
              ? error.message
              : "تعذر بدء عملية الشراء.",
          );

          setBuying(false);
        }
      },
      [
        validateSelection,
        product,
        addItem,
        selectedSize,
        selectedColor,
        navigate,
      ],
    );

  const handleToggleFavorite =
    useCallback(() => {
      if (!product) {
        return;
      }

      if (favorite) {
        removeFavorite(
          product.id,
        );

        setFavorite(false);

        toast.success(
          "تمت إزالة المنتج من المفضلة.",
        );

        return;
      }

      addFavorite(
        product.id,
      );

      setFavorite(true);

      toast.success(
        "تمت إضافة المنتج إلى المفضلة.",
      );
    }, [
      product,
      favorite,
    ]);

  const handleShare =
    useCallback(
      async () => {
        if (
          !product ||
          sharing
        ) {
          return;
        }

        const url =
          window.location.href;

        const shareData: ShareData =
          {
            title:
              product.name,
            text:
              `شاهد هذا المنتج في شهارة: ${product.name}`,
            url,
          };

        setSharing(true);

        try {
          if (
            typeof navigator.share ===
              "function"
          ) {
            await navigator.share(
              shareData,
            );

            return;
          }

          if (
            navigator.clipboard &&
            window.isSecureContext
          ) {
            await navigator.clipboard.writeText(
              url,
            );

            toast.success(
              "تم نسخ رابط المنتج.",
            );

            return;
          }

          const textArea =
            document.createElement(
              "textarea",
            );

          textArea.value =
            url;

          textArea.style.position =
            "fixed";

          textArea.style.opacity =
            "0";

          document.body.appendChild(
            textArea,
          );

          textArea.focus();
          textArea.select();

          const copied =
            document.execCommand(
              "copy",
            );

          document.body.removeChild(
            textArea,
          );

          if (copied) {
            toast.success(
              "تم نسخ رابط المنتج.",
            );
          } else {
            toast.error(
              "تعذر نسخ الرابط.",
            );
          }
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          toast.error(
            "تعذر مشاركة المنتج حالياً.",
          );
        } finally {
          setSharing(false);
        }
      },
      [
        product,
        sharing,
      ],
    );

  const goHome =
    useCallback(() => {
      void navigate({
        to: "/",
      });
    }, [navigate]);

  const previousImage =
    useCallback(() => {
      setActiveImageIndex(
        (current) =>
          current <= 0
            ? images.length - 1
            : current - 1,
      );
    }, [images.length]);

  const nextImage =
    useCallback(() => {
      setActiveImageIndex(
        (current) =>
          current >=
          images.length - 1
            ? 0
            : current + 1,
      );
    }, [images.length]);

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

  const handleReviewSubmit =
    async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (!product) {
        return;
      }

      const comment =
        reviewComment.trim();

      if (!comment) {
        toast.error(
          "اكتب تعليقك أولاً.",
        );
        return;
      }

      if (comment.length < 3) {
        toast.error(
          "يرجى كتابة تعليق أوضح.",
        );
        return;
      }

      setSubmittingReview(
        true,
      );

      try {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          toast.error(
            "يجب تسجيل الدخول لإضافة تقييم.",
          );
          return;
        }

        const displayName =
          user.user_metadata
            ?.full_name ||
          user.user_metadata
            ?.name ||
          user.email?.split(
            "@",
          )[0] ||
          "عميل شهارة";

        const {
          error,
        } = await supabase
          .from(
            "product_reviews",
          )
          .insert({
            product_id:
              product.id,
            user_id:
              user.id,
            user_name:
              displayName,
            rating:
              reviewRating,
            comment,
          });

        if (error) {
          throw error;
        }

        setReviewComment(
          "",
        );

        setReviewRating(
          5,
        );

        toast.success(
          "تم إرسال تقييمك للمراجعة.",
        );

        await refetchReviews();
      } catch (error) {
        toast.error(
          error instanceof
            Error
            ? error.message
            : "تعذر إرسال التقييم.",
        );
      } finally {
        setSubmittingReview(
          false,
        );
      }
    };

  if (isLoading) {
    return (
      <div
        dir="rtl"
        className="
          min-h-screen
          bg-[#F6F2EE]
        "
      >
        <header
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
            backgroundColor:
              BRAND.dark,
          }}
        >
          <div className="
            mx-auto
            flex
            max-w-7xl
            items-center
            justify-between
          ">
            <div className="
              h-9
              w-24
              animate-pulse
              rounded-xl
              bg-white/10
            " />

            <div className="
              h-5
              w-36
              animate-pulse
              rounded
              bg-white/10
            " />

            <div className="
              h-9
              w-9
              animate-pulse
              rounded-full
              bg-white/10
            " />
          </div>
        </header>

        <main className="
          mx-auto
          max-w-7xl
          space-y-5
          px-4
          py-5
          pb-8
        ">
          <div className="
            aspect-square
            animate-pulse
            rounded-[28px]
            bg-white
            shadow-sm
            md:aspect-[4/3]
          " />

          <div className="
            space-y-4
            rounded-[24px]
            border
            border-[#0D3B4D]/10
            bg-white
            p-5
          ">
            <div className="
              h-5
              w-24
              animate-pulse
              rounded
              bg-slate-100
            " />

            <div className="
              h-8
              w-4/5
              animate-pulse
              rounded
              bg-slate-100
            " />

            <div className="
              h-9
              w-1/3
              animate-pulse
              rounded
              bg-slate-100
            " />
          </div>
        </main>
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
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-[#F6F2EE]
          px-5
        "
      >
        <div className="
          w-full
          max-w-md
          rounded-[28px]
          border
          border-[#0D3B4D]/10
          bg-white
          p-7
          text-center
          shadow-[0_25px_60px_-40px_rgba(13,59,77,0.8)]
        ">
          <div className="
            mx-auto
            grid
            h-20
            w-20
            place-items-center
            rounded-[24px]
            bg-[#0D3B4D]/[0.07]
            text-[#0D3B4D]
          ">
            <ShoppingBag className="h-9 w-9" />
          </div>

          <h1 className="
            mt-5
            text-xl
            font-black
            text-[#0A2A38]
          ">
            المنتج غير متوفر
          </h1>

          <p className="
            mt-2
            text-xs
            leading-6
            text-slate-400
          ">
            قد يكون المنتج قد أُزيل أو لم يعد متاحاً حالياً.
          </p>

          <button
            type="button"
            onClick={goHome}
            className="
              mt-6
              inline-flex
              h-11
              items-center
              gap-2
              rounded-2xl
              bg-[#0D3B4D]
              px-5
              text-xs
              font-black
              text-white
              transition
              active:scale-95
            "
          >
            <ArrowRight className="h-4 w-4" />
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
        pb-[105px]
        md:pb-10
      "
    >
      {/* الهيدر الخاص بالمنتج */}
      <header
        className="
          sticky
          top-0
          z-50
          border-b
          border-white/10
          shadow-[0_10px_35px_-30px_rgba(0,0,0,0.8)]
        "
        style={{
          background:
            "linear-gradient(135deg,#0D3B4D,#0A2A38)",
        }}
      >
        <div className="
          mx-auto
          flex
          h-[62px]
          max-w-7xl
          items-center
          justify-between
          gap-3
          px-4
        ">
          <button
            type="button"
            onClick={goHome}
            aria-label="العودة إلى الرئيسية"
            className="
              flex
              h-10
              items-center
              gap-2
              rounded-2xl
              bg-white/[0.08]
              px-3
              text-white
              transition
              hover:bg-white/[0.13]
              active:scale-95
            "
          >
            <ArrowRight className="h-4 w-4" />

            <span className="text-[10px] font-black">
              الرئيسية
            </span>
          </button>

          <div className="
            flex
            min-w-0
            items-center
            gap-2
          ">
            <ShoppingBag className="h-4 w-4 shrink-0 text-[#E2723A]" />

            <span className="
              truncate
              text-xs
              font-black
              text-white
            ">
              تفاصيل المنتج
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              void handleShare()
            }
            disabled={sharing}
            aria-label="مشاركة المنتج"
            className="
              grid
              h-10
              w-10
              shrink-0
              place-items-center
              rounded-2xl
              bg-white/[0.08]
              text-white
              transition
              hover:bg-white/[0.13]
              active:scale-95
              disabled:opacity-60
            "
          >
            {sharing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pt-4 md:pt-6">
        <div className="
          grid
          gap-5
          lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.95fr)]
          lg:items-start
        ">
          {/* الصور */}
          <section className="
            min-w-0
            overflow-hidden
            rounded-[28px]
            border
            border-[#0D3B4D]/10
            bg-white
            p-2.5
            shadow-[0_20px_60px_-42px_rgba(13,59,77,0.8)]
          ">
            <div
              className="
                relative
                aspect-square
                overflow-hidden
                rounded-[23px]
                bg-[#F6F2EE]
                md:aspect-[4/3]
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
                  ] ?? images[0]
                }
                alt={
                  product.name
                }
                className="
                  h-full
                  w-full
                  object-cover
                "
              />

              {hasDiscount ? (
                <span className="
                  absolute
                  start-4
                  top-4
                  rounded-xl
                  bg-[#E2723A]
                  px-3
                  py-2
                  text-[10px]
                  font-black
                  text-white
                  shadow-[0_12px_25px_-15px_rgba(226,114,58,1)]
                ">
                  خصم {discountPercent}%
                </span>
              ) : null}

              {product.badge ? (
                <span className="
                  absolute
                  end-4
                  top-4
                  rounded-xl
                  border
                  border-white/20
                  bg-[#0A2A38]/75
                  px-3
                  py-2
                  text-[10px]
                  font-black
                  text-white
                  backdrop-blur-md
                ">
                  {product.badge}
                </span>
              ) : null}

              <div className="
                absolute
                inset-x-4
                bottom-4
                flex
                items-center
                justify-between
                gap-2
              ">
                <button
                  type="button"
                  onClick={
                    previousImage
                  }
                  disabled={
                    images.length <= 1
                  }
                  aria-label="الصورة السابقة"
                  className="
                    grid
                    h-10
                    w-10
                    place-items-center
                    rounded-2xl
                    border
                    border-white/20
                    bg-[#0A2A38]/55
                    text-white
                    backdrop-blur-md
                    transition
                    active:scale-90
                    disabled:opacity-30
                  "
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="
                  flex
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  border-white/15
                  bg-[#0A2A38]/50
                  px-3
                  py-2
                  backdrop-blur-md
                ">
                  {images.map(
                    (_, index) => (
                      <button
                        key={
                          index
                        }
                        type="button"
                        aria-label={`الصورة ${index + 1}`}
                        onClick={() =>
                          setActiveImageIndex(
                            index,
                          )
                        }
                        className={`
                          h-1.5
                          rounded-full
                          transition-all
                          duration-300
                          ${
                            index ===
                            activeImageIndex
                              ? "w-6 bg-[#E2723A]"
                              : "w-1.5 bg-white/50"
                          }
                        `}
                      />
                    ),
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    nextImage
                  }
                  disabled={
                    images.length <= 1
                  }
                  aria-label="الصورة التالية"
                  className="
                    grid
                    h-10
                    w-10
                    place-items-center
                    rounded-2xl
                    border
                    border-white/20
                    bg-[#0A2A38]/55
                    text-white
                    backdrop-blur-md
                    transition
                    active:scale-90
                    disabled:opacity-30
                  "
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>
            </div>

            {images.length > 1 ? (
              <div className="
                mt-2.5
                flex
                gap-2
                overflow-x-auto
                pb-0.5
              ">
                {images.map(
                  (
                    image,
                    index,
                  ) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() =>
                        setActiveImageIndex(
                          index,
                        )
                      }
                      className={`
                        relative
                        h-16
                        w-16
                        shrink-0
                        overflow-hidden
                        rounded-xl
                        border-2
                        bg-[#F6F2EE]
                        transition
                        ${
                          activeImageIndex ===
                          index
                            ? "border-[#E2723A]"
                            : "border-transparent"
                        }
                      `}
                    >
                      <ProductImage
                        src={image}
                        alt=""
                        className="
                          h-full
                          w-full
                          object-cover
                        "
                      />
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </section>

          {/* المعلومات */}
          <section className="
            min-w-0
            rounded-[28px]
            border
            border-[#0D3B4D]/10
            bg-white
            p-5
            shadow-[0_20px_60px_-42px_rgba(13,59,77,0.8)]
            md:p-6
          ">
            <div className="
              flex
              items-start
              justify-between
              gap-3
            ">
              <div className="min-w-0">
                <p className="
                  text-[9px]
                  font-black
                  tracking-[0.15em]
                  text-[#E2723A]
                ">
                  SHEHARA
                </p>

                <h1 className="
                  mt-2
                  text-xl
                  font-black
                  leading-8
                  text-[#0A2A38]
                  md:text-2xl
                ">
                  {product.name}
                </h1>
              </div>

              <button
                type="button"
                onClick={
                  handleToggleFavorite
                }
                aria-label={
                  favorite
                    ? "إزالة من المفضلة"
                    : "إضافة إلى المفضلة"
                }
                aria-pressed={
                  favorite
                }
                className={`
                  grid
                  h-11
                  w-11
                  shrink-0
                  place-items-center
                  rounded-2xl
                  border
                  transition-all
                  duration-300
                  active:scale-90
                  ${
                    favorite
                      ? "border-[#E2723A]/20 bg-[#E2723A]/10 text-[#E2723A]"
                      : "border-[#0D3B4D]/10 bg-[#F6F2EE] text-[#0D3B4D]"
                  }
                `}
              >
                <Heart
                  className="h-5 w-5"
                  fill={
                    favorite
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            </div>

            {/* التقييم */}
            <div className="
              mt-4
              flex
              flex-wrap
              items-center
              gap-2
            ">
              <div className="
                flex
                items-center
                gap-1
                rounded-xl
                bg-[#E2723A]/[0.08]
                px-2.5
                py-1.5
              ">
                <Star
                  className="
                    h-3.5
                    w-3.5
                    fill-[#E2723A]
                    text-[#E2723A]
                  "
                />

                <span className="
                  text-[10px]
                  font-black
                  text-[#A84E27]
                ">
                  {averageRating
                    ? averageRating.toFixed(
                        1,
                      )
                    : "0.0"}
                </span>
              </div>

              <span className="
                text-[10px]
                font-medium
                text-slate-400
              ">
                {reviews.length > 0
                  ? `${reviews.length.toLocaleString("ar-EG")} تقييم`
                  : `${Number(product.reviews_count || 0).toLocaleString("ar-EG")} تقييم`}
              </span>

              {product.sales_count >
              0 ? (
                <span className="
                  rounded-xl
                  bg-[#0D3B4D]/[0.06]
                  px-2.5
                  py-1.5
                  text-[9px]
                  font-bold
                  text-[#0D3B4D]
                ">
                  {Number(
                    product.sales_count,
                  ).toLocaleString(
                    "ar-EG",
                  )}{" "}
                  مبيع
                </span>
              ) : null}
            </div>

            {/* السعر */}
            <div className="
              mt-5
              rounded-[22px]
              bg-[#F6F2EE]
              p-4
            ">
              <div className="
                flex
                flex-wrap
                items-end
                gap-3
              ">
                <span className="
                  text-2xl
                  font-black
                  text-[#E2723A]
                ">
                  {formatPrice(
                    product.price,
                  )}
                </span>

                {hasDiscount ? (
                  <span className="
                    pb-1
                    text-xs
                    font-bold
                    text-slate-400
                    line-through
                  ">
                    {formatPrice(
                      product.old_price!,
                    )}
                  </span>
                ) : null}
              </div>

              {hasDiscount ? (
                <div className="
                  mt-2
                  flex
                  items-center
                  gap-1.5
                ">
                  <Zap className="
                    h-3.5
                    w-3.5
                    text-[#E2723A]
                  " />

                  <span className="
                    text-[9px]
                    font-bold
                    text-slate-500
                  ">
                    وفر{" "}
                    {formatPrice(
                      product.old_price! -
                        product.price,
                    )}{" "}
                    على هذا المنتج
                  </span>
                </div>
              ) : null}
            </div>

            {/* المخزون */}
            <div className="
              mt-4
              flex
              items-center
              justify-between
              gap-3
            ">
              <div className="
                flex
                items-center
                gap-2
              ">
                <span
                  className={`
                    h-2
                    w-2
                    rounded-full
                    ${
                      isOutOfStock
                        ? "bg-red-500"
                        : isLowStock
                          ? "bg-[#E2723A]"
                          : "bg-emerald-500"
                    }
                  `}
                />

                <span className="
                  text-[10px]
                  font-bold
                  text-slate-500
                ">
                  {isOutOfStock
                    ? "غير متوفر حالياً"
                    : isLowStock
                      ? `متبقي ${stockLeft.toLocaleString("ar-EG")} فقط`
                      : "متوفر في المخزون"}
                </span>
              </div>

              {cartQuantity > 0 ? (
                <span className="
                  rounded-xl
                  bg-[#0D3B4D]/[0.06]
                  px-2.5
                  py-1.5
                  text-[9px]
                  font-black
                  text-[#0D3B4D]
                ">
                  في السلة:{" "}
                  {cartQuantity.toLocaleString(
                    "ar-EG",
                  )}
                </span>
              ) : null}
            </div>

            {/* المقاسات */}
            {product.sizes?.length >
            0 ? (
              <div className="mt-5">
                <div className="
                  mb-2.5
                  flex
                  items-center
                  justify-between
                ">
                  <h2 className="
                    text-xs
                    font-black
                    text-[#0A2A38]
                  ">
                    اختر المقاس
                  </h2>

                  <span className="
                    text-[9px]
                    font-medium
                    text-slate-400
                  ">
                    مطلوب
                  </span>
                </div>

                <div className="
                  flex
                  flex-wrap
                  gap-2
                ">
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
                          min-w-[48px]
                          rounded-xl
                          border
                          px-3
                          py-2.5
                          text-[10px]
                          font-black
                          transition
                          active:scale-95
                          ${
                            selectedSize ===
                            size
                              ? "border-[#E2723A] bg-[#E2723A] text-white shadow-[0_10px_25px_-15px_rgba(226,114,58,1)]"
                              : "border-[#0D3B4D]/10 bg-white text-[#0D3B4D] hover:border-[#E2723A]/30"
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
            {product.colors?.length >
            0 ? (
              <div className="mt-5">
                <div className="
                  mb-2.5
                  flex
                  items-center
                  justify-between
                ">
                  <h2 className="
                    text-xs
                    font-black
                    text-[#0A2A38]
                  ">
                    اختر اللون
                  </h2>

                  <span className="
                    text-[9px]
                    font-medium
                    text-slate-400
                  ">
                    مطلوب
                  </span>
                </div>

                <div className="
                  flex
                  flex-wrap
                  gap-2
                ">
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
                          rounded-xl
                          border
                          px-3
                          py-2.5
                          text-[10px]
                          font-black
                          transition
                          active:scale-95
                          ${
                            selectedColor ===
                            color
                              ? "border-[#0D3B4D] bg-[#0D3B4D] text-white"
                              : "border-[#0D3B4D]/10 bg-white text-[#0D3B4D] hover:border-[#E2723A]/30"
                          }
                        `}
                      >
                        {color}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            {/* إجراءات سطح المكتب */}
            <div className="
              mt-6
              hidden
              gap-2
              sm:grid
              sm:grid-cols-[1fr_1.15fr]
            ">
              <button
                type="button"
                onClick={() =>
                  void handleAddToCart()
                }
                disabled={
                  adding ||
                  buying ||
                  isOutOfStock
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
                  bg-white
                  text-xs
                  font-black
                  text-[#0D3B4D]
                  transition
                  hover:bg-[#0D3B4D]/[0.04]
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

                إضافة للسلة
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleBuyNow()
                }
                disabled={
                  adding ||
                  buying ||
                  isOutOfStock
                }
                className="
                  flex
                  min-h-12
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-[#E2723A]
                  text-xs
                  font-black
                  text-white
                  shadow-[0_15px_35px_-20px_rgba(226,114,58,1)]
                  transition
                  hover:brightness-105
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

            {/* ضمانات */}
            <div className="
              mt-5
              grid
              grid-cols-3
              gap-2
            ">
              {[
                {
                  icon: Check,
                  title:
                    "منتج موثوق",
                },
                {
                  icon: ShoppingBag,
                  title:
                    "طلب آمن",
                },
                {
                  icon: Zap,
                  title:
                    "توصيل سريع",
                },
              ].map(
                ({
                  icon: Icon,
                  title,
                }) => (
                  <div
                    key={title}
                    className="
                      rounded-2xl
                      bg-[#F6F2EE]
                      px-2
                      py-3
                      text-center
                    "
                  >
                    <Icon className="
                      mx-auto
                      h-4
                      w-4
                      text-[#E2723A]
                    " />

                    <p className="
                      mt-1.5
                      text-[8px]
                      font-black
                      text-[#0D3B4D]
                    ">
                      {title}
                    </p>
                  </div>
                ),
              )}
            </div>
          </section>
        </div>

        {/* الوصف */}
        <section className="
          mt-5
          rounded-[26px]
          border
          border-[#0D3B4D]/10
          bg-white
          p-5
          shadow-[0_20px_60px_-45px_rgba(13,59,77,0.7)]
        ">
          <div className="
            flex
            items-center
            gap-3
          ">
            <div className="
              grid
              h-10
              w-10
              place-items-center
              rounded-xl
              bg-[#0D3B4D]
              text-[#E2723A]
            ">
              <Sparkles className="h-4 w-4" />
            </div>

            <div>
              <h2 className="
                text-sm
                font-black
                text-[#0A2A38]
              ">
                عن المنتج
              </h2>

              <p className="
                mt-0.5
                text-[9px]
                text-slate-400
              ">
                التفاصيل والمعلومات
              </p>
            </div>
          </div>

          <p className="
            mt-4
            whitespace-pre-line
            text-xs
            leading-7
            text-slate-500
          ">
            {product.description ||
              "لا توجد تفاصيل إضافية عن هذا المنتج حالياً."}
          </p>
        </section>

        {/* التقييمات */}
        <section className="
          mt-5
          rounded-[26px]
          border
          border-[#0D3B4D]/10
          bg-white
          p-5
        ">
          <div className="
            flex
            items-center
            justify-between
            gap-3
          ">
            <div>
              <h2 className="
                text-base
                font-black
                text-[#0A2A38]
              ">
                تقييمات العملاء
              </h2>

              <p className="
                mt-1
                text-[9px]
                text-slate-400
              ">
                تجارب العملاء مع هذا المنتج
              </p>
            </div>

            <div className="
              flex
              items-center
              gap-1.5
              rounded-xl
              bg-[#E2723A]/[0.08]
              px-3
              py-2
            ">
              <Star className="
                h-4
                w-4
                fill-[#E2723A]
                text-[#E2723A]
              " />

              <span className="
                text-xs
                font-black
                text-[#A84E27]
              ">
                {averageRating
                  ? averageRating.toFixed(
                      1,
                    )
                  : "0.0"}
              </span>
            </div>
          </div>

          {reviewsLoading ? (
            <div className="
              mt-4
              flex
              items-center
              justify-center
              py-8
            ">
              <Loader2 className="
                h-5
                w-5
                animate-spin
                text-[#E2723A]
              " />
            </div>
          ) : reviews.length > 0 ? (
            <div className="
              mt-4
              space-y-3
            ">
              {reviews.map(
                (review) => (
                  <ProductReviewRowView
                    key={
                      review.id
                    }
                    review={
                      review
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <div className="
              mt-4
              rounded-2xl
              bg-[#F6F2EE]
              px-4
              py-6
              text-center
            ">
              <p className="
                text-xs
                font-bold
                text-slate-500
              ">
                لا توجد تقييمات منشورة لهذا المنتج بعد.
              </p>
            </div>
          )}

          {/* إضافة تقييم */}
          <form
            onSubmit={
              handleReviewSubmit
            }
            className="
              mt-5
              rounded-[22px]
              bg-[#F6F2EE]
              p-4
            "
          >
            <h3 className="
              text-xs
              font-black
              text-[#0A2A38]
            ">
              شاركنا رأيك
            </h3>

            <div className="
              mt-3
              flex
              items-center
              gap-1
            ">
              {Array.from({
                length: 5,
              }).map((_, index) => {
                const rating =
                  index + 1;

                return (
                  <button
                    key={
                      rating
                    }
                    type="button"
                    aria-label={`${rating} نجوم`}
                    onClick={() =>
                      setReviewRating(
                        rating,
                      )
                    }
                    className="
                      grid
                      h-9
                      w-9
                      place-items-center
                      rounded-xl
                      transition
                      active:scale-90
                    "
                  >
                    <Star
                      className={`
                        h-5
                        w-5
                        ${
                          rating <=
                          reviewRating
                            ? "fill-[#E2723A] text-[#E2723A]"
                            : "text-slate-300"
                        }
                      `}
                    />
                  </button>
                );
              })}
            </div>

            <textarea
              value={
                reviewComment
              }
              onChange={(
                event,
              ) =>
                setReviewComment(
                  event.target.value,
                )
              }
              rows={4}
              maxLength={1000}
              placeholder="اكتب تجربتك مع المنتج..."
              className="
                mt-2
                w-full
                resize-none
                rounded-2xl
                border
                border-[#0D3B4D]/10
                bg-white
                px-3
                py-3
                text-xs
                leading-6
                text-[#0A2A38]
                outline-none
                transition
                focus:border-[#E2723A]/40
                focus:ring-2
                focus:ring-[#E2723A]/10
              "
            />

            <button
              type="submit"
              disabled={
                submittingReview
              }
              className="
                mt-3
                flex
                h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-[#0D3B4D]
                text-xs
                font-black
                text-white
                transition
                hover:bg-[#0A2A38]
                active:scale-[0.99]
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

        {/* المنتجات المشابهة */}
        {!similarLoading &&
        similarProducts.length >
          0 ? (
          <section className="mt-6">
            <div className="
              mb-3
              flex
              items-end
              justify-between
              gap-3
            ">
              <div>
                <p className="
                  text-[9px]
                  font-black
                  tracking-[0.15em]
                  text-[#E2723A]
                ">
                  YOU MAY LIKE
                </p>

                <h2 className="
                  mt-1
                  text-lg
                  font-black
                  text-[#0A2A38]
                ">
                  منتجات مشابهة
                </h2>
              </div>

              <Link
                to="/products"
                className="
                  flex
                  items-center
                  gap-1
                  text-[10px]
                  font-black
                  text-[#0D3B4D]
                "
              >
                الأقسام
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="
              grid
              grid-cols-2
              gap-3
              sm:grid-cols-3
              lg:grid-cols-6
            ">
              {similarProducts.map(
                (item) => (
                  <ProductCard
                    key={
                      item.id
                    }
                    product={
                      item
                    }
                  />
                ),
              )}
            </div>
          </section>
        ) : null}
      </main>

      {/* شريط إجراءات المنتج - بديل BottomNav */}
      <div
        dir="rtl"
        className="
          fixed
          inset-x-0
          bottom-0
          z-[95]
          border-t
          border-[#0D3B4D]/10
          bg-white/95
          p-2.5
          pb-[max(10px,env(safe-area-inset-bottom))]
          shadow-[0_-20px_50px_-35px_rgba(13,59,77,0.8)]
          backdrop-blur-2xl
        "
      >
        <div className="
          mx-auto
          grid
          max-w-7xl
          grid-cols-[44px_44px_minmax(0,1fr)_minmax(0,1fr)]
          gap-2
        ">
          {/* الرئيسية */}
          <button
            type="button"
            onClick={goHome}
            aria-label="الرئيسية"
            className="
              grid
              h-12
              place-items-center
              rounded-2xl
              border
              border-[#0D3B4D]/10
              bg-[#F6F2EE]
              text-[#0D3B4D]
              transition
              active:scale-95
            "
          >
            <ArrowRight className="h-5 w-5" />
          </button>

          {/* المفضلة */}
          <button
            type="button"
            onClick={
              handleToggleFavorite
            }
            aria-label={
              favorite
                ? "إزالة من المفضلة"
                : "إضافة إلى المفضلة"
            }
            aria-pressed={
              favorite
            }
            className={`
              relative
              grid
              h-12
              place-items-center
              rounded-2xl
              border
              transition
              active:scale-95
              ${
                favorite
                  ? "border-[#E2723A]/20 bg-[#E2723A]/10 text-[#E2723A]"
                  : "border-[#0D3B4D]/10 bg-[#F6F2EE] text-[#0D3B4D]"
              }
            `}
          >
            <Heart
              className="h-5 w-5"
              fill={
                favorite
                  ? "currentColor"
                  : "none"
              }
            />

            {favorite ? (
              <span className="
                absolute
                -end-1
                -top-1
                grid
                h-4
                w-4
                place-items-center
                rounded-full
                bg-[#E2723A]
                text-white
              ">
                <Check className="h-2.5 w-2.5" />
              </span>
            ) : null}
          </button>

          {/* السلة */}
          <button
            type="button"
            onClick={() =>
              void handleAddToCart()
            }
            disabled={
              adding ||
              buying ||
              isOutOfStock
            }
            className="
              flex
              h-12
              min-w-0
              items-center
              justify-center
              gap-2
              rounded-2xl
              border
              border-[#0D3B4D]/15
              bg-white
              px-2
              text-[10px]
              font-black
              text-[#0D3B4D]
              transition
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:px-4
            "
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4 shrink-0" />
            )}

            <span className="truncate">
              إضافة للسلة
            </span>
          </button>

          {/* شراء */}
          <button
            type="button"
            onClick={() =>
              void handleBuyNow()
            }
            disabled={
              adding ||
              buying ||
              isOutOfStock
            }
            className="
              flex
              h-12
              min-w-0
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-[#E2723A]
              px-2
              text-[10px]
              font-black
              text-white
              shadow-[0_15px_35px_-20px_rgba(226,114,58,1)]
              transition
              hover:brightness-105
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:px-4
            "
          >
            {buying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingBag className="h-4 w-4 shrink-0" />
            )}

            <span className="truncate">
              شراء الآن
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
