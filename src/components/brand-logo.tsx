import { LOGO_ALT, LOGO_URL } from "@/lib/logo";

type BrandLogoProps = {
  size?: number;
  className?: string;
  decorative?: boolean;
  priority?: boolean;
};

export function BrandLogo({
  size = 48,
  className = "",
  decorative = false,
  priority = false,
}: BrandLogoProps) {
  const safeSize =
    Math.max(
      24,
      Math.round(size),
    );

  return (
    <span
      className={[
        "relative inline-flex shrink-0 items-center justify-center",
        className,
      ].join(" ")}
      style={{
        width: safeSize,
        height: safeSize,
      }}
    >
      {decorative ? (
        <span
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -inset-1
            rounded-2xl
            border
            border-[color:var(--brand-gold)]/25
          "
        />
      ) : null}

      <img
        src={LOGO_URL}
        alt={LOGO_ALT}
        width={safeSize}
        height={safeSize}
        loading={
          priority
            ? "eager"
            : "lazy"
        }
        fetchPriority={
          priority
            ? "high"
            : "auto"
        }
        decoding="async"
        draggable={false}
        onContextMenu={(
          event,
        ) => {
          event.preventDefault();
        }}
        onDragStart={(
          event,
        ) => {
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
    </span>
  );
}

export default BrandLogo;
