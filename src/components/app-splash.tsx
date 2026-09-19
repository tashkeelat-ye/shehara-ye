import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import {
  BRAND_NAME,
  BRAND_LATIN_NAME,
  STORE_TAGLINE,
} from "@/lib/logo";

type AppSplashProps = {
  onFinished?: () => void;
  duration?: number;
};

export function AppSplash({
  onFinished,
  duration = 2400,
}: AppSplashProps) {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const safeDuration = Math.max(duration, 1400);

    const leaveTimer = window.setTimeout(
      () => setLeaving(true),
      Math.max(safeDuration - 520, 700),
    );

    const finishTimer = window.setTimeout(() => {
      setVisible(false);
      onFinished?.();
    }, safeDuration);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(finishTimer);
    };
  }, [duration, onFinished]);

  if (!visible) return null;

  return (
    <div
      aria-label={BRAND_NAME}
      role="status"
      className={[
        "fixed inset-0 z-[10000] overflow-hidden",
        "flex items-center justify-center",
        "bg-[#071E28]",
        "transition-opacity duration-500 ease-out",
        leaving ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      <img
        src="/splash-background.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[#071E28]/35"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#071E28]/25 via-transparent to-[#071E28]/65"
      />

      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D65A31]/10 blur-[80px]"
      />

      <div
        className={[
          "relative z-10 flex w-full max-w-sm flex-col items-center px-8 text-center",
          "transition-all duration-700 ease-out",
          leaving
            ? "translate-y-4 scale-[.96] opacity-0"
            : "translate-y-0 scale-100 opacity-100",
        ].join(" ")}
      >
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-7 rounded-[38px] border border-white/15 opacity-80 animate-[logoPulse_2.8s_ease-in-out_infinite]"
          />
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-[32px] bg-white/10 blur-xl"
          />

          <div className="relative grid h-32 w-32 place-items-center rounded-[32px] border border-white/20 bg-white/95 shadow-[0_30px_90px_rgba(0,0,0,.35)] backdrop-blur">
            <BrandLogo size={104} priority />
          </div>
        </div>

        <div className="mt-8 animate-[fadeUp_700ms_180ms_both]">
          <h1 className="text-[32px] font-black tracking-tight text-white">
            {BRAND_NAME}
          </h1>

          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="h-px w-9 bg-[#D65A31]" />
            <span className="text-[10px] font-bold tracking-[.28em] text-white/75">
              {BRAND_LATIN_NAME}
            </span>
            <span className="h-px w-9 bg-[#D65A31]" />
          </div>
        </div>

        <p className="mt-4 animate-[fadeUp_700ms_360ms_both] text-sm font-semibold text-white/80">
          {STORE_TAGLINE}
        </p>

        <div className="mt-10 animate-[fadeUp_700ms_560ms_both]">
          <div className="flex items-center justify-center gap-2" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <span
                key={item}
                className="h-1.5 w-1.5 rounded-full bg-[#D65A31] animate-[splashDot_1.2s_ease-in-out_infinite]"
                style={{ animationDelay: `${item * 180}ms` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-7 left-0 right-0 z-10 text-center">
        <p className="text-[9px] font-medium tracking-wide text-white/50">
          متجر إلكتروني يمني
        </p>
      </div>

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes splashDot {
          0%, 100% {
            opacity: .25;
            transform: scale(.75);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        @keyframes logoPulse {
          0%, 100% {
            transform: scale(1);
            opacity: .35;
          }
          50% {
            transform: scale(1.04);
            opacity: .85;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

export default AppSplash;
