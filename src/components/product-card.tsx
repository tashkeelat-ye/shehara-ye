import { memo, useCallback, type MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Plus,
  ShoppingCart,
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

export const ProductCard = memo(function ProductCard({
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

  const lowStockThreshold = Math.max(
    1,
    Number(product.low_stock_threshold) || 5,
  );

  const isOutOfStock = stockLeft <= 0;

  const isLowStock =
    !isOutOfStock &&
    stockLeft <= lowStockThreshold;

  const cartQuantity = getItemQuantity(
    product.id,
  );

  const rating = Number(product.rating) || 0;
  const reviewsCount =
    Number(product.reviews_count) || 0;

  const hasRating =
    rating > 0 && reviewsCount > 0;

  const oldPrice =
    product.old_price !== null
      ? Number(product.old_price)
      : 0;

  const currentPrice =
    Number(product.price) || 0;

  const hasOldPrice =
    oldPrice > currentPrice &&
    currentPrice > 0;

  const discountPercent =
    hasOldPrice && oldPrice > 0
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

      if (isOutOfStock) {
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
        const message =
          error instanceof Error
            ? error.message
            : "تعذر إضافة المنتج إلى السلة";

        toast.error(message);
      }
    },
    [
      addItem,
      cartQuantity,
      isOutOfStock,
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
        overflow-hidden rounded-[20px]
        border border-border/60
        bg-card
        shadow-card
        transition-[transform,box-shadow,border-color]
        duration-200
        hover:border-primary/20
        hover:shadow-lg
        active:scale-[0.985]
      "
    >
      {/* =====================================================
          صورة المنتج
          ===================================================== */}
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        aria-label={`عرض ${product.name}`}
        className="
          relative block min-w-0
          overflow-hidden
          outline-none
          focus-visible:ring-2
          focus-visible:ring-inset
          focus-visible:ring-primary
        "
      >
        <div className="relative aspect-square overflow-hidden bg-secondary">
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full"
          />

          {/* طبقة خفيفة أسفل الصورة */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none absolute inset-x-0
              bottom-0 h-16
              bg-gradient-to-t
              from-black/10
              to-transparent
              opacity-0
              transition-opacity
              duration-300
              group-hover:opacity-100
            "
          />

          {/* شارة الخصم */}
          {discountPercent > 0 ? (
            <span
              className="
                absolute start-2 top-2
                rounded-full
                bg-destructive
                px-2 py-1
                text-[9px]
                font-extrabold
                leading-none
                text-destructive-foreground
                shadow-sm
              "
            >
              -{discountPercent}%
            </span>
          ) : null}

          {/* شارة المنتج */}
          {product.badge ? (
            <span
              className="
                absolute end-2 top-2
                max-w-[58%]
                truncate
                rounded-full
                bg-card/95
                px-2 py-1
                text-[9px]
                font-bold
                leading-none
                text-foreground
                shadow-sm
                backdrop-blur-sm
              "
            >
              {product.badge}
            </span>
          ) : null}

          {/* نفد المخزون */}
          {isOutOfStock ? (
            <div
              className="
                absolute inset-0
                flex items-center justify-center
                bg-background/65
                backdrop-blur-[1px]
              "
              aria-hidden="true"
            >
              <span
                className="
                  rounded-full
                  bg-destructive
                  px-3 py-1.5
                  text-[10px]
                  font-bold
                  text-destructive-foreground
                  shadow-lg
                "
              >
                نفد المخزون
              </span>
            </div>
          ) : null}
        </div>
      </Link>

      {/* =====================================================
          معلومات المنتج
          ===================================================== */}
      <div className="flex min-h-[128px] flex-1 flex-col px-3 pb-2.5 pt-2.5">
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          aria-label={`عرض ${product.name}`}
          className="
            rounded-md
            outline-none
            focus-visible:ring-2
            focus-visible:ring-primary/40
          "
        >
          <h3
            className="
              line-clamp-2
              min-h-[2.55rem]
              text-[12.5px]
              font-semibold
              leading-[1.45]
              text-foreground
              transition-colors
              group-hover:text-primary
            "
          >
            {product.name}
          </h3>
        </Link>

        {/* التقييم */}
        {hasRating ? (
          <div
            className="
              mt-1.5
              flex min-h-4
              items-center
              gap-1
              text-[9px]
              text-muted-foreground
            "
            aria-label={`التقييم ${rating.toLocaleString(
              "ar-EG",
            )} من 5`}
          >
            <Star
              className="
                h-3 w-3
                fill-accent-solid
                text-accent-solid
              "
              aria-hidden="true"
            />

            <span className="font-bold text-foreground">
              {rating.toLocaleString(
                "ar-EG",
                {
                  maximumFractionDigits: 1,
                },
              )}
            </span>

            <span>
              (
              {reviewsCount.toLocaleString(
                "ar-EG",
              )}
              )
            </span>
          </div>
        ) : (
          <div className="mt-1.5 min-h-4" />
        )}

        {/* حالة المخزون */}
        <div className="mt-1 min-h-4">
          {isLowStock ? (
            <p className="text-[9px] font-semibold text-amber-600 dark:text-amber-400">
              متبقي{" "}
              {stockLeft.toLocaleString(
                "ar-EG",
              )}{" "}
              فقط
            </p>
          ) : isOutOfStock ? (
            <p className="text-[9px] font-semibold text-destructive">
              غير متوفر حالياً
            </p>
          ) : null}
        </div>

        {/* =================================================
            السعر + الإضافة للسلة
            ================================================= */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0 flex-1">
            <p
              className="
                truncate
                text-[14px]
                font-extrabold
                leading-tight
                text-primary
                sm:text-[15px]
              "
              aria-label={`السعر ${formatPrice(
                currentPrice,
              )}`}
            >
              {formatPrice(currentPrice)}
            </p>

            {hasOldPrice ? (
              <p
                className="
                  mt-0.5
                  truncate
                  text-[9px]
                  leading-tight
                  text-muted-foreground
                  line-through
                "
                aria-label={`السعر السابق ${formatPrice(
                  oldPrice,
                )}`}
              >
                {formatPrice(oldPrice)}
              </p>
            ) : (
              <div className="h-3" />
            )}
          </div>

          {/* زر الإضافة */}
          <button
            type="button"
            disabled={isOutOfStock}
            aria-label={
              isOutOfStock
                ? `${product.name} غير متوفر`
                : cartQuantity > 0
                  ? `إضافة قطعة أخرى من ${product.name} إلى السلة`
                  : `إضافة ${product.name} إلى السلة`
            }
            onClick={quickAdd}
            className="
              relative
              grid h-10 w-10
              shrink-0
              place-items-center
              rounded-xl
              bg-primary
              text-primary-foreground
              shadow-sm
              outline-none
              transition-[transform,background-color,opacity]
              duration-150
              hover:bg-primary/90
              active:scale-90
              focus-visible:ring-2
              focus-visible:ring-primary
              focus-visible:ring-offset-2
              focus-visible:ring-offset-card
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {cartQuantity > 0 ? (
              <>
                <Check
                  className="h-4 w-4"
                  strokeWidth={2.6}
                  aria-hidden="true"
                />

                <span
                  className="
                    absolute
                    -end-1
                    -top-1
                    grid
                    min-h-4
                    min-w-4
                    place-items-center
                    rounded-full
                    border-2
                    border-card
                    bg-foreground
                    px-1
                    text-[8px]
                    font-extrabold
                    leading-none
                    text-background
                  "
                >
                  {cartQuantity > 99
                    ? "99+"
                    : cartQuantity.toLocaleString(
                        "ar-EG",
                      )}
                </span>
              </>
            ) : (
              <Plus
                className="h-4 w-4"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>

      {/* =====================================================
          حالة وجود المنتج في السلة
          ===================================================== */}
      {cartQuantity > 0 &&
      !isOutOfStock ? (
        <button
          type="button"
          onClick={openCart}
          className="
            mx-3 mb-3
            flex min-h-8
            items-center
            justify-center
            gap-1.5
            rounded-xl
            bg-brand-soft
            px-2
            py-1.5
            text-[9px]
            font-bold
            text-primary
            outline-none
            transition-colors
            hover:bg-primary
            hover:text-primary-foreground
            focus-visible:ring-2
            focus-visible:ring-primary/40
          "
          aria-label={`فتح السلة، ${cartQuantity.toLocaleString(
            "ar-EG",
          )} في السلة`}
        >
          <ShoppingCart
            className="h-3.5 w-3.5"
            strokeWidth={2}
            aria-hidden="true"
          />

          <span>
            {cartQuantity.toLocaleString(
              "ar-EG",
            )}{" "}
            في السلة
          </span>
        </button>
      ) : null}
    </article>
  );
});

ProductCard.displayName = "ProductCard";

export function ProductCardSkeleton() {
  return (
    <div
      className="
        overflow-hidden
        rounded-[20px]
        border border-border/60
        bg-card
        shadow-card
      "
      aria-hidden="true"
    >
      <div className="aspect-square w-full animate-pulse bg-muted" />

      <div className="flex min-h-[128px] flex-col p-3">
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-5">
          <div className="space-y-1.5">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
          </div>

          <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
