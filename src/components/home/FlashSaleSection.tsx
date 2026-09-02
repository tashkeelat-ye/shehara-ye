import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Clock,
  Heart,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type FlashSaleItem = {
  id: string;
  discount_percentage: number;
  ends_at: string;
  product: {
    id: string;
    name: string;
    price: number;
    old_price: number | null;
    images: string[];
    stock_left: number;
    total_stock: number;
  };
};

export function FlashSaleSection() {
  const [sales, setSales] = useState<FlashSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } =
    useWishlist();

  useEffect(() => {
    async function fetchFlashSales() {
      try {
        const { data, error } = await supabase
          .from("flash_sales")
          .select(`
            id,
            discount_percentage,
            ends_at,
            product:products (
              id,
              name,
              price,
              old_price,
              images,
              stock_left,
              total_stock
            )
          `)
          .eq("is_active", true)
          .gt(
            "ends_at",
            new Date().toISOString(),
          )
          .limit(8);

        if (!error && data) {
          const validSales = data.filter(
            (item) => item.product,
          ) as unknown as FlashSaleItem[];

          setSales(validSales);
        }
      } catch (err) {
        console.warn(
          "Could not load flash sales:",
          err,
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchFlashSales();
  }, []);

  useEffect(() => {
    if (sales.length === 0) return;

    const targetDate = new Date(
      sales[0]!.ends_at,
    ).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(interval);

        setTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0,
        });

        return;
      }

      const hours = Math.floor(
        (difference %
          (1000 * 60 * 60 * 24)) /
          (1000 * 60 * 60),
      );

      const minutes = Math.floor(
        (difference %
          (1000 * 60 * 60)) /
          (1000 * 60),
      );

      const seconds = Math.floor(
        (difference %
          (1000 * 60)) /
          1000,
      );

      setTimeLeft({
        hours,
        minutes,
        seconds,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sales]);

  if (loading) {
    return (
      <section className="py-8">
        <div className="container px-4">
          <Skeleton className="mb-6 h-10 w-48" />

          <div
            className="
              flex
              gap-3
              overflow-hidden
              md:grid
              md:grid-cols-4
            "
          >
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <Skeleton
                  key={index}
                  className="
                    h-64
                    min-w-[72%]
                    rounded-[20px]
                    sm:min-w-[45%]
                    md:min-w-0
                  "
                />
              ),
            )}
          </div>
        </div>
      </section>
    );
  }

  if (sales.length === 0) {
    return null;
  }

  return (
    <section
      className="
        relative
        overflow-hidden
        py-8
        bg-gradient-to-b
        from-[color:var(--brand-burgundy)]/[0.035]
        via-background
        to-background
      "
    >
      {/* العلامة المائية */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          end-[-70px]
          top-[-70px]
          h-48
          w-48
          rotate-45
          border
          border-[color:var(--brand-gold)]/[0.08]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          start-[-90px]
          bottom-[-100px]
          h-56
          w-56
          rotate-45
          border
          border-[color:var(--brand-burgundy)]/[0.045]
        "
      />

      <div className="container relative px-4">
        {/* =====================================================
            رأس القسم
            ===================================================== */}

        <div
          className="
            mb-6
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                relative
                grid
                h-11
                w-11
                shrink-0
                place-items-center
                overflow-hidden
                rounded-2xl
                bg-[color:var(--brand-burgundy)]
                text-[color:var(--brand-gold-soft)]
                shadow-[0_8px_20px_-12px_color-mix(in_srgb,var(--brand-burgundy)_80%,transparent)]
              "
            >
              <span
                aria-hidden="true"
                className="
                  absolute
                  inset-1.5
                  rotate-45
                  border
                  border-[color:var(--brand-gold)]/25
                "
              />

              <Zap
                className="
                  relative
                  h-5
                  w-5
                  fill-current
                "
                aria-hidden="true"
              />
            </div>

            <div>
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <h2
                  className="
                    text-xl
                    font-extrabold
                    tracking-tight
                    text-foreground
                  "
                >
                  عروض خاطفة
                </h2>

                <span
                  className="
                    hidden
                    rounded-full
                    bg-[color:var(--brand-gold)]/12
                    px-2
                    py-0.5
                    text-[9px]
                    font-bold
                    text-[color:var(--brand-burgundy)]
                    sm:inline-flex
                    dark:text-[color:var(--brand-gold)]
                  "
                >
                  محدود
                </span>
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground">
                خصومات لفترة محدودة، سارع قبل نفاذ
                الكمية!
              </p>
            </div>
          </div>

          {/* العداد */}
          <div
            className="
              flex
              w-fit
              items-center
              gap-1.5
              self-start
              rounded-full
              border
              border-[color:var(--brand-gold)]/20
              bg-card/95
              px-3
              py-1.5
              text-xs
              font-bold
              shadow-sm
              backdrop-blur-sm
              sm:self-auto
            "
          >
            <Clock
              className="
                h-4
                w-4
                text-[color:var(--brand-gold-deep)]
              "
              aria-hidden="true"
            />

            <span className="text-muted-foreground">
              ينتهي خلال:
            </span>

            <span
              className="
                rounded-md
                bg-[color:var(--brand-burgundy)]
                px-1.5
                py-0.5
                font-mono
                text-[color:var(--brand-gold-soft)]
              "
            >
              {String(timeLeft.hours).padStart(
                2,
                "0",
              )}
            </span>

            <span className="text-muted-foreground">
              :
            </span>

            <span
              className="
                rounded-md
                bg-[color:var(--brand-burgundy)]
                px-1.5
                py-0.5
                font-mono
                text-[color:var(--brand-gold-soft)]
              "
            >
              {String(
                timeLeft.minutes,
              ).padStart(2, "0")}
            </span>

            <span className="text-muted-foreground">
              :
            </span>

            <span
              className="
                rounded-md
                bg-[color:var(--brand-burgundy)]
                px-1.5
                py-0.5
                font-mono
                text-[color:var(--brand-gold-soft)]
              "
            >
              {String(
                timeLeft.seconds,
              ).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* =====================================================
            منطقة المنتجات
            الهاتف: تمرير أفقي
            سطح المكتب: شبكة
            ===================================================== */}

        <div className="relative">
          <div
            className="
              flex
              snap-x
              snap-mandatory
              gap-3
              overflow-x-auto
              overscroll-x-contain
              pb-3
              [scrollbar-width:none]
              [-ms-overflow-style:none]
              md:grid
              md:grid-cols-4
              md:gap-4
              md:overflow-visible
              md:pb-0
              [&::-webkit-scrollbar]:hidden
            "
          >
            {sales.map(
              ({
                id,
                discount_percentage,
                product,
              }) => {
                const stockLeft =
                  product.stock_left ?? 5;

                const totalStock =
                  product.total_stock ?? 20;

                const progressValue =
                  totalStock > 0
                    ? Math.min(
                        100,
                        Math.max(
                          0,
                          ((totalStock -
                            stockLeft) /
                            totalStock) *
                            100,
                        ),
                      )
                    : 0;

                const isInStock =
                  stockLeft > 0;

                return (
                  <article
                    key={id}
                    className="
                      group
                      relative
                      flex
                      min-w-[78%]
                      snap-start
                      flex-col
                      overflow-hidden
                      rounded-[20px]
                      border
                      border-[color:var(--brand-gold)]/15
                      bg-card
                      p-3
                      shadow-card
                      transition-all
                      duration-300
                      hover:-translate-y-0.5
                      hover:border-[color:var(--brand-gold)]/35
                      hover:shadow-[0_14px_35px_-24px_color-mix(in_srgb,var(--brand-burgundy)_70%,transparent)]
                      sm:min-w-[45%]
                      md:min-w-0
                    "
                  >
                    {/* صورة المنتج */}
                    <div
                      className="
                        relative
                        aspect-square
                        w-full
                        overflow-hidden
                        rounded-[16px]
                        bg-[color:var(--brand-paper)]
                        dark:bg-secondary
                      "
                    >
                      <Link
                        to="/product/$id"
                        params={{
                          id: product.id,
                        }}
                        aria-label={`عرض ${product.name}`}
                        className="
                          block
                          h-full
                          w-full
                          outline-none
                          focus-visible:ring-2
                          focus-visible:ring-inset
                          focus-visible:ring-[color:var(--brand-gold)]
                        "
                      >
                        <img
                          src={
                            product.images?.[0] ||
                            "/placeholder.svg"
                          }
                          alt={product.name}
                          loading="lazy"
                          draggable={false}
                          className="
                            h-full
                            w-full
                            select-none
                            object-cover
                            transition-transform
                            duration-500
                            group-hover:scale-[1.035]
                          "
                        />
                      </Link>

                      {/* خصم */}
                      <Badge
                        className="
                          absolute
                          end-2
                          top-2
                          border-0
                          bg-[color:var(--brand-burgundy)]
                          px-2
                          py-1
                          text-[9px]
                          font-extrabold
                          text-[color:var(--brand-gold-soft)]
                          shadow-sm
                        "
                      >
                        -{discount_percentage}%
                      </Badge>

                      {/* المفضلة */}
                      <button
                        type="button"
                        aria-label={
                          isInWishlist(
                            product.id,
                          )
                            ? "إزالة من المفضلة"
                            : "إضافة إلى المفضلة"
                        }
                        onClick={() =>
                          toggleWishlist(
                            product.id,
                          )
                        }
                        className="
                          absolute
                          start-2
                          top-2
                          grid
                          h-8
                          w-8
                          place-items-center
                          rounded-full
                          border
                          border-[color:var(--brand-gold)]/15
                          bg-card/90
                          text-foreground
                          shadow-sm
                          backdrop-blur-sm
                          outline-none
                          transition-all
                          hover:scale-105
                          hover:text-[color:var(--brand-burgundy)]
                          focus-visible:ring-2
                          focus-visible:ring-[color:var(--brand-gold)]
                          dark:hover:text-[color:var(--brand-gold)]
                        "
                      >
                        <Heart
                          className={`
                            h-4
                            w-4
                            transition-colors
                            ${
                              isInWishlist(
                                product.id,
                              )
                                ? "fill-[color:var(--brand-burgundy)] text-[color:var(--brand-burgundy)] dark:fill-[color:var(--brand-gold)] dark:text-[color:var(--brand-gold)]"
                                : ""
                            }
                          `}
                          aria-hidden="true"
                        />
                      </button>

                      {/* زخرفة صغيرة */}
                      <span
                        aria-hidden="true"
                        className="
                          pointer-events-none
                          absolute
                          bottom-2
                          start-2
                          h-2
                          w-2
                          rotate-45
                          border
                          border-[color:var(--brand-gold)]/35
                          opacity-0
                          transition-opacity
                          duration-300
                          group-hover:opacity-100
                        "
                      />
                    </div>

                    {/* تفاصيل المنتج */}
                    <div
                      className="
                        flex
                        flex-1
                        flex-col
                        justify-between
                        space-y-2
                        pt-2.5
                      "
                    >
                      <div>
                        <Link
                          to="/product/$id"
                          params={{
                            id: product.id,
                          }}
                          className="
                            line-clamp-2
                            min-h-[2.5rem]
                            text-sm
                            font-semibold
                            leading-[1.45]
                            text-foreground
                            outline-none
                            transition-colors
                            hover:text-[color:var(--brand-burgundy)]
                            focus-visible:ring-2
                            focus-visible:ring-[color:var(--brand-gold)]
                            dark:hover:text-[color:var(--brand-gold)]
                          "
                        >
                          {product.name}
                        </Link>

                        <div
                          className="
                            mt-1.5
                            flex
                            flex-wrap
                            items-baseline
                            gap-x-2
                            gap-y-0.5
                          "
                        >
                          <span
                            className="
                              text-sm
                              font-extrabold
                              text-[color:var(--brand-burgundy)]
                              dark:text-[color:var(--brand-gold)]
                            "
                          >
                            {product.price.toLocaleString(
                              "ar-EG",
                            )}{" "}
                            ر.ي
                          </span>

                          {product.old_price ? (
                            <span
                              className="
                                text-[10px]
                                text-muted-foreground
                                line-through
                              "
                            >
                              {product.old_price.toLocaleString(
                                "ar-EG",
                              )}{" "}
                              ر.ي
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* المخزون */}
                      <div className="space-y-1">
                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            gap-2
                            text-[9px]
                            font-semibold
                            text-muted-foreground
                          "
                        >
                          <span>
                            تم بيع الأكثرية
                          </span>

                          <span
                            className={
                              isInStock
                                ? "text-[color:var(--brand-burgundy)] dark:text-[color:var(--brand-gold)]"
                                : "text-destructive"
                            }
                          >
                            {isInStock
                              ? `متبقي ${stockLeft} فقط`
                              : "نفد المخزون"}
                          </span>
                        </div>

                        <Progress
                          value={
                            progressValue
                          }
                          className="
                            h-1.5
                            bg-muted
                          "
                        />
                      </div>

                      {/* زر السلة */}
                      <Button
                        type="button"
                        size="sm"
                        disabled={!isInStock}
                        className="
                          mt-1
                          min-h-9
                          w-full
                          gap-1.5
                          rounded-xl
                          border-0
                          bg-[color:var(--brand-burgundy)]
                          text-[color:var(--brand-gold-soft)]
                          shadow-sm
                          transition-all
                          hover:bg-[color:var(--brand-burgundy-soft)]
                          hover:shadow-md
                          active:scale-[0.97]
                          disabled:cursor-not-allowed
                          disabled:opacity-45
                        "
                        onClick={() =>
                          addItem({
                            productId:
                              product.id,
                            openDrawer: true,
                          })
                        }
                      >
                        <ShoppingBag
                          className="h-4 w-4"
                          aria-hidden="true"
                        />

                        <span>
                          {isInStock
                            ? "إضافة للسلة"
                            : "نفد المخزون"}
                        </span>
                      </Button>
                    </div>
                  </article>
                );
              },
            )}
          </div>

          {/* مؤشر التمرير على الهاتف */}
          {sales.length > 1 ? (
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                end-0
                top-1/2
                hidden
                -translate-y-1/2
                items-center
                justify-center
                rounded-s-full
                bg-card/90
                py-3
                ps-2
                pe-1
                text-[color:var(--brand-burgundy)]
                shadow-sm
                backdrop-blur-sm
                sm:flex
                md:hidden
                dark:text-[color:var(--brand-gold)]
              "
            >
              <ChevronLeft className="h-4 w-4" />
            </div>
          ) : null}
        </div>

        {/* نص إرشادي للهاتف */}
        {sales.length > 2 ? (
          <div
            className="
              mt-2
              flex
              items-center
              justify-center
              gap-1.5
              text-[9px]
              font-medium
              text-muted-foreground
              md:hidden
            "
          >
            <span
              aria-hidden="true"
              className="
                h-1
                w-1
                rounded-full
                bg-[color:var(--brand-gold)]
              "
            />

            اسحب لعرض المزيد

            <span
              aria-hidden="true"
              className="
                h-1
                w-1
                rounded-full
                bg-[color:var(--brand-gold)]
              "
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
