import { useState } from "react";

export function ProductImage({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string | undefined;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-secondary ${className}`}>
      {!loaded ? (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />
      ) : null}
      {src ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
    </div>
  );
}
