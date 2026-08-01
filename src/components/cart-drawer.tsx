import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/db";
import { ProductImage } from "./product-image";

export function CartDrawer() {
  const { items, total, count, drawerOpen, setDrawerOpen, updateQuantity, removeItem } =
    useCart();

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="إغلاق السلة"
        onClick={() => setDrawerOpen(false)}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <aside className="relative ms-auto flex h-full w-full max-w-md flex-col bg-card shadow-brand">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-base text-foreground">
            <ShoppingCart className="h-5 w-5 text-primary" />
            سلة التسوق ({count.toLocaleString("ar-EG")})
          </h2>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={() => setDrawerOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-xl text-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              سلتك فارغة حاليًا
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-2xl border border-border/70 p-2"
                >
                  <Link
                    to="/product/$id"
                    params={{ id: item.product_id }}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <ProductImage
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="h-20 w-20 shrink-0 rounded-xl"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="line-clamp-2 text-[13px] leading-tight text-foreground">
                      {item.product.name}
                    </p>
                    {item.size || item.color ? (
                      <p className="text-[11px] text-muted-foreground">
                        {[item.size, item.color].filter(Boolean).join(" • ")}
                      </p>
                    ) : null}
                    <p className="text-sm text-primary">{formatPrice(item.product.price)}</p>
                    <div className="mt-auto flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-xl border border-border">
                        <button
                          type="button"
                          aria-label="تقليل الكمية"
                          onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                          className="grid h-8 w-8 place-items-center text-foreground"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-6 text-center text-sm">
                          {item.quantity.toLocaleString("ar-EG")}
                        </span>
                        <button
                          type="button"
                          aria-label="زيادة الكمية"
                          onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                          className="grid h-8 w-8 place-items-center text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label="حذف من السلة"
                        onClick={() => void removeItem(item.id)}
                        className="grid h-8 w-8 place-items-center rounded-xl text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">الإجمالي</span>
            <span className="text-base text-primary">{formatPrice(total)}</span>
          </div>
          <Link
            to="/checkout"
            onClick={() => setDrawerOpen(false)}
            aria-disabled={items.length === 0}
            className={`mt-3 flex h-12 items-center justify-center rounded-2xl bg-primary text-sm text-primary-foreground ${
              items.length === 0 ? "pointer-events-none opacity-50" : ""
            }`}
          >
            إتمام الطلب
          </Link>
        </div>
      </aside>
    </div>
  );
}
