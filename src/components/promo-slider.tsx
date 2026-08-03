import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchBanners, type Banner } from "@/lib/store";

function BannerBody({ b }: { b: Banner }) {
  return (
    <>
      <img
        src={b.image_url}
        alt={b.title || "عرض من تشكيلات"}
        width={1200}
        height={700}
        loading="eager"
        decoding="async"
        className="h-44 w-full object-cover sm:h-60 md:h-72"
      />
      <div className="absolute inset-0 bg-brand-gradient opacity-80" />
      <div className="absolute inset-0 flex flex-col justify-center gap-2 p-5 text-primary-foreground sm:p-8">
        <span className="w-fit rounded-full bg-accent-solid px-3 py-1 text-[11px] text-accent-solid-foreground">
          عروض هذا الأسبوع
        </span>
        <h2 className="text-xl leading-snug sm:text-3xl">{b.title}</h2>
        {b.subtitle ? (
          <p className="max-w-sm text-xs opacity-90 sm:text-sm">{b.subtitle}</p>
        ) : null}
        {b.cta_label ? (
          <span className="mt-1 w-fit rounded-full bg-card px-4 py-2 text-xs text-primary sm:text-sm">
            {b.cta_label}
          </span>
        ) : null}
      </div>
    </>
  );
}

export function PromoSlider() {
  const { data: banners = [] } = useQuery({
    queryKey: ["banners", "active"],
    queryFn: () => fetchBanners(true),
  });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <section className="px-4 pt-4">
        <div className="h-44 w-full animate-pulse rounded-3xl bg-muted sm:h-60 md:h-72" />
      </section>
    );
  }

  const banner = banners[Math.min(index, banners.length - 1)]!;
  const internal = banner.link_url.startsWith("/");

  return (
    <section className="px-4 pt-4">
      <div className="relative overflow-hidden rounded-3xl shadow-brand">
        {banner.link_url ? (
          internal ? (
            <Link to={banner.link_url} className="block">
              <BannerBody b={banner} />
            </Link>
          ) : (
            <a href={banner.link_url} target="_blank" rel="noreferrer" className="block">
              <BannerBody b={banner} />
            </a>
          )
        ) : (
          <BannerBody b={banner} />
        )}
        {banners.length > 1 ? (
          <div className="absolute bottom-3 start-5 z-10 flex gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`الشريحة ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-accent-solid" : "w-1.5 bg-card/60"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
