import { memo, useState } from "react";
import { ImageOff } from "lucide-react";

type ProductImageProps = {
  src: string | undefined | null;
  alt: string;
  className?: string;
  eager?: boolean;
};

export const ProductImage = memo(function ProductImage({
  src,
  alt,
  className = "",
  eager = false,
}: ProductImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const hasSource =
    typeof src === "string" &&
    src.trim().length > 0;

  const showPlaceholder =
    !hasSource || failed;

  return (
    <div
      className={`relative overflow-hidden bg-secondary ${className}`}
    >
      {/* =====================================================
          حالة التحميل
          تبقى خلف الصورة حتى لا يحدث اهتزاز في الواجهة.
          ===================================================== */}
      {!loaded && !showPlaceholder ? (
        <div
          className="
            absolute inset-0
            animate-pulse
            bg-muted
          "
          aria-hidden="true"
        />
      ) : null}

      {/* =====================================================
          الصورة
          ===================================================== */}
      {hasSource && !failed ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          onLoad={() => {
            setLoaded(true);
          }}
          onError={() => {
            setFailed(true);
            setLoaded(true);
          }}
          className={`
            h-full
            w-full
            object-cover
            transition-opacity
            duration-300
            ${loaded ? "opacity-100" : "opacity-0"}
          `}
        />
      ) : null}

      {/* =====================================================
          الصورة غير متوفرة / فشل التحميل
          ===================================================== */}
      {showPlaceholder ? (
        <div
          className="
            absolute inset-0
            flex
            flex-col
            items-center
            justify-center
            gap-2
            bg-secondary
            text-muted-foreground
          "
          role="img"
          aria-label={
            failed
              ? `تعذر تحميل صورة ${alt}`
              : `لا توجد صورة لـ ${alt}`
          }
        >
          <div
            className="
              grid
              h-10
              w-10
              place-items-center
              rounded-full
              bg-card
              shadow-sm
            "
          >
            <ImageOff
              className="h-5 w-5 opacity-60"
              aria-hidden="true"
            />
          </div>

          <span className="px-3 text-center text-[9px] font-medium">
            الصورة غير متوفرة
          </span>
        </div>
      ) : null}
    </div>
  );
});

ProductImage.displayName = "ProductImage";
