import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowUpRight,
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
import { useFormatPrice } from "@/lib/currency-context";
import {
  fetchPaymentMethods,
  fetchWalletTransactions,
  formatDate,
} from "@/lib/store";
import { uploadReceipt } from "@/lib/media";
import { DigitalWalletCard } from "@/components/digital-wallet-card";

export const Route = createFileRoute(
  "/_authenticated/wallet",
)({
  head: () => ({
    meta: [
      {
        title: "محفظتي | شهارة",
      },
      {
        name: "description",
        content:
          "محفظتك الرقمية في شهارة.",
      },
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

  const {
    user,
    profile,
    refreshProfile,
  } = useAuth();

  const userId = user?.id ?? "";

  const [open, setOpen] =
    useState(false);

  const [amount, setAmount] =
    useState("");

  const [methodCode, setMethodCode] =
    useState("");

  const [senderName, setSenderName] =
    useState("");

  const [senderPhone, setSenderPhone] =
    useState("");

  const [reference, setReference] =
    useState("");

  const [receipt, setReceipt] =
    useState<File | null>(null);

  const [busy, setBusy] =
    useState(false);

  const {
    data: wallet,
    isLoading: walletLoading,
    refetch: refetchWallet,
  } = useQuery<WalletData | null>({
    queryKey: [
      "wallet",
      userId,
      "YER",
    ],
    enabled: Boolean(userId),

    queryFn: async () => {
      const { data, error } =
        await (supabase as any).rpc(
          "get_wallet",
          {
            requested_currency:
              "YER",
          },
        );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      if (!data) {
        return null;
      }

      const row = Array.isArray(data)
        ? data[0]
        : data;

      if (!row) {
        return null;
      }

      return {
        id: String(row.id),
        user_id: String(row.user_id),
        currency: String(
          row.currency,
        ),
        balance: Number(
          row.balance ?? 0,
        ),
      };
    },
  });

  const {
    data: txs = [],
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: [
      "wallet-tx",
      userId,
    ],
    enabled: Boolean(userId),

    queryFn: () =>
      fetchWalletTransactions(
        userId,
      ),
  });

  const {
    data: methods = [],
  } = useQuery({
    queryKey: [
      "payment-methods",
      "active",
    ],

    queryFn: () =>
      fetchPaymentMethods(true),
  });

  const transferMethods =
    methods.filter(
      (method) =>
        method.requires_receipt,
    );

  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!userId) {
      toast.error(
        "يجب تسجيل الدخول أولاً",
      );
      return;
    }

    const value = Number(amount);

    const code =
      methodCode ||
      transferMethods[0]?.code ||
      "";

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      toast.error(
        "أدخل مبلغاً صحيحاً",
      );
      return;
    }

    if (!code) {
      toast.error(
        "لا توجد طريقة تحويل متاحة حالياً",
      );
      return;
    }

    if (!receipt) {
      toast.error(
        "أرفق صورة إيصال التحويل",
      );
      return;
    }

    setBusy(true);

    try {
      const path =
        await uploadReceipt(
          userId,
          receipt,
        );

      const { error } =
        await (supabase as any).rpc(
          "request_wallet_topup",
          {
            _amount: value,
            _method_code: code,
            _currency: "YER",
            _sender_name:
              senderName.trim() ||
              profile?.full_name ||
              "",
            _sender_phone:
              senderPhone.trim() ||
              profile?.phone ||
              "",
            _reference:
              reference.trim(),
            _receipt_path: path,
          },
        );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      toast.success(
        "تم إرسال طلب الشحن، وسيتم تحديث الرصيد بعد تأكيد الإدارة",
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

  const currentBalance =
    wallet?.balance ?? 0;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#0A2A38] pb-28 text-[#F6F2EE] md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-5 sm:py-6">

        {/* Page title */}
        <header className="mb-5">
          <p className="text-[10px] font-medium tracking-[0.15em] text-white/35">
            SHEHARA WALLET
          </p>

          <h1 className="mt-1 text-xl font-black">
            محفظتي
          </h1>

          <p className="mt-1 text-[9px] text-white/35">
            محفظتك الرقمية لإدارة رصيدك وعملياتك
          </p>
        </header>

        {/* Digital wallet */}
        <section className="mb-4">
          <DigitalWalletCard
            name={profile?.full_name}
            balance={currentBalance}
            loading={walletLoading}
          />
        </section>

        {/* Wallet actions */}
        <section className="mb-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              setOpen(true)
            }
            className="group rounded-[18px] border border-white/[0.07] bg-[#0D3B4D] p-4 text-start transition hover:border-[#E2723A]/30"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E2723A]/10 text-[#E2723A]">
              <ArrowDownToLine className="h-5 w-5" />
            </span>

            <p className="mt-3 text-xs font-bold">
              شحن الرصيد
            </p>

            <p className="mt-1 text-[9px] text-white/35">
              إضافة رصيد للمحفظة
            </p>
          </button>

          <div className="rounded-[18px] border border-white/[0.07] bg-[#0D3B4D] p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-white/55">
              <ArrowUpRight className="h-5 w-5" />
            </span>

            <p className="mt-3 text-xs font-bold">
              الدفع من المحفظة
            </p>

            <p className="mt-1 text-[9px] text-white/35">
              متاح عند إتمام الطلب
            </p>
          </div>
        </section>

        {/* Topup form */}
        {open ? (
          <form
            onSubmit={submit}
            className="mb-4 rounded-[20px] border border-white/[0.07] bg-[#0D3B4D] p-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">
                  شحن المحفظة
                </h2>

                <p className="mt-1 text-[9px] text-white/35">
                  سيتم اعتماد العملية من الإدارة
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="text-[9px] font-bold text-white/40"
              >
                إلغاء
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="المبلغ المحول (ريال يمني)"
                required
              >
                <input
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value,
                    )
                  }
                  inputMode="decimal"
                  min="1"
                  step="0.01"
                  dir="ltr"
                  autoComplete="off"
                  className={`${fieldCls} !border-white/10 !bg-[#0A2A38] !text-[#F6F2EE]`}
                  disabled={busy}
                />
              </FormField>

              <FormField
                label="طريقة التحويل"
                required
              >
                <select
                  value={
                    methodCode ||
                    transferMethods[0]
                      ?.code ||
                    ""
                  }
                  onChange={(event) =>
                    setMethodCode(
                      event.target.value,
                    )
                  }
                  className={`${fieldCls} !border-white/10 !bg-[#0A2A38] !text-[#F6F2EE]`}
                  disabled={
                    busy ||
                    transferMethods.length ===
                      0
                  }
                >
                  {transferMethods.length ===
                  0 ? (
                    <option value="">
                      لا توجد طريقة تحويل
                    </option>
                  ) : (
                    transferMethods.map(
                      (method) => (
                        <option
                          key={method.id}
                          value={
                            method.code
                          }
                        >
                          {
                            method.display_name
                          }
                          {method.account_number
                            ? ` — ${method.account_number}`
                            : ""}
                        </option>
                      ),
                    )
                  )}
                </select>
              </FormField>

              <FormField label="اسم المحول">
                <input
                  value={senderName}
                  onChange={(event) =>
                    setSenderName(
                      event.target.value,
                    )
                  }
                  maxLength={100}
                  className={`${fieldCls} !border-white/10 !bg-[#0A2A38] !text-[#F6F2EE]`}
                  disabled={busy}
                  placeholder={
                    profile?.full_name ||
                    ""
                  }
                />
              </FormField>

              <FormField label="رقم المحول">
                <input
                  value={senderPhone}
                  onChange={(event) =>
                    setSenderPhone(
                      event.target.value,
                    )
                  }
                  dir="ltr"
                  maxLength={30}
                  inputMode="tel"
                  className={`${fieldCls} !border-white/10 !bg-[#0A2A38] !text-[#F6F2EE]`}
                  disabled={busy}
                  placeholder={
                    profile?.phone ||
                    ""
                  }
                />
              </FormField>

              <FormField label="رقم العملية">
                <input
                  value={reference}
                  onChange={(event) =>
                    setReference(
                      event.target.value,
                    )
                  }
                  maxLength={100}
                  dir="ltr"
                  className={`${fieldCls} !border-white/10 !bg-[#0A2A38] !text-[#F6F2EE]`}
                  disabled={busy}
                  placeholder="اختياري"
                />
              </FormField>

              <FormField
                label="صورة الإيصال"
                required
              >
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
                        event.target
                          .files?.[0] ??
                        null;

                      if (!file) {
                        setReceipt(null);
                        return;
                      }

                      if (
                        !file.type.startsWith(
                          "image/",
                        )
                      ) {
                        toast.error(
                          "يرجى اختيار صورة فقط",
                        );

                        event.currentTarget.value =
                          "";

                        setReceipt(null);
                        return;
                      }

                      if (
                        file.size >
                        10 *
                          1024 *
                          1024
                      ) {
                        toast.error(
                          "حجم الصورة يجب ألا يتجاوز 10MB",
                        );

                        event.currentTarget.value =
                          "";

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
                لن تتم إضافة المبلغ مباشرة.
                تتم مراجعة الطلب واعتماده من
                الإدارة قبل تحديث الرصيد.
              </p>
            </div>

            <button
              type="submit"
              disabled={
                busy ||
                transferMethods.length ===
                  0
              }
              className="mt-3 h-12 w-full rounded-xl bg-[#E2723A] text-xs font-bold text-white disabled:opacity-50"
            >
              {busy
                ? "جارٍ إرسال الطلب..."
                : "إرسال طلب الشحن"}
            </button>
          </form>
        ) : null}

        {/* Transactions */}
        <section className="rounded-[20px] border border-white/[0.07] bg-[#0D3B4D] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-white/55">
                <History className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-xs font-bold">
                  سجل العمليات
                </h2>

                <p className="mt-1 text-[8px] text-white/35">
                  جميع عمليات المحفظة
                </p>
              </div>
            </div>

            <Wallet className="h-4 w-4 text-[#E2723A]" />
          </div>

          {txs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
              <Wallet className="mx-auto h-6 w-6 text-white/15" />

              <p className="mt-2 text-[9px] text-white/35">
                لا توجد عمليات على محفظتك بعد
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {txs.map(
                (transaction) => (
                  <li
                    key={
                      transaction.id
                    }
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                        {transaction.amount <
                        0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-red-300" />
                        ) : (
                          <ArrowDownToLine className="h-3.5 w-3.5 text-[#E2723A]" />
                        )}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-[9px] font-semibold">
                          {transaction.description ||
                            transaction.kind}
                        </p>

                        <p className="mt-1 text-[7px] text-white/30">
                          {formatDate(
                            transaction.created_at,
                          )}
                        </p>
                      </div>
                    </div>

                    <span
                      className={
                        transaction.amount <
                        0
                          ? "shrink-0 text-[10px] font-bold text-red-300"
                          : "shrink-0 text-[10px] font-bold text-[#E2723A]"
                      }
                    >
                      {transaction.amount <
                      0
                        ? "-"
                        : "+"}

                      {formatPrice(
                        Math.abs(
                          transaction.amount,
                        ),
                      )}
                    </span>
                  </li>
                ),
              )}
            </ul>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
