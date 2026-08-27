import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  fetchBanners,
  type Banner,
} from "@/lib/store";

function BannerImage({
  banner,
  eager,
}: {
  banner: Banner;
  eager: boolean;
}) {
  return (
    <img
      src={banner.image_url}
      alt={
        banner.title ||
        "عرض من شهارة"
      }
      width={1200}
      height={560}
      loading={
        eager ? "eager" : "lazy"
      }
      decoding="async"
      draggable={false}
      className="
        h-full
        w-full
        select-none
        object-cover
        transition-transform
        duration-700
      "
    />
  );
}

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

  const [index, setIndex] =
    useState(0);

  const startX =
    useRef<number | null>(null);

  const paused =
    useRef(false);

  useEffect(() => {
    if (banners.length < 2) {
      return;
    }

    const timer =
      window.setInterval(() => {
        if (!paused.current) {
          setIndex(
            (current) =>
              (current + 1) %
              banners.length,
          );
        }
      }, 5000);

    return () =>
      window.clearInterval(
        timer,
      );
  }, [banners.length]);

  useEffect(() => {
    if (
      index >= banners.length &&
      banners.length > 0
    ) {
      setIndex(0);
    }
  }, [
    banners.length,
    index,
  ]);

  if (banners.length === 0) {
    return (
      <section
        className="
          overflow-hidden
          rounded-[1.5rem]
          border
          border-[#0E4D64]/8
          bg-[#E8F1F4]
        "
      >
        <div
          className="
            h-48
            animate-pulse
            bg-[#0E4D64]/5
            sm:h-64
            md:h-80
          "
          aria-label="جاري تحميل العروض"
          role="status"
        />
      </section>
    );
  }

  const active =
    banners[
      Math.min(
        index,
        banners.length - 1,
      )
    ];

  const go = (
    delta: number,
  ) => {
    setIndex(
      (current) =>
        (current +
          delta +
          banners.length) %
        banners.length,
    );
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    startX.current =
      event.clientX;

    paused.current = true;
  };

  const handlePointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const from =
      startX.current;

    startX.current = null;
    paused.current = false;

    if (from === null) {
      return;
    }

    const distance =
      event.clientX - from;

    if (
      Math.abs(distance) < 40
    ) {
      return;
    }

    go(
      distance > 0
        ? -1
        : 1,
    );
  };

  return (
    <section
      aria-label="العروض من شهارة"
      className="
        overflow-hidden
        rounded-[1.5rem]
      "
    >
      <div
        className="
          relative
          overflow-hidden
          rounded-[1.5rem]
          bg-[#0E4D64]
          shadow-[0_18px_40px_-28px_rgba(14,77,100,0.7)]
        "
        onPointerDown={
          handlePointerDown
        }
        onPointerUp={
          handlePointerUp
        }
        onPointerCancel={() => {
          startX.current = null;
          paused.current = false;
        }}
      >
        <div
          className="
            relative
            h-48
            overflow-hidden
            sm:h-64
            md:h-80
          "
        >
          <BannerImage
            banner={active}
            eager
          />

          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-gradient-to-t
              from-[#0E4D64]/65
              via-[#0E4D64]/10
              to-transparent
            "
          />

          <div
            className="
              absolute
              inset-x-0
              bottom-0
              z-10
              p-5
              text-white
              sm:p-7
            "
          >
            {active.title ? (
              <h2
                className="
                  max-w-xl
                  text-lg
                  font-extrabold
                  sm:text-2xl
                "
              >
                {active.title}
              </h2>
            ) : null}

            {active.subtitle ? (
              <p
                className="
                  mt-1
                  max-w-lg
                  text-xs
                  leading-6
                  text-white/80
                  sm:text-sm
                "
              >
                {active.subtitle}
              </p>
            ) : null}

            {active.cta_label &&
            active.link_url ? (
              <Link
                to={
                  active.link_url.startsWith(
                    "/",
                  )
                    ? active.link_url
                    : "/"
                }
                className="
                  mt-3
                  inline-flex
                  min-h-10
                  items-center
                  rounded-xl
                  bg-[#D65A31]
                  px-4
                  text-xs
                  font-extrabold
                  text-white
                  shadow-lg
                  transition-all
                  duration-200
                  hover:bg-[#B74624]
                  active:scale-95
                "
              >
                {active.cta_label}
              </Link>
            ) : null}
          </div>

          {banners.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="العرض السابق"
                onClick={() => go(-1)}
                className="
                  absolute
                  start-3
                  top-1/2
                  z-20
                  grid
                  h-9
                  w-9
                  -translate-y-1/2
                  place-items-center
                  rounded-full
                  bg-white/90
                  text-[#0E4D64]
                  shadow-lg
                  transition-all
                  hover:bg-white
                  active:scale-90
                "
              >
                <ChevronRight
                  className="h-4 w-4"
                />
              </button>

              <button
                type="button"
                aria-label="العرض التالي"
                onClick={() => go(1)}
                className="
                  absolute
                  end-3
                  top-1/2
                  z-20
                  grid
                  h-9
                  w-9
                  -translate-y-1/2
                  place-items-center
                  rounded-full
                  bg-white/90
                  text-[#0E4D64]
                  shadow-lg
                  transition-all
                  hover:bg-white
                  active:scale-90
                "
              >
                <ChevronLeft
                  className="h-4 w-4"
                />
              </button>

              <div
                className="
                  absolute
                  bottom-3
                  left-1/2
                  z-20
                  flex
                  -translate-x-1/2
                  gap-1.5
                "
              >
                {banners.map(
                  (_, dotIndex) => (
                    <button
                      key={dotIndex}
                      type="button"
                      aria-label={`العرض ${dotIndex + 1}`}
                      onClick={() =>
                        setIndex(
                          dotIndex,
                        )
                      }
                      className={`
                        h-1.5
                        rounded-full
                        transition-all
                        duration-200
                        ${
                          dotIndex ===
                          index
                            ? "w-6 bg-[#D65A31]"
                            : "w-1.5 bg-white/60"
                        }
                      `}
                    />
                  ),
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
