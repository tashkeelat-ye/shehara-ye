import { Link } from "@tanstack/react-router";

import {
  CookingPot,
  Landmark,
  Lamp,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Watch,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import {
  useEffect,
  useRef,
} from "react";

import { fetchCategories } from "@/lib/db";
import { SectionHeading } from "./section-heading";

const iconMap = {
  Shirt,
  Smartphone,
  CookingPot,
  Sparkles,
  ShoppingBasket,
  Watch,
  Lamp,
  Landmark,
};

export function CategoryStrip() {
  const {
    data: categories = [],
  } =
    useQuery({
      queryKey: [
        "categories",
      ],
      queryFn:
        fetchCategories,
    });

  const scrollerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const pausedRef =
    useRef(false);

  const directionRef =
    useRef(1);

  useEffect(() => {
    const scroller =
      scrollerRef.current;

    if (
      !scroller ||
      categories.length < 2
    ) {
      return;
    }

    let frame = 0;
    let lastTime = 0;

    const pause = () => {
      pausedRef.current =
        true;
    };

    const resume = () => {
      pausedRef.current =
        false;
    };

    const tick = (
      time: number,
    ) => {
      if (!lastTime) {
        lastTime = time;
      }

      const elapsed =
        Math.min(
          time - lastTime,
          50,
        );

      lastTime = time;

      if (
        !pausedRef.current &&
        scroller.scrollWidth >
          scroller.clientWidth
      ) {
        const maxScroll =
          scroller.scrollWidth -
          scroller.clientWidth;

        /*
         * سرعة هادئة حتى تكون
         * الحركة واضحة وغير مزعجة.
         */
        const step =
          (elapsed / 16.67) *
          0.55;

        const next =
          scroller.scrollLeft +
          directionRef.current *
            step;

        if (
          next >= maxScroll
        ) {
          scroller.scrollLeft =
            maxScroll;

          directionRef.current =
            -1;
        } else if (
          next <= 0
        ) {
          scroller.scrollLeft =
            0;

          directionRef.current =
            1;
        } else {
          scroller.scrollLeft =
            next;
        }
      }

      frame =
        window.requestAnimationFrame(
          tick,
        );
    };

    scroller.addEventListener(
      "pointerdown",
      pause,
      {
        passive: true,
      },
    );

    scroller.addEventListener(
      "pointerup",
      resume,
      {
        passive: true,
      },
    );

    scroller.addEventListener(
      "pointercancel",
      resume,
      {
        passive: true,
      },
    );

    scroller.addEventListener(
      "mouseenter",
      pause,
    );

    scroller.addEventListener(
      "mouseleave",
      resume,
    );

    scroller.addEventListener(
      "touchstart",
      pause,
      {
        passive: true,
      },
    );

    scroller.addEventListener(
      "touchend",
      resume,
      {
        passive: true,
      },
    );

    frame =
      window.requestAnimationFrame(
        tick,
      );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );

      scroller.removeEventListener(
        "pointerdown",
        pause,
      );

      scroller.removeEventListener(
        "pointerup",
        resume,
      );

      scroller.removeEventListener(
        "pointercancel",
        resume,
      );

      scroller.removeEventListener(
        "mouseenter",
        pause,
      );

      scroller.removeEventListener(
        "mouseleave",
        resume,
      );

      scroller.removeEventListener(
        "touchstart",
        pause,
      );

      scroller.removeEventListener(
        "touchend",
        resume,
      );
    };
  }, [
    categories.length,
  ]);

  return (
    <section className="space-y-4">
      <SectionHeading
        title="تسوق حسب الفئات"
        action="عرض الكل"
        to="/products"
      />

      <div className="relative">
        <div
          ref={scrollerRef}
          dir="ltr"
          aria-label="فئات المتجر"
          className="
            no-scrollbar
            w-full
            overflow-x-auto
            overscroll-x-contain
            px-4
            pb-1
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          <div
            dir="rtl"
            className="
              flex
              w-max
              flex-row-reverse
              gap-3
            "
          >
            {categories.map(
              (
                cat,
                index,
              ) => {
                const Icon =
                  iconMap[
                    cat.icon as keyof typeof iconMap
                  ] ?? Shirt;

                const hasImage =
                  Boolean(
                    cat.image_url,
                  );

                const orange =
                  index % 3 === 1;

                return (
                  <Link
                    key={cat.id}
                    to="/category/$slug"
                    params={{
                      slug: cat.slug,
                    }}
                    className="
                      group
                      flex
                      w-[82px]
                      shrink-0
                      flex-col
                      items-center
                      gap-2
                      rounded-2xl
                      p-1.5
                      transition-all
                      duration-200
                      hover:-translate-y-0.5
                      hover:bg-white
                      hover:shadow-[0_10px_30px_-25px_rgba(14,77,100,0.65)]
                      active:scale-95
                    "
                  >
                    <span
                      className={`
                        relative
                        grid
                        h-[62px]
                        w-[62px]
                        place-items-center
                        overflow-hidden
                        rounded-full
                        border
                        shadow-sm
                        transition-all
                        duration-200
                        group-hover:scale-105
                        ${
                          orange
                            ? "border-[#D65A31]/15 bg-[#D65A31]/10 text-[#D65A31]"
                            : "border-[#0E4D64]/12 bg-[#0E4D64]/7 text-[#0E4D64]"
                        }
                      `}
                    >
                      {hasImage ? (
                        <img
                          src={
                            cat.image_url!
                          }
                          alt={
                            cat.name
                          }
                          className="
                            h-full
                            w-full
                            object-cover
                          "
                        />
                      ) : (
                        <Icon
                          className="
                            h-6
                            w-6
                          "
                          strokeWidth={
                            1.8
                          }
                        />
                      )}
                    </span>

                    <span
                      className="
                        line-clamp-2
                        min-h-[2rem]
                        w-full
                        text-center
                        text-[11px]
                        font-semibold
                        leading-4
                        text-foreground
                      "
                    >
                      {cat.name}
                    </span>
                  </Link>
                );
              },
            )}
          </div>
        </div>

        {/* تلميح بصري بوجود المزيد */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-y-0
            start-0
            w-8
            bg-gradient-to-r
            from-[#FAF9F6]
            to-transparent
            dark:from-[#071B24]
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-y-0
            end-0
            w-8
            bg-gradient-to-l
            from-[#FAF9F6]
            to-transparent
            dark:from-[#071B24]
          "
        />
      </div>
    </section>
  );
}
