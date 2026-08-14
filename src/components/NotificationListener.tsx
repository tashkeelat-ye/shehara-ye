import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell } from "lucide-react";

export function NotificationListener({ currentUserId }: { currentUserId?: string }) {
  useEffect(() => {
    const playNotificationSound = () => {
      try {
        // تم تحديث المسار ليشير مباشرة للملف داخل مجلد public
        const audio = new Audio("/notification.mp3");
        void audio.play();
      } catch (e) {
        console.log("Audio playback blocked by browser policy");
      }
    };

    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = payload.new;

          if (!newNotif.user_id || newNotif.user_id === currentUserId) {
            playNotificationSound();

            toast(newNotif.title, {
              description: newNotif.body,
              icon: <Bell className="h-4 w-4 text-primary" />,
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return null;
}
