import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, Field, btnCls, btnGhostCls, inputCls } from "@/components/admin-ui";
import { YEMEN_GOVERNORATES } from "@/lib/yemen";
import type { Courier } from "@/lib/store";

export const Route = createFileRoute("/admin/couriers")({
  component: AdminCouriers,
});

const EMPTY = { name: "", phone: "", city: "", is_active: true };

function AdminCouriers() {
  const [rows, setRows] = useState<Courier[]>([]);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("couriers")
      .select("id,name,phone,city,is_active")
      .order("name")
      .returns<Courier[]>();
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!form.name.trim()) {
      toast.error("أدخل اسم عامل التوصيل");
      return;
    }
    const { error } = await supabase.from("couriers").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      city: form.city,
      is_active: form.is_active,
    });
    if (error) toast.error("تعذّر الإضافة: " + error.message);
    else {
      toast.success("تمت إضافة عامل التوصيل");
      setForm(EMPTY);
      await load();
    }
  }

  async function toggle(row: Courier) {
    const { error } = await supabase
      .from("couriers")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) toast.error("تعذّر التحديث: " + error.message);
    await load();
  }

  async function remove(row: Courier) {
    if (!window.confirm(`حذف ${row.name}؟`)) return;
    const { error } = await supabase.from("couriers").delete().eq("id", row.id);
    if (error) toast.error("تعذّر الحذف: " + error.message);
    await load();
  }

  return (
    <div className="space-y-4">
      <AdminCard title="إضافة عامل توصيل">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="الاسم">
            <input
              className={inputCls}
              value={form.name}
              maxLength={100}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="رقم الهاتف">
            <input
              dir="ltr"
              className={inputCls}
              value={form.phone}
              maxLength={20}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="المحافظة">
            <select
              className={inputCls}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            >
              <option value="">اختر المحافظة</option>
              {YEMEN_GOVERNORATES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button type="button" className={`${btnCls} mt-3`} onClick={add}>
          إضافة
        </button>
      </AdminCard>

      <AdminCard title={`عمال التوصيل (${rows.length.toLocaleString("ar-EG")})`}>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 p-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-foreground">{r.name}</p>
                <p dir="ltr" className="text-muted-foreground">
                  {r.phone || "—"} · {r.city || "—"}
                </p>
              </div>
              <span
                className={
                  r.is_active
                    ? "rounded-full bg-brand-soft px-2 py-0.5 text-primary"
                    : "rounded-full bg-destructive/10 px-2 py-0.5 text-destructive"
                }
              >
                {r.is_active ? "متاح" : "غير متاح"}
              </span>
              <button type="button" className={btnGhostCls} onClick={() => toggle(r)}>
                {r.is_active ? "تعطيل" : "تفعيل"}
              </button>
              <button type="button" className={btnGhostCls} onClick={() => remove(r)}>
                حذف
              </button>
            </li>
          ))}
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا يوجد عمال توصيل بعد.</p>
          ) : null}
        </ul>
      </AdminCard>
    </div>
  );
}
