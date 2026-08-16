import { Link } from "@tanstack/react-router";
import { Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { type Product } from "@/lib/db";
import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "./product-image";

export function ProductCard({ product }: { product: Product }) {
  const { addItem, setDrawerOpen } = useCart();
  const formatPrice = useFormatPrice();

  async function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await addItem({ productId: product.id, quantity: 1 });
    toast.success("تمت إضافة المنتج إلى السلة", {
      action: { label: "عرض السلة", onClick: () => setDrawerOpen(true) },
    });
  }

  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card transition-transform active:scale-[0.98]"
    >
      <div className="relative">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          className="aspect-square w-full"
        />
        {product.badge ? (
          <span className="absolute top-2 start-2 rounded-full bg-accent-solid px-2 py-0.5 text-[10px] text-accent-solid-foreground">
            {product.badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 min-h-10 text-[13px] leading-tight text-foreground">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-accent-solid text-accent-solid" />
          <span className="text-foreground">{Number(product.rating).toLocaleString("ar-EG")}</span>
          <span>({product.reviews_count.toLocaleString("ar-EG")})</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <p className="truncate text-sm text-primary">{formatPrice(product.price)}</p>
            {product.old_price ? (
              <p className="truncate text-[11px] text-muted-foreground line-through">
                {formatPrice(product.old_price)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={`إضافة ${product.name} إلى السلة`}
            onClick={quickAdd}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-90"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="aspect-square w-full animate-pulse bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
