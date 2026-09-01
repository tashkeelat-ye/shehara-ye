import { Link } from "@tanstack/react-router";
import {
  Plus,
  ShoppingCart,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { ProductImage } from "@/components/product-image";
import type { Product } from "@/lib/db";
import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";

export type ProductCardProps = {
  product: Product;
  eager?: boolean;
};

function getDiscountPercent(product: Product): number {
  const oldPrice = Number(product.old_price ?? 0);
  const price = Number(product.price ?? 0);

  if (oldPrice <= price || oldPrice <= 0) {
    return 0;
  }

  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function ProductCard({
  product,
  eager = false,
}: ProductCardProps) {
  const formatPrice = useFormatPrice();
  const { addItem, setDrawerOpen } = useCart();

  const discount = getDiscountPercent(product);

  const stockLeft = Math.max(
    0,
    Number(product.stock_left ?? 0),
  );

  const hasVariants =
    product.sizes.length > 0 ||
    product.colors.length > 0;

  const outOfStock =
    stockLeft <= 0 ||
    product.is_active === false;

  async function handleAddToCart() {
    if (outOfStock) {
      toast.error(
        "المنتج غير متوفر حالياً.",
      );
      return;
    }

    /*
     * المنتجات التي تحتاج اختيار مقاس أو لون
     * يتم فتح صفحة المنتج بدلاً من إضافة
     * خيارات افتراضية غير مقصودة.
     */
    if (hasVariants) {
      return;
    }

    try {
      await addItem({
        productId: product.id,
        quantity: 1,
        size: null,
        color: null,
      });

      toast.success(
        "تمت إضافة المنتج إلى السلة.",
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
    }
  }

  return (
    <article
      className="
        group
        flex
        min-w-0
        flex-col
        overflow-hidden
        rounded-[1.25rem]
        border
        border-border/70
        bg-card
        shadow-[0_10px_30px_-18px_rgba(14,77,100,0.28)]
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-primary/15
        hover:shadow-[0_18px_38px_-24px_rgba(14,77,100,0.4)]
      "
    >
      {/* صورة المنتج */}
      <Link
        to="/product/$id"
        params={{
          id: product.id,
        }}
        className="block"
        aria-label={`عرض ${product.name}`}
      >
        <div
          className="
            relative
            aspect-square
            overflow-hidden
            bg-secondary
          "
        >
          <ProductImage
            src={product.images?.[0]}
            alt={product.name}
            eager={eager}
            className="h-full w-full"
          />

          {/* الشارات */}
          <div
            className="
              pointer-events-none
              absolute
              inset-x-2
              top-2
              z-10
              flex
              items-start
              justify-between
              gap-2
            "
          >
            <div
              className="
                flex
                min-w-0
                flex-wrap
                gap-1
              "
            >
              {discount > 0 ? (
                <span
                  className="
                    rounded-lg
                    bg-accent
                    px-2
                    py-1
                    text-[9px]
                    font-black
                    text-accent-foreground
                    shadow-sm
                  "
                >
                  -{discount}%
                </span>
              ) : null}

              {product.badge ? (
                <span
                  className="
                    max-w-[100px]
                    truncate
                    rounded-lg
                    bg-primary
                    px-2
                    py-1
                    text-[9px]
                    font-black
                    text-primary-foreground
                    shadow-sm
                  "
                >
                  {product.badge}
                </span>
              ) : null}
            </div>

            {product.is_local ? (
              <span
                className="
                  shrink-0
                  rounded-lg
                  bg-white/90
                  px-2
                  py-1
                  text-[8px]
                  font-black
                  text-primary
                  shadow-sm
                  backdrop-blur-sm
                  dark:bg-card/90
                "
              >
                يمني
              </span>
            ) : null}
          </div>

          {/* نفاد المخزون */}
          {outOfStock ? (
            <div
              className="
                absolute
                inset-0
                z-20
                flex
                items-center
                justify-center
                bg-black/35
              "
            >
              <span
                className="
                  rounded-xl
                  bg-white/95
                  px-3
                  py-2
                  text-[10px]
                  font-black
                  text-foreground
                  shadow-lg
                  dark:bg-card/95
                "
              >
                نفد المخزون
              </span>
            </div>
          ) : null}
        </div>
      </Link>

      {/* بيانات المنتج */}
      <div
        className="
          flex
          min-h-[156px]
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
              min-h-[34px]
              text-[11px]
              font-extrabold
              leading-5
              text-foreground
              transition-colors
              group-hover:text-primary
              sm:text-xs
            "
          >
            {product.name}
          </h3>
        </Link>

        {/* التقييم والمدينة */}
        <div
          className="
            mt-2
            flex
            items-center
            justify-between
            gap-2
          "
        >
          <div
            className="
              flex
              min-w-0
              items-center
              gap-1
            "
          >
            <Star
              className="
                h-3.5
                w-3.5
                shrink-0
                fill-accent
                text-accent
              "
              aria-hidden="true"
            />

            <span
              className="
                text-[9px]
                font-bold
                text-foreground
              "
            >
              {Number(
                product.rating ?? 0,
              ).toFixed(1)}
            </span>

            <span
              className="
                truncate
                text-[8px]
                text-muted-foreground
              "
            >
              (
              {Number(
                product.reviews_count ?? 0,
              ).toLocaleString("ar-EG")}
              )
            </span>
          </div>

          {product.city ? (
            <span
              className="
                max-w-[90px]
                truncate
                text-[8px]
                text-muted-foreground
              "
            >
              {product.city}
            </span>
          ) : null}
        </div>

        {/* السعر */}
        <div
          className="
            mt-2
            flex
            flex-wrap
            items-end
            gap-1.5
          "
        >
          <span
            className="
              text-sm
              font-black
              text-primary
              sm:text-[15px]
            "
          >
            {formatPrice(
              Number(product.price ?? 0),
            )}
          </span>

          {discount > 0 ? (
            <span
              className="
                text-[9px]
                font-medium
                text-muted-foreground
                line-through
              "
            >
              {formatPrice(
                Number(
                  product.old_price ?? 0,
                ),
              )}
            </span>
          ) : null}
        </div>

        {/* المخزون المنخفض */}
        {stockLeft > 0 &&
        stockLeft <=
          Number(
            product.low_stock_threshold ?? 5,
          ) ? (
          <p
            className="
              mt-1
              text-[8px]
              font-bold
              text-accent
            "
          >
            متبقي{" "}
            {stockLeft.toLocaleString(
              "ar-EG",
            )}{" "}
            فقط
          </p>
        ) : null}

        {/* زر الإجراء */}
        <div className="mt-auto pt-3">
          {hasVariants ? (
            <Link
              to="/product/$id"
              params={{
                id: product.id,
              }}
              className="
                flex
                h-9
                w-full
                items-center
                justify-center
                gap-1.5
                rounded-xl
                bg-primary
                px-2
                text-[9px]
                font-black
                text-primary-foreground
                transition-all
                hover:bg-primary/90
                active:scale-[0.98]
              "
            >
              <SlidersHorizontal
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />

              اختيار الخيارات
            </Link>
          ) : (
            <button
              type="button"
              disabled={outOfStock}
              onClick={() =>
                void handleAddToCart()
              }
              className="
                flex
                h-9
                w-full
                items-center
                justify-center
                gap-1.5
                rounded-xl
                bg-primary
                px-2
                text-[9px]
                font-black
                text-primary-foreground
                transition-all
                hover:bg-primary/90
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {outOfStock ? (
                <ShoppingCart
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
              ) : (
                <Plus
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
              )}

              {outOfStock
                ? "غير متوفر"
                : "أضف للسلة"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Skeleton موحد لبطاقات المنتجات.
 *
 * مهم:
 * هذه الدالة يجب أن تبقى export
 * لأن صفحات:
 * - الرئيسية
 * - المنتجات
 * - العروض
 * - التصنيف
 * تستوردها مباشرة.
 */
export function ProductCardSkeleton() {
  return (
    <article
      className="
        overflow-hidden
        rounded-[1.25rem]
        border
        border-border/70
        bg-card
      "
    >
      <div
        className="
          aspect-square
          animate-pulse
          bg-muted
        "
      />

      <div className="space-y-3 p-3">
        <div
          className="
            h-4
            w-4/5
            animate-pulse
            rounded-md
            bg-muted
          "
        />

        <div
          className="
            h-3
            w-2/5
            animate-pulse
            rounded-md
            bg-muted
          "
        />

        <div
          className="
            h-5
            w-1/2
            animate-pulse
            rounded-md
            bg-muted
          "
        />

        <div
          className="
            h-9
            w-full
            animate-pulse
            rounded-xl
            bg-muted
          "
        />
      </div>
    </article>
  );
}

export default ProductCard;
