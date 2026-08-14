import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, Field, btnCls, btnGhostCls, inputCls } from "@/components/admin-ui";
import { formatDate } from "@/lib/store";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotifications,
});

type Row = {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  link_url: string;
  kind: string;
  is_read: boolean;
  created_at: string;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [targetType, setTargetType] = useState<"all" | "single">("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  // جلب قائمة الإشعارات
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id,user_id,title,body,link_url,kind,is_read,created_at")
      .order("created_at", { ascending: false })
      .limit(80)
      .returns<Row[]>();
    setRows(data ?? []);
  }, []);

  // جلب قائمة العملاء لاختيار أحدهم عند الإرسال الخاص
  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles" as never)
      .select("id, full_name, phone");
    if (data) setUsers(data as UserProfile[]);
  }, []);

  useEffect(() => {
    void load();
    void loadUsers();
  }, [load, loadUsers]);

  async function send() {
    if (!title.trim()) {
      toast.error("أدخل عنوان الإشعار");
      return;
    }

    if (targetType === "single" && !selectedUserId) {
      toast.error("يرجى اختيار العميل المستهدف");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        link_url: link.trim(),
        user_id: targetType === "single" ? selectedUserId : null, // null للعام وخاص للمحدد
        sound: "default",
        kind: targetType === "single" ? "خاص" : "عام",
      };

      const { error } = await supabase.from("notifications").insert([payload]);

      if (error) throw error;

      toast.success(
        targetType === "all"
          ? "تم إرسال الإشعار لجميع العملاء وتنبيههم بالصوت"
          : "تم إرسال الإشعار للعميل المحدد بنجاح"
      );

      setTitle("");
      setBody("");
      setLink("");
      setSelectedUserId("");
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
      <AdminCard title="إرسال إشعار (عام أو مخصص)">
        <div className="space-y-3">
          {/* اختيار نوع الإشعار */}
          <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setTargetType("all")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                targetType === "all" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              📢 إشعار عام (للجميع)
            </button>
            <button
              type="button"
              onClick={() => setTargetType("single")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                targetType === "single" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              👤 إشعار خاص (لمستخدم محدد)
            </button>
          </div>

          {/* تحديد العميل في حالة الإشعار الخاص */}
          {targetType === "single" && (
            <Field label="اختر العميل المستهدف">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={inputCls}
              >
                <option value="">-- اختر مستخدم من القائمة --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || "مستخدم بدون اسم"} ({u.phone || u.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            </Field>
          )}

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
            {busy
              ? "جارٍ الإرسال..."
              : targetType === "all"
              ? "إرسال للجميع بالصوت"
              : "إرسال للعميل المحدد"}
          </button>
        </div>
      </AdminCard>

      <AdminCard title={`آخر الإشعارات (${rows.length.toLocaleString("ar-EG")})`}>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 p-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-foreground">{r.title}</p>
                  {r.user_id ? (
                    <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600">
                      خاص
                    </span>
                  ) : (
                    <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-600">
                      عام
                    </span>
                  )}
                </div>
                <p className="truncate text-muted-foreground">{r.body}</p>
              </div>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-primary">
                {r.kind || "إشعار"}
              </span>
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
