import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownLeft, Upload, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FormField, fieldCls } from "@/components/form-ui";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/db";
import { fetchPaymentMethods, fetchWalletTransactions, formatDate } from "@/lib/store";
import { uploadReceipt } from "@/lib/media";

const KIND_LABELS: Record<string, string> = {
  topup: "شحن رصيد",
  order_payment: "دفع طلب",
  refund: "استرداد",
  adjustment: "تسوية إدارية",
};

/** لوحة المحفظة الكاملة: الرصيد، الشحن، الاسترداد، وكشف الحساب. */
export function WalletPanel() {
  const { user, profile, refreshProfile } = useAuth();
  const userId = user?.id ?? "";

  const { data: txs = [], refetch } = useQuery({
    queryKey: ["wallet-tx", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchWalletTransactions(userId),
  });
  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods", "active"],
    queryFn: () => fetchPaymentMethods(true),
  });
  const transferMethods = methods.filter((m) => m.requires_receipt);

  const [mode, setMode] = useState<"none" | "topup" | "refund">("none");
  const [amount, setAmount] = useState("");
  const [methodCode, setMethodCode] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const balance = profile?.wallet_balance ?? 0;
  const totalIn = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = txs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  function reset() {
    setMode("none");
    setAmount("");
    setReceipt(null);
    setReference("");
  }

  async function submitTopup(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    const code = methodCode || transferMethods[0]?.code || "";
    if (!Number.isFinite(value) || value <= 0) return toast.error("أدخل مبلغًا صحيحًا");
    if (!code) return toast.error("لا توجد طريقة تحويل متاحة حاليًا");
    if (!receipt) return toast.error("أرفق صورة إيصال التحويل");
    setBusy(true);
    try {
      const path = await uploadReceipt(userId, receipt);
      const { error } = await supabase.from("payment_requests").insert({
        user_id: userId,
        purpose: "topup",
        method_code: code,
        amount: value,
        sender_name: senderName.trim() || (profile?.full_name ?? ""),
        sender_phone: senderPhone.trim() || (profile?.phone ?? ""),
        reference: reference.trim(),
        receipt_path: path,
      });
      if (error) throw new Error(error.message);
      toast.success("تم إرسال طلب الشحن، سيتم تحديث رصيدك بعد تأكيد الإدارة");
      reset();
      await refetch();
      await refreshProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إرسال الطلب");
    } finally {
      setBusy(false);
    }
  }

  async function submitRefund(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return toast.error("أدخل مبلغًا صحيحًا");
    if (value > balance) return toast.error("المبلغ أكبر من رصيدك الحالي");
    setBusy(true);
    try {
      const { error } = await supabase.from("payment_requests").insert({
        user_id: userId,
        purpose: "refund",
        method_code: methodCode || transferMethods[0]?.code || "manual",
        amount: value,
        sender_name: senderName.trim() || (profile?.full_name ?? ""),
        sender_phone: senderPhone.trim() || (profile?.phone ?? ""),
        reference: reference.trim(),
        receipt_path: "",
      });
      if (error) throw new Error(error.message);
      toast.success("تم إرسال طلب الاسترداد، ستتم مراجعته من الإدارة");
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إرسال الطلب");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-brand-soft to-card p-5">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Wallet className="h-4 w-4 text-primary" />
          الرصيد الحالي
        </p>
        <p className="mt-1 text-2xl text-primary">{formatPrice(balance)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div className="rounded-2xl bg-card/70 p-2.5">
            <p>إجمالي الإيداعات</p>
            <p className="mt-0.5 text-sm text-primary">{formatPrice(totalIn)}</p>
          </div>
          <div className="rounded-2xl bg-card/70 p-2.5">
            <p>إجمالي المدفوعات</p>
            <p className="mt-0.5 text-sm text-foreground">{formatPrice(totalOut)}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === "topup" ? "none" : "topup")}
            className="h-11 rounded-2xl bg-primary px-3 text-xs text-primary-foreground"
          >
            {mode === "topup" ? "إلغاء" : "شحن الرصيد"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "refund" ? "none" : "refund")}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-3 text-xs text-foreground"
          >
            <ArrowDownLeft className="h-4 w-4 text-primary" />
            {mode === "refund" ? "إلغاء" : "طلب استرداد"}
          </button>
        </div>
      </section>

      {mode === "topup" ? (
        <form
          onSubmit={submitTopup}
          className="grid gap-3 rounded-3xl border border-border/70 bg-card p-4 sm:grid-cols-2"
        >
          <FormField label="المبلغ المحوَّل (ريال يمني)" required>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              dir="ltr"
              className={fieldCls}
            />
          </FormField>
          <FormField label="طريقة التحويل" required>
            <select
              value={methodCode || transferMethods[0]?.code || ""}
              onChange={(e) => setMethodCode(e.target.value)}
              className={fieldCls}
              aria-label="طريقة التحويل"
            >
              {transferMethods.map((m) => (
                <option key={m.id} value={m.code}>
                  {m.display_name} — {m.account_number}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="اسم المُحوِّل">
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              maxLength={100}
              className={fieldCls}
            />
          </FormField>
          <FormField label="رقم المُحوِّل">
            <input
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              dir="ltr"
              maxLength={20}
              className={fieldCls}
            />
          </FormField>
          <FormField label="رقم عملية التحويل">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={60}
              className={fieldCls}
            />
          </FormField>
          <FormField label="صورة الإيصال" required>
            <label className="flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-border bg-secondary px-3.5 text-xs text-muted-foreground">
              <Upload className="h-4 w-4 text-primary" />
              <span className="truncate">{receipt ? receipt.name : "اختر صورة الإيصال"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              />
            </label>
          </FormField>
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-2xl bg-primary text-sm text-primary-foreground disabled:opacity-60 sm:col-span-2"
          >
            {busy ? "جارٍ الإرسال..." : "إرسال طلب الشحن"}
          </button>
        </form>
      ) : null}

      {mode === "refund" ? (
        <form
          onSubmit={submitRefund}
          className="grid gap-3 rounded-3xl border border-border/70 bg-card p-4 sm:grid-cols-2"
        >
          <FormField label="مبلغ الاسترداد (ريال يمني)" required>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              dir="ltr"
              className={fieldCls}
            />
          </FormField>
          <FormField label="رقم المحفظة/الحساب لاستلام المبلغ" required>
            <input
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              dir="ltr"
              maxLength={30}
              className={fieldCls}
            />
          </FormField>
          <FormField label="سبب الاسترداد" hint="اختياري">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={120}
              className={fieldCls}
            />
          </FormField>
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-2xl bg-primary text-sm text-primary-foreground disabled:opacity-60 sm:col-span-2"
          >
            {busy ? "جارٍ الإرسال..." : "إرسال طلب الاسترداد"}
          </button>
        </form>
      ) : null}

      <section>
        <h2 className="text-sm text-foreground">كشف الحساب</h2>
        {txs.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">لا توجد عمليات على محفظتك بعد.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {txs.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate text-foreground">
                    {t.description || KIND_LABELS[t.kind] || t.kind}
                  </p>
                  <p className="text-muted-foreground">
                    {KIND_LABELS[t.kind] ?? t.kind} • {formatDate(t.created_at)}
                  </p>
                </div>
                <span className={t.amount < 0 ? "shrink-0 text-destructive" : "shrink-0 text-primary"}>
                  {t.amount < 0 ? "-" : "+"}
                  {formatPrice(Math.abs(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
