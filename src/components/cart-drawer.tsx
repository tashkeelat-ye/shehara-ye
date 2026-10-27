import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "./product-image";

type PendingAction = "quantity" | "remove";

export function CartDrawer() {
  const formatPrice = useFormatPrice();
  const {
    items,
    total,
    count,
    loading,
    drawerOpen,
    setDrawerOpen,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const [mounted, setMounted] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [pending, setPending] = useState<Record<string, PendingAction | undefined>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const closeTimer = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) {
      setMounted(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
      closeButtonRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [drawerOpen]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const closeDrawer = useCallback(() => {
    setMounted(false);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setDrawerOpen(false);
      closeTimer.current = null;
    }, 220);
  }, [setDrawerOpen]);

  const runItemAction = useCallback(
    async (
      lineId: string,
      action: PendingAction,
      task: () => Promise<void>,
    ) => {
      if (pending[lineId]) return;
      setErrorMessage("");
      setPending((previous) => ({ ...previous, [lineId]: action }));
      try {
        await task();
      } catch (error) {
        console.error("[CartDrawer] cart action failed:", error);
        setErrorMessage(
          navigator.onLine
            ? "تعذّر حفظ التغيير. تحقق من اتصالك ثم حاول مرة أخرى."
            : "أنت غير متصل بالإنترنت؛ تعذّر حفظ هذا التغيير.",
        );
      } finally {
        setPending((previous) => {
          const next = { ...previous };
          delete next[lineId];
          return next;
        });
      }
    },
    [pending],
  );

  const handleQuantity = useCallback(
    (lineId: string, quantity: number) => {
      if (quantity < 1) {
        void runItemAction(lineId, "remove", () => removeItem(lineId));
        return;
      }
      void runItemAction(lineId, "quantity", () => updateQuantity(lineId, quantity));
    },
    [removeItem, runItemAction, updateQuantity],
  );

  const handleClearCart = async () => {
    if (items.length === 0 || pending.__clear) return;
    const confirmed = window.confirm("هل تريد إفراغ سلة التسوق وحذف جميع المنتجات منها؟");
    if (!confirmed) return;
    setErrorMessage("");
    setPending((previous) => ({ ...previous, __clear: "remove" }));
    try {
      await clearCart();
    } catch (error) {
      console.error("[CartDrawer] clear cart failed:", error);
      setErrorMessage("لم نتمكن من إفراغ السلة بالكامل. يرجى المحاولة مرة أخرى.");
    } finally {
      setPending((previous) => {
        const next = { ...previous };
        delete next.__clear;
        return next;
      });
    }
  };

  if (!drawerOpen) return null;

  const unavailableItems = items.filter(
    (item) =>
      item.product.is_active === false || Number(item.product.stock_left ?? 0) < 1,
  );
  const canCheckout = items.length > 0 && unavailableItems.length === 0 && !loading;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[999] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="سلة التسوق"
      aria-describedby="cart-drawer-description"
    >
      <button
        type="button"
        aria-label="إغلاق السلة"
        tabIndex={-1}
        onClick={closeDrawer}
        className={`absolute inset-0 cursor-default bg-[#071B24]/65 backdrop-blur-[4px] transition-opacity duration-300 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        className={`absolute inset-y-0 end-0 flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-white shadow-[-24px_0_80px_-35px_rgba(7,27,36,0.6)] transition-transform duration-300 ease-out dark:bg-[#071E28] ${
          mounted ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* الخط الجمالي العلوي */}
        <div
          aria-hidden="true"
          className="h-1.5 shrink-0 bg-gradient-to-l from-[#0E4D64] via-[#D65A31] to-[#0E4D64]"
        />

        {/* رأس سلة التسوق */}
        <header className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-4 dark:border-white/[0.08]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0E4D64] text-white shadow-sm">
                <ShoppingCart className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-wider text-[#D65A31]">
                  SHEHARA STORE
                </span>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    سلة التسوّق
                  </h2>
                  <span className="rounded-full bg-[#EBF2F5] px-2 py-0.5 text-[11px] font-black text-[#0E4D64] dark:bg-white/10 dark:text-[#8DC1CC]">
                    {count.toLocaleString("ar-EG")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {items.length > 1 ? (
                <button
                  type="button"
                  onClick={() => void handleClearCart()}
                  disabled={Boolean(pending.__clear)}
                  className="inline-flex h-10 items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/30"
                >
                  {pending.__clear ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>إفراغ</span>
                </button>
              ) : null}

              <button
                ref={closeButtonRef}
                type="button"
                aria-label="إغلاق السلة"
                onClick={closeDrawer}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-[#D65A31] dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* محتوى السلة القابل للتمرير */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F9FA] px-4 py-4 dark:bg-[#061820]">
          {errorMessage ? (
            <div
              role="alert"
              className="mb-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage("")}
                aria-label="إخفاء رسالة الخطأ"
                className="grid h-6 w-6 place-items-center rounded-lg hover:bg-rose-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          {loading && items.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-[#0E4D64]" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                جارٍ تحديث محتويات سلتك...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center px-4 py-12 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#EBF2F5] text-[#0E4D64] shadow-inner dark:bg-white/10 dark:text-[#8DC1CC]">
                <ShoppingBag className="h-9 w-9" />
              </div>
              <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
                سلتك تنتظر اختياراتك
              </h3>
              <p className="mt-1.5 max-w-[260px] text-xs leading-6 text-slate-500 dark:text-slate-400">
                لم تضف أي منتجات بعد. استكشف أقسامنا المتنوعة واختر ما يعجبك.
              </p>
              <Link
                to="/products"
                onClick={() => setDrawerOpen(false)}
                className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0E4D64] px-6 text-sm font-black text-white shadow-md transition hover:bg-[#093747] active:scale-[0.98]"
              >
                <ShoppingBag className="h-4 w-4" />
                تصفح المنتجات الآن
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const image = item.product.images?.[0] || "/placeholder.svg";
                const unitPrice = Number(item.product.price || 0);
                const lineTotal = unitPrice * item.quantity;
                const stockLeft = Math.max(0, Number(item.product.stock_left ?? 0));
                const outOfStock = item.product.is_active === false || stockLeft < 1;
                const atStockLimit = item.quantity >= stockLeft;
                const isBusy = Boolean(pending[item.id]);

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-[#0A2A38]"
                  >
                    <div className="flex min-w-0 gap-3">
                      <Link
                        to="/product/$id"
                        params={{ id: item.product_id }}
                        onClick={closeDrawer}
                        className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-[#EBF2F5] dark:bg-[#123B4A]"
                      >
                        <ProductImage
                          src={image}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-1 end-1 rounded-md bg-[#071E28]/85 px-1.5 py-0.5 text-[9px] font-black text-white backdrop-blur">
                          ×{item.quantity}
                        </span>
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1.5">
                          <Link
                            to="/product/$id"
                            params={{ id: item.product_id }}
                            onClick={closeDrawer}
                            className="min-w-0 flex-1"
                          >
                            <h3 className="line-clamp-2 text-xs font-black leading-5 text-slate-900 transition hover:text-[#0E4D64] dark:text-white dark:hover:text-[#8DC1CC]">
                              {item.product.name}
                            </h3>
                          </Link>
                          <button
                            type="button"
                            aria-label={`حذف ${item.product.name}`}
                            disabled={isBusy || Boolean(pending.__clear)}
                            onClick={() =>
                              void runItemAction(item.id, "remove", () =>
                                removeItem(item.id),
                              )
                            }
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/30"
                          >
                            {pending[item.id] === "remove" ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        {item.size || item.color ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.size ? (
                              <span className="rounded-md bg-[#0E4D64]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#0E4D64] dark:bg-white/10 dark:text-[#8DC1CC]">
                                {item.size}
                              </span>
                            ) : null}
                            {item.color ? (
                              <span className="rounded-md bg-[#D65A31]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#D65A31]">
                                {item.color}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {outOfStock ? (
                          <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/30">
                            <PackageCheck className="h-3 w-3" />
                            نفدت الكمية
                          </p>
                        ) : null}

                        <div className="mt-3 flex items-end justify-between gap-2">
                          <div>
                            <p className="text-sm font-black text-[#D65A31]">
                              {formatPrice(lineTotal)}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              {formatPrice(unitPrice)} للقطعة
                            </p>
                          </div>

                          {/* كبسولة زيادة ونقصان الكمية */}
                          <div
                            className={`flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-white/[0.05] ${
                              isBusy ? "opacity-60" : ""
                            }`}
                          >
                            <button
                              type="button"
                              aria-label="تقليل الكمية"
                              disabled={isBusy || Boolean(pending.__clear)}
                              onClick={() => handleQuantity(item.id, item.quantity - 1)}
                              className="grid h-7 w-7 place-items-center rounded-lg text-slate-600 transition hover:bg-white hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-6 text-center text-xs font-black tabular-nums text-slate-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="زيادة الكمية"
                              disabled={
                                isBusy ||
                                Boolean(pending.__clear) ||
                                outOfStock ||
                                atStockLimit
                              }
                              onClick={() => handleQuantity(item.id, item.quantity + 1)}
                              className="grid h-7 w-7 place-items-center rounded-lg bg-white text-[#D65A31] shadow-xs transition hover:bg-[#D65A31] hover:text-white disabled:opacity-40 dark:bg-white/10 dark:text-white"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* حقل كود الخصم (اختياري) */}
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 dark:border-white/[0.08] dark:bg-[#0A2A38]">
                <Tag className="ms-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="كود الخصم (اختياري)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-white"
                />
                <button
                  type="button"
                  className="rounded-xl bg-[#0E4D64]/10 px-3 py-1.5 text-xs font-black text-[#0E4D64] transition hover:bg-[#0E4D64] hover:text-white dark:bg-white/10 dark:text-[#8DC1CC]"
                >
                  تطبيق
                </button>
              </div>
            </div>
          )}
        </div>

        {/* الشريط السفلي وزر الانتقال للدفع */}
        {items.length > 0 ? (
          <footer className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-lg dark:border-white/[0.08] dark:bg-[#071E28]">
            <div className="mb-3 space-y-1.5 rounded-2xl bg-slate-50 p-3.5 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>إجمالي المنتجات ({count}):</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatPrice(total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>تكلفة الشحن والتوصيل:</span>
                <span className="font-bold text-[#0E4D64] dark:text-[#8DC1CC]">
                  يُحدَّد عند التأكيد
                </span>
              </div>
              <div className="border-t border-slate-200/80 pt-2 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    المبلغ الإجمالي:
                  </span>
                  <span className="text-lg font-black text-[#D65A31]">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/checkout"
              onClick={(event) => {
                if (!canCheckout) {
                  event.preventDefault();
                  setErrorMessage(
                    "يرجى مراجعة المنتجات غير المتاحة أو الانتظار حتى تكتمل مزامنة السلة.",
                  );
                  return;
                }
                setDrawerOpen(false);
              }}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0E4D64] px-4 text-sm font-black text-white shadow-lg transition active:scale-[0.98] ${
                canCheckout
                  ? "hover:bg-[#093747]"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              <LockKeyhole className="h-4 w-4" />
              <span>إتمام الطلب الآن</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

export default CartDrawer;
