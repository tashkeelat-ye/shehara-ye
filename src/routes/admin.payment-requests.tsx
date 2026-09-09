import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminCard, btnCls, btnGhostCls } from "@/components/admin-ui";
import { formatPrice } from "@/lib/db";
import {
  fetchPaymentRequests,
  formatDate,
  PAYMENT_REQUEST_PURPOSE_LABELS,
  PAYMENT_REQUEST_STATUS_LABELS,
  type PaymentRequest,
} from "@/lib/store";

export const Route = createFileRoute("/admin/payment-requests")({
  component: AdminPaymentRequests,
});

type ReviewAction = "approve" | "reject";

function formatMoney(amount: number, currency: string) {
  const normalizedCurrency = currency === "SAR" ? "SAR" : "YER";

  try {
    return new Intl.NumberFormat("ar-YE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount ?? 0)) + ` ${normalizedCurrency}`;
  } catch {
    return `${Number(amount ?? 0).toFixed(2)} ${normalizedCurrency}`;
  }
}

function purposeLabel(purpose: string) {
  return (
    PAYMENT_REQUEST_PURPOSE_LABELS[purpose] ??
    purpose ||
    "عملية مالية"
  );
}

function statusLabel(status: string) {
  return PAYMENT_REQUEST_STATUS_LABELS[status] ?? status;
}

function statusClass(status: string) {
  if (status === "approved") {
    return "text-primary";
  }

  if (status === "rejected") {
    return "text-destructive";
  }

  return "text-amber-600 dark:text-amber-400";
}

function getReviewRpc(
  request: PaymentRequest,
  action: ReviewAction,
) {
  const approve = action === "approve";

  if (request.purpose === "topup") {
    return {
      name: approve
        ? "approve_wallet_topup"
        : "reject_wallet_topup",
      params: {
        _payment_request_id: request.id,
        _note: "",
      },
    };
  }

  if (request.purpose === "refund") {
    return {
      name: approve
        ? "approve_wallet_refund"
        : "reject_wallet_refund",
      params: {
        _payment_request_id: request.id,
        _note: "",
      },
    };
  }

  return {
    name: "review_payment_request",
    params: {
      _id: request.id,
      _approve: approve,
      _note: "",
    },
  };
}

function AdminPaymentRequests() {
  const [rows, setRows] = useState<PaymentRequest[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const list = await fetchPaymentRequests();

      setRows(list);

      const entries = await Promise.all(
        list
          .filter((request) => request.receipt_path)
          .map(async (request) => {
            const { data, error } = await supabase.storage
              .from("receipts")
              .createSignedUrl(request.receipt_path, 3600);

            if (error) {
              return [request.id, ""] as const;
            }

            return [request.id, data?.signedUrl ?? ""] as const;
          }),
      );

      setUrls(Object.fromEntries(entries));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تحميل طلبات الدفع.";

      toast.error(message);
      setRows([]);
      setUrls({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(
    request: PaymentRequest,
    action: ReviewAction,
  ) {
    if (processingId) {
      return;
    }

    let note = "";

    if (action === "reject") {
      note =
        window.prompt("سبب الرفض (اختياري)")?.trim() ?? "";
    }

    setProcessingId(request.id);

    try {
      const rpc = getReviewRpc(request, action);

      const { error } = await supabase.rpc(
        rpc.name,
        rpc.params as never,
      );

      if (error) {
        throw error;
      }

      if (action === "approve") {
        if (request.purpose === "topup") {
          toast.success("تم اعتماد شحن المحفظة بنجاح.");
        } else if (request.purpose === "refund") {
          toast.success("تم اعتماد الاسترداد وإضافة المبلغ للمحفظة.");
        } else {
          toast.success("تم اعتماد دفع الطلب.");
        }
      } else {
        toast.success("تم رفض العملية.");
      }

      await load();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تنفيذ العملية.";

      toast.error(`تعذر تنفيذ العملية: ${message}`);
    } finally {
      setProcessingId(null);
    }
  }

  const pending = rows.filter(
    (request) => request.status === "pending",
  );

  const done = rows.filter(
    (request) => request.status !== "pending",
  );

  return (
    <div className="space-y-4">
      <AdminCard
        title={`طلبات الدفع المعلّقة (${pending.length.toLocaleString(
          "ar-EG",
        )})`}
      >
        {loading ? (
          <div className="rounded-xl border border-border/70 p-4 text-center text-xs text-muted-foreground">
            جارٍ تحميل الطلبات المالية...
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-xl border border-border/70 p-4 text-center text-xs text-muted-foreground">
            لا توجد عمليات بانتظار المراجعة.
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((request) => {
              const busy = processingId === request.id;

              return (
                <li
                  key={request.id}
                  className="rounded-xl border border-border/70 p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {purposeLabel(request.purpose)}
                    </span>

                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-muted-foreground">
                      {request.method_code}
                    </span>

                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-muted-foreground">
                      {request.currency === "SAR"
                        ? "ريال سعودي"
                        : "ريال يمني"}
                    </span>

                    <span className="font-semibold text-primary">
                      {formatMoney(
                        request.amount,
                        request.currency,
                      )}
                    </span>

                    <span className="text-muted-foreground">
                      {formatDate(request.created_at)}
                    </span>
                  </div>

                  {request.order_id ? (
                    <p className="mt-2 break-all text-muted-foreground">
                      رقم الطلب:{" "}
                      <span className="text-foreground">
                        {request.order_id}
                      </span>
                    </p>
                  ) : null}

                  {request.purpose === "topup" ||
                  request.purpose === "order" ? (
                    <p className="mt-1 text-muted-foreground">
                      المُحوِّل:{" "}
                      {request.sender_name || "—"} ·{" "}
                      {request.sender_phone || "—"} · مرجع:{" "}
                      {request.reference || "—"}
                    </p>
                  ) : null}

                  {request.purpose === "refund" ? (
                    <p className="mt-1 text-muted-foreground">
                      طلب استرداد إلى محفظة العميل
                      {request.reference
                        ? ` · مرجع: ${request.reference}`
                        : ""}
                    </p>
                  ) : null}

                  {urls[request.id] ? (
                    <a
                      href={urls[request.id]}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block"
                    >
                      <img
                        src={urls[request.id]}
                        alt="إيصال التحويل"
                        loading="lazy"
                        className="h-32 w-32 rounded-lg border border-border object-cover transition-opacity hover:opacity-80"
                      />
                    </a>
                  ) : request.receipt_path ? (
                    <p className="mt-2 text-muted-foreground">
                      تعذر تحميل الإيصال.
                    </p>
                  ) : request.purpose !== "refund" ? (
                    <p className="mt-2 text-muted-foreground">
                      لا يوجد إيصال مرفوع.
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btnCls}
                      disabled={busy}
                      onClick={() =>
                        void review(request, "approve")
                      }
                    >
                      {busy ? "جارٍ التنفيذ..." : "تأكيد واعتماد"}
                    </button>

                    <button
                      type="button"
                      className={btnGhostCls}
                      disabled={busy}
                      onClick={() =>
                        void review(request, "reject")
                      }
                    >
                      رفض
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>

      <AdminCard
        title={`العمليات المراجَعة (${done.length.toLocaleString(
          "ar-EG",
        )})`}
      >
        {loading ? (
          <p className="text-xs text-muted-foreground">
            جارٍ التحميل...
          </p>
        ) : done.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            لا توجد عمليات مراجعة سابقة.
          </p>
        ) : (
          <ul className="space-y-2 text-xs">
            {done.map((request) => (
              <li
                key={request.id}
                className="rounded-lg border-b border-border/60 pb-2 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {purposeLabel(request.purpose)}
                  </span>

                  <span className="text-muted-foreground">
                    {request.method_code}
                  </span>

                  <span className="font-medium text-primary">
                    {formatMoney(
                      request.amount,
                      request.currency,
                    )}
                  </span>

                  <span
                    className={statusClass(request.status)}
                  >
                    {statusLabel(request.status)}
                  </span>

                  <span className="text-muted-foreground">
                    {formatDate(request.created_at)}
                  </span>
                </div>

                {request.order_id ? (
                  <p className="mt-1 break-all text-muted-foreground">
                    الطلب: {request.order_id}
                  </p>
                ) : null}

                {request.admin_note ? (
                  <p className="mt-1 text-muted-foreground">
                    ملاحظة الإدارة: {request.admin_note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
