import { useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

type NotificationListenerProps = {
  currentUserId?: string;
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

    const unlockAudio = () => {
      if (audioUnlockedRef.current) {
        return;
      }

      try {
        if (!audioRef.current) {
          audioRef.current =
            new Audio(
              "/notification.mp3",
            );

          audioRef.current.preload =
            "auto";

          audioRef.current.volume = 1;
        }

        const audio =
          audioRef.current;

        audio.currentTime = 0;

        void audio
          .play()
          .then(() => {
            audio.pause();
            audio.currentTime = 0;

            audioUnlockedRef.current =
              true;
          })
          .catch(() => {
            // سيتم إعادة المحاولة عند تفاعل المستخدم.
          });
      } catch {
        // تجاهل منع المتصفح للصوت.
      }
    };

    const playNotificationSound =
      () => {
        try {
          if (!audioRef.current) {
            audioRef.current =
              new Audio(
                "/notification.mp3",
              );

            audioRef.current.preload =
              "auto";

            audioRef.current.volume = 1;
          }

          const audio =
            audioRef.current;

          audio.currentTime = 0;

          void audio.play().catch(
            () => {
              /*
               * إذا كان المتصفح يمنع
               * التشغيل، فلا نحاول تجاوز
               * سياسة المتصفح.
               */
            },
          );
        } catch {
          // تجاهل الخطأ.
        }
      };

    /*
     * فتح صلاحية تشغيل الصوت بعد أول
     * تفاعل حقيقي مع الصفحة.
     */
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
              payload.new as {
                id?: string;
                user_id?: string | null;
                title?: string | null;
                body?: string | null;
                kind?: string | null;
                link_url?: string | null;
              };

            /*
             * إشعارات الطلبات فقط.
             */
            if (
              notification.kind !==
              "new_order"
            ) {
              return;
            }

            playNotificationSound();

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
        .subscribe();

    return () => {
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
