import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCheck,
  Clock3,
  Loader2,
  MessageCircle,
  MoreVertical,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AdminCard } from "@/components/admin-ui";
import {
  fetchAllThreads,
  fetchMessages,
  markThreadRead,
  sendMessage,
  type SupportMessage,
  type SupportThreadSummary,
} from "@/lib/support";

export const Route = createFileRoute("/admin/support")({
  head: () => ({
    meta: [
      { title: "محادثات العملاء | شهارة" },
      {
        name: "description",
        content: "إدارة محادثات العملاء والرد عليهم من لوحة تحكم شهارة.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminSupportPage,
});

function initials(name: string) {
  const value = name.trim();
  if (!value) return "ش";
  const parts = value.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "ش") + (parts[1]?.[0] ?? "");
}

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function AdminSupportPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const { data: threads = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-support-threads", refreshTick],
    queryFn: fetchAllThreads,
    staleTime: 2500,
    refetchInterval: 15000,
  });

  useEffect(() => {
    const channel = window.setInterval(() => setRefreshTick((v) => v + 1), 10000);
    return () => window.clearInterval(channel);
  }, []);

  const filteredThreads = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ar");
    if (!term) return threads;
    return threads.filter((thread) =>
      [thread.user_name, thread.user_phone, thread.last_message, thread.subject]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ar")
        .includes(term),
    );
  }, [threads, search]);

  const unreadTotal = threads.reduce((sum, thread) => sum + thread.unread, 0);
  const selected = threads.find((thread) => thread.id === selectedId) ?? null;

  async function openThread(id: string) {
    setSelectedId(id);
    setMobileChatOpen(true);
    await markThreadRead(id, "user");
    await refetch();
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground">محادثات العملاء</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">تواصل مباشر ومنظم مع كل عميل في محادثة مستقلة.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-border bg-card px-3 py-2 text-xs">
            <span className="text-muted-foreground">المحادثات</span>
            <span className="mx-1.5 font-black text-foreground">{threads.length}</span>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">غير مقروء</span>
            <span className="mx-1.5 font-black text-primary">{unreadTotal}</span>
          </div>
        </div>
      </div>

      <AdminCard title="إدارة محادثات العملاء">
        <div className="grid min-h-[calc(100vh-210px)] overflow-hidden rounded-2xl border border-border/70 bg-card lg:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-l border-border/70 bg-card">
            <div className="border-b border-border/70 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="بحث باسم العميل أو رقم الهاتف..."
                  aria-label="بحث في المحادثات"
                  className="h-11 w-full rounded-2xl border border-border bg-secondary/60 ps-10 pe-3 text-xs text-foreground outline-none transition focus:border-primary/40 focus:bg-card"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
              <span className="text-[11px] font-bold text-muted-foreground">كل المحادثات</span>
              {unreadTotal > 0 ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground">
                  {unreadTotal.toLocaleString("ar-EG")} جديد
                </span>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex animate-pulse items-center gap-3 rounded-2xl p-3">
                      <span className="h-12 w-12 shrink-0 rounded-full bg-secondary" />
                      <span className="min-w-0 flex-1 space-y-2">
                        <span className="block h-3 w-2/3 rounded bg-secondary" />
                        <span className="block h-2.5 w-full rounded bg-secondary" />
                      </span>
                    </div>
                  ))}
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-muted-foreground">
                    <MessageCircle className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">لا توجد محادثات</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">ستظهر محادثات العملاء هنا فور وصولها.</p>
                  </div>
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => void openThread(thread.id)}
                    className={`group flex w-full items-center gap-3 border-b border-border/50 px-3 py-3 text-start transition hover:bg-secondary/60 ${
                      selectedId === thread.id ? "bg-primary/[0.06]" : "bg-card"
                    }`}
                  >
                    <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-black text-primary">
                      {initials(thread.user_name)}
                      {thread.unread > 0 ? (
                        <span className="absolute -end-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-card bg-primary px-1 text-[9px] font-black text-primary-foreground">
                          {thread.unread > 99 ? "99+" : thread.unread}
                        </span>
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm ${thread.unread > 0 ? "font-black text-foreground" : "font-bold text-foreground"}`}>
                          {thread.user_name}
                        </span>
                        <span className={`shrink-0 text-[10px] ${thread.unread > 0 ? "font-bold text-primary" : "text-muted-foreground"}`}>
                          {relativeTime(thread.last_message_at)}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        {thread.last_sender === "admin" ? <CheckCheck className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                        <span className={`min-w-0 flex-1 truncate text-[11px] ${thread.unread > 0 ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                          {thread.last_message || "لا توجد رسائل بعد"}
                        </span>
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="hidden min-h-0 lg:flex lg:flex-col">
            {selected ? (
              <ConversationPanel
                key={selected.id}
                thread={selected}
                onChanged={async () => {
                  await refetch();
                }}
              />
            ) : (
              <EmptyConversation />
            )}
          </section>
        </div>
      </AdminCard>

      {mobileChatOpen && selected ? (
        <div className="fixed inset-0 z-[100] flex bg-background lg:hidden">
          <div className="flex min-h-0 w-full flex-col">
            <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-3 shadow-sm">
              <button
                type="button"
                onClick={() => setMobileChatOpen(false)}
                aria-label="العودة إلى المحادثات"
                className="grid h-10 w-10 place-items-center rounded-xl text-foreground hover:bg-secondary"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-xs font-black text-primary">
                {initials(selected.user_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-foreground">{selected.user_name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{selected.user_phone || "عميل شهارة"}</p>
              </div>
              <button type="button" className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-secondary" aria-label="المزيد">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ConversationPanel
                key={selected.id}
                thread={selected}
                mobile
                onChanged={async () => {
                  await refetch();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyConversation() {
  return (
    <div className="flex h-full min-h-[30rem] flex-col items-center justify-center bg-secondary/[0.22] px-8 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary">
        <MessageCircle className="h-9 w-9" />
      </span>
      <h2 className="mt-5 text-lg font-black text-foreground">اختر محادثة</h2>
      <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
        اختر اسم أحد العملاء من القائمة لفتح محادثته بشكل مستقل والرد عليه مباشرة.
      </p>
    </div>
  );
}

function ConversationPanel({
  thread,
  onChanged,
  mobile = false,
}: {
  thread: SupportThreadSummary;
  onChanged: () => Promise<void>;
  mobile?: boolean;
}) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const next = await fetchMessages(thread.id);
      setMessages(next);
      await markThreadRead(thread.id, "user");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل المحادثة");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [thread.id]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [thread.id]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = input.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await sendMessage(thread.id, body, "admin");
      setInput("");
      await load();
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال الرسالة");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f6f8fa] dark:bg-background">
      {!mobile ? (
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-sm font-black text-primary">
            {initials(thread.user_name)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-black text-foreground">{thread.user_name}</h2>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {thread.user_phone || "عميل شهارة"} · {thread.status === "open" ? "محادثة مفتوحة" : "مغلقة"}
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground">
              <Clock3 className="h-3 w-3" />
              آخر نشاط {relativeTime(thread.last_message_at)}
            </span>
          </div>
        </div>
      ) : null}

      <div ref={boxRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-card text-muted-foreground shadow-sm">
              <UserRound className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-bold text-foreground">ابدأ المحادثة مع {thread.user_name}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">أرسل أول رد للعميل من الأسفل.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-2">
            <div className="mb-4 flex justify-center">
              <span className="rounded-full bg-card px-3 py-1 text-[10px] text-muted-foreground shadow-sm">
                {thread.subject || "خدمة العملاء"}
              </span>
            </div>
            {messages.map((message) => (
              <div key={message.id} className={message.sender === "admin" ? "flex justify-start" : "flex justify-end"}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[70%] ${
                    message.sender === "admin"
                      ? "rounded-ss-md bg-primary text-primary-foreground"
                      : "rounded-se-md border border-border/50 bg-card text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-xs leading-6">{message.body}</p>
                  <div className={`mt-1 flex items-center gap-1.5 text-[9px] ${message.sender === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    <span>{formatClock(message.created_at)}</span>
                    {message.sender === "admin" ? <CheckCheck className="h-3 w-3" /> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="shrink-0 border-t border-border bg-card p-3 sm:p-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-border bg-secondary/60 p-1.5 focus-within:border-primary/30 focus-within:bg-card">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`اكتب ردك إلى ${thread.user_name}...`}
            aria-label={`الرد على ${thread.user_name}`}
            maxLength={2000}
            disabled={busy}
            className="h-10 min-w-0 flex-1 bg-transparent px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="إرسال الرسالة"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mx-auto mt-1.5 max-w-3xl px-2 text-[9px] text-muted-foreground">
          Enter للإرسال · الرسائل تحفظ مباشرة في قاعدة البيانات.
        </p>
      </form>
    </div>
  );
}
