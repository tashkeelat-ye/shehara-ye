import { useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

type NotificationListenerProps = {
  currentUserId?: string;
};

type IncomingNotification = {
  id?: string;
  user_id?: string | null;
  title?: string | null;
  body?: string | null;
  kind?: string | null;
  link_url?: string | null;
};

const NOTIFICATION_SOUND = "/notification.mp3";

const AUDIO_UNLOCK_STORAGE_KEY =
  "shehara_notification_audio_unlocked";

function createNotificationAudio(): HTMLAudioElement {
  const audio = new Audio(
    NOTIFICATION_SOUND,
  );

  audio.preload = "auto";
  audio.volume = 1;
  audio.setAttribute(
    "playsinline",
    "true",
  );

  return audio;
}

export function NotificationListener({
  currentUserId,
}: NotificationListenerProps) {
  const audioRef =
    useRef<HTMLAudioElement | null>(
      null,
    );

  const audioUnlockedRef =
    useRef(false);

  const mountedRef =
    useRef(false);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    mountedRef.current = true;

    let disposed = false;

    /*
     * ========================================================
     * إنشاء الصوت
     * ========================================================
     */

    const getAudio = () => {
      if (
        typeof window === "undefined"
      ) {
        return null;
      }

      if (!audioRef.current) {
        audioRef.current =
          createNotificationAudio();
      }

      return audioRef.current;
    };

    /*
     * ========================================================
     * اختبار تحميل ملف الصوت
     * ========================================================
     */

    const preloadAudio = () => {
      const audio = getAudio();

      if (!audio) {
        return;
      }

      try {
        audio.load();
      } catch {
        // لا نوقف الإشعارات إذا تعذر تحميل الصوت.
      }
    };

    /*
     * ========================================================
     * فتح صلاحية تشغيل الصوت
     *
     * Android/Chrome يمنع الصوت التلقائي قبل وجود
     * تفاعل من المستخدم.
     *
     * لذلك ننفذ تشغيل/إيقاف قصير جداً عند أول تفاعل.
     * ========================================================
     */

    const unlockAudio = () => {
      if (
        disposed ||
        audioUnlockedRef.current
      ) {
        return;
      }

      const audio = getAudio();

      if (!audio) {
        return;
      }

      try {
        audio.muted = true;
        audio.volume = 0;
        audio.currentTime = 0;

        const playPromise =
          audio.play();

        if (
          playPromise &&
          typeof playPromise.then ===
            "function"
        ) {
          void playPromise
            .then(() => {
              if (disposed) {
                return;
              }

              audio.pause();

              try {
                audio.currentTime = 0;
              } catch {
                // تجاهل.
              }

              audio.muted = false;
              audio.volume = 1;

              audioUnlockedRef.current =
                true;

              try {
                sessionStorage.setItem(
                  AUDIO_UNLOCK_STORAGE_KEY,
                  "true",
                );
              } catch {
                // تجاهل.
              }
            })
            .catch(() => {
              /*
               * سيعاد المحاولة عند التفاعل
               * التالي للمستخدم.
               */
            });
        }
      } catch {
        // المتصفح منع التشغيل.
      }
    };

    /*
     * ========================================================
     * تشغيل صوت الإشعار
     * ========================================================
     */

    const playNotificationSound =
      () => {
        if (disposed) {
          return;
        }

        const audio = getAudio();

        if (!audio) {
          return;
        }

        try {
          /*
           * إعادة الصوت من البداية حتى لو كان
           * هناك إشعار سابق ما زال يعمل.
           */
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          audio.volume = 1;

          const promise =
            audio.play();

          if (
            promise &&
            typeof promise.catch ===
              "function"
          ) {
            void promise.catch(
              (error) => {
                /*
                 * إذا منع المتصفح التشغيل،
                 * نحاول فتح الصوت مرة أخرى
                 * بعد تفاعل المستخدم.
                 */
                audioUnlockedRef.current =
                  false;

                console.warn(
                  "تعذر تشغيل صوت إشعار شهارة:",
                  error,
                );
              },
            );
          }
        } catch (error) {
          console.warn(
            "خطأ في تشغيل صوت إشعار شهارة:",
            error,
          );
        }
      };

    /*
     * ========================================================
     * تهيئة الصوت
     * ========================================================
     */

    preloadAudio();

    try {
      if (
        sessionStorage.getItem(
          AUDIO_UNLOCK_STORAGE_KEY,
        ) === "true"
      ) {
        /*
         * لا نعتمد على القيمة وحدها،
         * لأن المتصفح قد يعيد ضبط سياسة
         * التشغيل.
         */
        audioUnlockedRef.current =
          true;
      }
    } catch {
      // تجاهل.
    }

    /*
     * ========================================================
     * جميع تفاعلات المستخدم
     * ========================================================
     */

    const handleUserInteraction =
      () => {
        unlockAudio();
      };

    window.addEventListener(
      "pointerdown",
      handleUserInteraction,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "touchstart",
      handleUserInteraction,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "click",
      handleUserInteraction,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "keydown",
      handleUserInteraction,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "focus",
      handleUserInteraction,
    );

    /*
     * ========================================================
     * عند عودة التطبيق للواجهة
     * ========================================================
     */

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          preloadAudio();

          if (
            !audioUnlockedRef.current
          ) {
            unlockAudio();
          }
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    /*
     * ========================================================
     * محاولة أولية
     * ========================================================
     */

    unlockAudio();

    /*
     * ========================================================
     * Realtime notifications
     *
     * مهم:
     * نستقبل جميع أنواع إشعارات العميل.
     * لا نقتصر على new_order.
     * ========================================================
     */

    const channel =
      supabase
        .channel(
          `user-notifications-${currentUserId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            if (disposed) {
              return;
            }

            const notification =
              payload.new as IncomingNotification;

            /*
             * لا نحتاج إلى فحص kind هنا.
             *
             * أي إشعار يصل لهذا المستخدم
             * يجب أن يكون له صوت.
             */

            playNotificationSound();

            /*
             * عرض الإشعار داخل التطبيق.
             */

            toast(
              notification.title ||
                "إشعار من شهارة 🔔",
              {
                description:
                  notification.body ||
                  "لديك إشعار جديد من شهارة.",

                icon: (
                  <Bell className="h-4 w-4 text-primary" />
                ),

                duration: 15000,

                action:
                  notification.link_url
                    ? {
                        label:
                          "فتح",
                        onClick: () => {
                          window.location.href =
                            notification.link_url ||
                            "/";
                        },
                      }
                    : undefined,
              },
            );
          },
        )
        .subscribe((status) => {
          if (
            status ===
            "SUBSCRIBED"
          ) {
            console.info(
              "تم تفعيل إشعارات Realtime للمستخدم.",
            );
          }

          if (
            status ===
            "CHANNEL_ERROR"
          ) {
            console.error(
              "تعذر الاشتراك في قناة إشعارات المستخدم.",
            );
          }

          if (
            status ===
            "TIMED_OUT"
          ) {
            console.warn(
              "انتهت مهلة قناة إشعارات المستخدم.",
            );
          }
        });

    /*
     * ========================================================
     * تنظيف
     * ========================================================
     */

    return () => {
      disposed = true;
      mountedRef.current = false;

      window.removeEventListener(
        "pointerdown",
        handleUserInteraction,
      );

      window.removeEventListener(
        "touchstart",
        handleUserInteraction,
      );

      window.removeEventListener(
        "click",
        handleUserInteraction,
      );

      window.removeEventListener(
        "keydown",
        handleUserInteraction,
      );

      window.removeEventListener(
        "focus",
        handleUserInteraction,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      void supabase.removeChannel(
        channel,
      );

      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = "";
          audioRef.current.load();
        } catch {
          // تجاهل.
        }

        audioRef.current = null;
      }

      audioUnlockedRef.current =
        false;
    };
  }, [currentUserId]);

  return null;
}
