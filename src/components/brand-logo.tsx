import {
  LOGO_ALT,
  LOGO_URL,
} from "@/lib/logo";

type BrandLogoProps = {
  size?: number;
  className?: string;
  decorative?: boolean;
  priority?: boolean;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

export function BrandLogo({
  size = 48,
  className = "",
  decorative = false,
  priority = false,
  showWordmark = false,
  wordmarkClassName = "",
}: BrandLogoProps) {
  const safeSize = Math.max(
    24,
    Math.round(size),
  );

  const logoAlt = showWordmark
    ? LOGO_ALT
    : "شعار شهارة";

  return (
    <span
      className={[
        "relative inline-flex shrink-0 items-center",
        showWordmark
          ? "gap-2.5"
          : "justify-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        minHeight: safeSize,
      }}
      dir="rtl"
    >
      {/* الإطار الزخرفي الاختياري */}
      {decorative ? (
        <span
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -inset-1
            rounded-2xl
            border
            border-[#D65A31]/20
          "
        />
      ) : null}

      {/* الرمز الأساسي */}
      <span
        className="
          relative
          z-10
          inline-flex
          shrink-0
          items-center
          justify-center
          overflow-hidden
          rounded-xl
          bg-white
        "
        style={{
          width: safeSize,
          height: safeSize,
        }}
      >
        <img
          src={LOGO_URL}
          alt={logoAlt}
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
            block
            h-full
            w-full
            select-none
            object-contain
            [-webkit-user-drag:none]
          "
        />
      </span>

      {/* الاسم النصي الاختياري */}
      {showWordmark ? (
        <span
          className={[
            "flex flex-col leading-none",
            wordmarkClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span
            className="
              text-[1.05rem]
              font-black
              tracking-tight
              text-[#0E4D64]
            "
          >
            شهارة
          </span>

          <span
            dir="ltr"
            className="
              mt-1
              text-[0.48rem]
              font-bold
              uppercase
              tracking-[0.24em]
              text-[#D65A31]
            "
          >
            SHEHARA
          </span>
        </span>
      ) : null}
    </span>
  );
}

export default BrandLogo;
