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
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "./product-image";

const BRAND = {
  teal: "#0E4D64",
  tealDark: "#093747",
  orange: "#D65A31",
  canvas: "#F5F8F9",
};

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

  const runItemAction = useCallback(async (
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
          : "أنت غير متصل بالإنترنت؛ تعذّر حفظ هذا التغيير. حاول مجددًا عند عودة الاتصال.",
      );
    } finally {
      setPending((previous) => {
        const next = { ...previous };
        delete next[lineId];
        return next;
      });
    }
  }, [pending]);

  const handleQuantity = useCallback((lineId: string, quantity: number) => {
    if (quantity < 1) {
      void runItemAction(lineId, "remove", () => removeItem(lineId));
      return;
    }
    void runItemAction(lineId, "quantity", () => updateQuantity(lineId, quantity));
  }, [removeItem, runItemAction, updateQuantity]);

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

  const unavailableItems = items.filter((item) =>
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
        className={`absolute inset-0 cursor-default bg-[#041922]/65 backdrop-blur-sm transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        className={`absolute inset-y-0 end-0 flex h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden bg-white shadow-[-24px_0_80px_-35px_rgba(9,55,71,0.65)] transition-transform duration-300 ease-out ${mounted ? "translate-x-0" : "translate-x-full"}`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div aria-hidden="true" className="h-1 shrink-0" style={{ background: `linear-gradient(90deg, ${BRAND.orange}, ${BRAND.teal}, ${BRAND.orange})` }} />

        <header className="shrink-0 border-b border-slate-100 px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm" style={{ background: `linear-gradient(145deg, ${BRAND.teal}, ${BRAND.tealDark})` }}>
                <ShoppingCart className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black leading-6 text-slate-900">سلة التسوق</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {count.toLocaleString("ar-EG")} {count === 1 ? "قطعة" : "قطع"} في سلتك
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {items.length > 1 ? (
                <button
                  type="button"
                  onClick={() => void handleClearCart()}
                  disabled={Boolean(pending.__clear)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 sm:px-3"
                >
                  {pending.__clear ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span>إفراغ</span>
                </button>
              ) : null}
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="إغلاق السلة"
                onClick={closeDrawer}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31]/40"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {items.length > 0 ? (
            <div id="cart-drawer-description" className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#0E4D64]/10 bg-[#0E4D64]/[0.045] px-3.5 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0E4D64]" aria-hidden="true" />
              <p className="text-xs leading-5 text-slate-600">راجع المنتجات والكميات قبل إكمال الطلب. لن يتم تأكيد الشراء إلا بعد مراجعة تفاصيل الدفع والتوصيل.</p>
            </div>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F5F8F9] px-3 py-4 sm:px-5 sm:py-5">
          {errorMessage ? (
            <div role="alert" className="mb-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-700">
              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">{errorMessage}</span>
              <button type="button" onClick={() => setErrorMessage("")} aria-label="إخفاء رسالة الخطأ" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg hover:bg-red-100"><X className="h-4 w-4" /></button>
            </div>
          ) : null}

          {loading && items.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-[#0E4D64]" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-600">نجهّز سلتك...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center px-5 py-8 text-center">
              <div className="relative grid h-24 w-24 place-items-center rounded-[30px] bg-white shadow-[0_20px_50px_-30px_rgba(14,77,100,0.55)] ring-1 ring-[#0E4D64]/10">
                <div className="absolute inset-2 rounded-[24px] border border-[#D65A31]/20" />
                <ShoppingBag className="h-10 w-10 text-[#0E4D64]" aria-hidden="true" />
              </div>
              <h3 className="mt-6 text-xl font-black text-slate-900">سلتك تنتظر اختياراتك</h3>
              <p className="mt-2 max-w-[280px] text-sm leading-6 text-slate-500">لم تضف أي منتج حتى الآن. اكتشف المنتجات وأضف ما يناسبك، وستجده هنا.</p>
              <Link
                to="/products"
                onClick={() => setDrawerOpen(false)}
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-extrabold text-white shadow-[0_14px_30px_-18px_rgba(14,77,100,0.8)] transition hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31]/50"
                style={{ background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.tealDark})` }}
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                اكتشف المنتجات
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mb-1 flex items-center justify-between gap-3 px-1">
                <p className="text-xs font-bold text-slate-500">منتجاتك المختارة</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">{items.length.toLocaleString("ar-EG")} {items.length === 1 ? "منتج" : "منتجات"}</span>
              </div>

              {items.map((item) => {
                const image = item.product.images?.[0] || "/placeholder.svg";
                const unitPrice = Number(item.product.price || 0);
                const lineTotal = unitPrice * item.quantity;
                const stockLeft = Math.max(0, Number(item.product.stock_left ?? 0));
                const outOfStock = item.product.is_active === false || stockLeft < 1;
                const atStockLimit = item.quantity >= stockLeft;
                const isBusy = Boolean(pending[item.id]);

                return (
                  <article key={item.id} className="rounded-[22px] border border-slate-200/80 bg-white p-3 shadow-[0_10px_30px_-28px_rgba(14,77,100,0.55)] sm:p-3.5">
                    <div className="flex min-w-0 gap-3 sm:gap-3.5">
                      <Link
                        to="/product/$id"
                        params={{ id: item.product_id }}
                        onClick={closeDrawer}
                        aria-label={`عرض ${item.product.name}`}
                        className="group relative h-[104px] w-[92px] shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-900/5 sm:h-28 sm:w-28"
                      >
                        <ProductImage src={image} alt={item.product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        <span className="absolute bottom-1.5 start-1.5 inline-flex min-h-6 items-center rounded-full bg-[#093747]/90 px-2 text-[10px] font-extrabold text-white backdrop-blur">
                          ×{item.quantity.toLocaleString("ar-EG")}
                        </span>
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start gap-1.5">
                          <Link to="/product/$id" params={{ id: item.product_id }} onClick={closeDrawer} className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31]/40">
                            <h3 className="line-clamp-2 break-words text-sm font-extrabold leading-5 text-slate-900 sm:text-[15px]">{item.product.name}</h3>
                          </Link>
                          <button
                            type="button"
                            aria-label={`حذف ${item.product.name} من السلة`}
                            title="حذف المنتج"
                            disabled={isBusy || Boolean(pending.__clear)}
                            onClick={() => void runItemAction(item.id, "remove", () => removeItem(item.id))}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-wait disabled:opacity-50"
                          >
                            {pending[item.id] === "remove" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                          </button>
                        </div>

                        {item.size || item.color ? (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {item.size ? <span className="max-w-full break-words rounded-lg bg-[#0E4D64]/[0.07] px-2 py-1 text-[10px] font-bold text-[#0E4D64]">المقاس: {item.size}</span> : null}
                            {item.color ? <span className="max-w-full break-words rounded-lg bg-[#D65A31]/[0.09] px-2 py-1 text-[10px] font-bold text-[#A84220]">اللون: {item.color}</span> : null}
                          </div>
                        ) : null}

                        {outOfStock ? (
                          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700">
                            <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            {item.product.is_active === false ? "المنتج غير متاح حاليًا" : "نفدت الكمية المتاحة"}
                          </p>
                        ) : stockLeft <= Math.max(3, Number(item.product.low_stock_threshold ?? 0)) ? (
                          <p className="mt-2 text-[11px] font-semibold text-amber-700">متبقٍ {stockLeft.toLocaleString("ar-EG")} فقط</p>
                        ) : null}

                        <div className="mt-3 flex min-w-0 flex-wrap items-end justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-base font-black leading-6 text-[#D65A31]">{formatPrice(lineTotal)}</p>
                            <p className="mt-0.5 break-words text-[11px] text-slate-500">{formatPrice(unitPrice)} <span aria-hidden="true">×</span> {item.quantity.toLocaleString("ar-EG")}</p>
                          </div>

                          <div className={`inline-flex h-11 shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 ${isBusy ? "opacity-70" : ""}`} aria-label={`كمية ${item.product.name}`}>
                            <button
                              type="button"
                              aria-label={`تقليل كمية ${item.product.name}`}
                              disabled={isBusy || Boolean(pending.__clear)}
                              onClick={() => handleQuantity(item.id, item.quantity - 1)}
                              className="grid h-9 w-9 place-items-center rounded-lg text-[#0E4D64] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31]/40 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {pending[item.id] === "quantity" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" aria-hidden="true" />}
                            </button>
                            <span className="min-w-7 text-center text-sm font-extrabold tabular-nums text-slate-900" aria-live="polite">{item.quantity.toLocaleString("ar-EG")}</span>
                            <button
                              type="button"
                              aria-label={`زيادة كمية ${item.product.name}`}
                              title={atStockLimit ? "وصلت إلى الحد المتاح في المخزون" : "زيادة الكمية"}
                              disabled={isBusy || Boolean(pending.__clear) || outOfStock || atStockLimit}
                              onClick={() => handleQuantity(item.id, item.quantity + 1)}
                              className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#D65A31] shadow-sm transition hover:bg-[#D65A31]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31]/40 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <Plus className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {atStockLimit && !outOfStock ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">وصلت للكمية المتاحة حاليًا من هذا المنتج.</p> : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <footer className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-18px_40px_-35px_rgba(14,77,100,0.45)] sm:px-5 sm:pt-4">
            <div className="mb-3 rounded-2xl border border-[#0E4D64]/10 bg-[#F5F8F9] px-3.5 py-3.5 sm:px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-sm font-extrabold text-slate-800">إجمالي المنتجات</span>
                  <span className="mt-1 block text-[11px] text-slate-500">{count.toLocaleString("ar-EG")} قطعة في السلة</span>
                </div>
                <span className="shrink-0 break-words text-lg font-black text-[#D65A31] sm:text-xl">{formatPrice(total)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0E4D64]" aria-hidden="true" />
                <span>تُراجع تفاصيل التوصيل والدفع قبل تأكيد الطلب.</span>
              </div>
            </div>

            {unavailableItems.length > 0 ? (
              <p role="status" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700">
                لا يمكن متابعة الدفع حتى تزيل المنتجات غير المتاحة أو تنتظر عودتها للمخزون.
              </p>
            ) : null}

            <Link
              to="/checkout"
              onClick={(event) => {
                if (!canCheckout) {
                  event.preventDefault();
                  setErrorMessage("يرجى الانتظار حتى تكتمل مزامنة السلة والتأكد من توفر المنتجات.");
                  return;
                }
                setDrawerOpen(false);
              }}
              aria-disabled={!canCheckout}
              className={`group flex min-h-13 w-full items-center justify-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-black text-white shadow-[0_16px_32px_-18px_rgba(14,77,100,0.7)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31]/50 focus-visible:ring-offset-2 ${canCheckout ? "hover:brightness-105 active:scale-[0.99]" : "cursor-not-allowed opacity-50"}`}
              style={{ background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.tealDark})` }}
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              <span>{loading ? "جارٍ تحديث السلة..." : "المتابعة إلى الدفع الآمن"}</span>
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" aria-hidden="true" />
            </Link>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[10px] font-medium text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-[#0E4D64]" aria-hidden="true" />
              راجع طلبك قبل التأكيد النهائي
            </p>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
