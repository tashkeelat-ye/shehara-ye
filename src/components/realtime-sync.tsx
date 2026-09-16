import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const REALTIME_TABLES = [
  "site_settings",
  "banners",
  "home_sections",
  "products",
  "categories",
  "vendors",
  "pages",
  "faqs",
  "payment_requests",
  "payment_methods",
  "orders",
  "order_items",
  "profiles",
] as const;

export type SheharaRealtimeDetail = {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE" | "*";
};

declare global {
  interface WindowEventMap {
    "shehara:realtime": CustomEvent<SheharaRealtimeDetail>;
  }
}

export function RealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let refreshTimer: number | null = null;

    const channel = supabase.channel(
      "shehara-global-database-realtime",
    );

    for (const table of REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        (payload) => {
          const eventType =
            payload.eventType as
              | "INSERT"
              | "UPDATE"
              | "DELETE"
              | "*";

          window.dispatchEvent(
            new CustomEvent("shehara:realtime", {
              detail: {
                table,
                eventType,
              },
            }),
          );

          if (refreshTimer !== null) {
            window.clearTimeout(refreshTimer);
          }

          refreshTimer = window.setTimeout(() => {
            void queryClient.invalidateQueries();
            refreshTimer = null;
          }, 150);
        },
      );
    }

    channel.subscribe((status, error) => {
      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT"
      ) {
        console.error(
          "[Shehara Realtime]",
          status,
          error,
        );
      }

      if (status === "SUBSCRIBED") {
        console.info(
          "[Shehara Realtime] Connected",
        );
      }
    });

    return () => {
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }

      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
}
