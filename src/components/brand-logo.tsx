import { LOGO_URL } from "@/lib/logo";

export function BrandLogo({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={LOGO_URL}
      alt="شعار تشكيلات للتسوق"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-xl object-contain ${className}`}
    />
  );
}
