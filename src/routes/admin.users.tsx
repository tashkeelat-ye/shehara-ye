import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, btnGhostCls } from "@/components/admin-ui";
import { formatPrice } from "@/lib/db";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type Row = {
  id: string;
  full_name: string;
  phone: string | null;
  wallet_balance: number;
  is_disabled: boolean;
  created_at: string;
};

function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,full_name,phone,wallet_balance,is_disabled,created_at")
        .order("created_at", { ascending: false })
        .returns<Row[]>(),
      supabase.from("user_roles").select("user_id,role").returns<{ user_id: string; role: string }[]>(),
    ]);
    setRows(p.data ?? []);
    const map: Record<string, string[]> = {};
    for (const row of r.data ?? []) {
      map[row.user_id] = [...(map[row.user_id] ?? []), row.role];
    }
    setRoles(map);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleDisabled(row: Row) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_disabled: !row.is_disabled })
      .eq("id", row.id);
    if (error) toast.error("تعذّر التحديث: " + error.message);
    else toast.success(row.is_disabled ? "تم تفعيل الحساب" : "تم تعطيل الحساب");
    await load();
  }

  const roleLabels: Record<string, string> = { admin: "إدارة", vendor: "تاجر", customer: "عميل" };

  return (
    <AdminCard title={`المستخدمون والتجار (${rows.length.toLocaleString("ar-EG")})`}>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 p-3 text-xs">
            <div className="min-w-0 flex-1">
              <p className="truncate text-foreground">{r.full_name || "بدون اسم"}</p>
              <p dir="ltr" className="text-muted-foreground">
                {r.phone ?? "—"}
              </p>
            </div>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-primary">
              {(roles[r.id] ?? ["customer"]).map((x) => roleLabels[x] ?? x).join(" / ")}
            </span>
            <span className="text-primary">{formatPrice(r.wallet_balance)}</span>
            {r.is_disabled ? (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">معطّل</span>
            ) : null}
            <button type="button" className={btnGhostCls} onClick={() => toggleDisabled(r)}>
              {r.is_disabled ? "تفعيل الحساب" : "تعطيل الحساب"}
            </button>
          </li>
        ))}
      </ul>
    </AdminCard>
  );
}
