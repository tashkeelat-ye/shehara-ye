import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

type AutoScrollRowProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  speed?: number;
  pauseAfterInteraction?: number;
  ariaLabel?: string;
};

export function AutoScrollRow({
  children,
  className = "",
  contentClassName = "",
  speed = 0.38,
  pauseAfterInteraction = 1800,
  ariaLabel = "محتوى قابل للتمرير",
}: AutoScrollRowProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const animationFrameRef =
    useRef<number | null>(null);

  const lastTimestampRef =
    useRef<number | null>(null);

  const directionRef =
    useRef(-1);

  const pausedRef =
    useRef(false);

  const resumeTimerRef =
    useRef<number | null>(null);

  const hasInteractionRef =
    useRef(false);

  const pauseTemporarily =
    useCallback(() => {
      pausedRef.current = true;

      if (
        resumeTimerRef.current !== null
      ) {
        window.clearTimeout(
          resumeTimerRef.current,
        );
      }

      resumeTimerRef.current =
        window.setTimeout(() => {
          pausedRef.current = false;
        }, pauseAfterInteraction);
    }, [
      pauseAfterInteraction,
    ]);

  const stopAnimation =
    useCallback(() => {
      if (
        animationFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          animationFrameRef.current,
        );

        animationFrameRef.current = null;
      }

      lastTimestampRef.current =
        null;
    }, []);

  const animate =
    useCallback(
      (timestamp: number) => {
        const container =
          containerRef.current;

        if (!container) {
          return;
        }

        if (
          lastTimestampRef.current ===
          null
        ) {
          lastTimestampRef.current =
            timestamp;
        }

        const elapsed =
          Math.min(
            timestamp -
              lastTimestampRef.current,
            50,
          );

        lastTimestampRef.current =
          timestamp;

        const maxScroll =
          container.scrollWidth -
          container.clientWidth;

        if (
          maxScroll > 1 &&
          !pausedRef.current
        ) {
          const movement =
            speed *
            (elapsed / 16.67);

          let next =
            container.scrollLeft +
            directionRef.current *
              movement;

          /*
           * RTL browsers تختلف في طريقة
           * تخزين scrollLeft، لذلك نستخدم
           * الحدود الفعلية بدلاً من الاعتماد
           * على قيمة موجبة/سالبة ثابتة.
           */
          const current =
            container.scrollLeft;

          const reachedEnd =
            directionRef.current < 0
              ? current <= -maxScroll + 1 ||
                current <= 1
              : current >= maxScroll - 1;

          if (reachedEnd) {
            directionRef.current *=
              -1;

            next =
              container.scrollLeft +
              directionRef.current *
                movement;
          }

          container.scrollLeft =
            next;
        }

        animationFrameRef.current =
          window.requestAnimationFrame(
            animate,
          );
      },
      [speed],
    );

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const pause = () => {
      hasInteractionRef.current =
        true;

      pauseTemporarily();
    };

    const resume = () => {
      if (
        !hasInteractionRef.current
      ) {
        return;
      }

      pausedRef.current = false;
    };

    const handleVisibility =
      () => {
        pausedRef.current =
          document.hidden;
      };

    container.addEventListener(
      "pointerdown",
      pause,
      { passive: true },
    );

    container.addEventListener(
      "pointerup",
      resume,
      { passive: true },
    );

    container.addEventListener(
      "pointercancel",
      resume,
      { passive: true },
    );

    container.addEventListener(
      "touchstart",
      pause,
      { passive: true },
    );

    container.addEventListener(
      "touchend",
      resume,
      { passive: true },
    );

    container.addEventListener(
      "mouseenter",
      () => {
        pausedRef.current = true;
      },
    );

    container.addEventListener(
      "mouseleave",
      () => {
        if (
          hasInteractionRef.current
        ) {
          pauseTemporarily();
        } else {
          pausedRef.current = false;
        }
      },
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    animationFrameRef.current =
      window.requestAnimationFrame(
        animate,
      );

    return () => {
      stopAnimation();

      if (
        resumeTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          resumeTimerRef.current,
        );
      }

      container.removeEventListener(
        "pointerdown",
        pause,
      );

      container.removeEventListener(
        "pointerup",
        resume,
      );

      container.removeEventListener(
        "pointercancel",
        resume,
      );

      container.removeEventListener(
        "touchstart",
        pause,
      );

      container.removeEventListener(
        "touchend",
        resume,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [
    animate,
    pauseTemporarily,
    stopAnimation,
  ]);

  return (
    <div
      ref={containerRef}
      dir="rtl"
      aria-label={ariaLabel}
      className={`
        no-scrollbar
        w-full
        overflow-x-auto
        overscroll-x-contain
        scroll-smooth
        [scrollbar-width:none]
        [-ms-overflow-style:none]
        [&::-webkit-scrollbar]:hidden
        ${className}
      `}
    >
      <div
        className={`
          flex
          w-max
          flex-row-reverse
          items-stretch
          gap-3
          ${contentClassName}
        `}
      >
        {children}
      </div>
    </div>
  );
}
