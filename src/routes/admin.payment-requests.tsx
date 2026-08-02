import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, btnCls, btnGhostCls } from "@/components/admin-ui";
import { formatPrice } from "@/lib/db";
import { formatDate, type PaymentRequest } from "@/lib/store";

export const Route = createFileRoute("/admin/payment-requests")({
  component: AdminPaymentRequests,
});

function AdminPaymentRequests() {
  const [rows, setRows] = useState<PaymentRequest[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("payment_requests")
      .select(
        "id,user_id,purpose,order_id,method_code,amount,sender_name,sender_phone,reference,receipt_path,status,admin_note,created_at",
      )
      .order("created_at", { ascending: false })
      .returns<PaymentRequest[]>();
    const list = data ?? [];
    setRows(list);

    const entries = await Promise.all(
      list
        .filter((r) => r.receipt_path)
        .map(async (r) => {
          const { data: signed } = await supabase.storage
            .from("receipts")
            .createSignedUrl(r.receipt_path, 3600);
          return [r.id, signed?.signedUrl ?? ""] as const;
        }),
    );
    setUrls(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, approve: boolean) {
    const note = approve ? "" : window.prompt("سبب الرفض (اختياري)") ?? "";
    const { error } = await supabase.rpc("review_payment_request", {
      _id: id,
      _approve: approve,
      _note: note,
    });
    if (error) toast.error("تعذّر تنفيذ العملية: " + error.message);
    else toast.success(approve ? "تم تأكيد الدفع" : "تم رفض العملية");
    await load();
  }

  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-4">
      <AdminCard title={`طلبات الدفع المعلّقة (${pending.length.toLocaleString("ar-EG")})`}>
        {pending.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد عمليات بانتظار المراجعة.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => (
              <li key={r.id} className="rounded-xl border border-border/70 p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground">
                    {r.purpose === "topup" ? "شحن رصيد" : "دفع طلب"} · {r.method_code}
                  </span>
                  <span className="text-primary">{formatPrice(r.amount)}</span>
                  <span className="text-muted-foreground">{formatDate(r.created_at)}</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  المُحوِّل: {r.sender_name || "—"} · {r.sender_phone || "—"} · مرجع: {r.reference || "—"}
                </p>
                {urls[r.id] ? (
                  <a
                    href={urls[r.id]}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block"
                  >
                    <img
                      src={urls[r.id]}
                      alt="إيصال التحويل"
                      loading="lazy"
                      className="h-28 w-28 rounded-lg border border-border object-cover"
                    />
                  </a>
                ) : (
                  <p className="mt-1 text-muted-foreground">لا يوجد إيصال مرفوع.</p>
                )}
                <div className="mt-2 flex gap-2">
                  <button type="button" className={btnCls} onClick={() => review(r.id, true)}>
                    تأكيد
                  </button>
                  <button type="button" className={btnGhostCls} onClick={() => review(r.id, false)}>
                    رفض
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard title="العمليات المراجَعة">
        <ul className="space-y-1 text-xs">
          {done.map((r) => (
            <li key={r.id} className="flex flex-wrap gap-2 border-b border-border/60 pb-1">
              <span className="text-foreground">{r.method_code}</span>
              <span className="text-primary">{formatPrice(r.amount)}</span>
              <span className={r.status === "approved" ? "text-primary" : "text-destructive"}>
                {r.status === "approved" ? "مؤكدة" : "مرفوضة"}
              </span>
              <span className="text-muted-foreground">{formatDate(r.created_at)}</span>
            </li>
          ))}
        </ul>
      </AdminCard>
    </div>
  );
}
