import { supabase } from "@/integrations/supabase/client";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  link_url: string;
  kind: string;
  is_read: boolean;
  created_at: string;
};

const COLUMNS = "id,title,body,link_url,kind,is_read,created_at";

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data } = await supabase
    .from("notifications")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<AppNotification[]>();
  return data ?? [];
}

export async function markNotificationRead(id: string) {
  await supabase.from("notifications").update({ is_read: true }).eq("id", id);
}

export async function markAllNotificationsRead(userId: string) {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}

export async function deleteNotification(id: string) {
  await supabase.from("notifications").delete().eq("id", id);
}

export async function broadcastNotification(args: {
  title: string;
  body: string;
  link: string;
}) {
  const { error } = await supabase.rpc("broadcast_notification", {
    _title: args.title,
    _body: args.body,
    _link: args.link,
  });
  if (error) throw new Error(error.message);
}
