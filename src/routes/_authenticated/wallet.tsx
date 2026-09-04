import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileDown,
  FileText,
  History,
  Upload,
  Wallet,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { FormField, fieldCls } from "@/components/form-ui";
import { WalletCard } from "@/components/account/wallet-card";

import { useAuth } from "@/lib/auth-context";
import { useFormatPrice } from "@/lib/currency-context";

import {
  fetchPaymentMethods,
  fetchWalletTransactions,
  formatDate,
  type WalletTransaction,
} from "@/lib/store";

import { uploadReceipt } from "@/lib/media";

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
          "الرصيد والشحن ومعاملات محفظة شهارة وكشف الحساب.",
      },
    ],
  }),

  component: WalletPage,
});

type TopUpRequest = {
  id: string;
  amount: number;
  method_code: string;
  reference: string;
  status: string;
  created_at: string;
};

function WalletPage() {
  const formatPrice = useFormatPrice();

  const {
    user,
    profile,
    refreshProfile,
  } = useAuth();

  const userId = user?.id ?? "";

  const walletId =
    profile?.phone?.trim() ||
    user?.phone?.trim() ||
    "";

  const [
    openTopUp,
    setOpenTopUp,
  ] = useState(false);

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

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const [statementReady, setStatementReady] =
    useState(false);

  const {
    data: txs = [],
    refetch: refetchTxs,
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

  const {
    data: topUpRequests = [],
    refetch: refetchTopUps,
  } = useQuery({
    queryKey: [
      "wallet-topup-requests",
      userId,
    ],

    enabled: Boolean(userId),

    queryFn: async () => {
      const {
        data,
        error,
      } = await supabase
        .from("payment_requests")
        .select(
          "id,amount,method_code,reference,status,created_at",
        )
        .eq(
          "user_id",
          userId,
        )
        .eq(
          "purpose",
          "topup",
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(5)
        .returns<TopUpRequest[]>();

      if (error) {
        throw new Error(
          error.message,
        );
      }

      return data ?? [];
    },
  });

  const transferMethods =
    methods.filter(
      (method) =>
        method.requires_receipt,
    );

  const selectedMethodCode =
    methodCode ||
    transferMethods[0]?.code ||
    "";

  const filteredTxs =
    useMemo(() => {
      const from = fromDate
        ? new Date(
            `${fromDate}T00:00:00`,
          )
        : null;

      const to = toDate
        ? new Date(
            `${toDate}T23:59:59.999`,
          )
        : null;

      return txs.filter(
        (tx) => {
          const date =
            new Date(
              tx.created_at,
            );

          if (
            from &&
            date < from
          ) {
            return false;
          }

          if (
            to &&
            date > to
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      fromDate,
      toDate,
      txs,
    ]);

  const statementTotals =
    useMemo(() => {
      const credits =
        filteredTxs
          .filter(
            (tx) =>
              tx.amount > 0,
          )
          .reduce(
            (sum, tx) =>
              sum + tx.amount,
            0,
          );

      const debits =
        filteredTxs
          .filter(
            (tx) =>
              tx.amount < 0,
          )
          .reduce(
            (sum, tx) =>
              sum +
              Math.abs(
                tx.amount,
              ),
            0,
          );

      const net =
        credits - debits;

      const closing =
        Number(
          profile?.wallet_balance ??
            0,
        );

      const opening =
        closing - net;

      return {
        credits,
        debits,
        net,
        opening,
        closing,
      };
    }, [
      filteredTxs,
      profile?.wallet_balance,
    ]);

  async function submitTopUp(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const value =
      Number(amount);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      toast.error(
        "أدخل مبلغًا صحيحًا",
      );
      return;
    }

    if (
      !selectedMethodCode
    ) {
      toast.error(
        "لا توجد طريقة تحويل متاحة حاليًا",
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

      const {
        error,
      } = await supabase
        .from(
          "payment_requests",
        )
        .insert({
          user_id: userId,
          purpose: "topup",
          method_code:
            selectedMethodCode,
          amount: value,
          sender_name:
            senderName.trim() ||
            (profile?.full_name ??
              ""),
          sender_phone:
            senderPhone.trim() ||
            (profile?.phone ??
              ""),
          reference:
            reference.trim(),
          receipt_path: path,
        });

      if (error) {
        throw new Error(
          error.message,
        );
      }

      toast.success(
        "تم إرسال طلب الشحن للمراجعة",
      );

      setOpenTopUp(false);
      setAmount("");
      setSenderName("");
      setSenderPhone("");
      setReference("");
      setReceipt(null);

      await refetchTopUps();
      await refetchTxs();
      await refreshProfile();
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

  function createStatement() {
    if (
      fromDate &&
      toDate &&
      fromDate > toDate
    ) {
      toast.error(
        "تاريخ البداية يجب أن يسبق تاريخ النهاية",
      );
      return;
    }

    setStatementReady(true);

    toast.success(
      `تم إنشاء كشف الحساب من ${
        fromDate ||
        "بداية المحفظة"
      } إلى ${
        toDate ||
        "اليوم"
      }`,
    );
  }

  function exportCsv() {
    if (!statementReady) {
      toast.error(
        "أنشئ كشف الحساب أولاً",
      );
      return;
    }

    const rows = [
      [
        "كشف حساب محفظة شهارة",
      ],

      [
        "معرف المحفظة",
        walletId ||
          "غير مضاف",
      ],

      [
        "صاحب المحفظة",
        profile?.full_name ||
          "عميل شهارة",
      ],

      [
        "الفترة",
        `${
          fromDate ||
          "بداية المحفظة"
        } - ${
          toDate ||
          "اليوم"
        }`,
      ],

      [],

      [
        "الرصيد الافتتاحي",
        statementTotals.opening.toFixed(
          2,
        ),
      ],

      [
        "إجمالي الإيداعات",
        statementTotals.credits.toFixed(
          2,
        ),
      ],

      [
        "إجمالي الخصومات",
        statementTotals.debits.toFixed(
          2,
        ),
      ],

      [
        "صافي الحركة",
        statementTotals.net.toFixed(
          2,
        ),
      ],

      [
        "الرصيد الختامي",
        statementTotals.closing.toFixed(
          2,
        ),
      ],

      [],

      [
        "التاريخ",
        "النوع",
        "الوصف",
        "المبلغ",
      ],

      ...filteredTxs.map(
        (tx) => [
          new Date(
            tx.created_at,
          ).toLocaleString(
            "ar-YE",
          ),

          tx.kind,

          tx.description ||
            "—",

          tx.amount.toFixed(
            2,
          ),
        ],
      ),
    ];

    const csv =
      rows
        .map(
          (row) =>
            row
              .map(csvCell)
              .join(","),
        )
        .join("\r\n");

    const blob =
      new Blob(
        [
          "\uFEFF" + csv,
        ],
        {
          type:
            "text/csv;charset=utf-8",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement(
        "a",
      );

    link.href = url;

    link.download =
      `shehara-wallet-statement-${new Date()
        .toISOString()
        .slice(
          0,
          10,
        )}.csv`;

    document.body.appendChild(
      link,
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url,
    );

    toast.success(
      "تم تصدير كشف الحساب بصيغة CSV",
    );
  }

  function printStatement() {
    if (!statementReady) {
      toast.error(
        "أنشئ كشف الحساب أولاً",
      );
      return;
    }

    window.print();
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-transparent pb-28 text-foreground md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">
        <header className="flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[9px] font-black text-[#D65A31]">
              SHEHARA
            </p>

            <h1 className="mt-1 text-xl font-black">
              محفظتي
            </h1>

            <p className="mt-1 text-[9px] text-muted-foreground">
              الرصيد والشحن ومعاملات المحفظة وكشف الحساب
            </p>
          </div>

          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0E4D64]/10 text-[#0E4D64]">
            <Wallet className="h-5 w-5" />
          </span>
        </header>

        <WalletCard
          balance={Number(
            profile?.wallet_balance ??
              0,
          )}
          formattedBalance={formatPrice(
            profile?.wallet_balance ??
              0,
          )}
          customerName={
            profile?.full_name ||
            "عميل شهارة"
          }
          phone={
            profile?.phone ||
            user?.phone ||
            ""
          }
          walletId={walletId}
        />

        <section className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              setOpenTopUp(
                (value) =>
                  !value,
              )
            }
            className="flex min-h-20 items-center gap-3 rounded-2xl border border-[#D65A31]/15 bg-white/90 p-3 text-start shadow-sm transition active:scale-[.98] dark:bg-card/90"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
              <ArrowUpFromLine className="h-5 w-5" />
            </span>

            <span>
              <span className="block text-[10px] font-black">
                شحن الرصيد
              </span>

              <span className="mt-1 block text-[8px] text-muted-foreground">
                إرسال طلب شحن
              </span>
            </span>
          </button>

          <a
            href="#transactions"
            className="flex min-h-20 items-center gap-3 rounded-2xl border border-[#0E4D64]/10 bg-white/90 p-3 shadow-sm transition active:scale-[.98] dark:bg-card/90"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
              <History className="h-5 w-5" />
            </span>

            <span>
              <span className="block text-[10px] font-black">
                معاملات المحفظة
              </span>

              <span className="mt-1 block text-[8px] text-muted-foreground">
                سجل الرصيد والحركة
              </span>
            </span>
          </a>
        </section>

        {openTopUp ? (
          <form
            onSubmit={submitTopUp}
            className="rounded-[24px] border border-[#D65A31]/15 bg-white/95 p-4 shadow-sm dark:bg-card/95"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black">
                  شحن الرصيد
                </h2>

                <p className="mt-1 text-[8px] text-muted-foreground">
                  حوّل المبلغ إلى إحدى طرق الدفع ثم أرفق الإيصال.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpenTopUp(false)
                }
                className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="المبلغ المحوّل (ريال يمني)"
                required
              >
                <input
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target
                        .value,
                    )
                  }
                  inputMode="numeric"
                  dir="ltr"
                  className={
                    fieldCls
                  }
                />
              </FormField>

              <FormField
                label="طريقة التحويل"
                required
              >
                <select
                  value={
                    selectedMethodCode
                  }
                  onChange={(event) =>
                    setMethodCode(
                      event.target
                        .value,
                    )
                  }
                  className={
                    fieldCls
                  }
                  aria-label="طريقة التحويل"
                >
                  {transferMethods.map(
                    (method) => (
                      <option
                        key={
                          method.id
                        }
                        value={
                          method.code
                        }
                      >
                        {
                          method.display_name
                        }{" "}
                        —{" "}
                        {
                          method.account_number
                        }
                      </option>
                    ),
                  )}
                </select>
              </FormField>

              <FormField label="اسم المحوّل">
                <input
                  value={senderName}
                  onChange={(event) =>
                    setSenderName(
                      event.target
                        .value,
                    )
                  }
                  className={
                    fieldCls
                  }
                />
              </FormField>

              <FormField label="رقم المحوّل">
                <input
                  value={senderPhone}
                  onChange={(event) =>
                    setSenderPhone(
                      event.target
                        .value,
                    )
                  }
                  dir="ltr"
                  className={
                    fieldCls
                  }
                />
              </FormField>

              <FormField label="رقم عملية التحويل">
                <input
                  value={reference}
                  onChange={(event) =>
                    setReference(
                      event.target
                        .value,
                    )
                  }
                  maxLength={60}
                  className={
                    fieldCls
                  }
                />
              </FormField>

              <FormField
                label="صورة الإيصال"
                required
              >
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-border bg-secondary px-3 text-xs text-muted-foreground">
                  <Upload className="h-4 w-4 text-primary" />

                  <span className="truncate">
                    {receipt?.name ||
                      "اختر صورة الإيصال"}
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      setReceipt(
                        event.target
                          .files?.[0] ??
                          null,
                      )
                    }
                  />
                </label>
              </FormField>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-3 h-12 w-full rounded-2xl bg-[#D65A31] text-sm font-black text-white disabled:opacity-50"
            >
              {busy
                ? "جارٍ إرسال الطلب..."
                : "إرسال طلب الشحن"}
            </button>
          </form>
        ) : null}

        <section className="rounded-[24px] border border-[#0E4D64]/10 bg-white/90 p-4 shadow-sm dark:bg-card/90">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
              <ArrowDownToLine className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black">
                طلبات الشحن
              </h2>

              <p className="mt-1 text-[8px] text-muted-foreground">
                آخر طلبات شحن أرسلتها للإدارة
              </p>
            </div>
          </div>

          {topUpRequests.length ? (
            <div className="mt-4 space-y-2">
              {topUpRequests.map(
                (request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
                      <FileText className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black">
                        {formatPrice(
                          request.amount,
                        )}
                      </p>

                      <p className="mt-1 text-[8px] text-muted-foreground">
                        {formatDate(
                          request.created_at,
                        )}

                        {request.reference
                          ? ` • ${request.reference}`
                          : ""}
                      </p>
                    </div>

                    <span className="rounded-full bg-muted px-2 py-1 text-[8px] font-bold">
                      {topUpStatusLabel(
                        request.status,
                      )}
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-background p-4 text-center text-[9px] text-muted-foreground">
              لا توجد طلبات شحن بعد.
            </p>
          )}
        </section>

        <section
          className="rounded-[24px] border border-[#0E4D64]/10 bg-white/90 p-4 shadow-sm dark:bg-card/90"
          id="statement"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
              <FileText className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black">
                كشف حساب المحفظة
              </h2>

              <p className="mt-1 text-[8px] text-muted-foreground">
                حدد الفترة وأنشئ كشفاً قابلاً للتصدير.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[9px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1">
                من تاريخ
                <CalendarDays className="h-3 w-3" />
              </span>

              <input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(
                    event.target
                      .value,
                  );
                  setStatementReady(
                    false,
                  );
                }}
                className={fieldCls}
              />
            </label>

            <label className="text-[9px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1">
                إلى تاريخ
                <CalendarDays className="h-3 w-3" />
              </span>

              <input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(
                    event.target
                      .value,
                  );
                  setStatementReady(
                    false,
                  );
                }}
                className={fieldCls}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={
              createStatement
            }
            className="mt-3 h-11 w-full rounded-2xl bg-[#0E4D64] text-xs font-black text-white"
          >
            إنشاء كشف الحساب
          </button>

          {statementReady ? (
            <div
              id="wallet-statement"
              className="mt-4 rounded-2xl border border-border/60 bg-background p-4"
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Summary
                  label="الرصيد الافتتاحي"
                  value={formatPrice(
                    statementTotals.opening,
                  )}
                />

                <Summary
                  label="الإيداعات"
                  value={formatPrice(
                    statementTotals.credits,
                  )}
                  positive
                />

                <Summary
                  label="الخصومات"
                  value={formatPrice(
                    statementTotals.debits,
                  )}
                  negative
                />

                <Summary
                  label="صافي الحركة"
                  value={formatPrice(
                    statementTotals.net,
                  )}
                />

                <Summary
                  label="الرصيد الختامي"
                  value={formatPrice(
                    statementTotals.closing,
                  )}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 print-hide">
                <button
                  type="button"
                  onClick={
                    exportCsv
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0E4D64] px-4 text-[9px] font-black text-white"
                >
                  <FileDown className="h-4 w-4" />
                  تصدير CSV
                </button>

                <button
                  type="button"
                  onClick={
                    printStatement
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#0E4D64]/15 bg-white px-4 text-[9px] font-black text-[#0E4D64] dark:bg-card"
                >
                  <FileText className="h-4 w-4" />
                  طباعة / PDF
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section
          id="transactions"
          className="rounded-[24px] border border-[#0E4D64]/10 bg-white/90 p-4 shadow-sm dark:bg-card/90"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
              <History className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black">
                معاملات المحفظة
              </h2>

              <p className="mt-1 text-[8px] text-muted-foreground">
                آخر الحركات المسجلة على محفظتك.
              </p>
            </div>

            <span className="rounded-full bg-[#0E4D64]/10 px-2 py-1 text-[8px] font-black text-[#0E4D64]">
              {filteredTxs.length}
            </span>
          </div>

          {filteredTxs.length ? (
            <div className="mt-4 space-y-2">
              {filteredTxs.map(
                (tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    formatPrice={
                      formatPrice
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-[9px] text-muted-foreground">
              لا توجد معاملات ضمن الفترة المحددة.
            </p>
          )}
        </section>

        <Link
          to="/account"
          className="flex items-center justify-between rounded-2xl border border-[#0E4D64]/10 bg-white/90 p-3 text-[10px] font-black shadow-sm dark:bg-card/90"
        >
          <span>
            العودة إلى حسابي
          </span>

          <ChevronRight className="h-4 w-4" />
        </Link>
      </main>

      <BottomNav />

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #wallet-statement,
          #wallet-statement * {
            visibility: visible !important;
          }

          #wallet-statement {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            border: 0 !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }

          .print-hide {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function TransactionRow({
  tx,
  formatPrice,
}: {
  tx: WalletTransaction;
  formatPrice: (
    value: number,
  ) => string;
}) {
  const positive =
    tx.amount >= 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          positive
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-red-500/10 text-red-600"
        }`}
      >
        {positive ? (
          <ArrowDownToLine className="h-4 w-4" />
        ) : (
          <ArrowUpFromLine className="h-4 w-4" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-black">
          {tx.description ||
            tx.kind}
        </p>

        <p className="mt-1 text-[8px] text-muted-foreground">
          {formatDate(
            tx.created_at,
          )}
        </p>
      </div>

      <strong
        dir="ltr"
        className={`text-[10px] font-black ${
          positive
            ? "text-emerald-600"
            : "text-red-600"
        }`}
      >
        {positive ? "+" : "-"}
        {formatPrice(
          Math.abs(
            tx.amount,
          ),
        )}
      </strong>

      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
    </div>
  );
}

function Summary({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <p className="text-[7px] text-muted-foreground">
        {label}
      </p>

      <p
        className={`mt-1 text-[9px] font-black ${
          positive
            ? "text-emerald-600"
            : negative
              ? "text-red-600"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function topUpStatusLabel(
  status: string,
) {
  switch (status) {
    case "pending":
      return "قيد المراجعة";

    case "approved":
      return "تم الاعتماد";

    case "rejected":
      return "مرفوض";

    case "paid":
      return "تم الاعتماد";

    default:
      return (
        status ||
        "قيد المراجعة"
      );
  }
}

function csvCell(
  value: string,
) {
  return `"${value.replace(
    /"/g,
    '""',
  )}"`;
}
