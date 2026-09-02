import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import {
  fetchBanners,
  type Banner,
} from "@/lib/store";

import {
  BRAND_COLORS,
} from "@/lib/logo";

/**
 * =========================================================
 * تشكيلات للتسوق
 * Promo Slider
 * =========================================================
 *
 * المسؤوليات:
 *
 * - عرض البنرات الفعالة من قاعدة البيانات.
 * - التبديل التلقائي.
 * - السحب على الهاتف.
 * - دعم الروابط الداخلية والخارجية.
 * - دعم RTL.
 * - الحفاظ على صور الإعلانات الحالية.
 * - تطبيق إطار الهوية البصرية.
 * =========================================================
 */

function HeritageCorner({
  position,
}: {
  position:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left";
}) {
  const positionClass = {
    "top-right":
      "right-3 top-3",
    "top-left":
      "left-3 top-3",
    "bottom-right":
      "bottom-3 right-3",
    "bottom-left":
      "bottom-3 left-3",
  }[position];

  return (
    <span
      aria-hidden="true"
      className={`
        pointer-events-none
        absolute
        z-20
        hidden
        h-5
        w-5
        opacity-75
        sm:block
        ${positionClass}
      `}
    >
      <span
        className="
          absolute
          inset-1
          rotate-45
          border
          border-[#E0B85C]/70
        "
      />

      <span
        className="
          absolute
          left-1/2
          top-1/2
          h-1
          w-1
          -translate-x-1/2
          -translate-y-1/2
          rotate-45
          bg-[#E0B85C]
        "
      />
    </span>
  );
}

/**
 * =========================================================
 * صورة البنر
 * =========================================================
 */

function BannerImage({
  b,
  eager,
}: {
  b: Banner;
  eager: boolean;
}) {
  return (
    <div
      className="
        relative
        h-44
        w-full
        overflow-hidden
        bg-[#4A1525]
        sm:h-60
        md:h-72
      "
    >
      <img
        src={b.image_url}
        alt={
          b.title ||
          "عرض من تشكيلات"
        }
        width={1200}
        height={700}
        loading={
          eager
            ? "eager"
            : "lazy"
        }
        decoding="async"
        draggable={false}
        onContextMenu={(event) => {
          event.preventDefault();
        }}
        onDragStart={(event) => {
          event.preventDefault();
        }}
        className="
          h-full
          w-full
          select-none
          object-cover
          [-webkit-user-drag:none]
        "
      />

      {/*
       * طبقة حماية بصرية خفيفة.
       *
       * لا تحجب الإعلان ولا تقلل وضوحه،
       * وإنما تضيف لمسة من الهوية.
       */}

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-gradient-to-t
          from-[#35101C]/10
          via-transparent
          to-[#35101C]/5
        "
      />

      {/*
       * إطار داخلي ذهبي شديد الخفة.
       */}

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-1
          rounded-[1.35rem]
          border
          border-[#E0B85C]/15
        "
      />
    </div>
  );
}

/**
 * =========================================================
 * Promo Slider
 * =========================================================
 */

export function PromoSlider() {
  const {
    data: banners = [],
  } = useQuery({
    queryKey: [
      "banners",
      "active",
    ],
    queryFn: () =>
      fetchBanners(true),
    staleTime:
      1000 * 60 * 5,
    gcTime:
      1000 * 60 * 30,
  });

  const [
    index,
    setIndex,
  ] = useState(0);

  const startX =
    useRef<number | null>(
      null,
    );

  const paused =
    useRef(false);

  /**
   * =======================================================
   * التبديل التلقائي
   * =======================================================
   */

  useEffect(() => {
    if (banners.length < 2) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          if (
            !paused.current
          ) {
            setIndex(
              (current) =>
                (current + 1) %
                banners.length,
            );
          }
        },
        5000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, [banners.length]);

  /**
   * =======================================================
   * الحالة الانتقالية
   * =======================================================
   */

  useEffect(() => {
    if (
      banners.length === 0
    ) {
      return;
    }

    if (
      index >=
      banners.length
    ) {
      setIndex(0);
    }
  }, [
    banners.length,
    index,
  ]);

  /**
   * =======================================================
   * Skeleton
   * =======================================================
   */

  if (
    banners.length === 0
  ) {
    return (
      <section className="px-4 pt-4">
        <div
          className="
            relative
            h-44
            w-full
            overflow-hidden
            rounded-[1.75rem]
            border
            border-[#E0B85C]/15
            bg-[#4A1525]/5
            shadow-[0_15px_45px_-30px_rgba(74,21,37,0.55)]
            sm:h-60
            md:h-72
          "
          aria-label="جاري تحميل العروض"
          role="status"
        >
          <div
            className="
              absolute
              inset-0
              animate-pulse
              bg-muted
            "
          />

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              inset-3
              rounded-[1.35rem]
              border
              border-[#E0B85C]/20
            "
          />

          <HeritageCorner
            position="top-right"
          />

          <HeritageCorner
            position="top-left"
          />

          <HeritageCorner
            position="bottom-right"
          />

          <HeritageCorner
            position="bottom-left"
          />
        </div>
      </section>
    );
  }

  const active = Math.min(
    index,
    banners.length - 1,
  );

  /**
   * =======================================================
   * التنقل
   * =======================================================
   */

  function go(delta: number) {
    setIndex(
      (current) =>
        (current + delta + banners.length) %
        banners.length,
    );
  }

  /**
   * =======================================================
   * Pointer handlers
   * =======================================================
   */

  function handlePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    startX.current =
      event.clientX;

    paused.current = true;
  }

  function handlePointerUp(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const from =
      startX.current;

    startX.current = null;
    paused.current = false;

    if (from === null) {
      return;
    }

    const dx =
      event.clientX - from;

    if (
      Math.abs(dx) < 40
    ) {
      return;
    }

    /*
     * RTL:
     *
     * السحب لليسار:
     * الشريحة التالية.
     *
     * السحب لليمين:
     * الشريحة السابقة.
     */
    go(
      dx > 0
        ? -1
        : 1,
    );
  }

  function handlePointerCancel() {
    startX.current = null;
    paused.current = false;
  }

  /**
   * =======================================================
   * Render
   * =======================================================
   */

  return (
    <section
      className="
        px-4
        pt-4
      "
      aria-label="العروض والإعلانات"
    >
      <div
        className="
          relative
          overflow-hidden
          rounded-[1.75rem]
          border
          border-[#E0B85C]/25
          bg-[#4A1525]
          p-[3px]
          shadow-[0_18px_55px_-30px_rgba(74,21,37,0.65)]
          dark:border-[#E0B85C]/20
          dark:bg-[#35101C]
        "
        onPointerDown={
          handlePointerDown
        }
        onPointerUp={
          handlePointerUp
        }
        onPointerCancel={
          handlePointerCancel
        }
        onPointerLeave={() => {
          if (
            startX.current !==
            null
          ) {
            startX.current = null;
            paused.current = false;
          }
        }}
      >
        {/*
         * ===================================================
         * الإطار الداخلي
         * ===================================================
         */}

        <div
          className="
            relative
            overflow-hidden
            rounded-[1.55rem]
          "
          style={{
            background:
              `linear-gradient(
                135deg,
                ${BRAND_COLORS.orangeDeep},
                ${BRAND_COLORS.orange}
              )`,
          }}
        >
          {/*
           * زخارف الزوايا.
           */}

          <HeritageCorner
            position="top-right"
          />

          <HeritageCorner
            position="top-left"
          />

          <HeritageCorner
            position="bottom-right"
          />

          <HeritageCorner
            position="bottom-left"
          />

          {/*
           * العلامة المائية الهندسية.
           */}

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -right-16
              top-1/2
              z-10
              h-40
              w-40
              -translate-y-1/2
              rotate-45
              rounded-[2rem]
              border
              border-[#E0B85C]/[0.055]
            "
          />

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -left-16
              top-1/2
              z-10
              h-32
              w-32
              -translate-y-1/2
              rotate-45
              rounded-[1.5rem]
              border
              border-[#E0B85C]/[0.04]
            "
          />

          {/*
           * =================================================
           * الشرائح
           * =================================================
           */}

          <div
            className="
              flex
              touch-pan-y
              select-none
              transition-transform
              duration-500
              ease-out
            "
            style={{
              transform:
                `translateX(${active * 100}%)`,
            }}
          >
            {banners.map(
              (banner, i) => {
                const internal =
                  banner.link_url.startsWith(
                    "/",
                  );

                const body = (
                  <BannerImage
                    b={banner}
                    eager={i === 0}
                  />
                );

                return (
                  <div
                    key={banner.id}
                    className="
                      w-full
                      shrink-0
                    "
                    aria-hidden={
                      i !== active
                    }
                  >
                    {banner.link_url ? (
                      internal ? (
                        <Link
                          to={
                            banner.link_url
                          }
                          className="
                            block
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-inset
                            focus-visible:ring-[#E0B85C]
                          "
                        >
                          {body}
                        </Link>
                      ) : (
                        <a
                          href={
                            banner.link_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="
                            block
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-inset
                            focus-visible:ring-[#E0B85C]
                          "
                        >
                          {body}
                        </a>
                      )
                    ) : (
                      body
                    )}
                  </div>
                );
              },
            )}
          </div>

          {/*
           * =================================================
           * مؤشرات الشرائح
           * =================================================
           */}

          {banners.length >
          1 ? (
            <div
              className="
                absolute
                bottom-3
                start-1/2
                z-30
                flex
                -translate-x-1/2
                items-center
                gap-1.5
                rounded-full
                border
                border-white/10
                bg-[#35101C]/55
                px-2.5
                py-1.5
                shadow-lg
                backdrop-blur-sm
              "
              role="tablist"
              aria-label="شرائح العروض"
            >
              {banners.map(
                (
                  banner,
                  i,
                ) => (
                  <button
                    key={
                      banner.id
                    }
                    type="button"
                    role="tab"
                    aria-selected={
                      i === active
                    }
                    aria-label={`الانتقال إلى الشريحة ${
                      i + 1
                    }`}
                    onClick={() =>
                      setIndex(i)
                    }
                    className={`
                      h-1.5
                      rounded-full
                      transition-all
                      duration-300
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-[#E0B85C]
                      ${
                        i ===
                        active
                          ? "w-6 bg-[#E0B85C]"
                          : "w-1.5 bg-white/70 hover:bg-[#E0B85C]/70"
                      }
                    `}
                  />
                ),
              )}
            </div>
          ) : null}

          {/*
           * خط ذهبي سفلي خفيف.
           */}

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              inset-x-8
              bottom-0
              z-30
              h-px
              bg-gradient-to-r
              from-transparent
              via-[#E0B85C]/40
              to-transparent
            "
          />
        </div>
      </div>
    </section>
  );
}

export default PromoSlider;
