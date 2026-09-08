import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Check, Plus, Trash2, X } from "lucide-react";

import { AdminCard, Field, btnCls, btnGhostCls, inputCls } from "@/components/admin-ui";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/vendors")({
  component: AdminVendors,
});

type VendorRow = {
  id: string;
  name: string;
  city: string;
  phone: string;
  logo_url: string;
  description: string;
  is_active: boolean;
  account_enabled: boolean;
  user_id: string | null;
  created_at: string;
};

const emptyForm = {
  name: "",
  city: "",
  phone: "",
  logo_url: "",
  description: "",
};

function AdminVendors() {
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("id,name,city,phone,logo_url,description,is_active,account_enabled,user_id,created_at")
      .order("created_at", { ascending: false })
      .returns<VendorRow[]>();

    if (error) {
      toast.error("تعذّر تحميل المتاجر");
      return;
    }
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!form.name.trim() || !form.city.trim()) {
      toast.error("أدخل اسم المتجر والمدينة");
      return;
    }

    setBusy(true);
    try {
      if (editing) {
        const { error } = await supabase.from("vendors").update(form).eq("id", editing);
        if (error) throw error;
        toast.success("تم تحديث المتجر");
      } else {
        const { error } = await supabase
          .from("vendors")
          .insert({ ...form, is_active: true, account_enabled: true });
        if (error) throw error;
        toast.success("تمت إضافة المتجر");
      }
      setForm(emptyForm);
      setEditing(null);
      await load();
    } catch {
      toast.error("تعذّر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  async function approve(row: VendorRow) {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("vendors")
        .update({ is_active: true, account_enabled: true })
        .eq("id", row.id);
      if (error) throw error;

      if (row.user_id) {
        const { error: roleError } = await supabase.rpc("ensure_vendor_role", {
          p_user_id: row.user_id,
        });
        if (roleError) throw roleError;
      }

      toast.success("تم تفعيل المتجر ومنح صلاحية التاجر");
      await load();
    } catch {
      toast.error("تعذّر التفعيل");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row: VendorRow) {
    setBusy(true);
    try {
      const next = !(row.is_active && row.account_enabled);
      const { error } = await supabase
        .from("vendors")
        .update({ is_active: next, account_enabled: next })
        .eq("id", row.id);
      if (error) throw error;
      await load();
    } catch {
      toast.error("تعذّر التحديث");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: VendorRow) {
    setBusy(true);
    try {
      const { error } = await supabase.from("vendors").delete().eq("id", row.id);
      if (error) throw error;
      toast.success("تم حذف المتجر");
      await load();
    } catch {
      toast.error("تعذّر الحذف — قد تكون هناك منتجات مرتبطة بالمتجر");
    } finally {
      setBusy(false);
    }
  }

  const pending = rows.filter((row) => !(row.is_active && row.account_enabled));

  return (
    <div className="space-y-4" dir="rtl">
      {pending.length > 0 ? (
        <AdminCard title={`طلبات فتح متجر (${pending.length})`}>
          <ul className="space-y-2">
            {pending.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-primary/30 bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {row.city}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    className={btnCls}
                    disabled={busy}
                    onClick={() => void approve(row)}
                  >
                    <Check className="h-4 w-4" />
                    تفعيل
                  </button>

                  <button
                    type="button"
                    className={btnGhostCls}
                    disabled={busy}
                    aria-label="رفض وحذف"
                    onClick={() => void remove(row)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      <AdminCard title={editing ? "تعديل متجر" : "إضافة متجر"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="اسم المتجر">
            <input
              className={inputCls}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>

          <Field label="المدينة">
            <input
              className={inputCls}
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
          </Field>

          <Field label="رقم الهاتف">
            <input
              className={inputCls}
              dir="ltr"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </Field>

          <Field label="رابط الشعار">
            <input
              className={inputCls}
              dir="ltr"
              value={form.logo_url}
              onChange={(event) => setForm({ ...form, logo_url: event.target.value })}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="وصف المتجر">
              <textarea
                className={`${inputCls} h-20 py-2`}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={btnCls} disabled={busy} onClick={() => void save()}>
            <Plus className="h-4 w-4" />
            {editing ? "حفظ التعديلات" : "إضافة"}
          </button>

          {editing ? (
            <button
              type="button"
              className={btnGhostCls}
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
              }}
            >
              إلغاء
            </button>
          ) : null}
        </div>
      </AdminCard>

      <AdminCard title={`المتاجر (${rows.length})`}>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
                  {row.name}
                  {row.is_active && row.account_enabled ? (
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : null}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {row.city}
                  {row.is_active && row.account_enabled ? "" : " · غير مفعّل"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  className={btnGhostCls}
                  disabled={busy}
                  onClick={() => {
                    setEditing(row.id);
                    setForm({
                      name: row.name,
                      city: row.city,
                      phone: row.phone ?? "",
                      logo_url: row.logo_url ?? "",
                      description: row.description ?? "",
                    });
                  }}
                >
                  تعديل
                </button>

                <button
                  type="button"
                  className={btnGhostCls}
                  disabled={busy}
                  onClick={() => void toggle(row)}
                >
                  {row.is_active && row.account_enabled ? "إيقاف" : "تفعيل"}
                </button>

                <button
                  type="button"
                  className={btnGhostCls}
                  disabled={busy}
                  aria-label="حذف"
                  onClick={() => void remove(row)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">لا توجد متاجر.</p>
        ) : null}
      </AdminCard>
    </div>
  );
}
