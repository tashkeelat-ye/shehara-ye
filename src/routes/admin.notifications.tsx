import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, Field, btnCls, btnGhostCls, inputCls } from "@/components/admin-ui";
import { broadcastNotification } from "@/lib/notifications";
import { formatDate } from "@/lib/store";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotifications,
});

type Row = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link_url: string;
  kind: string;
  is_read: boolean;
  created_at: string;
};

function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id,user_id,title,body,link_url,kind,is_read,created_at")
      .order("created_at", { ascending: false })
      .limit(80)
      .returns<Row[]>();
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    if (!title.trim()) {
      toast.error("أدخل عنوان الإشعار");
      return;
    }
    setBusy(true);
    try {
      await broadcastNotification({ title: title.trim(), body: body.trim(), link: link.trim() });
      toast.success("تم إرسال الإشعار لجميع العملاء");
      setTitle("");
      setBody("");
      setLink("");
      await load();
    } catch (e) {
      toast.error("تعذّر الإرسال: " + (e instanceof Error ? e.message : "خطأ"));
    }
    setBusy(false);
  }

  async function remove(id: string) {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) toast.error("تعذّر الحذف: " + error.message);
    await load();
  }

  return (
    <div className="space-y-4">
      <AdminCard title="إرسال إشعار عام">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="العنوان">
            <input
              className={inputCls}
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="الرابط داخل التطبيق (اختياري)">
            <input
              dir="ltr"
              className={inputCls}
              placeholder="/products"
              value={link}
              maxLength={200}
              onChange={(e) => setLink(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="نص الإشعار">
              <textarea
                className={`${inputCls} h-24 py-2`}
                value={body}
                maxLength={500}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <button type="button" className={`${btnCls} mt-3`} disabled={busy} onClick={send}>
          {busy ? "جارٍ الإرسال..." : "إرسال للجميع"}
        </button>
      </AdminCard>

      <AdminCard title={`آخر الإشعارات (${rows.length.toLocaleString("ar-EG")})`}>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 p-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-foreground">{r.title}</p>
                <p className="truncate text-muted-foreground">{r.body}</p>
              </div>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-primary">{r.kind}</span>
              <span className="text-muted-foreground">{formatDate(r.created_at)}</span>
              {r.is_read ? <span className="text-primary">مقروء</span> : null}
              <button type="button" className={btnGhostCls} onClick={() => remove(r.id)}>
                حذف
              </button>
            </li>
          ))}
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد إشعارات بعد.</p>
          ) : null}
        </ul>
      </AdminCard>
    </div>
  );
}
