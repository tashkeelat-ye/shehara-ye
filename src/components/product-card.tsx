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
          group
          relative
          flex
          min-w-0
          flex-col
          overflow-hidden
          rounded-[1.25rem]
          border
          border-[#0D3B4D]/[0.08]
          bg-white
          shadow-[0_12px_35px_-27px_rgba(13,59,77,0.55)]
          transition-all
          duration-300
          hover:-translate-y-1
          hover:border-[#E2723A]/25
          hover:shadow-[0_22px_42px_-27px_rgba(13,59,77,0.7)]
          active:scale-[0.985]
          dark:border-white/[0.07]
          dark:bg-[#0A2A38]
        "
      >
        {/* صورة المنتج */}
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
            focus-visible:ring-[#E2723A]
          "
        >
          <div
            className="
              relative
              aspect-square
              overflow-hidden
              bg-[#F3F5F5]
              dark:bg-[#103847]
            "
          >
            <ProductImage
              src={product.images[0]}
              alt={product.name}
              className="
                h-full
                w-full
                transition-transform
                duration-700
                ease-out
                group-hover:scale-[1.06]
              "
            />

            {/* طبقة فخامة خفيفة */}
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                inset-0
                bg-gradient-to-t
                from-[#0D3B4D]/[0.12]
                via-transparent
                to-transparent
                opacity-0
                transition-opacity
                duration-300
                group-hover:opacity-100
              "
            />

            {/* الخصم */}
            {discount > 0 && (
              <span
                className="
                  absolute
                  start-2.5
                  top-2.5
                  rounded-full
                  bg-[#E2723A]
                  px-2.5
                  py-1.5
                  text-[9px]
                  font-extrabold
                  leading-none
                  text-white
                  shadow-[0_5px_15px_-8px_rgba(226,114,58,0.9)]
                "
              >
                خصم {discount}%
              </span>
            )}

            {/* Badge */}
            {product.badge && (
              <span
                className="
                  absolute
                  end-2.5
                  top-2.5
                  max-w-[58%]
                  truncate
                  rounded-full
                  border
                  border-white/80
                  bg-white/90
                  px-2.5
                  py-1.5
                  text-[9px]
                  font-bold
                  text-[#0D3B4D]
                  shadow-sm
                  backdrop-blur-md
                  dark:border-white/10
                  dark:bg-[#0D3B4D]/90
                  dark:text-white
                "
              >
                {product.badge}
              </span>
            )}

            {/* نفاد المخزون */}
            {outOfStock && (
              <div
                className="
                  absolute
                  inset-0
                  flex
                  items-center
                  justify-center
                  bg-[#0D3B4D]/45
                  backdrop-blur-[2px]
                "
              >
                <span
                  className="
                    rounded-full
                    border
                    border-white/20
                    bg-[#0D3B4D]/95
                    px-4
                    py-2
                    text-[10px]
                    font-extrabold
                    text-white
                    shadow-xl
                  "
                >
                  نفد المخزون
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* معلومات المنتج */}
        <div
          className="
            flex
            min-h-[158px]
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
            className="min-w-0"
          >
            <h3
              className="
                line-clamp-2
                min-h-[2.7rem]
                text-[12px]
                font-bold
                leading-[1.55]
                text-[#102F3A]
                transition-colors
                group-hover:text-[#0D3B4D]
                dark:text-white
              "
            >
              {product.name}
            </h3>
          </Link>

          {/* التقييم */}
          <div className="mt-2 min-h-4">
            {hasRating ? (
              <div
                className="
                  flex
                  items-center
                  gap-1
                  text-[9px]
                "
              >
                <Star
                  className="
                    h-3.5
                    w-3.5
                    fill-[#E2723A]
                    text-[#E2723A]
                  "
                  aria-hidden="true"
                />

                <span
                  className="
                    font-extrabold
                    text-[#0D3B4D]
                    dark:text-white
                  "
                >
                  {rating.toLocaleString(
                    "ar-EG",
                    {
                      maximumFractionDigits: 1,
                    },
                  )}
                </span>

                <span className="text-muted-foreground">
                  (
                  {reviews.toLocaleString(
                    "ar-EG",
                  )}
                  )
                </span>
              </div>
            ) : (
              <div className="h-4" />
            )}
          </div>

          {/* المخزون */}
          <div className="mt-1 min-h-4">
            {lowStock && (
              <p
                className="
                  flex
                  items-center
                  gap-1
                  text-[9px]
                  font-bold
                  text-[#E2723A]
                "
              >
                <span
                  className="
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-[#E2723A]
                  "
                />

                متبقي{" "}
                {stockLeft.toLocaleString(
                  "ar-EG",
                )}{" "}
                فقط
              </p>
            )}
          </div>

          {/* السعر والإضافة */}
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
                  text-[#0D3B4D]
                  dark:text-[#E2723A]
                  sm:text-[15px]
                "
              >
                {formatPrice(currentPrice)}
              </p>

              {hasDiscount && (
                <p
                  className="
                    mt-1
                    truncate
                    text-[9px]
                    font-medium
                    text-muted-foreground
                    line-through
                  "
                >
                  {formatPrice(oldPrice)}
                </p>
              )}
            </div>

            {/* زر السلة */}
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
                bg-[#E2723A]
                text-white
                shadow-[0_8px_18px_-10px_rgba(226,114,58,0.9)]
                transition-all
                duration-200
                hover:scale-105
                hover:bg-[#D35F2C]
                active:scale-90
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {cartQuantity > 0 ? (
                <>
                  <Check
                    className="h-4 w-4"
                    strokeWidth={2.8}
                  />

                  <span
                    className="
                      absolute
                      -end-1.5
                      -top-1.5
                      grid
                      min-h-5
                      min-w-5
                      place-items-center
                      rounded-full
                      border-2
                      border-white
                      bg-[#0D3B4D]
                      px-1
                      text-[8px]
                      font-extrabold
                      text-white
                      dark:border-[#0A2A38]
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
                  strokeWidth={2.7}
                />
              )}
            </button>
          </div>
        </div>

        {/* حالة المنتج في السلة */}
        {cartQuantity > 0 &&
          !outOfStock && (
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
                gap-1
                rounded-xl
                border
                border-[#0D3B4D]/[0.07]
                bg-[#0D3B4D]/[0.045]
                px-2
                py-1.5
                text-[9px]
                font-bold
                text-[#0D3B4D]
                transition-all
                hover:border-[#E2723A]/20
                hover:bg-[#E2723A]/[0.07]
                dark:border-white/[0.06]
                dark:bg-white/[0.035]
                dark:text-white
              "
            >
              <ShoppingBag
                className="h-3 w-3"
                strokeWidth={2}
              />

              في السلة ·{" "}
              {cartQuantity.toLocaleString(
                "ar-EG",
              )}
            </button>
          )}
      </article>
    );
  },
);

ProductCard.displayName = "ProductCard";

export function ProductCardSkeleton() {
  return (
    <div
      className="
        overflow-hidden
        rounded-[1.25rem]
        border
        border-border
        bg-card
      "
    >
      <div
        className="
          aspect-square
          w-full
          animate-pulse
          bg-muted
        "
      />

      <div className="space-y-3 p-3">
        <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />

        <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />

        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />

          <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
