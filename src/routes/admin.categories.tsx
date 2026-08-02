import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, Field, btnCls, btnGhostCls, inputCls } from "@/components/admin-ui";
import type { Category } from "@/lib/db";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

const empty = { slug: "", name: "", icon: "Shirt", sort_order: 0 };

function AdminCategories() {
  const [rows, setRows] = useState<Category[]>([]);
  const [editing, setEditing] = useState<(typeof empty & { id?: string }) | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("categories")
      .select("id,slug,name,icon,sort_order")
      .order("sort_order")
      .returns<Category[]>();
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!editing?.name || !editing.slug) {
      toast.error("أكمل الاسم والمعرّف");
      return;
    }
    const payload = { slug: editing.slug, name: editing.name, icon: editing.icon, sort_order: editing.sort_order };
    const { error } = editing.id
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);
    if (error) {
      toast.error("تعذّر الحفظ: " + error.message);
      return;
    }
    toast.success("تم الحفظ");
    setEditing(null);
    await load();
  }

  async function remove(row: Category) {
    if (!window.confirm(`حذف الفئة "${row.name}"؟`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", row.id);
    if (error) toast.error("لا يمكن حذف فئة تحتوي منتجات");
    else toast.success("تم الحذف");
    await load();
  }

  return (
    <div className="space-y-4">
      <AdminCard
        title="الفئات"
        action={
          <button type="button" className={btnCls} onClick={() => setEditing({ ...empty })}>
            <Plus className="h-4 w-4" /> فئة جديدة
          </button>
        }
      >
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-xl border border-border/70 p-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="truncate text-foreground">{r.name}</p>
                <p dir="ltr" className="text-muted-foreground">
                  {r.slug} · {r.icon}
                </p>
              </div>
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
        </ul>
      </AdminCard>

      {editing ? (
        <AdminCard title={editing.id ? "تعديل فئة" : "إضافة فئة"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم الفئة">
              <input
                className={inputCls}
                value={editing.name}
                maxLength={80}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="المعرّف (بالإنجليزية)">
              <input
                dir="ltr"
                className={inputCls}
                value={editing.slug}
                maxLength={60}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              />
            </Field>
            <Field label="اسم الأيقونة (Lucide)">
              <input
                dir="ltr"
                className={inputCls}
                value={editing.icon}
                maxLength={40}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
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
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className={btnCls} onClick={save}>
              حفظ
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
