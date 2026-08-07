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
    <div className="fixed inset-0 z-[999] flex justify-end overflow-hidden">
      {/* الخلفية المظلمة عند الفتح */}
      <button
        type="button"
        aria-label="إغلاق السلة"
        onClick={() => setDrawerOpen(false)}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm transition-opacity"
      />

      {/* لوحة السلة الجانبية */}
      <aside className="relative flex h-[100dvh] w-[88vw] max-w-[380px] flex-col bg-card shadow-brand transition-transform">
        {/* هيدر السلة */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <ShoppingCart className="h-5 w-5 text-primary shrink-0" />
            <span>سلة التسوق ({count.toLocaleString("ar-EG")})</span>
          </h2>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={() => setDrawerOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-xl text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* قائمة المنتجات */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 no-scrollbar">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">سلتك فارغة حاليًا</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-2xl border border-border/70 p-2.5 bg-card/50"
                >
                  <Link
                    to="/product/$id"
                    params={{ id: item.product_id }}
                    onClick={() => setDrawerOpen(false)}
                    className="shrink-0"
                  >
                    <ProductImage
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="h-20 w-20 rounded-xl object-cover"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <p className="line-clamp-2 text-xs sm:text-[13px] font-semibold leading-snug text-foreground">
                        {item.product.name}
                      </p>
                      {item.size || item.color ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {[item.size, item.color].filter(Boolean).join(" • ")}
                        </p>
                      ) : null}
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <p className="text-sm font-bold text-primary">
                        {formatPrice(item.product.price)}
                      </p>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-1">
                          <button
                            type="button"
                            aria-label="تقليل الكمية"
                            onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                            className="grid h-7 w-7 place-items-center text-foreground hover:bg-accent rounded-lg"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[20px] text-center text-xs font-semibold">
                            {item.quantity.toLocaleString("ar-EG")}
                          </span>
                          <button
                            type="button"
                            aria-label="زيادة الكمية"
                            onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                            className="grid h-7 w-7 place-items-center text-foreground hover:bg-accent rounded-lg"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          aria-label="حذف من السلة"
                          onClick={() => void removeItem(item.id)}
                          className="grid h-8 w-8 place-items-center rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* أسفل السلة وزر الشراء */}
        <div className="shrink-0 border-t border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">الإجمالي</span>
            <span className="text-base font-bold text-primary">{formatPrice(total)}</span>
          </div>
          <Link
            to="/checkout"
            onClick={() => setDrawerOpen(false)}
            aria-disabled={items.length === 0}
            className={`mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 ${
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
