import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot, Headphones, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  ensureThread,
  fetchMessages,
  markThreadRead,
  sendMessage,
  type SupportMessage,
} from "@/lib/support";
import { fetchProducts } from "@/lib/db";

type AiMsg = { role: "user" | "assistant"; content: string };

const WELCOME =
  "مرحبًا بك في تشكيلات 👋 أنا مساعدك الذكي، اسألني عن أي منتج أو طريقة دفع أو التوصيل.";

export function SupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ai" | "human">("ai");

  return (
    <>
      <button
        type="button"
        aria-label="المساعدة والدعم"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] end-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-brand md:bottom-6"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="إغلاق"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-foreground/40 backdrop-blur-sm"
          />
          <div className="relative flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-card sm:h-[36rem] sm:rounded-3xl">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-brand-soft text-primary">
                  {tab === "ai" ? <Bot className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
                </span>
                <p className="truncate text-sm text-foreground">
                  {tab === "ai" ? "مساعد تشكيلات الذكي" : "خدمة العملاء"}
                </p>
              </div>
              <button
                type="button"
                aria-label="إغلاق المحادثة"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 p-2">
              {(
                [
                  ["ai", "المساعد الذكي"],
                  ["human", "خدمة العملاء"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`h-9 rounded-xl text-xs transition-colors ${
                    tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "ai" ? <AiChat /> : <HumanChat />}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Bubble({ mine, children }: { mine: boolean; children: React.ReactNode }) {
  return (
    <div className={mine ? "flex justify-start" : "flex justify-end"}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
          mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

function AiChat() {
  const [messages, setMessages] = useState<AiMsg[]>([{ role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["ai-context-products"],
    queryFn: () => fetchProducts({ sort: "best" }),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [messages, busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const context = products
        .slice(0, 25)
        .map((p) => `- ${p.name} | ${p.price} ريال يمني | ${p.city}`)
        .join("\n");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1), context }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error ?? "failed");
      }
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "تعذّر الوصول للمساعد الآن. جرّب مرة أخرى أو تواصل مع خدمة العملاء من التبويب الآخر.",
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <div ref={boxRef} className="flex-1 space-y-2 overflow-y-auto px-3 pb-2">
        {messages.map((m, i) => (
          <Bubble key={i} mine={m.role === "user"}>
            {m.content}
          </Bubble>
        ))}
        {busy ? (
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-2xl bg-secondary px-3 py-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              يكتب...
            </span>
          </div>
        ) : null}
      </div>
      <Composer
        value={input}
        onChange={setInput}
        onSubmit={submit}
        disabled={busy}
        inputRef={inputRef}
        placeholder="اكتب سؤالك..."
      />
    </>
  );
}

function HumanChat() {
  const { user } = useAuth();
  const [threadId, setThreadId] = useState("");
  const [items, setItems] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const t = await ensureThread(user.id);
      setThreadId(t.id);
      setItems(await fetchMessages(t.id));
      await markThreadRead(t.id, "admin");
      inputRef.current?.focus();
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!threadId) return;
    const timer = window.setInterval(async () => {
      setItems(await fetchMessages(threadId));
    }, 8000);
    return () => window.clearInterval(timer);
  }, [threadId]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [items]);

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xs text-muted-foreground">
          سجّل الدخول للتحدث مع فريق خدمة عملاء تشكيلات ومتابعة ردودهم.
        </p>
        <Link to="/auth" className="h-11 rounded-2xl bg-primary px-6 text-xs leading-[2.75rem] text-primary-foreground">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !threadId || busy) return;
    setBusy(true);
    try {
      await sendMessage(threadId, text, "user");
      setInput("");
      setItems(await fetchMessages(threadId));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <div ref={boxRef} className="flex-1 space-y-2 overflow-y-auto px-3 pb-2">
        {items.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-muted-foreground">
            اكتب رسالتك وسيتم الرد عليك من فريق خدمة العملاء في أقرب وقت.
          </p>
        ) : (
          items.map((m) => (
            <Bubble key={m.id} mine={m.sender === "user"}>
              {m.body}
            </Bubble>
          ))
        )}
      </div>
      <Composer
        value={input}
        onChange={setInput}
        onSubmit={submit}
        disabled={busy || !threadId}
        inputRef={inputRef}
        placeholder="اكتب رسالتك لخدمة العملاء..."
      />
    </>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  inputRef,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  placeholder: string;
}) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-border/70 p-3">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={800}
        className="h-11 w-full min-w-0 rounded-2xl border border-border bg-secondary px-3.5 text-xs text-foreground outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={disabled}
        aria-label="إرسال"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
