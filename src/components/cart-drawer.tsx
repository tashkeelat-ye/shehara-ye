import {
  Link,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "./product-image";

const BRAND = {
  teal: "#0D3B4D",
  dark: "#0A2A38",
  orange: "#E2723A",
  cream: "#F6F2EE",
};

export function CartDrawer() {
  const formatPrice = useFormatPrice();

  const {
    items,
    total,
    count,
    drawerOpen,
    setDrawerOpen,
    updateQuantity,
    removeItem,
  } = useCart();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!drawerOpen) {
      setMounted(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [drawerOpen]);

  if (!drawerOpen) {
    return null;
  }

  const closeDrawer = () => {
    setMounted(false);

    window.setTimeout(() => {
      setDrawerOpen(false);
    }, 220);
  };

  const handleQuantity = (
    lineId: string,
    quantity: number,
  ) => {
    void updateQuantity(
      lineId,
      quantity,
    );
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[999] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="سلة التسوق"
    >
      {/* الخلفية */}
      <button
        type="button"
        aria-label="إغلاق السلة"
        onClick={closeDrawer}
        className={`
          absolute
          inset-0
          bg-[#041922]/65
          backdrop-blur-md
          transition-opacity
          duration-300
          ${mounted ? "opacity-100" : "opacity-0"}
        `}
      />

      {/* اللوحة */}
      <aside
        className={`
          absolute
          inset-y-0
          end-0
          flex
          h-[100dvh]
          w-full
          max-w-[430px]
          flex-col
          overflow-hidden
          bg-[#F6F2EE]
          shadow-[-24px_0_80px_-35px_rgba(10,42,56,0.75)]
          transition-transform
          duration-300
          ease-out
          ${mounted ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* زخرفة علوية */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background:
              "linear-gradient(90deg, #E2723A, #0D3B4D, #E2723A)",
          }}
        />

        {/* الهيدر */}
        <header
          className="relative shrink-0 border-b border-[#0D3B4D]/10 px-4 pb-4 pt-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(13,59,77,0.98), rgba(10,42,56,0.98))",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="
                  grid
                  h-11
                  w-11
                  shrink-0
                  place-items-center
                  rounded-2xl
                  bg-white/10
                  text-[#E2723A]
                  ring-1
                  ring-white/10
                "
              >
                <ShoppingCart
                  className="h-5 w-5"
                  strokeWidth={2.2}
                />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-black text-white">
                  سلة التسوق
                </h2>

                <p className="mt-0.5 text-[11px] text-white/60">
                  {count.toLocaleString("ar-EG")}{" "}
                  {count === 1
                    ? "منتج"
                    : "منتجات"}{" "}
                  في سلتك
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="إغلاق السلة"
              onClick={closeDrawer}
              className="
                grid
                h-10
                w-10
                shrink-0
                place-items-center
                rounded-2xl
                bg-white/10
                text-white
                transition
                hover:bg-white/15
                active:scale-95
              "
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {items.length > 0 ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
              <Sparkles className="h-4 w-4 shrink-0 text-[#E2723A]" />

              <p className="text-[10px] font-medium leading-5 text-white/75">
                راجع منتجاتك قبل إتمام الطلب وتأكد من الكميات والخيارات.
              </p>
            </div>
          ) : null}
        </header>

        {/* المنتجات */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {items.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
              <div
                className="
                  relative
                  grid
                  h-24
                  w-24
                  place-items-center
                  rounded-[30px]
                  bg-white
                  shadow-[0_20px_50px_-30px_rgba(13,59,77,0.55)]
                  ring-1
                  ring-[#0D3B4D]/10
                "
              >
                <div className="absolute inset-2 rounded-[24px] border border-[#E2723A]/15" />

                <ShoppingBag
                  className="h-10 w-10"
                  style={{
                    color: BRAND.teal,
                  }}
                />
              </div>

              <h3
                className="mt-6 text-lg font-black"
                style={{
                  color: BRAND.dark,
                }}
              >
                سلتك فارغة
              </h3>

              <p className="mt-2 max-w-[280px] text-xs leading-6 text-slate-500">
                لم تضف أي منتج بعد. تصفح الأقسام واختر المنتجات التي ترغب بها.
              </p>

              <Link
                to="/products"
                onClick={() =>
                  setDrawerOpen(false)
                }
                className="
                  mt-6
                  inline-flex
                  h-11
                  items-center
                  gap-2
                  rounded-2xl
                  px-5
                  text-xs
                  font-black
                  text-white
                  shadow-[0_14px_30px_-18px_rgba(13,59,77,0.8)]
                  transition
                  active:scale-95
                "
                style={{
                  background:
                    `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.dark})`,
                }}
              >
                <ShoppingBag className="h-4 w-4" />
                تصفح الأقسام
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const image =
                  item.product.images?.[0] ||
                  "/placeholder.svg";

                const lineTotal =
                  Number(item.product.price || 0) *
                  item.quantity;

                return (
                  <article
                    key={item.id}
                    className="
                      overflow-hidden
                      rounded-[22px]
                      border
                      border-[#0D3B4D]/10
                      bg-white
                      p-2.5
                      shadow-[0_12px_35px_-28px_rgba(13,59,77,0.75)]
                      transition
                    "
                  >
                    <div className="flex gap-3">
                      <Link
                        to="/product/$id"
                        params={{
                          id: item.product_id,
                        }}
                        onClick={closeDrawer}
                        className="group shrink-0"
                      >
                        <div className="relative overflow-hidden rounded-[17px]">
                          <ProductImage
                            src={image}
                            alt={item.product.name}
                            className="
                              h-[92px]
                              w-[92px]
                              object-cover
                              transition
                              duration-500
                              group-hover:scale-105
                            "
                          />

                          {item.quantity > 1 ? (
                            <span className="
                              absolute
                              bottom-1.5
                              start-1.5
                              grid
                              h-6
                              min-w-6
                              place-items-center
                              rounded-full
                              bg-[#0D3B4D]/90
                              px-1.5
                              text-[9px]
                              font-black
                              text-white
                              backdrop-blur
                            ">
                              ×{item.quantity}
                            </span>
                          ) : null}
                        </div>
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <Link
                            to="/product/$id"
                            params={{
                              id: item.product_id,
                            }}
                            onClick={closeDrawer}
                            className="min-w-0 flex-1"
                          >
                            <h3 className="
                              line-clamp-2
                              text-[12px]
                              font-black
                              leading-5
                              text-[#0A2A38]
                            ">
                              {item.product.name}
                            </h3>
                          </Link>

                          <button
                            type="button"
                            aria-label="حذف المنتج"
                            onClick={() =>
                              void removeItem(
                                item.id,
                              )
                            }
                            className="
                              grid
                              h-8
                              w-8
                              shrink-0
                              place-items-center
                              rounded-xl
                              text-slate-400
                              transition
                              hover:bg-red-50
                              hover:text-red-500
                              active:scale-95
                            "
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {item.size ||
                        item.color ? (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {item.size ? (
                              <span className="
                                rounded-lg
                                bg-[#0D3B4D]/[0.06]
                                px-2
                                py-1
                                text-[9px]
                                font-bold
                                text-[#0D3B4D]
                              ">
                                المقاس: {item.size}
                              </span>
                            ) : null}

                            {item.color ? (
                              <span className="
                                rounded-lg
                                bg-[#E2723A]/[0.08]
                                px-2
                                py-1
                                text-[9px]
                                font-bold
                                text-[#A84E27]
                              ">
                                {item.color}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="mt-3 flex items-end justify-between gap-2">
                          <div>
                            <p className="
                              text-sm
                              font-black
                              text-[#E2723A]
                            ">
                              {formatPrice(lineTotal)}
                            </p>

                            {item.quantity > 1 ? (
                              <p className="mt-0.5 text-[9px] text-slate-400">
                                {formatPrice(
                                  item.product.price,
                                )}{" "}
                                ×{" "}
                                {item.quantity.toLocaleString(
                                  "ar-EG",
                                )}
                              </p>
                            ) : null}
                          </div>

                          <div className="
                            flex
                            h-9
                            items-center
                            rounded-xl
                            border
                            border-[#0D3B4D]/10
                            bg-[#F6F2EE]
                            p-1
                          ">
                            <button
                              type="button"
                              aria-label="تقليل الكمية"
                              onClick={() =>
                                handleQuantity(
                                  item.id,
                                  item.quantity - 1,
                                )
                              }
                              className="
                                grid
                                h-7
                                w-7
                                place-items-center
                                rounded-lg
                                text-[#0D3B4D]
                                transition
                                hover:bg-white
                                active:scale-90
                              "
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <span className="
                              min-w-[26px]
                              text-center
                              text-[11px]
                              font-black
                              text-[#0A2A38]
                            ">
                              {item.quantity.toLocaleString(
                                "ar-EG",
                              )}
                            </span>

                            <button
                              type="button"
                              aria-label="زيادة الكمية"
                              onClick={() =>
                                handleQuantity(
                                  item.id,
                                  item.quantity + 1,
                                )
                              }
                              className="
                                grid
                                h-7
                                w-7
                                place-items-center
                                rounded-lg
                                bg-white
                                text-[#E2723A]
                                shadow-sm
                                transition
                                hover:bg-[#E2723A]/10
                                active:scale-90
                              "
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
            </div>
          )}
        </div>

        {/* الفوتر */}
        {items.length > 0 ? (
          <footer
            className="
              shrink-0
              border-t
              border-[#0D3B4D]/10
              bg-white/95
              p-4
              pb-[max(16px,env(safe-area-inset-bottom))]
              shadow-[0_-20px_45px_-35px_rgba(13,59,77,0.8)]
              backdrop-blur-xl
            "
          >
            <div className="mb-3 rounded-2xl bg-[#F6F2EE] px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-500">
                  إجمالي المنتجات
                </span>

                <span className="text-base font-black text-[#0A2A38]">
                  {formatPrice(total)}
                </span>
              </div>
            </div>

            <Link
              to="/checkout"
              onClick={() =>
                setDrawerOpen(false)
              }
              className="
                group
                flex
                h-13
                w-full
                items-center
                justify-center
                gap-2
                rounded-[18px]
                text-sm
                font-black
                text-white
                shadow-[0_18px_35px_-20px_rgba(13,59,77,0.95)]
                transition
                hover:brightness-105
                active:scale-[0.985]
              "
              style={{
                background:
                  `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.dark})`,
              }}
            >
              <span>متابعة وإتمام الطلب</span>

              <ArrowLeft
                className="
                  h-4
                  w-4
                  transition-transform
                  duration-300
                  group-hover:-translate-x-1
                "
              />
            </Link>

            <p className="mt-2 text-center text-[9px] font-medium text-slate-400">
              يمكنك تعديل الكميات قبل تأكيد الطلب.
            </p>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
