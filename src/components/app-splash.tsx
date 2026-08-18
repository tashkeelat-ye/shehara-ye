import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { STORE_TAGLINE } from "@/lib/logo";

type AppSplashProps = {
  onFinished?: () => void;
  duration?: number;
};

export function AppSplash({
  onFinished,
  duration = 2200,
}: AppSplashProps) {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => {
      setLeaving(true);
    }, Math.max(duration - 450, 300));

    const finishTimer = window.setTimeout(() => {
      setVisible(false);
      onFinished?.();
    }, duration);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(finishTimer);
    };
  }, [duration, onFinished]);

  if (!visible) {
    return null;
  }

  return (
    <div
      aria-label="تشكيلات"
      role="status"
      className={[
        "fixed inset-0 z-[10000] overflow-hidden",
        "flex items-center justify-center",
        "bg-[#4a1525]",
        "transition-opacity duration-500 ease-out",
        leaving ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      {/* الخلفية الزخرفية */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#b8954f]/[0.06] blur-3xl" />

        <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full border border-[#c6a15b]/10" />

        <div className="absolute -bottom-40 -left-32 h-80 w-80 rounded-full border border-[#c6a15b]/10" />

        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/10 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/15 to-transparent" />
      </div>

      {/* المحتوى */}
      <div
        className={[
          "relative z-10 flex w-full max-w-sm flex-col items-center px-8 text-center",
          "transition-all duration-700 ease-out",
          leaving
            ? "translate-y-2 scale-[0.98] opacity-0"
            : "translate-y-0 scale-100 opacity-100",
        ].join(" ")}
      >
        {/* الشعار */}
        <div className="relative mb-7">
          <div
            aria-hidden="true"
            className="absolute inset-[-18px] animate-[pulse_2.6s_ease-in-out_infinite] rounded-full border border-[#c6a15b]/15"
          />

          <div
            aria-hidden="true"
            className="absolute inset-[-8px] rounded-full border border-[#c6a15b]/20"
          />

          <div className="relative grid h-32 w-32 place-items-center rounded-[2.25rem] border border-[#c6a15b]/30 bg-[#3b0f1e]/80 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <BrandLogo
              size={88}
              className="h-[88px] w-[88px] object-contain"
            />
          </div>
        </div>

        {/* الاسم */}
        <div
          className="animate-[fadeInUp_700ms_250ms_both]"
        >
          <h1 className="text-[30px] font-extrabold tracking-tight text-[#f4dfaa]">
            تشكيلات
          </h1>

          <div className="mx-auto mt-2 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-[#c6a15b]/50" />

            <span className="text-[10px] font-medium tracking-[0.18em] text-[#e2c98d]/80">
              TASHKILAT
            </span>

            <span className="h-px w-8 bg-[#c6a15b]/50" />
          </div>
        </div>

        {/* العبارة */}
        <p
          className="mt-4 animate-[fadeInUp_700ms_450ms_both] text-[13px] font-medium text-[#f5ead1]/75"
        >
          {STORE_TAGLINE || "كل ما تحتاجه... في مكان واحد"}
        </p>

        {/* مؤشر التحميل */}
        <div
          className="mt-10 animate-[fadeInUp_700ms_650ms_both]"
          aria-hidden="true"
        >
          <div className="flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-[splashDot_1.2s_ease-in-out_infinite] rounded-full bg-[#c6a15b]" />

            <span className="h-1.5 w-1.5 animate-[splashDot_1.2s_200ms_ease-in-out_infinite] rounded-full bg-[#c6a15b]" />

            <span className="h-1.5 w-1.5 animate-[splashDot_1.2s_400ms_ease-in-out_infinite] rounded-full bg-[#c6a15b]" />
          </div>
        </div>
      </div>

      {/* العلامة السفلية */}
      <div
        className={[
          "absolute bottom-8 left-0 right-0 text-center",
          "transition-opacity duration-500",
          leaving ? "opacity-0" : "opacity-70",
        ].join(" ")}
      >
        <p className="text-[9px] font-medium tracking-wide text-[#ead7ad]/60">
          متجر يمني للتسوق الإلكتروني
        </p>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes splashDot {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(0.8);
          }

          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.55;
          }

          50% {
            transform: scale(1.04);
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
