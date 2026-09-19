import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
} from "lucide-react";

import {
  fetchBanners,
  type Banner,
} from "@/lib/store";

/**
 * =========================================================
 * شهارة للتسوق — Main Promo Slider
 * =========================================================
 * البيانات والروابط والصور تأتي بالكامل من قاعدة البيانات.
 * لا توجد بيانات تجريبية أو Mock.
 * =========================================================
 */

function HeritageCorners() {
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute right-4 top-4 z-30 hidden h-7 w-7 rounded-[10px] border border-white/35 sm:block">
        <span className="absolute inset-1 rotate-45 border border-[#D65A31]/80" />
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute left-4 top-4 z-30 hidden h-7 w-7 rounded-[10px] border border-white/20 sm:block">
        <span className="absolute inset-1 rotate-45 border border-[#D65A31]/65" />
      </span>
    </>
  );
}

function BannerImage({
  banner,
  eager,
}: {
  banner: Banner;
  eager: boolean;
}) {
  return (
    <div className="relative aspect-[12/7] w-full overflow-hidden bg-[#0E4D64]">
      <img
        src={banner.image_url}
        alt={banner.title || "عرض من شهارة"}
        width={1200}
        height={700}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
        className="h-full w-full select-none object-cover [-webkit-user-drag:none]"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071B24]/35 via-transparent to-[#0E4D64]/[0.06]" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-[1.45rem] border border-white/20" />
    </div>
  );
}

export function PromoSlider() {
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["banners", "active"],
    queryFn: () => fetchBanners(true),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (banners.length === 0) return;
    setIndex((current) => current >= banners.length ? 0 : current);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length < 2 || isPaused) return;

    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % banners.length);
      setProgressKey((current) => current + 1);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [banners.length, index, isPaused, progressKey]);

  function go(delta: number) {
    if (banners.length < 2) return;
    setIndex((current) => (current + delta + banners.length) % banners.length);
    setProgressKey((current) => current + 1);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    startX.current = event.clientX;
    setIsPaused(true);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const from = startX.current;
    startX.current = null;
    setIsPaused(false);
    if (from === null || banners.length < 2) return;

    const distance = event.clientX - from;
    if (Math.abs(distance) < 40) return;

    go(distance > 0 ? -1 : 1);
  }

  function handlePointerCancel() {
    startX.current = null;
    setIsPaused(false);
  }

  if (isLoading || banners.length === 0) {
    return (
      <section
        className="relative overflow-hidden rounded-[1.9rem] border border-[#D65A31]/15 bg-[#0E4D64] p-1 shadow-[0_24px_70px_-42px_rgba(14,77,100,0.65)]"
        aria-label="جاري تحميل العروض"
        role="status"
      >
        <div className="aspect-[12/7] w-full animate-pulse rounded-[1.55rem] bg-white/10" />
        <HeritageCorners />
      </section>
    );
  }

  const active = Math.min(index, banners.length - 1);
  const activeBanner = banners[active];

  return (
    <section className="relative w-full" aria-label="العروض والإعلانات">
      <div
        className="relative overflow-hidden rounded-[1.9rem] border border-[#D65A31]/25 bg-[#0E4D64] p-1 shadow-[0_24px_70px_-42px_rgba(14,77,100,0.70)] dark:border-[#D65A31]/20 dark:bg-[#0A3D50]"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="relative overflow-hidden rounded-[1.6rem] bg-[#0E4D64]">
          {banners.map((banner, i) => {
            const internal = banner.link_url.startsWith("/");
            const isActive = i === active;
            const body = <BannerImage banner={banner} eager={i === 0} />;

            return (
              <div
                key={banner.id}
                className={`${i === 0 ? "relative" : "absolute inset-0"} w-full transition-all duration-700 ease-out ${isActive ? "z-10 scale-100 opacity-100" : "pointer-events-none z-0 scale-[1.015] opacity-0"}`}
                aria-hidden={!isActive}
              >
                {banner.link_url ? (
                  internal ? (
                    <Link
                      to={banner.link_url}
                      tabIndex={isActive ? 0 : -1}
                      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D65A31]"
                    >
                      {body}
                    </Link>
                  ) : (
                    <a
                      href={banner.link_url}
                      target="_blank"
                      rel="noreferrer"
                      tabIndex={isActive ? 0 : -1}
                      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D65A31]"
                    >
                      {body}
                    </a>
                  )
                ) : body}
              </div>
            );
          })}

          <HeritageCorners />

          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#071B24]/18 via-transparent to-white/[0.025]" />

          {banners.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="البنر السابق"
                onClick={() => go(-1)}
                className="absolute start-3 top-1/2 z-40 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#071B24]/45 text-white shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-[#071B24]/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31] sm:flex"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="البنر التالي"
                onClick={() => go(1)}
                className="absolute end-3 top-1/2 z-40 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#071B24]/45 text-white shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-[#071B24]/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31] sm:flex"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </>
          ) : null}

          <div className="absolute inset-x-3 bottom-3 z-40 flex items-end justify-between gap-3 sm:inset-x-4 sm:bottom-4">
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/15 bg-[#071B24]/48 px-3 py-1.5 text-[9px] font-bold text-white shadow-lg backdrop-blur-md sm:text-[10px]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D65A31] shadow-[0_0_12px_rgba(214,90,49,0.9)]" />
              <span className="truncate">{activeBanner.title || "عرض من شهارة"}</span>
            </div>

            {banners.length > 1 ? (
              <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-[#071B24]/48 px-2 py-1.5 text-[9px] font-black text-white shadow-lg backdrop-blur-md">
                <span>{active + 1}</span>
                <span className="text-white/45">/</span>
                <span className="text-white/70">{banners.length}</span>
              </div>
            ) : null}
          </div>

          {banners.length > 1 ? (
            <div className="absolute bottom-12 start-1/2 z-40 flex max-w-[65%] -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-[#071B24]/45 px-2.5 py-1.5 backdrop-blur-md sm:bottom-14" role="tablist" aria-label="شرائح العروض">
              {banners.map((banner, i) => (
                <button
                  key={banner.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`الانتقال إلى الشريحة ${i + 1}`}
                  onClick={() => {
                    setIndex(i);
                    setProgressKey((current) => current + 1);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31] ${i === active ? "w-7 bg-[#D65A31]" : "w-1.5 bg-white/65 hover:bg-white"}`}
                />
              ))}
            </div>
          ) : null}

          {banners.length > 1 ? (
            <button
              type="button"
              aria-label={isPaused ? "استئناف عرض البنرات" : "إيقاف عرض البنرات"}
              onClick={() => setIsPaused((value) => !value)}
              className="absolute bottom-3 end-3 z-50 hidden h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#071B24]/48 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31] sm:flex"
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
          ) : null}

          {banners.length > 1 ? (
            <span
              key={`${active}-${progressKey}`}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-50 h-0.5 origin-right bg-[#D65A31]"
              style={{
                animation: isPaused ? "none" : "shehara-banner-progress 5s linear forwards",
              }}
            />
          ) : null}
        </div>
      </div>

      <style>
        {`@keyframes shehara-banner-progress { from { transform: scaleX(1); opacity: .95; } to { transform: scaleX(0); opacity: .35; } }`}
      </style>
    </section>
  );
}

export default PromoSlider;
