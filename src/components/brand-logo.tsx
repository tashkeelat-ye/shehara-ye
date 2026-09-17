import {
  useEffect,
  useState,
} from "react";

import {
  getBranding,
  subscribeBranding,
  type BrandingSettings,
} from "@/lib/branding";

type BrandLogoProps = {
  size?: number;
  className?: string;
  decorative?: boolean;
  priority?: boolean;

  /**
   * نوع الشعار المطلوب.
   *
   * header  = القائمة العلوية
   * sidebar = القائمة الجانبية
   * auth    = الدخول / التسجيل
   * default = الشعار العام
   */
  variant?:
    | "default"
    | "header"
    | "sidebar"
    | "auth";
};

export function BrandLogo({
  size = 48,
  className = "",
  decorative = false,
  priority = false,
  variant = "default",
}: BrandLogoProps) {
  const [
    branding,
    setBranding,
  ] =
    useState<BrandingSettings>(
      getBranding(),
    );

  useEffect(() => {
    return subscribeBranding(
      setBranding,
    );
  }, []);

  const safeSize =
    Math.max(
      24,
      Math.round(size),
    );

  let src =
    branding.header_logo_url;

  if (
    variant === "sidebar"
  ) {
    src =
      branding.sidebar_logo_url;
  }

  if (
    variant === "auth"
  ) {
    src =
      branding.auth_logo_url;
  }

  if (
    variant === "default"
  ) {
    src =
      branding.header_logo_url;
  }

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
        src={src}
        alt="شعار شهارة SHEHARA"
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
