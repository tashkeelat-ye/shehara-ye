import {
  useEffect,
  useState,
} from "react";

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
  duration = 2200,
}: AppSplashProps) {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = window.setTimeout(
      () => {
        setLeaving(true);
      },
      Math.max(duration - 450, 300),
    );

    const finishTimer = window.setTimeout(
      () => {
        setVisible(false);
        onFinished?.();
      },
      duration,
    );

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
      aria-label={BRAND_NAME}
      role="status"
      className={[
        "fixed inset-0 z-[10000] overflow-hidden",
        "flex items-center justify-center",
        "bg-white",
        "transition-opacity duration-500 ease-out",
        leaving
          ? "opacity-0"
          : "opacity-100",
      ].join(" ")}
    >
      {/* خلفية هوية شهارة */}
      <img
        src="/splash-background.png"
        alt=""
        aria-hidden="true"
        className={[
          "pointer-events-none",
          "absolute inset-0",
          "h-full w-full",
          "object-cover",
          "object-center",
          "select-none",
        ].join(" ")}
      />

      {/* طبقة بيضاء خفيفة للحفاظ على وضوح المحتوى */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute inset-0
          bg-white/10
        "
      />

      {/* محتوى شاشة الافتتاح */}
      <div
        className={[
          "relative z-10",
          "flex w-full max-w-sm flex-col items-center",
          "px-8 text-center",
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
            className="
              absolute
              inset-[-18px]
              animate-[pulse_2.6s_ease-in-out_infinite]
              rounded-full
              border
              border-[#CD562B]/20
            "
          />

          <div
            aria-hidden="true"
            className="
              absolute
              inset-[-8px]
              rounded-full
              border
              border-[#05465F]/15
            "
          />

          <div
            className="
              relative
              grid
              h-32
              w-32
              place-items-center
              rounded-[2.25rem]
              border
              border-[#CD562B]/35
              bg-white/95
              shadow-[0_20px_60px_rgba(0,0,0,0.18)]
              backdrop-blur-sm
            "
          >
            <BrandLogo
              size={104}
              className="
                h-[104px]
                w-[104px]
              "
            />
          </div>
        </div>

        {/* اسم شهارة */}
        <div
          className="
            animate-[fadeInUp_700ms_250ms_both]
          "
        >
          <h1
            className="
              text-[30px]
              font-extrabold
              tracking-tight
              text-[#05465F]
            "
          >
            {BRAND_NAME}
          </h1>

          <div
            className="
              mx-auto
              mt-2
              flex
              items-center
              justify-center
              gap-2
            "
          >
            <span className="h-px w-8 bg-[#CD562B]/80" />

            <span
              className="
                text-[10px]
                font-bold
                tracking-[0.22em]
                text-[#05465F]/80
              "
            >
              {BRAND_LATIN_NAME}
            </span>

            <span className="h-px w-8 bg-[#CD562B]/80" />
          </div>
        </div>

        {/* الشعار النصي */}
        <p
          className="
            mt-4
            animate-[fadeInUp_700ms_450ms_both]
            text-[13px]
            font-medium
            text-[#05465F]/70
          "
        >
          {STORE_TAGLINE}
        </p>

        {/* مؤشر التحميل */}
        <div
          className="
            mt-10
            animate-[fadeInUp_700ms_650ms_both]
          "
          aria-hidden="true"
        >
          <div
            className="
              flex
              items-center
              justify-center
              gap-1.5
            "
          >
            <span
              className="
                h-1.5
                w-1.5
                animate-[splashDot_1.2s_ease-in-out_infinite]
                rounded-full
                bg-[#CD562B]
              "
            />

            <span
              className="
                h-1.5
                w-1.5
                animate-[splashDot_1.2s_200ms_ease-in-out_infinite]
                rounded-full
                bg-[#CD562B]
              "
            />

            <span
              className="
                h-1.5
                w-1.5
                animate-[splashDot_1.2s_400ms_ease-in-out_infinite]
                rounded-full
                bg-[#CD562B]
              "
            />
          </div>
        </div>
      </div>

      {/* النص السفلي */}
      <div
        className={[
          "absolute bottom-8 left-0 right-0",
          "z-10 text-center",
          "transition-opacity duration-500",
          leaving
            ? "opacity-0"
            : "opacity-70",
        ].join(" ")}
      >
        <p
          className="
            text-[9px]
            font-medium
            tracking-wide
            text-[#05465F]/60
          "
        >
          متجر إلكتروني يمني
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
