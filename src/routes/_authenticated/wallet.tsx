import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  Clipboard,
  Clock3,
  CreditCard,
  FileImage,
  History,
  Info,
  Loader2,
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
          "تابع رصيد محفظتك في شهارة، اشحن الرصيد وراجع سجل العمليات.",
      },
      {
        property: "og:title",
        content: "محفظتي | شهارة",
      },
      {
        property: "og:description",
        content:
          "رصيد المحفظة وسجل العمليات في شهارة.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const formatPrice = useFormatPrice();
  const {
    user,
    profile,
    refreshProfile,
  } = useAuth();

  const userId = user?.id ?? "";

  const {
    data: txs = [],
    refetch,
    isLoading: transactionsLoading,
  } = useQuery({
    queryKey: ["wallet-tx", userId],
    enabled: Boolean(userId),
    queryFn: () =>
      fetchWalletTransactions(userId),
  });

  const {
    data: methods = [],
    isLoading: methodsLoading,
  } = useQuery({
    queryKey: ["payment-methods", "active"],
    queryFn: () =>
      fetchPaymentMethods(true),
  });

  const transferMethods = methods.filter(
    (method) => method.requires_receipt,
  );

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

  const balance =
    Number(profile?.wallet_balance ?? 0);

  const selectedMethod = useMemo(
    () =>
      transferMethods.find(
        (method) =>
          method.code === methodCode,
      ) ??
      transferMethods[0] ??
      null,
    [transferMethods, methodCode],
  );

  const positiveTransactions = useMemo(
    () =>
      txs.filter(
        (transaction) =>
          Number(transaction.amount) > 0,
      ).length,
    [txs],
  );

  const negativeTransactions = useMemo(
    () =>
      txs.filter(
        (transaction) =>
          Number(transaction.amount) < 0,
      ).length,
    [txs],
  );

  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

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
        "أدخل مبلغًا صحيحًا للشحن",
      );
      return;
    }

    if (!code) {
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

    if (!userId) {
      toast.error(
        "يجب تسجيل الدخول أولاً",
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
        await supabase
          .from("payment_requests")
          .insert({
            user_id: userId,
            purpose: "topup",
            method_code: code,
            amount: value,
            sender_name:
              senderName.trim() ||
              profile?.full_name ||
              "",
            sender_phone:
              senderPhone.trim() ||
              profile?.phone ||
              "",
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
        "تم إرسال طلب الشحن بنجاح",
        {
          description:
            "سيتم تحديث رصيدك بعد مراجعة الإدارة وتأكيد العملية.",
        },
      );

      setOpen(false);
      setAmount("");
      setMethodCode("");
      setSenderName("");
      setSenderPhone("");
      setReference("");
      setReceipt(null);

      await refetch();
      await refreshProfile();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذّر إرسال طلب الشحن",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyAccountNumber(
    accountNumber: string,
  ) {
    try {
      await navigator.clipboard.writeText(
        accountNumber,
      );

      toast.success(
        "تم نسخ رقم الحساب",
      );
    } catch {
      toast.error(
        "تعذر نسخ رقم الحساب",
      );
    }
  }

  function handleReceiptChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0] ??
      null;

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

      event.target.value = "";
      return;
    }

    const maxSize =
      8 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error(
        "حجم صورة الإيصال يجب ألا يتجاوز 8MB",
      );

      event.target.value = "";
      return;
    }

    setReceipt(file);
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FAF9F6] pb-28 text-foreground dark:bg-[#071B24] md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-6">

        {/* =========================================
            PAGE HEADER
        ========================================== */}

        <header className="mb-4">

          <div className="flex items-center gap-3">

            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-white/10 dark:text-white">
              <Wallet className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">

              <h1 className="text-lg font-black tracking-tight">
                محفظتي
              </h1>

              <p className="mt-0.5 text-[10px] text-muted-foreground">
                أموالك ورصيدك وسجل عملياتك في مكان واحد
              </p>

            </div>

          </div>

        </header>

        {/* =========================================
            BALANCE CARD
        ========================================== */}

        <section className="relative overflow-hidden rounded-[2rem] bg-[#0E4D64] p-5 text-white shadow-[0_25px_60px_-35px_rgba(14,77,100,0.9)] sm:p-7">

          <div className="pointer-events-none absolute -end-16 -top-24 h-64 w-64 rounded-full border border-white/10" />

          <div className="pointer-events-none absolute -start-28 -bottom-36 h-80 w-80 rounded-full border border-[#D65A31]/20" />

          <div className="relative z-10">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="flex items-center gap-2 text-white/65">

                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10">
                    <Wallet className="h-4 w-4" />
                  </span>

                  <span className="text-[10px] font-bold">
                    الرصيد المتاح
                  </span>

                </div>

                <div className="mt-3 flex items-baseline gap-2">

                  <span className="text-3xl font-black tracking-tight sm:text-4xl">
                    {formatPrice(balance)}
                  </span>

                </div>

                <p className="mt-1 text-[9px] text-white/45">
                  الرصيد المتاح للاستخدام داخل شهارة
                </p>

              </div>

              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <Banknote className="h-6 w-6 text-[#D65A31]" />
              </div>

            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">

              <div className="rounded-2xl bg-white/10 p-3">
                <div className="flex items-center gap-1.5 text-white/55">
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  <span className="text-[8px] font-bold">
                    عمليات الإضافة
                  </span>
                </div>

                <p className="mt-1 text-sm font-black">
                  {positiveTransactions}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-3">
                <div className="flex items-center gap-1.5 text-white/55">
                  <ArrowUpFromLine className="h-3.5 w-3.5" />
                  <span className="text-[8px] font-bold">
                    عمليات الخصم
                  </span>
                </div>

                <p className="mt-1 text-sm font-black">
                  {negativeTransactions}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(
                  (value) => !value,
                )
              }
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#D65A31] text-xs font-black text-white shadow-lg shadow-black/10 transition hover:brightness-105 active:scale-[0.98]"
            >
              <CreditCard className="h-4 w-4" />

              {open
                ? "إغلاق نموذج الشحن"
                : "شحن المحفظة"}
            </button>

          </div>
        </section>

        {/* =========================================
            TOP UP FORM
        ========================================== */}

        {open ? (
          <section className="mt-4 overflow-hidden rounded-[1.75rem] border border-[#0E4D64]/10 bg-white shadow-sm dark:bg-card">

            <div className="border-b border-border/60 bg-[#0E4D64]/5 p-4">

              <div className="flex items-start gap-3">

                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
                  <ArrowDownToLine className="h-5 w-5" />
                </div>

                <div>

                  <h2 className="text-sm font-black">
                    شحن المحفظة
                  </h2>

                  <p className="mt-1 text-[9px] leading-5 text-muted-foreground">
                    حوّل المبلغ إلى إحدى وسائل الدفع المتاحة ثم أرسل صورة الإيصال.
                  </p>

                </div>

              </div>

            </div>

            <form
              onSubmit={submit}
              className="p-4"
            >

              {/* Payment Methods */}

              <div className="mb-4">

                <div className="mb-2 flex items-center justify-between">

                  <span className="text-[10px] font-black">
                    اختر طريقة التحويل
                  </span>

                  <span className="text-[8px] text-muted-foreground">
                    وسائل الدفع المتاحة
                  </span>

                </div>

                {methodsLoading ? (
                  <div className="h-20 animate-pulse rounded-2xl bg-muted" />
                ) : transferMethods.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-7 text-center">

                    <CreditCard className="mx-auto h-7 w-7 text-muted-foreground/40" />

                    <p className="mt-2 text-[10px] font-bold">
                      لا توجد وسائل تحويل متاحة
                    </p>

                    <p className="mt-1 text-[9px] text-muted-foreground">
                      يرجى المحاولة لاحقاً
                    </p>

                  </div>
                ) : (
                  <div className="space-y-2">

                    {transferMethods.map(
                      (method) => {
                        const active =
                          (methodCode ||
                            transferMethods[0]?.code) ===
                          method.code;

                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() =>
                              setMethodCode(
                                method.code,
                              )
                            }
                            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition active:scale-[0.99] ${
                              active
                                ? "border-[#D65A31]/40 bg-[#D65A31]/5"
                                : "border-border/70 bg-background"
                            }`}
                          >

                            <span
                              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                                active
                                  ? "bg-[#D65A31] text-white"
                                  : "bg-[#0E4D64]/10 text-[#0E4D64]"
                              }`}
                            >
                              <CreditCard className="h-4 w-4" />
                            </span>

                            <span className="min-w-0 flex-1">

                              <span className="block text-[10px] font-black">
                                {method.display_name}
                              </span>

                              <span
                                dir="ltr"
                                className="mt-1 block truncate text-start text-[9px] text-muted-foreground"
                              >
                                {method.account_number}
                              </span>

                            </span>

                            {active ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#D65A31]" />
                            ) : null}

                          </button>
                        );
                      },
                    )}

                  </div>
                )}

              </div>

              {/* Selected account */}

              {selectedMethod ? (
                <div className="mb-4 rounded-2xl bg-[#0E4D64] p-4 text-white">

                  <div className="flex items-center justify-between gap-3">

                    <div className="min-w-0">

                      <p className="text-[8px] text-white/50">
                        رقم الحساب / المحفظة
                      </p>

                      <p
                        dir="ltr"
                        className="mt-1 truncate text-start text-sm font-black tracking-wide"
                      >
                        {selectedMethod.account_number}
                      </p>

                      <p className="mt-1 text-[9px] text-white/55">
                        {selectedMethod.display_name}
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void copyAccountNumber(
                          selectedMethod.account_number,
                        )
                      }
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 transition active:scale-90"
                      aria-label="نسخ رقم الحساب"
                    >
                      <Clipboard className="h-4 w-4" />
                    </button>

                  </div>

                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">

                <FormField
                  label="المبلغ المحوَّل"
                  required
                >
                  <div className="relative">

                    <input
                      value={amount}
                      onChange={(event) =>
                        setAmount(
                          event.target.value,
                        )
                      }
                      inputMode="numeric"
                      dir="ltr"
                      placeholder="مثال: 10000"
                      className={`${fieldCls} pe-16`}
                    />

                    <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground">
                      ر.ي
                    </span>

                  </div>
                </FormField>

                <FormField label="رقم عملية التحويل">
                  <input
                    value={reference}
                    onChange={(event) =>
                      setReference(
                        event.target.value,
                      )
                    }
                    maxLength={60}
                    dir="ltr"
                    placeholder="إن وجد"
                    className={fieldCls}
                  />
                </FormField>

                <FormField label="اسم المُحوِّل">
                  <input
                    value={senderName}
                    onChange={(event) =>
                      setSenderName(
                        event.target.value,
                      )
                    }
                    maxLength={100}
                    placeholder={
                      profile?.full_name ||
                      "اسم صاحب التحويل"
                    }
                    className={fieldCls}
                  />
                </FormField>

                <FormField label="رقم المُحوِّل">
                  <input
                    value={senderPhone}
                    onChange={(event) =>
                      setSenderPhone(
                        event.target.value,
                      )
                    }
                    dir="ltr"
                    maxLength={20}
                    placeholder={
                      profile?.phone ||
                      "7xxxxxxxx"
                    }
                    className={fieldCls}
                  />
                </FormField>

                <FormField
                  label="صورة الإيصال"
                  required
                >
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#0E4D64]/20 bg-[#0E4D64]/5 px-3.5 transition hover:bg-[#0E4D64]/10">

                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0E4D64]/10 text-[#0E4D64]">
                      {receipt ? (
                        <FileImage className="h-4 w-4" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">

                      <span className="block truncate text-[10px] font-bold">
                        {receipt
                          ? receipt.name
                          : "اختر صورة الإيصال"}
                      </span>

                      <span className="mt-0.5 block text-[8px] text-muted-foreground">
                        JPG / PNG — حتى 8MB
                      </span>

                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={
                        handleReceiptChange
                      }
                    />

                  </label>
                </FormField>

              </div>

              {/* Information */}

              <div className="mt-4 rounded-2xl border border-[#D65A31]/15 bg-[#D65A31]/5 p-3">

                <div className="flex items-start gap-2">

                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#D65A31]" />

                  <div>

                    <p className="text-[9px] font-black text-[#D65A31]">
                      تنبيه مهم
                    </p>

                    <p className="mt-1 text-[8px] leading-5 text-muted-foreground">
                      بعد إرسال الطلب سيتم مراجعته من الإدارة. لا يتم إضافة المبلغ إلى رصيدك إلا بعد التأكد من التحويل.
                    </p>

                  </div>

                </div>

              </div>

              <button
                type="submit"
                disabled={
                  busy ||
                  methodsLoading ||
                  transferMethods.length === 0
                }
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#D65A31] text-xs font-black text-white shadow-lg shadow-[#D65A31]/10 transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >

                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ إرسال طلب الشحن...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="h-4 w-4" />
                    إرسال طلب الشحن
                  </>
                )}

              </button>

            </form>
          </section>
        ) : null}

        {/* =========================================
            SECURITY NOTICE
        ========================================== */}

        <section className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-3.5">

          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
          </span>

          <div>

            <p className="text-[10px] font-black">
              محفظتك تحت الحماية
            </p>

            <p className="mt-1 text-[8px] leading-5 text-muted-foreground">
              تتم مراجعة عمليات الشحن قبل اعتمادها لضمان أمان رصيدك.
            </p>

          </div>

        </section>

        {/* =========================================
            TRANSACTION HISTORY
        ========================================== */}

        <section className="mt-5">

          <div className="mb-3 flex items-end justify-between">

            <div className="flex items-center gap-2">

              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                <History className="h-4 w-4" />
              </span>

              <div>

                <h2 className="text-sm font-black">
                  سجل العمليات
                </h2>

                <p className="text-[9px] text-muted-foreground">
                  جميع الحركات على محفظتك
                </p>

              </div>

            </div>

          </div>

          {transactionsLoading ? (
            <div className="space-y-2">

              {Array.from({
                length: 4,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-[78px] animate-pulse rounded-2xl bg-muted"
                />
              ))}

            </div>
          ) : txs.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-border bg-white px-5 py-12 text-center dark:bg-card">

              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#0E4D64]/5 text-[#0E4D64]/40">
                <History className="h-6 w-6" />
              </span>

              <p className="mt-4 text-xs font-black">
                لا توجد عمليات بعد
              </p>

              <p className="mx-auto mt-1 max-w-xs text-[9px] leading-5 text-muted-foreground">
                عند استخدام محفظتك أو شحنها ستظهر جميع العمليات هنا.
              </p>

            </div>
          ) : (
            <div className="space-y-2">

              {txs.map(
                (transaction) => {
                  const value =
                    Number(
                      transaction.amount,
                    );

                  const isCredit =
                    value >= 0;

                  return (
                    <article
                      key={
                        transaction.id
                      }
                      className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-card"
                    >

                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                          isCredit
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-[#D65A31]/10 text-[#D65A31]"
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownToLine className="h-4 w-4" />
                        ) : (
                          <ArrowUpFromLine className="h-4 w-4" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">

                        <p className="truncate text-[10px] font-black">
                          {transaction.description ||
                            transaction.kind}
                        </p>

                        <div className="mt-1 flex items-center gap-1.5 text-[8px] text-muted-foreground">

                          <Clock3 className="h-3 w-3" />

                          <span>
                            {formatDate(
                              transaction.created_at,
                            )}
                          </span>

                        </div>

                      </div>

                      <div className="shrink-0 text-start">

                        <p
                          dir="ltr"
                          className={`text-xs font-black ${
                            isCredit
                              ? "text-emerald-600"
                              : "text-[#D65A31]"
                          }`}
                        >
                          {isCredit
                            ? "+"
                            : "-"}
                          {formatPrice(
                            Math.abs(value),
                          )}
                        </p>

                        <p className="mt-1 text-[8px] text-muted-foreground">
                          {isCredit
                            ? "إضافة"
                            : "خصم"}
                        </p>

                      </div>

                      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-x-0.5" />

                    </article>
                  );
                },
              )}

            </div>
          )}

        </section>

        {/* =========================================
            FOOTER BRAND
        ========================================== */}

        <div className="pb-3 pt-6 text-center">

          <div className="mx-auto flex w-fit items-center gap-2 text-[#0E4D64] dark:text-white">

            <Wallet className="h-4 w-4" />

            <span className="text-[10px] font-black">
              شهارة
            </span>

          </div>

          <p className="mt-1 text-[8px] text-muted-foreground">
            تسوق بلا حدود
          </p>

        </div>

      </main>

      <BottomNav />
    </div>
  );
}
