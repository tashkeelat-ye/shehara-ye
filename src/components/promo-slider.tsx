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

function BannerImage({
  banner,
  eager,
}: {
  banner: Banner;
  eager: boolean;
}) {
  return (
    <div className="relative aspect-[2/1] w-full overflow-hidden bg-[var(--brand-burgundy)] min-[420px]:aspect-[16/9] sm:aspect-[12/7]">
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

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071B24]/25 via-transparent to-[#071B24]/[0.025]"
      />
    </div>
  );
}

function BannerSkeleton() {
  return (
    <section
      className="w-full"
      aria-label="جاري تحميل العروض"
      role="status"
    >
      <div className="aspect-[2/1] w-full animate-pulse overflow-hidden rounded-2xl bg-[var(--brand-burgundy)]/10 min-[420px]:aspect-[16/9] sm:aspect-[12/7]" />
      <span className="sr-only">جاري تحميل العروض...</span>
    </section>
  );
}

export function PromoSlider() {
  const {
    data: banners = [],
    isLoading,
  } = useQuery({
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
    if (banners.length === 0) {
      setIndex(0);
      return;
    }

    setIndex((current) =>
      current >= banners.length ? 0 : current,
    );
  }, [banners.length]);

  useEffect(() => {
    if (banners.length < 2 || isPaused) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % banners.length);
      setProgressKey((current) => current + 1);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [banners.length, index, isPaused, progressKey]);

  function go(delta: number) {
    if (banners.length < 2) {
      return;
    }

    setIndex(
      (current) =>
        (current + delta + banners.length) % banners.length,
    );
    setProgressKey((current) => current + 1);
  }

  function selectBanner(nextIndex: number) {
    setIndex(nextIndex);
    setProgressKey((current) => current + 1);
  }

  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>,
  ) {
    startX.current = event.clientX;
    setIsPaused(true);
  }

  function handlePointerUp(
    event: PointerEvent<HTMLDivElement>,
  ) {
    const from = startX.current;

    startX.current = null;
    setIsPaused(false);

    if (from === null || banners.length < 2) {
      return;
    }

    const distance = event.clientX - from;

    if (Math.abs(distance) < 40) {
      return;
    }

    go(distance > 0 ? -1 : 1);
  }

  function handlePointerCancel() {
    startX.current = null;
    setIsPaused(false);
  }

  if (isLoading) {
    return <BannerSkeleton />;
  }

  if (banners.length === 0) {
    return null;
  }

  const active = Math.min(index, banners.length - 1);
  const activeBanner = banners[active];

  return (
    <section
      className="w-full min-w-0"
      aria-label="العروض والإعلانات"
    >
      <div
        className="relative w-full min-w-0"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="relative overflow-hidden rounded-2xl border border-[var(--brand-gold)]/20 bg-[var(--brand-burgundy)] shadow-[0_12px_32px_-25px_rgba(7,27,36,0.55)] sm:rounded-3xl">
          {banners.map((banner, i) => {
            const linkUrl = banner.link_url || "";
            const internal = linkUrl.startsWith("/");
            const isActive = i === active;

            const body = (
              <BannerImage
                banner={banner}
                eager={i === 0}
              />
            );

            return (
              <div
                key={banner.id}
                className={`${i === 0 ? "relative" : "absolute inset-0"} w-full transition-opacity duration-500 ease-out ${
                  isActive
                    ? "z-10 opacity-100"
                    : "pointer-events-none z-0 opacity-0"
                }`}
                aria-hidden={!isActive}
              >
                {linkUrl ? (
                  internal ? (
                    <Link
                      to={linkUrl}
                      tabIndex={isActive ? 0 : -1}
                      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-gold)]"
                    >
                      {body}
                    </Link>
                  ) : (
                    <a
                      href={linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      tabIndex={isActive ? 0 : -1}
                      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-gold)]"
                    >
                      {body}
                    </a>
                  )
                ) : (
                  body
                )}
              </div>
            );
          })}

          {banners.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="البنر السابق"
                onClick={() => go(-1)}
                className="absolute start-3 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#071B24]/45 text-white shadow-md backdrop-blur-md transition hover:bg-[#071B24]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] sm:flex"
              >
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                aria-label="البنر التالي"
                onClick={() => go(1)}
                className="absolute end-3 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#071B24]/45 text-white shadow-md backdrop-blur-md transition hover:bg-[#071B24]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] sm:flex"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                aria-label={
                  isPaused
                    ? "استئناف عرض البنرات"
                    : "إيقاف عرض البنرات"
                }
                onClick={() =>
                  setIsPaused((value) => !value)
                }
                className="absolute bottom-3 end-3 z-30 hidden h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-[#071B24]/50 text-white backdrop-blur-md transition hover:bg-[#071B24]/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] sm:flex"
              >
                {isPaused ? (
                  <Play className="h-3.5 w-3.5" />
                ) : (
                  <Pause className="h-3.5 w-3.5" />
                )}
              </button>
            </>
          ) : null}

          {banners.length > 1 ? (
            <span
              key={`${active}-${progressKey}`}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-0.5 origin-right bg-[var(--brand-gold)]"
              style={{
                animation: isPaused
                  ? "none"
                  : "shehara-banner-progress 5s linear forwards",
              }}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex min-h-8 min-w-0 items-center justify-between gap-3 px-1">
        <p
          className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--foreground)]"
          aria-live="polite"
        >
          {activeBanner.title || "عرض من شهارة"}
        </p>

        {banners.length > 1 ? (
          <div
            className="flex shrink-0 items-center gap-1.5"
            role="group"
            aria-label="التنقل بين العروض"
          >
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`عرض الشريحة ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => selectBanner(i)}
                className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2 ${
                  i === active
                    ? "w-5 bg-[var(--brand-gold)]"
                    : "w-2 bg-[var(--brand-burgundy)]/25 hover:bg-[var(--brand-burgundy)]/50 dark:bg-white/25 dark:hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        ) : null}

        {banners.length > 1 ? (
          <span
            className="shrink-0 text-[10px] tabular-nums text-muted-foreground"
            dir="ltr"
          >
            {active + 1}/{banners.length}
          </span>
        ) : null}
      </div>

      <style>
        {`@keyframes shehara-banner-progress {
          from { transform: scaleX(1); opacity: .9; }
          to { transform: scaleX(0); opacity: .35; }
        }`}
      </style>
    </section>
  );
}

export default PromoSlider;
