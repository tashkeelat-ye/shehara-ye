import { supabase } from "@/integrations/supabase/client";

export type SupportMessage = {
  id: string;
  thread_id: string;
  sender: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export type SupportThread = {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  last_message_at: string;
};

const T_COLUMNS = "id,user_id,subject,status,last_message_at";
const M_COLUMNS = "id,thread_id,sender,body,is_read,created_at";

export async function ensureThread(userId: string): Promise<SupportThread> {
  const { data: existing } = await supabase
    .from("support_threads")
    .select(T_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle<SupportThread>();
  if (existing) return existing;
  const { data, error } = await supabase
    .from("support_threads")
    .insert({ user_id: userId, subject: "خدمة العملاء" })
    .select(T_COLUMNS)
    .single<SupportThread>();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchMessages(threadId: string): Promise<SupportMessage[]> {
  const { data } = await supabase
    .from("support_messages")
    .select(M_COLUMNS)
    .eq("thread_id", threadId)
    .order("created_at")
    .returns<SupportMessage[]>();
  return data ?? [];
}

export async function sendMessage(threadId: string, body: string, sender: "user" | "admin") {
  const { error } = await supabase
    .from("support_messages")
    .insert({ thread_id: threadId, body, sender });
  if (error) throw new Error(error.message);
  await supabase
    .from("support_threads")
    .update({ last_message_at: new Date().toISOString(), status: "open" })
    .eq("id", threadId);
}

export async function fetchAllThreads(): Promise<(SupportThread & { unread: number })[]> {
  const { data: threads } = await supabase
    .from("support_threads")
    .select(T_COLUMNS)
    .order("last_message_at", { ascending: false })
    .returns<SupportThread[]>();
  const list = threads ?? [];
  const { data: msgs } = await supabase
    .from("support_messages")
    .select("thread_id,sender,is_read")
    .eq("sender", "user")
    .eq("is_read", false)
    .returns<{ thread_id: string; sender: string; is_read: boolean }[]>();
  const counts = new Map<string, number>();
  for (const m of msgs ?? []) counts.set(m.thread_id, (counts.get(m.thread_id) ?? 0) + 1);
  return list.map((t) => ({ ...t, unread: counts.get(t.id) ?? 0 }));
}

export async function markThreadRead(threadId: string, sender: "user" | "admin") {
  await supabase
    .from("support_messages")
    .update({ is_read: true })
    .eq("thread_id", threadId)
    .eq("sender", sender)
    .eq("is_read", false);
}
