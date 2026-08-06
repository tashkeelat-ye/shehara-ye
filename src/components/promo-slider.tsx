import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchBanners, type Banner } from "@/lib/store";

function BannerImage({ b, eager }: { b: Banner; eager: boolean }) {
  return (
    <img
      src={b.image_url}
      alt={b.title || "عرض من تشكيلات"}
      width={1200}
      height={700}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className="h-44 w-full select-none object-cover sm:h-60 md:h-72"
    />
  );
}

export function PromoSlider() {
  const { data: banners = [] } = useQuery({
    queryKey: ["banners", "active"],
    queryFn: () => fetchBanners(true),
  });
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const paused = useRef(false);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <section className="px-4 pt-4">
        <div className="h-44 w-full animate-pulse rounded-3xl bg-muted sm:h-60 md:h-72" />
      </section>
    );
  }

  const active = Math.min(index, banners.length - 1);

  function go(delta: number) {
    setIndex((i) => (i + delta + banners.length) % banners.length);
  }

  return (
    <section className="px-4 pt-4">
      <div
        className="relative overflow-hidden rounded-3xl shadow-brand"
        onPointerDown={(e) => {
          startX.current = e.clientX;
          paused.current = true;
        }}
        onPointerUp={(e) => {
          const from = startX.current;
          startX.current = null;
          paused.current = false;
          if (from === null) return;
          const dx = e.clientX - from;
          if (Math.abs(dx) < 40) return;
          // RTL: السحب لليسار يعني الانتقال للشريحة التالية
          go(dx > 0 ? -1 : 1);
        }}
        onPointerCancel={() => {
          startX.current = null;
          paused.current = false;
        }}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(${active * 100}%)` }}
        >
          {banners.map((b, i) => {
            const internal = b.link_url.startsWith("/");
            const body = <BannerImage b={b} eager={i === 0} />;
            return (
              <div key={b.id} className="w-full shrink-0">
                {b.link_url ? (
                  internal ? (
                    <Link to={b.link_url} className="block">
                      {body}
                    </Link>
                  ) : (
                    <a href={b.link_url} target="_blank" rel="noreferrer" className="block">
                      {body}
                    </a>
                  )
                ) : (
                  body
                )}
              </div>
            );
          })}
        </div>

        {banners.length > 1 ? (
          <div className="absolute bottom-3 start-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`الشريحة ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full shadow transition-all ${
                  i === active ? "w-6 bg-accent-solid" : "w-1.5 bg-card/80"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
