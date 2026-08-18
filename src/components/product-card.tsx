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

  const hasRating =
    Number(product.reviews_count) > 0 &&
    Number(product.rating) > 0;

  const hasOldPrice =
    product.old_price !== null &&
    Number(product.old_price) > Number(product.price);

  const discountPercent =
    hasOldPrice && Number(product.old_price) > 0
      ? Math.round(
          ((Number(product.old_price) -
            Number(product.price)) /
            Number(product.old_price)) *
            100,
        )
      : 0;

  const quickAdd = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
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
            ? "تمت إضافة كمية أخرى إلى السلة"
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

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition-transform duration-200 active:scale-[0.985]">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        aria-label={`عرض ${product.name}`}
        className="block min-w-0"
      >
        <div className="relative overflow-hidden">
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            className="aspect-square w-full"
          />

          {product.badge ? (
            <span className="absolute start-2 top-2 max-w-[70%] truncate rounded-full bg-accent-solid px-2 py-1 text-[9px] font-bold text-accent-solid-foreground shadow-sm">
              {product.badge}
            </span>
          ) : null}

          {discountPercent > 0 ? (
            <span className="absolute end-2 top-2 rounded-full bg-destructive px-2 py-1 text-[9px] font-bold text-destructive-foreground shadow-sm">
              خصم {discountPercent}%
            </span>
          ) : null}

          {isOutOfStock ? (
            <div
              className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-[1px]"
              aria-hidden="true"
            >
              <span className="rounded-full bg-destructive px-3 py-1.5 text-[11px] font-bold text-destructive-foreground shadow-lg">
                نفد المخزون
              </span>
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5 p-3 pb-2">
          <h3 className="line-clamp-2 min-h-[2.35rem] text-[13px] font-medium leading-[1.35] text-foreground">
            {product.name}
          </h3>

          {hasRating ? (
            <div
              className="flex min-h-4 items-center gap-1 text-[10px] text-muted-foreground"
              aria-label={`التقييم ${Number(
                product.rating,
              ).toLocaleString("ar-EG")} من 5`}
            >
              <Star
                className="h-3 w-3 fill-accent-solid text-accent-solid"
                aria-hidden="true"
              />

              <span className="font-medium text-foreground">
                {Number(
                  product.rating,
                ).toLocaleString("ar-EG")}
              </span>

              <span>
                (
                {Number(
                  product.reviews_count,
                ).toLocaleString("ar-EG")}
                )
              </span>
            </div>
          ) : (
            <div className="min-h-4" />
          )}

          {isLowStock ? (
            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              متبقي{" "}
              {stockLeft.toLocaleString(
                "ar-EG",
              )}{" "}
              فقط
            </p>
          ) : isOutOfStock ? (
            <p className="text-[10px] font-semibold text-destructive">
              غير متوفر حالياً
            </p>
          ) : (
            <div className="h-[15px]" />
          )}
        </div>
      </Link>

      <div className="mt-auto flex items-end justify-between gap-2 px-3 pb-3">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-bold text-primary"
            aria-label={`السعر ${formatPrice(
              product.price,
            )}`}
          >
            {formatPrice(product.price)}
          </p>

          {hasOldPrice ? (
            <p className="truncate text-[10px] text-muted-foreground line-through">
              {formatPrice(product.old_price!)}
            </p>
          ) : (
            <div className="h-[15px]" />
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
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {cartQuantity > 0 ? (
            <>
              <Check
                className="h-4 w-4"
                strokeWidth={2.5}
                aria-hidden="true"
              />

              <span className="absolute -end-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full border-2 border-card bg-foreground px-1 text-[8px] font-bold text-background">
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
              strokeWidth={2.4}
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      {cartQuantity > 0 && !isOutOfStock ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDrawerOpen(true);
          }}
          className="mx-3 mb-3 flex items-center justify-center gap-1.5 rounded-lg bg-brand-soft px-2 py-1.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          aria-label="عرض السلة"
        >
          <ShoppingCart
            className="h-3 w-3"
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
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
      <div className="aspect-square w-full animate-pulse bg-muted" />

      <div className="space-y-2 p-3">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />

        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
