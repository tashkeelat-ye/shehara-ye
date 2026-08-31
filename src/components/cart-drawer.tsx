import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";
import { ProductImage } from "./product-image";

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

  if (!drawerOpen) {
    return null;
  }

  const closeDrawer = () =>
    setDrawerOpen(false);

  return (
    <div
      dir="rtl"
      className="
        fixed
        inset-0
        z-[999]
        overflow-hidden
      "
      role="dialog"
      aria-modal="true"
      aria-label="سلة التسوق"
    >
      {/* الخلفية */}
      <button
        type="button"
        aria-label="إغلاق السلة"
        onClick={closeDrawer}
        className="
          absolute
          inset-0
          cursor-default
          bg-black/45
          backdrop-blur-[3px]
        "
      />

      {/* لوحة السلة */}
      <aside
        className="
          absolute
          inset-y-0
          end-0
          flex
          h-[100dvh]
          w-[94vw]
          max-w-[430px]
          flex-col
          overflow-hidden
          border-s
          border-border
          bg-background
          shadow-2xl
          animate-in
          slide-in-from-left
          duration-300
        "
      >
        {/* الرأس */}
        <header
          className="
            shrink-0
            border-b
            border-border/70
            bg-background/95
            backdrop-blur-xl
          "
        >
          <div
            className="
              flex
              min-h-16
              items-center
              justify-between
              px-4
              pt-[env(safe-area-inset-top)]
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  grid
                  h-10
                  w-10
                  place-items-center
                  rounded-2xl
                  bg-[#0E4D64]/10
                  text-[#0E4D64]
                  dark:text-[#9DD5E5]
                "
              >
                <ShoppingBag className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-black">
                  سلة التسوق
                </h2>

                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {count.toLocaleString(
                    "ar-EG",
                  )}{" "}
                  {count === 1
                    ? "منتج"
                    : "منتجات"}
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
                place-items-center
                rounded-2xl
                text-muted-foreground
                transition-colors
                hover:bg-muted
                hover:text-foreground
                active:scale-90
              "
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* محتوى السلة */}
        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            px-3
            py-3
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          {items.length === 0 ? (
            <EmptyCart
              onClose={closeDrawer}
            />
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const lineTotal =
                  Number(
                    item.product.price ??
                      0,
                  ) *
                  item.quantity;

                const stock =
                  Number(
                    item.product
                      .stock_left ?? 0,
                  );

                const canIncrease =
                  stock <= 0 ||
                  item.quantity <
                    stock;

                return (
                  <article
                    key={item.id}
                    className="
                      overflow-hidden
                      rounded-[1.35rem]
                      border
                      border-border/70
                      bg-card
                      p-3
                    "
                  >
                    <div className="flex gap-3">
                      {/* الصورة */}
                      <Link
                        to="/product/$id"
                        params={{
                          id: item.product_id,
                        }}
                        onClick={
                          closeDrawer
                        }
                        className="
                          relative
                          h-[92px]
                          w-[92px]
                          shrink-0
                          overflow-hidden
                          rounded-2xl
                          bg-muted
                        "
                      >
                        <ProductImage
                          src={
                            item.product
                              .images?.[0] ??
                            "/placeholder.svg"
                          }
                          alt={
                            item.product
                              .name
                          }
                          className="
                            h-full
                            w-full
                            object-cover
                          "
                        />
                      </Link>

                      {/* البيانات */}
                      <div
                        className="
                          flex
                          min-w-0
                          flex-1
                          flex-col
                        "
                      >
                        <div className="flex items-start gap-2">
                          <Link
                            to="/product/$id"
                            params={{
                              id: item.product_id,
                            }}
                            onClick={
                              closeDrawer
                            }
                            className="
                              line-clamp-2
                              min-w-0
                              flex-1
                              text-xs
                              font-black
                              leading-6
                              text-foreground
                            "
                          >
                            {
                              item.product
                                .name
                            }
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
                              text-muted-foreground
                              transition-colors
                              hover:bg-destructive/10
                              hover:text-destructive
                              active:scale-90
                            "
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* الخيارات */}
                        {item.size ||
                        item.color ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {item.size ? (
                              <span
                                className="
                                  rounded-lg
                                  bg-muted
                                  px-2
                                  py-1
                                  text-[9px]
                                  font-bold
                                  text-muted-foreground
                                "
                              >
                                المقاس:{" "}
                                {item.size}
                              </span>
                            ) : null}

                            {item.color ? (
                              <span
                                className="
                                  rounded-lg
                                  bg-muted
                                  px-2
                                  py-1
                                  text-[9px]
                                  font-bold
                                  text-muted-foreground
                                "
                              >
                                {item.color}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        <div
                          className="
                            mt-auto
                            flex
                            items-end
                            justify-between
                            gap-2
                            pt-2
                          "
                        >
                          <div>
                            <p
                              className="
                                text-sm
                                font-black
                                text-[#0E4D64]
                                dark:text-[#9DD5E5]
                              "
                            >
                              {formatPrice(
                                lineTotal,
                              )}
                            </p>

                            {item.quantity >
                            1 ? (
                              <p className="mt-0.5 text-[9px] text-muted-foreground">
                                {formatPrice(
                                  item.product
                                    .price,
                                )}{" "}
                                ×{" "}
                                {item.quantity.toLocaleString(
                                  "ar-EG",
                                )}
                              </p>
                            ) : null}
                          </div>

                          {/* التحكم بالكمية */}
                          <div
                            className="
                              flex
                              h-9
                              items-center
                              rounded-xl
                              border
                              border-border
                              bg-background
                            "
                          >
                            <button
                              type="button"
                              aria-label="تقليل الكمية"
                              onClick={() =>
                                void updateQuantity(
                                  item.id,
                                  item.quantity -
                                    1,
                                )
                              }
                              className="
                                grid
                                h-9
                                w-9
                                place-items-center
                                rounded-xl
                                text-foreground
                                transition-colors
                                hover:bg-muted
                                active:scale-90
                              "
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <span
                              className="
                                min-w-7
                                text-center
                                text-[11px]
                                font-black
                              "
                            >
                              {item.quantity.toLocaleString(
                                "ar-EG",
                              )}
                            </span>

                            <button
                              type="button"
                              aria-label="زيادة الكمية"
                              disabled={
                                !canIncrease
                              }
                              onClick={() =>
                                void updateQuantity(
                                  item.id,
                                  item.quantity +
                                    1,
                                )
                              }
                              className="
                                grid
                                h-9
                                w-9
                                place-items-center
                                rounded-xl
                                text-foreground
                                transition-colors
                                hover:bg-muted
                                active:scale-90
                                disabled:cursor-not-allowed
                                disabled:opacity-30
                              "
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {stock > 0 &&
                    item.quantity >=
                      stock ? (
                      <p className="mt-2 rounded-xl bg-[#D65A31]/10 px-2.5 py-2 text-[9px] font-bold text-[#D65A31]">
                        وصلت إلى الحد المتوفر
                        من المخزون
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* أسفل السلة */}
        {items.length > 0 ? (
          <footer
            className="
              shrink-0
              border-t
              border-border/70
              bg-background/95
              p-4
              pb-[calc(1rem+env(safe-area-inset-bottom))]
              backdrop-blur-xl
            "
          >
            {/* الإجمالي */}
            <div className="rounded-2xl bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground">
                  إجمالي المنتجات
                </span>

                <span
                  className="
                    text-lg
                    font-black
                    text-[#0E4D64]
                    dark:text-[#9DD5E5]
                  "
                >
                  {formatPrice(total)}
                </span>
              </div>

              <p className="mt-1 text-[9px] leading-5 text-muted-foreground">
                تكاليف الشحن وأي رسوم إضافية
                تُحسب عند إتمام الطلب.
              </p>
            </div>

            {/* زر الدفع */}
            <Link
              to="/checkout"
              onClick={closeDrawer}
              className="
                mt-3
                flex
                min-h-13
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-[#D65A31]
                px-4
                text-xs
                font-black
                text-white
                shadow-sm
                transition-all
                hover:bg-[#B74624]
                active:scale-[0.985]
              "
            >
              <span>
                إتمام الطلب
              </span>

              <ArrowLeft className="h-4 w-4" />
            </Link>

            {/* الاستمرار */}
            <button
              type="button"
              onClick={closeDrawer}
              className="
                mt-2
                flex
                min-h-10
                w-full
                items-center
                justify-center
                rounded-xl
                text-[10px]
                font-bold
                text-muted-foreground
                transition-colors
                hover:bg-muted
              "
            >
              متابعة التسوق
            </button>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

/* -------------------------------------------------- */
/* Empty cart                                         */
/* -------------------------------------------------- */

function EmptyCart({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div
      className="
        flex
        min-h-[calc(100dvh-7rem)]
        flex-col
        items-center
        justify-center
        px-6
        text-center
      "
    >
      <div
        className="
          grid
          h-20
          w-20
          place-items-center
          rounded-[1.7rem]
          bg-[#0E4D64]/10
          text-[#0E4D64]
          dark:text-[#9DD5E5]
        "
      >
        <ShoppingBag className="h-9 w-9" />
      </div>

      <h3 className="mt-5 text-base font-black">
        سلتك فارغة
      </h3>

      <p className="mt-2 max-w-[240px] text-[10px] leading-6 text-muted-foreground">
        لم تضف أي منتجات بعد.
        اكتشف منتجات شهارة وأضف ما
        يعجبك إلى سلتك.
      </p>

      <button
        type="button"
        onClick={onClose}
        className="
          mt-5
          rounded-2xl
          bg-[#0E4D64]
          px-6
          py-3
          text-[10px]
          font-black
          text-white
          transition-all
          active:scale-95
        "
      >
        ابدأ التسوق
      </button>
    </div>
  );
}
