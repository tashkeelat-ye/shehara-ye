import { LOGO_URL } from "@/lib/logo";

type BrandLogoProps = {
  size?: number;
  className?: string;
  decorative?: boolean;
  priority?: boolean;
};

/**
 * شعار تشكيلات للتسوق.
 *
 * المكوّن مصمم ليعمل على الخلفيات الفاتحة والداكنة،
 * مع الحفاظ على الهوية الرسمية: العنابي + الذهبي + الكريمي.
 */
export function BrandLogo({
  size = 40,
  className = "",
  decorative = true,
  priority = false,
}: BrandLogoProps) {
  const safeSize = Math.max(24, Math.round(size));

  return (
    <span
      className={`
        relative
        inline-flex
        shrink-0
        items-center
        justify-center
        overflow-visible
        ${className}
      `}
      style={{ width: safeSize, height: safeSize }}
      aria-label="شعار تشكيلات للتسوق"
    >
      {decorative && (
        <>
          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -inset-1.5
              rounded-[1.15rem]
              border
              border-[color:var(--brand-gold)]/30
              opacity-80
              transition-opacity
              duration-300
            "
          />

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -inset-[4px]
              rounded-[1.3rem]
              border
              border-[color:var(--brand-burgundy)]/10
              dark:border-[color:var(--brand-gold)]/12
            "
          />

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -left-1.5
              -top-1.5
              h-2.5
              w-2.5
              rotate-45
              rounded-[2px]
              border
              border-[color:var(--brand-gold)]/65
              bg-[color:var(--brand-cream)]
              dark:bg-[color:var(--brand-burgundy-deep)]
            "
          />

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -bottom-1.5
              -right-1.5
              h-2.5
              w-2.5
              rotate-45
              rounded-[2px]
              border
              border-[color:var(--brand-gold)]/65
              bg-[color:var(--brand-cream)]
              dark:bg-[color:var(--brand-burgundy-deep)]
            "
          />
        </>
      )}

      <span
        className="
          relative
          z-10
          flex
          h-full
          w-full
          items-center
          justify-center
          overflow-hidden
          rounded-[0.9rem]
          bg-[color:var(--brand-burgundy)]
          shadow-[0_8px_24px_-12px_color-mix(in_srgb,var(--brand-burgundy)_65%,transparent)]
          ring-1
          ring-inset
          ring-[color:var(--brand-gold)]/25
          dark:bg-[color:var(--brand-burgundy-deep)]
        "
      >
        <span
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--brand-gold)_14%,transparent),transparent_42%)]
          "
        />

        <img
          src={LOGO_URL}
          alt="شعار تشكيلات للتسوق"
          width={safeSize}
          height={safeSize}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          draggable={false}
          onContextMenu={(event) => {
            event.preventDefault();
          }}
          onDragStart={(event) => {
            event.preventDefault();
          }}
          className="
            relative
            z-10
            h-full
            w-full
            shrink-0
            select-none
            object-contain
            [-webkit-user-drag:none]
          "
        />

        <span
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            z-20
            rounded-[0.9rem]
            ring-1
            ring-inset
            ring-[color:var(--brand-gold)]/12
          "
        />
      </span>
    </span>
  );
}

export default BrandLogo;
