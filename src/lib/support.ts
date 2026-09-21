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

export type SupportThreadSummary = SupportThread & {
  user_name: string;
  user_phone: string;
  unread: number;
  last_message: string;
  last_sender: string;
  message_count: number;
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
  const { data, error } = await supabase
    .from("support_messages")
    .select(M_COLUMNS)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .returns<SupportMessage[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function sendMessage(
  threadId: string,
  body: string,
  sender: "user" | "admin",
) {
  const cleanBody = body.trim();
  if (!cleanBody) throw new Error("الرسالة فارغة");

  const { error } = await supabase
    .from("support_messages")
    .insert({
      thread_id: threadId,
      body: cleanBody.slice(0, 2000),
      sender,
      is_read: false,
    });

  if (error) throw new Error(error.message);

  const { error: threadError } = await supabase
    .from("support_threads")
    .update({
      last_message_at: new Date().toISOString(),
      status: "open",
    })
    .eq("id", threadId);

  if (threadError) throw new Error(threadError.message);
}

export async function fetchAllThreads(): Promise<SupportThreadSummary[]> {
  const { data: threads, error: threadError } = await supabase
    .from("support_threads")
    .select(T_COLUMNS)
    .order("last_message_at", { ascending: false })
    .returns<SupportThread[]>();

  if (threadError) throw new Error(threadError.message);

  const list = threads ?? [];
  if (list.length === 0) return [];

  const userIds = [...new Set(list.map((thread) => thread.user_id).filter(Boolean))];
  const threadIds = list.map((thread) => thread.id);

  const [{ data: profiles, error: profilesError }, { data: messages, error: messagesError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,full_name,phone")
        .in("id", userIds)
        .returns<{ id: string; full_name: string | null; phone: string | null }[]>(),
      supabase
        .from("support_messages")
        .select("id,thread_id,sender,body,is_read,created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false })
        .returns<SupportMessage[]>(),
    ]);

  if (profilesError) throw new Error(profilesError.message);
  if (messagesError) throw new Error(messagesError.message);

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        name: profile.full_name?.trim() || "عميل شهارة",
        phone: profile.phone?.trim() || "",
      },
    ]),
  );

  const byThread = new Map<string, SupportMessage[]>();
  for (const message of messages ?? []) {
    const bucket = byThread.get(message.thread_id) ?? [];
    bucket.push(message);
    byThread.set(message.thread_id, bucket);
  }

  return list.map((thread) => {
    const threadMessages = byThread.get(thread.id) ?? [];
    const profile = profileMap.get(thread.user_id) ?? {
      name: "عميل شهارة",
      phone: "",
    };
    const latest = threadMessages[0];
    const unread = threadMessages.reduce(
      (count, message) =>
        count + (message.sender === "user" && !message.is_read ? 1 : 0),
      0,
    );

    return {
      ...thread,
      user_name: profile.name,
      user_phone: profile.phone,
      unread,
      last_message: latest?.body ?? "",
      last_sender: latest?.sender ?? "",
      message_count: threadMessages.length,
    };
  });
}

export async function markThreadRead(
  threadId: string,
  sender: "user" | "admin",
) {
  const { error } = await supabase
    .from("support_messages")
    .update({ is_read: true })
    .eq("thread_id", threadId)
    .eq("sender", sender)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
}
