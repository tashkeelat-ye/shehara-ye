import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { FormField, fieldCls } from "@/components/form-ui";
import { useAuth } from "@/lib/auth-context";
import { useFormatPrice } from "@/lib/currency-context";
import { fetchPaymentMethods, fetchWalletTransactions, formatDate } from "@/lib/store";
import { uploadReceipt } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "محفظتي | تشكيلات" },
      {
        name: "description",
        content: "تابع رصيد محفظتك في تشكيلات، اشحن الرصيد وراجع سجل العمليات.",
      },
      { property: "og:title", content: "محفظتي | تشكيلات" },
      { property: "og:description", content: "رصيد المحفظة وسجل العمليات في متجر تشكيلات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const formatPrice = useFormatPrice();
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

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [methodCode, setMethodCode] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    const code = methodCode || transferMethods[0]?.code || "";
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("أدخل مبلغًا صحيحًا");
      return;
    }
    if (!code) {
      toast.error("لا توجد طريقة تحويل متاحة حاليًا");
      return;
    }
    if (!receipt) {
      toast.error("أرفق صورة إيصال التحويل");
      return;
    }
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
      setOpen(false);
      setAmount("");
      setReceipt(null);
      setReference("");
      await refetch();
      await refreshProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إرسال الطلب");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-8">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-lg text-foreground">محفظتي</h1>

        <section className="mt-4 rounded-2xl border border-border/70 bg-gradient-to-br from-brand-soft to-card p-5">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            الرصيد الحالي
          </p>
          <p className="mt-1 text-2xl text-primary">{formatPrice(profile?.wallet_balance ?? 0)}</p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-4 h-11 rounded-2xl bg-primary px-5 text-sm text-primary-foreground"
          >
            {open ? "إلغاء" : "شحن الرصيد"}
          </button>
        </section>

        {open ? (
          <form
            onSubmit={submit}
            className="mt-4 grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-2"
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

        <h2 className="mt-6 text-sm text-foreground">سجل العمليات</h2>
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
                  <p className="text-foreground">{t.description || t.kind}</p>
                  <p className="text-muted-foreground">{formatDate(t.created_at)}</p>
                </div>
                <span className={t.amount < 0 ? "text-destructive" : "text-primary"}>
                  {t.amount < 0 ? "-" : "+"}
                  {formatPrice(Math.abs(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
