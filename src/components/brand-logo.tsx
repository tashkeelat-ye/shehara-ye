import {
  useEffect,
  useState,
} from "react";

import {
  getBranding,
  subscribeBranding,
  type BrandingSettings,
} from "@/lib/branding";

const LOCAL_LOGO = "/logo.png";
const ALTERNATE_LOCAL_LOGO = "/shehara-logo.png";
const LEGACY_STORAGE_PATH =
  "/storage/v1/object/public/branding/site/";

type BrandLogoProps = {
  size?: number;
  className?: string;
  decorative?: boolean;
  priority?: boolean;
  variant?: "default" | "header" | "sidebar" | "auth";
};

export function BrandLogo({
  size = 48,
  className = "",
  decorative = false,
  priority = false,
  variant = "default",
}: BrandLogoProps) {
  const [branding, setBranding] = useState<BrandingSettings>(
    getBranding(),
  );

  useEffect(() => {
    const unsubscribe = subscribeBranding(setBranding);

    return () => {
      unsubscribe();
    };
  }, []);

  const safeSize = Math.max(24, Math.round(size));

  const configuredSource =
    variant === "sidebar"
      ? branding.sidebar_logo_url
      : variant === "auth"
        ? branding.auth_logo_url
        : branding.header_logo_url;

  // تجاهل رابط الشعار القديم حتى لو وصل من قاعدة البيانات.
  const initialSource =
    !configuredSource ||
    configuredSource.includes(LEGACY_STORAGE_PATH)
      ? LOCAL_LOGO
      : configuredSource;

  const [src, setSrc] = useState(initialSource);

  useEffect(() => {
    setSrc(initialSource);
  }, [initialSource]);

  const handleImageError = (
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    const image = event.currentTarget;
    const failedSource = image.getAttribute("src");

    if (failedSource !== LOCAL_LOGO) {
      setSrc(LOCAL_LOGO);
      return;
    }

    if (failedSource !== ALTERNATE_LOCAL_LOGO) {
      setSrc(ALTERNATE_LOCAL_LOGO);
      return;
    }

    image.style.visibility = "hidden";
  };

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
            border-[#D65A31]/25
          "
        />
      ) : null}

      <img
        src={src}
        alt="شعار شهارة SHEHARA"
        width={safeSize}
        height={safeSize}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        draggable={false}
        onError={handleImageError}
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
    </span>
  );
}

export default BrandLogo;
