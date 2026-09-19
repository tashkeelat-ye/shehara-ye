import {
  memo,
  useCallback,
  type MouseEvent,
} from "react";

import { Link } from "@tanstack/react-router";

import {
  Check,
  ChevronLeft,
  Plus,
  ShoppingBag,
  Star,
} from "lucide-react";

import { toast } from "sonner";

import { type Product } from "@/lib/db";
import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "./product-image";

type ProductCardProps = {
  product: Product;
};

export const ProductCard = memo(
  function ProductCard({
    product,
  }: ProductCardProps) {
    const {
      addItem,
      setDrawerOpen,
      getItemQuantity,
    } = useCart();

    const formatPrice = useFormatPrice();

    const stockLeft = Math.max(
      0,
      Number(product.stock_left) || 0,
    );

    const threshold = Math.max(
      1,
      Number(product.low_stock_threshold) || 5,
    );

    const outOfStock = stockLeft <= 0;

    const lowStock =
      !outOfStock &&
      stockLeft <= threshold;

    const cartQuantity =
      getItemQuantity(product.id);

    const rating =
      Number(product.rating) || 0;

    const reviews =
      Number(product.reviews_count) || 0;

    const hasRating =
      rating > 0 &&
      reviews > 0;

    const currentPrice =
      Number(product.price) || 0;

    const oldPrice =
      product.old_price !== null
        ? Number(product.old_price)
        : 0;

    const hasDiscount =
      oldPrice > currentPrice &&
      currentPrice > 0;

    const discount =
      hasDiscount
        ? Math.round(
            ((oldPrice - currentPrice) /
              oldPrice) *
              100,
          )
        : 0;

    const quickAdd = useCallback(
      async (
        event: MouseEvent<HTMLButtonElement>,
      ) => {
        event.preventDefault();
        event.stopPropagation();

        if (outOfStock) {
          toast.error(
            "عذراً، هذا المنتج نفد من المخزون.",
          );
          return;
        }

        try {
          await addItem({
            productId: product.id,
            quantity: 1,
          });

          toast.success(
            cartQuantity > 0
              ? "تمت إضافة قطعة أخرى إلى السلة"
              : "تمت إضافة المنتج إلى السلة",
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
              : "تعذر إضافة المنتج إلى السلة",
          );
        }
      },
      [
        addItem,
        cartQuantity,
        outOfStock,
        product.id,
        setDrawerOpen,
      ],
    );

    const openCart = useCallback(
      (
        event: MouseEvent<HTMLButtonElement>,
      ) => {
        event.preventDefault();
        event.stopPropagation();
        setDrawerOpen(true);
      },
      [setDrawerOpen],
    );

    return (
      <article
        className="
          group relative flex min-w-0 flex-col
          overflow-hidden rounded-[1.5rem]
          border border-[#0E4D64]/[0.08]
          bg-white
          shadow-[0_10px_35px_-25px_rgba(14,77,100,0.55)]
          transition-all duration-300
          hover:-translate-y-1
          hover:border-[#D65A31]/25
          hover:shadow-[0_22px_48px_-28px_rgba(14,77,100,0.72)]
          dark:border-white/[0.07]
          dark:bg-[#0A2A38]
        "
      >
        {/* صورة المنتج */}
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          aria-label={`عرض ${product.name}`}
          className="
            relative block overflow-hidden
            outline-none focus-visible:ring-2
            focus-visible:ring-inset
            focus-visible:ring-[#D65A31]
          "
        >
          <div
            className="
              relative aspect-[0.94]
              overflow-hidden
              bg-[#F5F7F7]
              dark:bg-[#103847]
            "
          >
            <ProductImage
              src={product.images[0]}
              alt={product.name}
              className="
                h-full w-full object-cover
                transition-transform duration-700
                ease-out
                group-hover:scale-[1.045]
              "
            />

            {/* تدرج سفلي يحافظ على وضوح المعلومات فوق الصورة */}
            <div
              aria-hidden="true"
              className="
                pointer-events-none absolute inset-x-0 bottom-0
                h-24 bg-gradient-to-t
                from-[#082B39]/20 to-transparent
              "
            />

            {/* الخصم */}
            {discount > 0 ? (
              <span
                className="
                  absolute start-2.5 top-2.5
                  inline-flex items-center gap-1
                  rounded-full
                  bg-[#D65A31] px-2.5 py-1.5
                  text-[9px] font-black leading-none
                  text-white
                  shadow-[0_7px_18px_-9px_rgba(214,90,49,0.95)]
                "
              >
                <span>خصم</span>
                <span>{discount}%</span>
              </span>
            ) : null}

            {/* شارة المنتج */}
            {product.badge ? (
              <span
                className="
                  absolute end-2.5 top-2.5
                  max-w-[55%] truncate
                  rounded-full
                  border border-white/80
                  bg-white/92 px-2.5 py-1.5
                  text-[9px] font-extrabold
                  text-[#0E4D64]
                  shadow-sm backdrop-blur-md
                  dark:border-white/10
                  dark:bg-[#0A2A38]/90
                  dark:text-white
                "
              >
                {product.badge}
              </span>
            ) : null}

            {/* مؤشر المخزون المنخفض */}
            {lowStock ? (
              <span
                className="
                  absolute bottom-2.5 start-2.5
                  inline-flex items-center gap-1
                  rounded-full
                  border border-white/70
                  bg-white/90 px-2.5 py-1.5
                  text-[8px] font-black
                  text-[#D65A31]
                  shadow-sm backdrop-blur-md
                "
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#D65A31]" />
                متبقي {stockLeft.toLocaleString("ar-EG")}
              </span>
            ) : null}

            {/* نفاد المخزون */}
            {outOfStock ? (
              <div
                className="
                  absolute inset-0 grid place-items-center
                  bg-[#0E4D64]/45 backdrop-blur-[2px]
                "
              >
                <span
                  className="
                    rounded-full
                    border border-white/20
                    bg-[#0E4D64]/95
                    px-4 py-2
                    text-[10px] font-black text-white
                    shadow-xl
                  "
                >
                  نفد المخزون
                </span>
              </div>
            ) : null}
          </div>
        </Link>

        {/* تفاصيل المنتج */}
        <div
          className="
            flex flex-1 flex-col
            px-3 py-3.5
            sm:px-3.5
          "
        >
          <Link
            to="/product/$id"
            params={{ id: product.id }}
            className="
              min-w-0 outline-none
              focus-visible:rounded-lg
              focus-visible:ring-2
              focus-visible:ring-[#D65A31]
            "
          >
            <h3
              className="
                line-clamp-2
                min-h-[2.8rem]
                text-[12px] font-black
                leading-[1.55]
                tracking-[-0.01em]
                text-[#17333D]
                transition-colors
                group-hover:text-[#0E4D64]
                dark:text-white
              "
            >
              {product.name}
            </h3>
          </Link>

          {/* التقييم */}
          <div className="mt-2.5 min-h-[18px]">
            {hasRating ? (
              <div
                className="
                  inline-flex items-center gap-1.5
                  rounded-full
                  bg-[#F8F5F1]
                  px-2 py-1
                  text-[9px]
                  dark:bg-white/[0.045]
                "
              >
                <Star
                  className="h-3.5 w-3.5 fill-[#D65A31] text-[#D65A31]"
                  aria-hidden="true"
                />

                <span className="font-black text-[#0E4D64] dark:text-white">
                  {rating.toLocaleString(
                    "ar-EG",
                    { maximumFractionDigits: 1 },
                  )}
                </span>

                <span className="text-muted-foreground">
                  {reviews.toLocaleString("ar-EG")} تقييم
                </span>
              </div>
            ) : (
              <div className="h-[18px]" />
            )}
          </div>

          {/* السعر */}
          <div
            className="
              mt-2.5 flex items-end
              justify-between gap-2
            "
          >
            <div className="min-w-0">
              <p
                className="
                  truncate text-[15px]
                  font-black leading-none
                  text-[#0E4D64]
                  dark:text-[#E2723A]
                  sm:text-[16px]
                "
              >
                {formatPrice(currentPrice)}
              </p>

              {hasDiscount ? (
                <p
                  className="
                    mt-1.5 truncate
                    text-[9px] font-medium
                    text-muted-foreground
                    line-through
                  "
                >
                  {formatPrice(oldPrice)}
                </p>
              ) : null}
            </div>

            {hasDiscount ? (
              <span
                className="
                  shrink-0 rounded-lg
                  bg-[#D65A31]/[0.08]
                  px-2 py-1
                  text-[8px] font-black
                  text-[#D65A31]
                "
              >
                وفر {formatPrice(oldPrice - currentPrice)}
              </span>
            ) : null}
          </div>

          {/* زر الإضافة إلى السلة */}
          <button
            type="button"
            disabled={outOfStock}
            aria-label={
              outOfStock
                ? `${product.name} غير متوفر`
                : cartQuantity > 0
                  ? `إضافة قطعة أخرى من ${product.name}`
                  : `إضافة ${product.name} إلى السلة`
            }
            onClick={quickAdd}
            className="
              mt-3 flex min-h-11 w-full
              items-center justify-center gap-2
              rounded-xl
              bg-[#0E4D64]
              px-3 py-2
              text-[10px] font-black
              text-white
              shadow-[0_9px_22px_-13px_rgba(14,77,100,0.9)]
              transition-all duration-200
              hover:bg-[#0A3D50]
              hover:shadow-[0_13px_26px_-13px_rgba(14,77,100,0.95)]
              active:scale-[0.97]
              disabled:cursor-not-allowed
              disabled:bg-[#94A4A9]
              disabled:shadow-none
              dark:bg-[#D65A31]
              dark:hover:bg-[#C94F29]
            "
          >
            {cartQuantity > 0 ? (
              <>
                <span
                  className="
                    grid h-6 w-6 place-items-center
                    rounded-full bg-white/15
                  "
                >
                  <Check
                    className="h-3.5 w-3.5"
                    strokeWidth={3}
                  />
                </span>

                <span>
                  في السلة · {cartQuantity.toLocaleString("ar-EG")}
                </span>

                <Plus
                  className="ms-auto h-3.5 w-3.5 opacity-80"
                  strokeWidth={2.8}
                />
              </>
            ) : (
              <>
                <ShoppingBag
                  className="h-4 w-4"
                  strokeWidth={2.3}
                />

                <span>أضف إلى السلة</span>

                <Plus
                  className="ms-auto h-3.5 w-3.5 opacity-80"
                  strokeWidth={2.8}
                />
              </>
            )}
          </button>

          {/* فتح السلة عند وجود المنتج فيها */}
          {cartQuantity > 0 && !outOfStock ? (
            <button
              type="button"
              onClick={openCart}
              className="
                mt-2 inline-flex items-center
                justify-center gap-1
                py-1 text-[9px] font-bold
                text-muted-foreground
                transition-colors
                hover:text-[#0E4D64]
                dark:hover:text-[#D65A31]
              "
            >
              عرض السلة
              <ChevronLeft className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </article>
    );
  },
);

ProductCard.displayName = "ProductCard";

export function ProductCardSkeleton() {
  return (
    <div
      className="
        overflow-hidden rounded-[1.5rem]
        border border-border bg-card
      "
    >
      <div
        className="
          aspect-[0.94] w-full
          animate-pulse bg-muted
        "
      />

      <div className="space-y-3 p-3.5">
        <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
        </div>

        <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
