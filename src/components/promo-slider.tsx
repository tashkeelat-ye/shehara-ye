import { useEffect, useState } from "react";
import banner from "@/assets/banner-1.jpg";
import { slides } from "@/data/mock";

export function PromoSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      5000,
    );
    return () => clearInterval(timer);
  }, []);

  const slide = slides[index];

  return (
    <section className="px-4 pt-4">
      <div className="relative overflow-hidden rounded-3xl shadow-brand">
        <img
          src={banner}
          alt="عروض تشكيلات"
          width={1200}
          height={700}
          className="h-44 w-full object-cover sm:h-60 md:h-72"
        />
        <div className="absolute inset-0 bg-brand-gradient opacity-80" />
        <div className="absolute inset-0 flex flex-col justify-center gap-2 p-5 text-primary-foreground sm:p-8">
          <span className="w-fit rounded-full bg-accent-solid px-3 py-1 text-[11px] text-accent-solid-foreground">
            عروض هذا الأسبوع
          </span>
          <h2 className="text-xl leading-snug sm:text-3xl">{slide.title}</h2>
          <p className="max-w-sm text-xs opacity-90 sm:text-sm">{slide.subtitle}</p>
          <button
            type="button"
            className="mt-1 w-fit rounded-full bg-card px-4 py-2 text-xs text-primary transition-transform active:scale-95 sm:text-sm"
          >
            {slide.cta}
          </button>
        </div>
        <div className="absolute bottom-3 start-5 flex gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`الشريحة ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-accent-solid" : "w-1.5 bg-card/60"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
