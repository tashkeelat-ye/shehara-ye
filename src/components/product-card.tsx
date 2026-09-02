import {
  memo,
  useCallback,
  type MouseEvent,
} from "react";

import { Link } from "@tanstack/react-router";

import {
  Check,
  Heart,
  Plus,
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

    const formatPrice =
      useFormatPrice();

    const stockLeft = Math.max(
      0,
      Number(product.stock_left) || 0,
    );

    const threshold = Math.max(
      1,
      Number(
        product.low_stock_threshold,
      ) || 5,
    );

    const outOfStock =
      stockLeft <= 0;

    const lowStock =
      !outOfStock &&
      stockLeft <= threshold;

    const cartQuantity =
      getItemQuantity(product.id);

    const rating =
      Number(product.rating) || 0;

    const reviews =
      Number(
        product.reviews_count,
      ) || 0;

    const hasRating =
      rating > 0 && reviews > 0;

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
            ((oldPrice -
              currentPrice) /
              oldPrice) *
              100,
          )
        : 0;

    const quickAdd =
      useCallback(
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
                    setDrawerOpen(
                      true,
                    ),
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

    const openCart =
      useCallback(
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
          group
          relative
          flex
          min-w-0
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-[#0E4D64]/8
          bg-white
          shadow-[0_8px_25px_-20px_rgba(14,77,100,0.55)]
          transition-all
          duration-200
          hover:-translate-y-0.5
          hover:border-[#0E4D64]/18
          hover:shadow-[0_18px_35px_-25px_rgba(14,77,100,0.65)]
          active:scale-[0.985]
          dark:bg-card
        "
      >
        <Link
          to="/product/$id"
          params={{
            id: product.id,
          }}
          aria-label={`عرض ${product.name}`}
          className="
            relative
            block
            overflow-hidden
            outline-none
            focus-visible:ring-2
            focus-visible:ring-inset
            focus-visible:ring-[#D65A31]
          "
        >
          <div
            className="
              relative
              aspect-square
              overflow-hidden
              bg-[#F4F7F8]
              dark:bg-[#103847]
            "
          >
            <ProductImage
              src={
                product.images[0]
              }
              alt={product.name}
              className="
                h-full
                w-full
                transition-transform
                duration-500
                group-hover:scale-[1.035]
              "
            />

            {discount > 0 ? (
              <span
                className="
                  absolute
                  start-2
                  top-2
                  rounded-full
                  bg-[#D65A31]
                  px-2
                  py-1
                  text-[9px]
                  font-extrabold
                  leading-none
                  text-white
                  shadow-sm
                "
              >
                -{discount}%
              </span>
            ) : null}

            {product.badge ? (
              <span
                className="
                  absolute
                  end-2
                  top-2
                  max-w-[62%]
                  truncate
                  rounded-full
                  border
                  border-white/70
                  bg-white/95
                  px-2
                  py-1
                  text-[9px]
                  font-bold
                  text-[#0E4D64]
                  shadow-sm
                  backdrop-blur-sm
                "
              >
                {product.badge}
              </span>
            ) : null}

            {outOfStock ? (
              <div
                className="
                  absolute
                  inset-0
                  flex
                  items-center
                  justify-center
                  bg-white/65
                  backdrop-blur-[2px]
                "
              >
                <span
                  className="
                    rounded-full
                    bg-[#0E4D64]
                    px-3
                    py-1.5
                    text-[10px]
                    font-bold
                    text-white
                  "
                >
                  نفد المخزون
                </span>
              </div>
            ) : null}
          </div>
        </Link>

        <div
          className="
            flex
            min-h-[150px]
            flex-1
            flex-col
            p-3
          "
        >
          <Link
            to="/product/$id"
            params={{
              id: product.id,
            }}
          >
            <h3
              className="
                line-clamp-2
                min-h-[2.7rem]
                text-[12.5px]
                font-bold
                leading-[1.5]
                text-foreground
                transition-colors
                group-hover:text-[#0E4D64]
              "
            >
              {product.name}
            </h3>
          </Link>

          {hasRating ? (
            <div
              className="
                mt-2
                flex
                items-center
                gap-1
                text-[10px]
                text-muted-foreground
              "
            >
              <Star
                className="
                  h-3.5
                  w-3.5
                  fill-[#D65A31]
                  text-[#D65A31]
                "
                aria-hidden="true"
              />

              <span
                className="
                  font-bold
                  text-foreground
                "
              >
                {rating.toLocaleString(
                  "ar-EG",
                  {
                    maximumFractionDigits: 1,
                  },
                )}
              </span>

              <span>
                (
                {reviews.toLocaleString(
                  "ar-EG",
                )}
                )
              </span>
            </div>
          ) : (
            <div className="mt-2 h-4" />
          )}

          <div className="mt-1 min-h-4">
            {lowStock ? (
              <p
                className="
                  text-[9px]
                  font-bold
                  text-[#D65A31]
                "
              >
                متبقي{" "}
                {stockLeft.toLocaleString(
                  "ar-EG",
                )}{" "}
                فقط
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
            <div className="min-w-0">
              <p
                className="
                  truncate
                  text-[14px]
                  font-extrabold
                  leading-tight
                  text-[#0E4D64]
                  sm:text-[15px]
                "
              >
                {formatPrice(
                  currentPrice,
                )}
              </p>

              {hasDiscount ? (
                <p
                  className="
                    mt-1
                    truncate
                    text-[9px]
                    text-muted-foreground
                    line-through
                  "
                >
                  {formatPrice(
                    oldPrice,
                  )}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={outOfStock}
              aria-label={
                outOfStock
                  ? `${product.name} غير متوفر`
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
                bg-[#D65A31]
                text-white
                shadow-sm
                transition-all
                duration-150
                hover:bg-[#B74624]
                active:scale-90
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {cartQuantity > 0 ? (
                <>
                  <Check
                    className="h-4 w-4"
                    strokeWidth={2.7}
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
                      bg-[#0E4D64]
                      px-1
                      text-[8px]
                      font-extrabold
                      text-white
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
                  strokeWidth={2.6}
                />
              )}
            </button>
          </div>
        </div>

        {cartQuantity > 0 &&
        !outOfStock ? (
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
              rounded-xl
              bg-[#0E4D64]/6
              px-2
              py-1.5
              text-[9px]
              font-bold
              text-[#0E4D64]
              transition-colors
              hover:bg-[#0E4D64]/10
            "
          >
            <Heart
              className="me-1 h-3 w-3"
              fill="currentColor"
            />
            في السلة ·{" "}
            {cartQuantity.toLocaleString(
              "ar-EG",
            )}
          </button>
        ) : null}
      </article>
    );
  },
);

ProductCard.displayName =
  "ProductCard";

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-square w-full animate-pulse bg-muted" />

      <div className="space-y-2 p-2.5">
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-7 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
