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
        overflow-hidden
        rounded-[20px]
        border
        border-[color:var(--brand-gold)]/12
        bg-card
        shadow-card
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:border-[color:var(--brand-gold)]/35
        hover:shadow-[0_14px_35px_-24px_color-mix(in_srgb,var(--brand-burgundy)_65%,transparent)]
        active:scale-[0.985]
        dark:border-[color:var(--brand-gold)]/10
      "
    >
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
          focus-visible:ring-[color:var(--brand-gold)]
        "
      >
        <div
          className="
            relative
            aspect-square
            overflow-hidden
            bg-[color:var(--brand-paper)]
            dark:bg-secondary
          "
        >
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            className="
              h-full
              w-full
              transition-transform
              duration-500
              group-hover:scale-[1.025]
            "
          />

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              inset-0
              bg-gradient-to-t
              from-[color:var(--brand-burgundy)]/[0.08]
              via-transparent
              to-transparent
              opacity-0
              transition-opacity
              duration-300
              group-hover:opacity-100
            "
          />

          {discountPercent > 0 ? (
            <span
              className="
                absolute
                start-2
                top-2
                rounded-full
                bg-[color:var(--brand-burgundy)]
                px-2
                py-1
                text-[9px]
                font-extrabold
                leading-none
                text-[color:var(--brand-gold-soft)]
                shadow-sm
              "
            >
              -{discountPercent}%
            </span>
          ) : null}

          {product.badge ? (
            <span
              className="
                absolute
                end-2
                top-2
                max-w-[58%]
                truncate
                rounded-full
                border
                border-[color:var(--brand-gold)]/20
                bg-card/95
                px-2
                py-1
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

          {isOutOfStock ? (
            <div
              className="
                absolute
                inset-0
                flex
                items-center
                justify-center
                bg-background/65
                backdrop-blur-[1px]
              "
              aria-hidden="true"
            >
              <span
                className="
                  rounded-full
                  bg-destructive
                  px-3
                  py-1.5
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

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              bottom-2
              start-2
              h-2
              w-2
              rotate-45
              border
              border-[color:var(--brand-gold)]/30
              opacity-0
              transition-opacity
              duration-300
              group-hover:opacity-100
            "
          />
        </div>
      </Link>

      <div
        className="
          flex
          min-h-[132px]
          flex-1
          flex-col
          px-3
          pb-2.5
          pt-2.5
        "
      >
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          aria-label={`عرض ${product.name}`}
          className="
            rounded-md
            outline-none
            focus-visible:ring-2
            focus-visible:ring-[color:var(--brand-gold)]/40
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
              group-hover:text-[color:var(--brand-burgundy)]
              dark:group-hover:text-[color:var(--brand-gold)]
            "
          >
            {product.name}
          </h3>
        </Link>

        {hasRating ? (
          <div
            className="
              mt-1.5
              flex
              min-h-4
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
                h-3
                w-3
                fill-[color:var(--brand-gold)]
                text-[color:var(--brand-gold-deep)]
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

        <div className="mt-1 min-h-4">
          {isLowStock ? (
            <p
              className="
                text-[9px]
                font-semibold
                text-amber-600
                dark:text-amber-400
              "
            >
              متبقي{" "}
              {stockLeft.toLocaleString(
                "ar-EG",
              )}{" "}
              فقط
            </p>
          ) : isOutOfStock ? (
            <p
              className="
                text-[9px]
                font-semibold
                text-destructive
              "
            >
              غير متوفر حالياً
            </p>
          ) : null}
        </div>

        <div
          className="
            mt-auto
            flex
            items-end
            justify-between
            gap-2
            pt-2
          "
        >
          <div className="min-w-0 flex-1">
            <p
              className="
                truncate
                text-[14px]
                font-extrabold
                leading-tight
                text-[color:var(--brand-burgundy)]
                dark:text-[color:var(--brand-gold)]
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
              grid
              h-10
              w-10
              shrink-0
              place-items-center
              rounded-xl
              bg-[color:var(--brand-burgundy)]
              text-[color:var(--brand-gold-soft)]
              shadow-sm
              outline-none
              transition-all
              duration-200
              hover:bg-[color:var(--brand-burgundy-soft)]
              hover:shadow-[0_8px_20px_-12px_color-mix(in_srgb,var(--brand-burgundy)_80%,transparent)]
              active:scale-90
              focus-visible:ring-2
              focus-visible:ring-[color:var(--brand-gold)]
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
                    bg-[color:var(--brand-gold)]
                    px-1
                    text-[8px]
                    font-extrabold
                    leading-none
                    text-[color:var(--brand-burgundy)]
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

      {cartQuantity > 0 &&
      !isOutOfStock ? (
        <button
          type="button"
          onClick={openCart}
          className="
            mx-3
            mb-3
            flex
            min-h-8
            items-center
            justify-center
            gap-1.5
            rounded-xl
            border
            border-[color:var(--brand-gold)]/20
            bg-[color:var(--brand-gold)]/[0.08]
            px-2
            py-1.5
            text-[9px]
            font-bold
            text-[color:var(--brand-burgundy)]
            outline-none
            transition-all
            hover:border-[color:var(--brand-gold)]/40
            hover:bg-[color:var(--brand-gold)]/[0.16]
            focus-visible:ring-2
            focus-visible:ring-[color:var(--brand-gold)]/40
            dark:text-[color:var(--brand-gold)]
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
        border
        border-[color:var(--brand-gold)]/10
        bg-card
        shadow-card
      "
      aria-hidden="true"
    >
      <div
        className="
          aspect-square
          w-full
          animate-pulse
          bg-muted
        "
      />

      <div
        className="
          flex
          min-h-[132px]
          flex-col
          p-3
        "
      >
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
        </div>

        <div
          className="
            mt-auto
            flex
            items-end
            justify-between
            gap-2
            pt-5
          "
        >
          <div className="space-y-1.5">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
          </div>

          <div
            className="
              h-10
              w-10
              animate-pulse
              rounded-xl
              bg-muted
            "
          />
        </div>
      </div>
    </div>
  );
}
