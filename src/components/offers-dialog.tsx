import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Tag, X } from "lucide-react";

import { fetchCategories } from "@/lib/db";
import { fetchOfferProducts } from "@/lib/offers";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";

/**
 * نافذة العروض: تعرض منتجات العروض الحقيقية لجميع الفئات
 * مع إمكانية التصفية حسب الفئة.
 */
export function OffersDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [active, setActive] = useState<string>("all");

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["offers", "all"],
    queryFn: () => fetchOfferProducts(60),
    enabled: open,
    staleTime: 60_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: open,
    staleTime: 10 * 60_000,
  });

  const usedCategories = useMemo(() => {
    const ids = new Set(offers.map((o) => o.category_id));
    return categories.filter((c) => ids.has(c.id));
  }, [offers, categories]);

  const list = useMemo(
    () =>
      active === "all"
        ? offers
        : offers.filter((o) => o.category_id === active),
    [offers, active],
  );

  if (!open) return null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="عروض جميع الفئات"
      className="fixed inset-0 z-[150] flex flex-col bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="mt-auto flex max-h-[88vh] w-full flex-col rounded-t-3xl border border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl sm:mx-auto sm:my-auto sm:max-w-3xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <Tag className="h-4 w-4" />
            </span>
            عروض جميع الفئات
          </h2>

          <button
            type="button"
            aria-label="إغلاق"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border text-foreground active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setActive("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              active === "all"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-muted text-muted-foreground"
            }`}
          >
            الكل
          </button>

          {usedCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActive(category.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                active === category.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-muted text-muted-foreground"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              لا توجد عروض متاحة حالياً.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {list.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-3">
          <Link
            to="/offers"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground active:scale-95"
          >
            عرض صفحة العروض الكاملة
          </Link>
        </div>
      </div>
    </div>
  );
}
