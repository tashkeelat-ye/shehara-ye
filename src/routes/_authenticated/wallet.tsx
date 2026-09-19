import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  History,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { FormField, fieldCls } from "@/components/form-ui";
import { useAuth } from "@/lib/auth-context";
import { useCurrency } from "@/lib/currency-context";
import {
  fetchPaymentMethods,
  fetchPaymentRequests,
  fetchWalletTransactions,
  formatDate,
  type WalletTransaction,
  type PaymentRequest,
} from "@/lib/store";
import { uploadReceipt } from "@/lib/media";
import { DigitalWalletCard } from "@/components/digital-wallet-card";

type WalletData = {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
};

export const Route = createFileRoute(
  "/_authenticated/wallet",
)({
  head: () => ({
    meta: [
      { title: "محفظتي | شهارة" },
      {
        name: "description",
        content:
          "إدارة البطاقة والرصيد وعمليات المحفظة وطلبات الشحن في شهارة.",
      },
    ],
  }),
  component: WalletPage,
});

function formatWalletAmount(
  amount: number,
  currency: string,
) {
  const suffix = currency === "SAR" ? "ر.س" : "ر.ي";
  return `${amount.toLocaleString("ar-EG", {
    minimumFractionDigits: currency === "SAR" ? 2 : 0,
    maximumFractionDigits: 2,
  })} ${suffix}`;
}

