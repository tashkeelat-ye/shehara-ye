import { supabase } from "@/integrations/supabase/client";

export type NotificationPrefs = {
  user_id: string;
  orders: boolean;
  promos: boolean;
  system: boolean;
  push_enabled: boolean;
};

const COLUMNS = "user_id,orders,promos,system,push_enabled";

export async function fetchNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const { data } = await supabase
    .from("notification_preferences")
    .select(COLUMNS)
    .eq("user_id", userId)
    .maybeSingle<NotificationPrefs>();
  if (data) return data;
  const fallback: NotificationPrefs = {
    user_id: userId,
    orders: true,
    promos: true,
    system: true,
    push_enabled: false,
  };
  await supabase.from("notification_preferences").upsert(fallback, { onConflict: "user_id" });
  return fallback;
}

export async function saveNotificationPrefs(prefs: NotificationPrefs) {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(prefs, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
