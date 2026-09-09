import { useEffect } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

type NotificationListenerProps = {
  currentUserId?: string;
};

export function NotificationListener({
  currentUserId,
}: NotificationListenerProps) {
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let audio: HTMLAudioElement | null =
      null;

    const playNotificationSound = () => {
      try {
        if (!audio) {
          audio = new Audio(
            "/notification.mp3",
          );

          audio.preload = "auto";

          audio.volume = 1;
        }

        audio.currentTime = 0;

        void audio.play().catch(() => {
          /*
           * المتصفح قد يمنع الصوت إذا لم يوجد
           * تفاعل سابق مع الصفحة.
           *
           * Web Push في الخلفية يعتمد على صوت
           * نظام الإشعارات في الجهاز.
           */
        });
      } catch {
        // تجاهل منع التشغيل من المتصفح
      }
    };


    const channel = supabase
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
          const newNotification =
            payload.new as {
              id?: string;
              user_id?: string | null;
              title?: string | null;
              body?: string | null;
              kind?: string | null;
              link_url?: string | null;
            };

          if (
            newNotification.kind !==
            "new_order"
          ) {
            return;
          }

          playNotificationSound();

          toast(
            newNotification.title ||
              "طلب جديد من شهارة",
            {
              description:
                newNotification.body ||
                "وصل طلب جديد إلى لوحة الإدارة.",
              icon: (
                <Bell className="h-4 w-4 text-primary" />
              ),
              duration: 10000,
              action: {
                label: "فتح الطلبات",
                onClick: () => {
                  window.location.href =
                    newNotification.link_url ||
                    "/admin/orders";
                },
              },
            },
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );

      audio?.pause();

      audio = null;
    };
  }, [currentUserId]);

  return null;
}
