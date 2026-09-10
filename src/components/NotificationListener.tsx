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

export function NotificationListener({
  currentUserId,
}: NotificationListenerProps) {
  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  const audioUnlockedRef =
    useRef(false);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let disposed = false;

    const createAudio = () => {
      if (
        typeof window === "undefined"
      ) {
        return null;
      }

      if (!audioRef.current) {
        const audio =
          new Audio(
            "/notification.mp3",
          );

        audio.preload = "auto";
        audio.volume = 1;
        audio.setAttribute(
          "playsinline",
          "true",
        );

        audioRef.current = audio;
      }

      return audioRef.current;
    };

    const unlockAudio = () => {
      if (
        disposed ||
        audioUnlockedRef.current
      ) {
        return;
      }

      const audio = createAudio();

      if (!audio) {
        return;
      }

      try {
        audio.currentTime = 0;

        void audio
          .play()
          .then(() => {
            if (disposed) {
              return;
            }

            audio.pause();
            audio.currentTime = 0;

            audioUnlockedRef.current =
              true;
          })
          .catch(() => {
            /*
             * المتصفح لم يسمح بعد
             * بتشغيل الصوت.
             *
             * سنعيد المحاولة مع تفاعل
             * مستخدم لاحق.
             */
          });
      } catch {
        // تجاهل منع المتصفح للصوت.
      }
    };

    const playNotificationSound =
      () => {
        const audio =
          createAudio();

        if (!audio) {
          return;
        }

        try {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 1;

          void audio.play().catch(
            (error) => {
              console.warn(
                "تعذر تشغيل صوت إشعار الطلب:",
                error,
              );
            },
          );
        } catch (error) {
          console.warn(
            "خطأ في تشغيل صوت إشعار الطلب:",
            error,
          );
        }
      };

    const handleVisibilityChange =
      () => {
        /*
         * عندما تعود لوحة الإدارة
         * إلى الواجهة، نعيد محاولة
         * فتح صلاحية الصوت.
         */
        if (
          document.visibilityState ===
          "visible"
        ) {
          unlockAudio();
        }
      };

    const handleFocus = () => {
      unlockAudio();
    };

    window.addEventListener(
      "pointerdown",
      unlockAudio,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "keydown",
      unlockAudio,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "touchstart",
      unlockAudio,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "click",
      unlockAudio,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    /*
     * نحاول تجهيز الصوت فوراً.
     * قد يمنعه المتصفح، لكن أول
     * تفاعل للمستخدم سيعيد المحاولة.
     */
    unlockAudio();

    const channel =
      supabase
        .channel(
          `admin-notifications-${currentUserId}`,
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
            const notification =
              payload.new as IncomingNotification;

            if (
              notification.kind !==
              "new_order"
            ) {
              return;
            }

            /*
             * الصوت داخل لوحة الإدارة.
             */
            playNotificationSound();

            /*
             * إشعار داخل لوحة الإدارة.
             */
            toast(
              notification.title ||
                "طلبية جديدة من شهارة 🛍️",
              {
                description:
                  notification.body ||
                  "لديك طلبية جديدة في لوحة الإدارة.",

                icon: (
                  <Bell className="h-4 w-4 text-primary" />
                ),

                duration: 15000,

                action: {
                  label: "فتح الطلبات",

                  onClick: () => {
                    window.location.href =
                      notification.link_url ||
                      "/admin/orders";
                  },
                },
              },
            );
          },
        )
        .subscribe((status) => {
          if (
            status === "CHANNEL_ERROR"
          ) {
            console.error(
              "تعذر الاشتراك في قناة إشعارات الإدارة.",
            );
          }
        });

    return () => {
      disposed = true;

      window.removeEventListener(
        "pointerdown",
        unlockAudio,
      );

      window.removeEventListener(
        "keydown",
        unlockAudio,
      );

      window.removeEventListener(
        "touchstart",
        unlockAudio,
      );

      window.removeEventListener(
        "click",
        unlockAudio,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      void supabase.removeChannel(
        channel,
      );

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }

      audioUnlockedRef.current =
        false;
    };
  }, [currentUserId]);

  return null;
}
