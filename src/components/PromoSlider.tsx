import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";

import { fetchBanners, type Banner } from "@/lib/store";

function BannerImage({ banner, eager }: { banner: Banner; eager: boolean }) {
  return (
    <div className="relative aspect-[16/8] w-full overflow-hidden bg-[#0E4D64]/10 sm:aspect-[21/9]">
      <img
        src={banner.image_url}
        alt={banner.title || "عرض شهارة"}
        width={1200}
        height={600}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        draggable={false}
        className="h-full w-full select-none object-cover transition-transform duration-500 hover:scale-105"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      {banner.title && (
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 text-white">
          <p className="line-clamp-1 text-xs sm:text-base font-bold drop-shadow-md">
            {banner.title}
          </p>
        </div>
      )}
    </div>
  );
}

export function PromoSlider() {
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["banners", "active"],
    queryFn: () => fetchBanners(true),
    staleTime: 1000 * 60 * 5,
  });

  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (banners.length < 2 || isPaused) return;
    const timer = window.setTimeout(() => {
      setIndex((curr) => (curr + 1) % banners.length);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [banners.length, index, isPaused]);

  function go(delta: number) {
    if (banners.length < 2) return;
    setIndex((curr) => (curr + delta + banners.length) % banners.length);
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

  if (isLoading) {
    return (
      <div className="w-full aspect-[16/8] sm:aspect-[21/9] animate-pulse rounded-2xl bg-[#0E4D64]/10" />
    );
  }

  if (banners.length === 0) return null;

  const active = Math.min(index, banners.length - 1);

  return (
    <section className="w-full min-w-0" aria-label="العروض الترويجية">
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-[#0E4D64]/10 shadow-sm"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="relative w-full">
          {banners.map((banner, i) => {
            const linkUrl = banner.link_url || "";
            const isActive = i === active;
            const body = <BannerImage banner={banner} eager={i === 0} />;

            return (
              <div
                key={banner.id}
                className={`${i === 0 ? "relative" : "absolute inset-0"} w-full transition-opacity duration-500 ease-in-out ${
                  isActive ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
                }`}
                aria-hidden={!isActive}
              >
                {linkUrl ? (
                  linkUrl.startsWith("/") ? (
                    <Link to={linkUrl} tabIndex={isActive ? 0 : -1}>{body}</Link>
                  ) : (
                    <a href={linkUrl} target="_blank" rel="noreferrer" tabIndex={isActive ? 0 : -1}>{body}</a>
                  )
                ) : (
                  body
                )}
              </div>
            );
          })}
        </div>

        {/* مؤشرات التنقل السفلية */}
        {banners.length > 1 && (
          <div className="absolute bottom-2.5 end-3 z-20 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-md">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`شريحة ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "w-5 bg-[#D65A31]" : "w-1.5 bg-white/60 hover:bg-white"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default PromoSlider;
