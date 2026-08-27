import {
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import {
  fetchBanners,
  type Banner,
} from "@/lib/store";

function AdImage({
  banner,
}: {
  banner: Banner;
}) {
  return (
    <img
      src={banner.image_url}
      alt={
        banner.title ||
        "إعلان من شهارة"
      }
      width={1200}
      height={420}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="h-full w-full select-none object-cover"
    />
  );
}

export function InterstitialAdSlider() {
  const {
    data: banners = [],
  } = useQuery({
    queryKey: [
      "banners",
      "interstitial",
    ],
    queryFn: () =>
      fetchBanners(true),
    staleTime:
      1000 * 60 * 5,
  });

  const [index, setIndex] =
    useState(0);

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
      }, 4500);

    return () =>
      window.clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return null;
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

  return (
    <section
      aria-label="إعلانات شهارة"
      className="relative overflow-hidden rounded-[1.75rem]"
      onMouseEnter={() => {
        paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
    >
      <div className="relative h-40 overflow-hidden rounded-[1.75rem] bg-[#0E4D64] sm:h-52 md:h-60">
        <AdImage banner={active} />

        <div className="absolute inset-0 bg-gradient-to-l from-[#0E4D64]/70 via-transparent to-transparent" />

        <div className="absolute inset-y-0 start-0 z-10 flex w-[70%] flex-col justify-center p-4 text-white sm:p-6">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-bold backdrop-blur">
            <Sparkles className="h-3 w-3 text-[#F6B39B]" />
            إعلان من شهارة
          </span>

          {active.title ? (
            <h2 className="mt-2 line-clamp-2 text-base font-black sm:text-xl">
              {active.title}
            </h2>
          ) : null}

          {active.subtitle ? (
            <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-white/75 sm:text-xs">
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
              className="mt-3 inline-flex w-fit min-h-9 items-center rounded-xl bg-[#D65A31] px-3.5 text-[10px] font-extrabold text-white transition hover:brightness-105 active:scale-95"
            >
              {active.cta_label}
            </Link>
          ) : null}
        </div>

        {banners.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="الإعلان السابق"
              onClick={() => go(-1)}
              className="absolute start-2 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#0E4D64] shadow-lg active:scale-90 sm:start-3"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              aria-label="الإعلان التالي"
              onClick={() => go(1)}
              className="absolute end-2 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#0E4D64] shadow-lg active:scale-90 sm:end-3"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
              {banners.map(
                (_, dot) => (
                  <button
                    key={dot}
                    type="button"
                    aria-label={`الإعلان ${dot + 1}`}
                    onClick={() =>
                      setIndex(dot)
                    }
                    className={`h-1.5 rounded-full transition-all ${
                      dot === index
                        ? "w-6 bg-[#D65A31]"
                        : "w-1.5 bg-white/60"
                    }`}
                  />
                ),
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
