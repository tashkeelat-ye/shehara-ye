import { LOGO_URL } from "@/lib/logo";

type BrandLogoProps = {
  size?: number;
  className?: string;
  decorative?: boolean;
  priority?: boolean;
};

export function BrandLogo({
  size = 40,
  className = "",
  decorative = true,
  priority = false,
}: BrandLogoProps) {
  const safeSize = Math.max(
    24,
    Math.round(size),
  );

  return (
    <span
      className={`
        relative
        inline-flex
        shrink-0
        items-center
        justify-center
        ${className}
      `}
      style={{
        width: safeSize,
        height: safeSize,
      }}
      aria-label="شعار تشكيلات للتسوق"
    >
      {decorative && (
        <>
          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -inset-1
              rounded-[1.15rem]
              border
              border-[#E0B85C]/35
              opacity-80
            "
          />

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -inset-[3px]
              rounded-[1.25rem]
              border
              border-[#4A1525]/10
              dark:border-[#E0B85C]/10
            "
          />

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -left-1
              -top-1
              h-2
              w-2
              rotate-45
              border
              border-[#E0B85C]/70
              bg-[#FBF7EF]
              dark:bg-[#35101C]
            "
          />

          <span
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -bottom-1
              -right-1
              h-2
              w-2
              rotate-45
              border
              border-[#E0B85C]/70
              bg-[#FBF7EF]
              dark:bg-[#35101C]
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
          rounded-xl
          bg-[#4A1525]
          shadow-[0_6px_18px_-10px_rgba(74,21,37,0.55)]
          ring-1
          ring-[#E0B85C]/20
          dark:bg-[#35101C]
        "
      >
        <img
          src={LOGO_URL}
          alt="شعار تشكيلات للتسوق"
          width={safeSize}
          height={safeSize}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={
            priority ? "high" : "auto"
          }
          decoding="async"
          draggable={false}
          onContextMenu={(event) => {
            event.preventDefault();
          }}
          onDragStart={(event) => {
            event.preventDefault();
          }}
          className="
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
            rounded-xl
            ring-1
            ring-inset
            ring-[#E0B85C]/10
          "
        />
      </span>
    </span>
  );
}

export default BrandLogo;
