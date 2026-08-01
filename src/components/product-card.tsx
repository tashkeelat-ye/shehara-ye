import { Plus, Star } from "lucide-react";
import { formatPrice, type Product } from "@/data/mock";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
      <div className="relative bg-secondary">
        <img
          src={product.image}
          alt={product.name}
          width={700}
          height={700}
          loading="lazy"
          className="aspect-square w-full object-cover"
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
          <span className="text-foreground">{product.rating.toLocaleString("ar-EG")}</span>
          <span>({product.reviews.toLocaleString("ar-EG")})</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <p className="truncate text-sm text-primary">{formatPrice(product.price)}</p>
            {product.oldPrice ? (
              <p className="truncate text-[11px] text-muted-foreground line-through">
                {formatPrice(product.oldPrice)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={`إضافة ${product.name} إلى السلة`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform active:scale-90"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
