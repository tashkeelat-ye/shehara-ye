import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { AdminCard } from "@/components/admin-ui";
import {
  fetchAllThreads,
  fetchMessages,
  markThreadRead,
  sendMessage,
  type SupportMessage,
} from "@/lib/support";
import { formatDate } from "@/lib/store";

export const Route = createFileRoute("/admin/support")({
  head: () => ({
    meta: [
      { title: "محادثات خدمة العملاء | تشكيلات" },
      { name: "description", content: "الرد على رسائل العملاء داخل متجر تشكيلات." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "محادثات خدمة العملاء | تشكيلات" },
      { property: "og:description", content: "إدارة محادثات الدعم في تشكيلات." },
    ],
  }),
  component: AdminSupportPage,
});

function AdminSupportPage() {
  const [activeId, setActiveId] = useState("");
  const [items, setItems] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const { data: threads = [], refetch } = useQuery({
    queryKey: ["admin-support-threads"],
    queryFn: fetchAllThreads,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!activeId) return;
    void (async () => {
      setItems(await fetchMessages(activeId));
      await markThreadRead(activeId, "user");
      await refetch();
    })();
  }, [activeId]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [items]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !activeId || busy) return;
    setBusy(true);
    try {
      await sendMessage(activeId, text, "admin");
      setInput("");
      setItems(await fetchMessages(activeId));
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg text-foreground">محادثات خدمة العملاء</h1>
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <AdminCard title="المحادثات">
          <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border p-2.5 text-start text-xs ${
                    activeId === t.id ? "border-primary bg-brand-soft" : "border-border/70"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-foreground">{t.subject || "محادثة"}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {formatDate(t.last_message_at)}
                    </span>
                  </span>
                  {t.unread > 0 ? (
                    <span className="shrink-0 rounded-full bg-accent-solid px-2 py-0.5 text-[10px] text-accent-solid-foreground">
                      {t.unread.toLocaleString("ar-EG")}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            {threads.length === 0 ? (
              <li className="text-xs text-muted-foreground">لا توجد محادثات بعد</li>
            ) : null}
          </ul>
        </AdminCard>

        <AdminCard title="الرسائل">
          {!activeId ? (
            <p className="text-xs text-muted-foreground">اختر محادثة من القائمة للبدء.</p>
          ) : (
            <div className="flex h-[26rem] flex-col">
              <div ref={boxRef} className="flex-1 space-y-2 overflow-y-auto pb-2">
                {items.map((m) => (
                  <div key={m.id} className={m.sender === "admin" ? "flex justify-end" : "flex justify-start"}>
                    <p
                      className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-xs ${
                        m.sender === "admin"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {m.body}
                    </p>
                  </div>
                ))}
              </div>
              <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 pt-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  aria-label="الرد على العميل"
                  placeholder="اكتب ردك..."
                  maxLength={800}
                  className="h-11 w-full min-w-0 rounded-2xl border border-border bg-secondary px-3.5 text-xs outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={busy}
                  aria-label="إرسال"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
