import { cn } from "@/lib/utils";

interface LogoLoaderProps {
  className?: string;
  size?: number;
  fullPage?: boolean;
}

export function LogoLoader({ className, size = 64, fullPage = false }: LogoLoaderProps) {
  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-xs pointer-events-none">
        <img
          src="/splash.gif"
          alt="جاري التحميل..."
          style={{ width: `${size * 1.5}px`, height: `${size * 1.5}px` }}
          className="object-contain bg-transparent"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center bg-transparent p-2", className)}>
      <img
        src="/splash.gif"
        alt="جاري التحميل..."
        style={{ width: `${size}px`, height: `${size}px` }}
        className="object-contain bg-transparent pointer-events-none select-none"
      />
    </div>
  );
}
