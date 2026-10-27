import { memo, useCallback, type MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, Star, Plus } from "lucide-react";
import { toast } from "sonner";

import { type Product } from "@/lib/db";
import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "./product-image";

type ProductCardProps = {
  product: Product;
};

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const { addItem, setDrawerOpen, getItemQuantity } = useCart();
  const formatPrice = useFormatPrice();

  const stockLeft = Math.max(0, Number(product.stock_left) || 0);
  const outOfStock = stockLeft <= 0;
  const cartQuantity = getItemQuantity(product.id);

  const currentPrice = Number(product.price) || 0;
  const oldPrice = product.old_price !== null ? Number(product.old_price) : 0;
  const hasDiscount = oldPrice > currentPrice && currentPrice > 0;
  const discount = hasDiscount ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100) : 0;

  const rating = Number(product.rating) || 0;

  const quickAdd = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (outOfStock) {
        toast.error("عذراً، نفد المنتج من المخزون");
        return;
      }

      try {
        await addItem({
          productId: product.id,
          quantity: 1,
        });

        toast.success(
          cartQuantity > 0 ? "أضيفت قطعة إضافية إلى السلة" : "تمت الإضافة إلى السلة",
          {
            action: {
              label: "عرض السلة",
              onClick: () => setDrawerOpen(true),
            },
          }
        );
      } catch (err) {
        toast.error("تعذر إضافة المنتج");
      }
    },
    [addItem, cartQuantity, outOfStock, product.id, setDrawerOpen]
  );

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#0E4D64]/10 bg-card p-2.5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-[#0E4D64]/20 dark:border-white/10">
      
      {/* رابط تفاصيل المنتج والصورة المربعة */}
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#EBF2F5] dark:bg-white/5"
      >
        <ProductImage
          src={product.image_url}
          alt={product.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* شارة الخصم */}
        {hasDiscount && (
          <span className="absolute start-2 top-2 rounded-lg bg-[#D65A31] px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
            %{discount}-
          </span>
        )}

        {/* شارة نفاد الكمية */}
        {outOfStock && (
          <span className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-black text-white backdrop-blur-[2px]">
            نفد المخزون
          </span>
        )}
      </Link>

      {/* تفاصيل المنتج والأسعار */}
      <div className="mt-2.5 flex flex-1 flex-col justify-between">
        <div>
          {/* التقييم إن وُجد */}
          {rating > 0 && (
            <div className="mb-1 flex items-center gap-1 text-[11px] text-amber-500 font-bold">
              <Star className="h-3 w-3 fill-amber-400 stroke-none" />
              <span>{rating.toFixed(1)}</span>
            </div>
          )}

          <Link
            to="/product/$id"
            params={{ id: product.id }}
            className="line-clamp-2 text-xs font-bold leading-snug text-foreground hover:text-[#0E4D64] dark:hover:text-[#D65A31]"
          >
            {product.title}
          </Link>
        </div>

        {/* السعر وزر الإضافة السريع */}
        <div className="mt-3 flex items-center justify-between gap-1 pt-1 border-t border-[#0E4D64]/5 dark:border-white/5">
          <div className="flex flex-col">
            <span className="text-sm font-black text-[#0E4D64] dark:text-[#E4F1F4]">
              {formatPrice(currentPrice)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] font-medium text-muted-foreground line-through">
                {formatPrice(oldPrice)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={quickAdd}
            disabled={outOfStock}
            aria-label={`إضافة ${product.title} إلى السلة`}
            className="grid h-8 w-8 place-items-center rounded-xl bg-[#D65A31] text-white transition-all hover:bg-[#b84722] active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

      </div>
    </div>
  );
});

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-[#0E4D64]/10 bg-card p-2.5 shadow-sm">
      <div className="aspect-square w-full animate-pulse rounded-xl bg-[#0E4D64]/10" />
      <div className="mt-2.5 space-y-2">
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export default ProductCard;
