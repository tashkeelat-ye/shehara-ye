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
import {
  fetchPaymentMethods,
  fetchWalletTransactions,
  formatDate,
} from "@/lib/store";
import { uploadReceipt } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "محفظتي | شهارة" },
      {
        name: "description",
        content:
          "تابع رصيد محفظتك في شهارة، اشحن الرصيد وراجع سجل العمليات.",
      },
      { property: "og:title", content: "محفظتي | شهارة" },
      {
        property: "og:description",
        content: "رصيد المحفظة وسجل العمليات في متجر شهارة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WalletPage,
});

type WalletData = {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
};

function WalletPage() {
  const formatPrice = useFormatPrice();
  const { user, profile, refreshProfile } = useAuth();

  const userId = user?.id ?? "";

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [methodCode, setMethodCode] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  /*
   * الرصيد الحقيقي من جدول wallets عبر RPC آمن.
   *
   * نستخدم any هنا مؤقتًا لأن types.ts المولّد من Supabase
   * قد لا يحتوي بعد على الدوال الجديدة التي أضيفت في migrations.
   * بعد إعادة توليد أنواع Supabase يمكن إزالة any.
   */
  const {
    data: wallet,
    isLoading: walletLoading,
    refetch: refetchWallet,
  } = useQuery<WalletData | null>({
    queryKey: ["wallet", userId, "YER"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_wallet", {
        requested_currency: "YER",
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      const row = Array.isArray(data) ? data[0] : data;

      if (!row) {
        return null;
      }

      return {
        id: String(row.id),
        user_id: String(row.user_id),
        currency: String(row.currency),
        balance: Number(row.balance ?? 0),
      };
    },
  });

  const {
    data: txs = [],
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["wallet-tx", userId],
    enabled: Boolean(userId),
    queryFn: () => fetchWalletTransactions(userId),
  });

  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods", "active"],
    queryFn: () => fetchPaymentMethods(true),
  });

  const transferMethods = methods.filter((method) => method.requires_receipt);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!userId) {
      toast.error("يجب تسجيل الدخول أولًا");
      return;
    }

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
      /*
       * رفع الإيصال إلى Storage.
       * لا يتم إنشاء payment_request مباشرة من العميل.
       */
      const path = await uploadReceipt(userId, receipt);

      /*
       * إنشاء طلب الشحن يتم حصريًا عبر SECURITY DEFINER RPC.
       *
       * الخادم يتحقق من:
       * - المستخدم
       * - المبلغ
       * - العملة
       * - طريقة الدفع
       * - حالة طريقة الدفع
       * - الإيصال
       * - رقم العملية المكرر
       */
      const { error } = await (supabase as any).rpc(
        "request_wallet_topup",
        {
          _amount: value,
          _method_code: code,
          _currency: "YER",
          _sender_name:
            senderName.trim() || profile?.full_name || "",
          _sender_phone:
            senderPhone.trim() || profile?.phone || "",
          _reference: reference.trim(),
          _receipt_path: path,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      toast.success(
        "تم إرسال طلب الشحن، وسيتم تحديث رصيدك بعد تأكيد الإدارة",
      );

      setOpen(false);
      setAmount("");
      setMethodCode("");
      setSenderName("");
      setSenderPhone("");
      setReference("");
      setReceipt(null);

      await Promise.all([
        refetchWallet(),
        refetchTransactions(),
        refreshProfile(),
      ]);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "تعذّر إرسال طلب الشحن",
      );
    } finally {
      setBusy(false);
    }
  }

  const currentBalance = wallet?.balance ?? 0;

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

          <p
            className="mt-1 text-2xl text-primary"
            aria-live="polite"
          >
            {walletLoading
              ? "..."
              : formatPrice(currentBalance)}
          </p>

          <p className="mt-1 text-[11px] text-muted-foreground">
            رصيد المحفظة بالريال اليمني
          </p>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
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
            <FormField
              label="المبلغ المحوَّل (ريال يمني)"
              required
            >
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                min="1"
                step="0.01"
                dir="ltr"
                autoComplete="off"
                className={fieldCls}
                disabled={busy}
              />
            </FormField>

            <FormField label="طريقة التحويل" required>
              <select
                value={methodCode || transferMethods[0]?.code || ""}
                onChange={(e) => setMethodCode(e.target.value)}
                className={fieldCls}
                aria-label="طريقة التحويل"
                disabled={busy || transferMethods.length === 0}
              >
                {transferMethods.length === 0 ? (
                  <option value="">
                    لا توجد طريقة تحويل متاحة
                  </option>
                ) : (
                  transferMethods.map((method) => (
                    <option
                      key={method.id}
                      value={method.code}
                    >
                      {method.display_name}
                      {method.account_number
                        ? ` — ${method.account_number}`
                        : ""}
                    </option>
                  ))
                )}
              </select>
            </FormField>

            <FormField label="اسم المُحوِّل">
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                maxLength={100}
                autoComplete="name"
                className={fieldCls}
                disabled={busy}
                placeholder={profile?.full_name || ""}
              />
            </FormField>

            <FormField label="رقم المُحوِّل">
              <input
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                dir="ltr"
                maxLength={30}
                inputMode="tel"
                autoComplete="tel"
                className={fieldCls}
                disabled={busy}
                placeholder={profile?.phone || ""}
              />
            </FormField>

            <FormField label="رقم عملية التحويل">
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={100}
                dir="ltr"
                inputMode="text"
                autoComplete="off"
                className={fieldCls}
                disabled={busy}
                placeholder="اختياري"
              />
            </FormField>

            <FormField label="صورة الإيصال" required>
              <label
                className={`flex h-12 items-center gap-2 rounded-2xl border border-dashed border-border bg-secondary px-3.5 text-xs text-muted-foreground ${
                  busy
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer"
                }`}
              >
                <Upload className="h-4 w-4 text-primary" />

                <span className="truncate">
                  {receipt
                    ? receipt.name
                    : "اختر صورة الإيصال"}
                </span>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const file =
                      e.target.files?.[0] ?? null;

                    if (!file) {
                      setReceipt(null);
                      return;
                    }

                    if (!file.type.startsWith("image/")) {
                      toast.error(
                        "يرجى اختيار ملف صورة فقط",
                      );
                      e.currentTarget.value = "";
                      setReceipt(null);
                      return;
                    }

                    /*
                     * حد مبدئي لحجم الصورة من الواجهة.
                     * الحماية الأساسية تبقى في Storage/RLS.
                     */
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error(
                        "حجم صورة الإيصال يجب ألا يتجاوز 10MB",
                      );
                      e.currentTarget.value = "";
                      setReceipt(null);
                      return;
                    }

                    setReceipt(file);
                  }}
                />
              </label>
            </FormField>

            <div className="rounded-2xl bg-secondary/60 p-3 text-[11px] leading-5 text-muted-foreground sm:col-span-2">
              بعد إرسال الطلب، لن يتم إضافة المبلغ إلى
              محفظتك مباشرة. ستتم مراجعته من الإدارة أولًا،
              وبعد الاعتماد فقط يتم تحديث الرصيد وتسجيل
              العملية المالية.
            </div>

            <button
              type="submit"
              disabled={
                busy ||
                transferMethods.length === 0
              }
              className="h-12 rounded-2xl bg-primary text-sm text-primary-foreground disabled:opacity-60 sm:col-span-2"
            >
              {busy
                ? "جارٍ إرسال الطلب..."
                : "إرسال طلب الشحن"}
            </button>
          </form>
        ) : null}

        <h2 className="mt-6 text-sm text-foreground">
          سجل العمليات
        </h2>

        {txs.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            لا توجد عمليات على محفظتك بعد.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {txs.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="text-foreground">
                    {transaction.description ||
                      transaction.kind}
                  </p>

                  <p className="text-muted-foreground">
                    {formatDate(transaction.created_at)}
                  </p>
                </div>

                <span
                  className={
                    transaction.amount < 0
                      ? "text-destructive"
                      : "text-primary"
                  }
                >
                  {transaction.amount < 0 ? "-" : "+"}
                  {formatPrice(
                    Math.abs(transaction.amount),
                  )}
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
