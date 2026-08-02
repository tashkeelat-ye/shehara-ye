import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, Field, btnCls, inputCls } from "@/components/admin-ui";
import { fetchPaymentMethods, type PaymentMethod } from "@/lib/store";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

function AdminPayments() {
  const [rows, setRows] = useState<PaymentMethod[]>([]);

  const load = useCallback(async () => {
    setRows(await fetchPaymentMethods(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patch(id: string, key: keyof PaymentMethod, value: string | boolean) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  async function save(row: PaymentMethod) {
    const { error } = await supabase
      .from("payment_methods")
      .update({
        display_name: row.display_name,
        account_number: row.account_number,
        account_name: row.account_name,
        instructions: row.instructions,
        requires_receipt: row.requires_receipt,
        is_active: row.is_active,
        sort_order: row.sort_order,
      })
      .eq("id", row.id);
    if (error) toast.error("تعذّر الحفظ: " + error.message);
    else toast.success("تم حفظ طريقة الدفع");
    await load();
  }

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <AdminCard key={r.id} title={`${r.display_name} (${r.code})`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الاسم الظاهر">
              <input
                className={inputCls}
                value={r.display_name}
                maxLength={100}
                onChange={(e) => patch(r.id, "display_name", e.target.value)}
              />
            </Field>
            <Field label="الرقم / رقم الحساب">
              <input
                dir="ltr"
                className={inputCls}
                value={r.account_number}
                maxLength={60}
                onChange={(e) => patch(r.id, "account_number", e.target.value)}
              />
            </Field>
            <Field label="اسم صاحب الحساب">
              <input
                className={inputCls}
                value={r.account_name}
                maxLength={100}
                onChange={(e) => patch(r.id, "account_name", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="نص التعليمات">
                <textarea
                  className="min-h-20 w-full rounded-xl border border-border bg-secondary p-3 text-sm outline-none focus:border-primary"
                  value={r.instructions}
                  maxLength={600}
                  onChange={(e) => patch(r.id, "instructions", e.target.value)}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={r.is_active}
                onChange={(e) => patch(r.id, "is_active", e.target.checked)}
              />
              مُفعّلة للعملاء
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={r.requires_receipt}
                onChange={(e) => patch(r.id, "requires_receipt", e.target.checked)}
              />
              تتطلب رفع إيصال
            </label>
          </div>
          <button type="button" className={`${btnCls} mt-3`} onClick={() => save(r)}>
            حفظ
          </button>
        </AdminCard>
      ))}
    </div>
  );
}