function WalletPage() {
  const { user, profile } = useAuth();
  const { currency } = useCurrency();
  const userId = user?.id ?? "";
  const currencyCode = currency;

  const [openTopup, setOpenTopup] = useState(false);
  const [amount, setAmount] = useState("");
  const [methodCode, setMethodCode] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    data: wallet,
    isLoading: walletLoading,
    refetch: refetchWallet,
  } = useQuery<WalletData | null>({
    queryKey: ["wallet", userId, currencyCode],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "get_wallet",
        { requested_currency: currencyCode },
      );

      if (error) throw new Error(error.message);

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;

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
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery<WalletTransaction[]>({
    queryKey: ["wallet-tx", userId, currencyCode],
    enabled: Boolean(userId),
    queryFn: () =>
      fetchWalletTransactions(
        userId,
        currencyCode,
      ),
  });

  const {
    data: requests = [],
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useQuery<PaymentRequest[]>({
    queryKey: ["wallet-topup-requests", userId],
    enabled: Boolean(userId),
    queryFn: () =>
      fetchPaymentRequests(userId, "topup"),
  });

  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods", "active"],
    queryFn: () => fetchPaymentMethods(true),
  });

  const transferMethods = methods.filter(
    (method) => method.requires_receipt,
  );

  const currentBalance = wallet?.balance ?? 0;
  const credits = txs
    .filter((tx) => tx.transaction_type === "credit")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const debits = txs
    .filter((tx) => tx.transaction_type === "debit")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!userId) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

    const value = Number(amount);
    const code =
      methodCode ||
      transferMethods[0]?.code ||
      "";

    if (!Number.isFinite(value) || value <= 0) {
      toast.error("أدخل مبلغاً صحيحاً");
      return;
    }

    if (!code) {
      toast.error("لا توجد طريقة تحويل متاحة حالياً");
      return;
    }

    if (!receipt) {
      toast.error("أرفق صورة إيصال التحويل");
      return;
    }

    setBusy(true);

    try {
      const path = await uploadReceipt(userId, receipt);

      const { error } = await (supabase as any).rpc(
        "request_wallet_topup",
        {
          _amount: value,
          _method_code: code,
          _currency: currencyCode,
          _sender_name:
            senderName.trim() ||
            profile?.full_name ||
            "",
          _sender_phone:
            senderPhone.trim() ||
            profile?.phone ||
            "",
          _reference: reference.trim(),
          _receipt_path: path,
        },
      );

      if (error) throw new Error(error.message);

      toast.success(
        "تم إرسال طلب الشحن وسيتم تحديث الرصيد بعد اعتماد الإدارة",
      );

      setOpenTopup(false);
      setAmount("");
      setMethodCode("");
      setSenderName("");
      setSenderPhone("");
      setReference("");
      setReceipt(null);

      await Promise.all([
        refetchWallet(),
        refetchTransactions(),
        refetchRequests(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر إرسال طلب الشحن",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#0A2A38] pb-28 text-[#F6F2EE] md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-5 sm:py-6">
        <header className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium tracking-[0.15em] text-white/35">
              SHEHARA WALLET
            </p>
            <h1 className="mt-1 text-xl font-black">
              محفظتي
            </h1>
            <p className="mt-1 text-[9px] text-white/35">
              البطاقة والرصيد والعمليات المالية في مكان واحد
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-center">
            <p className="text-[7px] text-white/30">
              العملة
            </p>
            <p className="mt-0.5 text-[10px] font-black text-[#E2723A]">
              {currencyCode === "SAR"
                ? "ر.س"
                : "ر.ي"}
            </p>
          </div>
        </header>

        {/* Digital wallet card */}
        <section className="mb-4">
          <DigitalWalletCard
            name={profile?.full_name}
            balance={currentBalance}
            loading={walletLoading}
            accountNumber={
              wallet
                ? `•••• ${wallet.id.slice(-4)}`
                : "•••• ••••"
            }
          />
        </section>

        {/* Financial summary */}
        <section className="mb-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-[16px] border border-white/[0.07] bg-[#0D3B4D] p-3">
            <p className="text-[8px] text-white/35">
              الرصيد المتاح
            </p>
            <p className="mt-1 truncate text-[11px] font-black text-[#E2723A]">
              {formatWalletAmount(
                currentBalance,
                currencyCode,
              )}
            </p>
          </div>

          <div className="rounded-[16px] border border-white/[0.07] bg-[#0D3B4D] p-3">
            <p className="text-[8px] text-white/35">
              إجمالي الإضافات
            </p>
            <p className="mt-1 truncate text-[11px] font-black text-emerald-300">
              +{formatWalletAmount(credits, currencyCode)}
            </p>
          </div>

          <div className="rounded-[16px] border border-white/[0.07] bg-[#0D3B4D] p-3">
            <p className="text-[8px] text-white/35">
              إجمالي الخصومات
            </p>
            <p className="mt-1 truncate text-[11px] font-black text-red-300">
              -{formatWalletAmount(debits, currencyCode)}
            </p>
          </div>
        </section>

        {/* Wallet actions */}
        <section className="mb-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setOpenTopup(true)}
            className="group rounded-[18px] border border-[#E2723A]/20 bg-[#E2723A]/[0.07] p-4 text-start transition hover:-translate-y-0.5 hover:border-[#E2723A]/35"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E2723A]/10 text-[#E2723A]">
              <ArrowDownToLine className="h-5 w-5" />
            </span>
            <p className="mt-3 text-xs font-black">
              شحن الرصيد
            </p>
            <p className="mt-1 text-[9px] text-white/35">
              إرسال طلب شحن مع الإيصال
            </p>
          </button>

          <div className="rounded-[18px] border border-white/[0.07] bg-[#0D3B4D] p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-white/55">
              <ArrowUpRight className="h-5 w-5" />
            </span>
            <p className="mt-3 text-xs font-black">
              الدفع من المحفظة
            </p>
            <p className="mt-1 text-[9px] text-white/35">
              متاح عند إتمام الطلب
            </p>
          </div>
        </section>

        {/* Topup form */}
        {openTopup ? (
          <form
            onSubmit={submit}
            className="mb-4 rounded-[20px] border border-white/[0.07] bg-[#0D3B4D] p-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black">
                  شحن المحفظة
                </h2>
                <p className="mt-1 text-[9px] text-white/35">
                  طلب الشحن لا يغيّر الرصيد حتى تعتمد الإدارة العملية
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpenTopup(false)}
                className="text-[9px] font-bold text-white/40"
              >
                إلغاء
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label={`المبلغ (${currencyCode === "SAR" ? "ريال سعودي" : "ريال يمني"})`}
                required
              >
                <input
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  dir="ltr"
                  autoComplete="off"
                  className={`${fieldCls} !border-white/10 !bg-[#0A2A38] !text-[#F6F2EE]`}
                  disabled={busy}
                />
              </FormField>

              <FormField label="طريقة التحويل" required>
                <select
                  value={
                    methodCode ||
                    transferMethods[0]?.code ||
                    ""
                  }
                  onChange={(event) =>
                    setMethodCode(event.target.value)
                  }
                  className={`${fieldCls} !border-white/10 !bg-[#0A2A38] !text-[#F6F2EE]`}
                  disabled={
                    busy ||
                    transferMethods.length === 0
                  }
                >
                  {transferMethods.length === 0 ? (
                    <option value="">
                      لا توجد طريقة تحويل
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

              <FormField label="اسم المحول">
                <input
                  value={senderName}
                  onChange={(event) =>
                    setSenderName(event.target.value)
                  }
                  maxLength={100}
                  className={`${fieldCls} !border-white/10 !bg-[#0A2A38] !text-[#F6F2EE]`}
                  disabled={busy}
                  placeholder={profile?.full_name || ""}
                />
              </FormField>

              <FormField label="رقم المحول">
                <input
                  value={senderPhone}
                  onChange={(event) =>
                    setSenderPhone(event.target.value)
                  }
                  dir="ltr"
                  maxLength={30}
                  inputMode="tel"
                  className={`${fieldCls} !border-white/10 !bg-[#0A2A38] !text-[#F6F2EE]`}
                  disabled={busy}
                  placeholder={profile?.phone || ""}
                />
              </FormField>

              <FormField label="رقم العملية">
                <input
                  value={reference}
                  onChange={(event) =>
                    setReference(event.target.value)
                  }
                  maxLength={100}
                  dir="ltr"
                  className={`${fieldCls} !border-white/10 !bg-[#0A2A38] !text-[#F6F2EE]`}
                  disabled={busy}
                  placeholder="اختياري"
                />
              </FormField>

              <FormField label="صورة الإيصال" required>
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/10 bg-[#0A2A38] px-3 text-[10px] text-white/40">
                  <Upload className="h-4 w-4 text-[#E2723A]" />
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
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0] ?? null;

                      if (!file) {
                        setReceipt(null);
                        return;
                      }

                      if (
                        !file.type.startsWith("image/")
                      ) {
                        toast.error(
                          "يرجى اختيار صورة فقط",
                        );
                        event.currentTarget.value = "";
                        setReceipt(null);
                        return;
                      }

                      if (
                        file.size >
                        10 * 1024 * 1024
                      ) {
                        toast.error(
                          "حجم الصورة يجب ألا يتجاوز 10MB",
                        );
                        event.currentTarget.value = "";
                        setReceipt(null);
                        return;
                      }

                      setReceipt(file);
                    }}
                  />
                </label>
              </FormField>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/[0.035] p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#E2723A]" />
              <p className="text-[8px] leading-5 text-white/35">
                يتم تسجيل طلب الشحن أولاً. لا يتم تعديل رصيدك إلا عبر عملية الاعتماد الآمنة في النظام.
              </p>
            </div>

            <button
              type="submit"
              disabled={
                busy ||
                transferMethods.length === 0
              }
              className="mt-3 h-12 w-full rounded-xl bg-[#E2723A] text-xs font-black text-white disabled:opacity-50"
            >
              {busy
                ? "جارٍ إرسال الطلب..."
                : "إرسال طلب الشحن"}
            </button>
          </form>
        ) : null}

        {/* Pending requests */}
        <section className="mb-4 rounded-[20px] border border-white/[0.07] bg-[#0D3B4D] p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-white/55">
              <Clock3 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-xs font-black">
                طلبات الشحن
              </h2>
              <p className="mt-1 text-[8px] text-white/35">
                حالة طلبات إضافة الرصيد
              </p>
            </div>
          </div>

          {requestsLoading ? (
            <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center">
              <p className="text-[9px] text-white/35">
                لا توجد طلبات شحن
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.slice(0, 4).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] p-3"
                >
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold">
                      شحن محفظة
                    </p>
                    <p className="mt-1 text-[7px] text-white/30">
                      {formatDate(request.created_at)}
                    </p>
                  </div>

                  <div className="shrink-0 text-start">
                    <p className="text-[10px] font-black text-[#E2723A]">
                      {formatWalletAmount(
                        Number(request.amount),
                        request.currency,
                      )}
                    </p>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[7px] font-bold ${
                        request.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : request.status === "rejected"
                            ? "bg-red-500/10 text-red-300"
                            : "bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {request.status === "approved" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Clock3 className="h-3 w-3" />
                      )}
                      {request.status === "approved"
                        ? "مقبول"
                        : request.status === "rejected"
                          ? "مرفوض"
                          : "قيد المراجعة"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Transactions */}
        <section className="rounded-[20px] border border-white/[0.07] bg-[#0D3B4D] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-white/55">
                <History className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-xs font-black">
                  سجل العمليات
                </h2>
                <p className="mt-1 text-[8px] text-white/35">
                  جميع الحركات المسجلة على محفظتك
                </p>
              </div>
            </div>
            <Wallet className="h-4 w-4 text-[#E2723A]" />
          </div>

          {transactionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-14 animate-pulse rounded-xl bg-white/[0.04]"
                />
              ))}
            </div>
          ) : txs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
              <Wallet className="mx-auto h-6 w-6 text-white/15" />
              <p className="mt-2 text-[9px] text-white/35">
                لا توجد عمليات على هذه المحفظة بعد
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {txs.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                      {transaction.transaction_type ===
                      "debit" ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-red-300" />
                      ) : (
                        <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-300" />
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-[9px] font-semibold">
                        {transaction.description ||
                          transaction.kind ||
                          "عملية مالية"}
                      </p>
                      <p className="mt-1 text-[7px] text-white/30">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-start">
                    <p
                      className={
                        transaction.transaction_type ===
                        "debit"
                          ? "text-[10px] font-black text-red-300"
                          : "text-[10px] font-black text-emerald-300"
                      }
                    >
                      {transaction.transaction_type ===
                      "debit"
                        ? "-"
                        : "+"}
                      {formatWalletAmount(
                        Math.abs(transaction.amount),
                        transaction.currency,
                      )}
                    </p>

                    {transaction.balance_after !== null ? (
                      <p className="mt-1 text-[7px] text-white/25">
                        الرصيد بعد العملية:{" "}
                        {formatWalletAmount(
                          transaction.balance_after,
                          transaction.currency,
                        )}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

export default WalletPage;
