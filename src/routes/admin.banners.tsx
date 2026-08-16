import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, Field, btnCls, btnGhostCls, inputCls } from "@/components/admin-ui";
import { uploadMedia } from "@/lib/media";
import { fetchBanners, type Banner } from "@/lib/store";
import { Banners4to1Manager } from "@/components/admin/Banners4to1Manager";

export const Route = createFileRoute("/admin/banners")({
  component: AdminBanners,
});

type Draft = Omit<Banner, "id"> & { id?: string };

const empty: Draft = {
  title: "",
  subtitle: "",
  cta_label: "تسوّق الآن",
  link_url: "",
  image_url: "",
  sort_order: 0,
  is_active: true,
};

function AdminBanners() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(await fetchBanners(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!editing) return;
    if (!editing.image_url) {
      toast.error("ارفع صورة البانر أولاً");
      return;
    }
    setBusy(true);
    const payload = { ...editing };
    delete (payload as { id?: string }).id;
    const { error } = editing.id
      ? await supabase.from("banners").update(payload).eq("id", editing.id)
      : await supabase.from("banners").insert(payload);
    setBusy(false);
    if (error) {
      toast.error("تعذّر الحفظ: " + error.message);
      return;
    }
    toast.success("تم حفظ البانر");
    setEditing(null);
    await load();
  }

  async function toggle(row: Banner) {
    const { error } = await supabase
      .from("banners")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) toast.error("تعذّر التحديث");
    await load();
  }

  async function move(row: Banner, dir: -1 | 1) {
    const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
    const i = sorted.findIndex((r) => r.id === row.id);
    const other = sorted[i + dir];
    if (!other) return;
    await Promise.all([
      supabase.from("banners").update({ sort_order: other.sort_order }).eq("id", row.id),
      supabase.from("banners").update({ sort_order: row.sort_order }).eq("id", other.id),
    ]);
    await load();
  }

  async function remove(row: Banner) {
    if (!window.confirm("حذف هذا البانر؟")) return;
    const { error } = await supabase.from("banners").delete().eq("id", row.id);
    if (error) toast.error("تعذّر الحذف: " + error.message);
    else toast.success("تم الحذف");
    await load();
  }

  async function upload(file: File) {
    if (!editing) return;
    setBusy(true);
    try {
      const url = await uploadMedia("banners", file);
      setEditing({ ...editing, image_url: url });
      toast.success("تم رفع الصورة");
    } catch (e) {
      toast.error("تعذّر رفع الصورة: " + (e instanceof Error ? e.message : ""));
    }
    setBusy(false);
  }

  return (
    <div className="space-y-8">
      {/* قسم إدارة بنرات العروض (4:1) الجديد */}
      <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm">
        <Banners4to1Manager />
      </div>

      <hr className="border-border" />

      {/* قسم البانرات الإعلانية الأساسية */}
      <AdminCard
        title={`الإعلانات والعروض الأساسية (${rows.length.toLocaleString("ar-EG")})`}
        action={
          <button
            type="button"
            className={btnCls}
            onClick={() => setEditing({ ...empty, sort_order: rows.length + 1 })}
          >
            <Plus className="h-4 w-4" /> بانر جديد
          </button>
        }
      >
        <ul className="space-y-2">
          {[...rows]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 p-2 text-xs"
              >
                <img
                  src={r.image_url}
                  alt={r.title}
                  loading="lazy"
                  className="h-12 w-20 shrink-0 rounded-lg bg-muted object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground">{r.title || "بدون عنوان"}</p>
                  <p dir="ltr" className="truncate text-muted-foreground">
                    {r.link_url || "بدون رابط"}
                  </p>
                </div>
                <button type="button" aria-label="أعلى" className={btnGhostCls} onClick={() => move(r, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" aria-label="أسفل" className={btnGhostCls} onClick={() => move(r, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" className={btnGhostCls} onClick={() => toggle(r)}>
                  {r.is_active ? "تعطيل" : "تفعيل"}
                </button>
                <button type="button" className={btnGhostCls} onClick={() => setEditing({ ...r })}>
                  تعديل
                </button>
                <button
                  type="button"
                  aria-label="حذف"
                  onClick={() => remove(r)}
                  className="inline-flex h-10 items-center rounded-xl border border-destructive/40 px-3 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          {rows.length === 0 ? (
            <li className="text-muted-foreground">لا توجد بانرات أساسية بعد.</li>
          ) : null}
        </ul>
      </AdminCard>

      {editing ? (
        <AdminCard title={editing.id ? "تعديل بانر أساسي" : "بانر أساسي جديد"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="العنوان">
              <input
                className={inputCls}
                maxLength={120}
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </Field>
            <Field label="النص الفرعي">
              <input
                className={inputCls}
                maxLength={200}
                value={editing.subtitle}
                onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
              />
            </Field>
            <Field label="نص الزر">
              <input
                className={inputCls}
                maxLength={40}
                value={editing.cta_label}
                onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })}
              />
            </Field>
            <Field label="رابط الوجهة (مثال: /products أو /category/fashion)">
              <input
                dir="ltr"
                className={inputCls}
                maxLength={300}
                value={editing.link_url}
                onChange={(e) => setEditing({ ...editing, link_url: e.target.value })}
              />
            </Field>
            <Field label="الترتيب">
              <input
                type="number"
                className={inputCls}
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
              />
            </Field>
            <Field label="صورة البانر">
              <div className="flex items-center gap-2">
                {editing.image_url ? (
                  <img
                    src={editing.image_url}
                    alt=""
                    className="h-14 w-24 rounded-lg object-cover"
                  />
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  aria-label="رفع صورة بانر"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                  }}
                  className="text-xs"
                />
              </div>
            </Field>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              مُفعّل
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} className={btnCls} onClick={save}>
              {busy ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            <button type="button" className={btnGhostCls} onClick={() => setEditing(null)}>
              إلغاء
            </button>
          </div>
        </AdminCard>
      ) : null}
    </div>
  );
}
