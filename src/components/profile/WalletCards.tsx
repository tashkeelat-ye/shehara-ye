import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  ReceiptText,
  ChevronLeft,
  Copy,
  Check,
  Wallet,
  CreditCard,
  MoreHorizontal,
} from "lucide-react";

export type WalletCurrency = "YER" | "SAR";

interface WalletCardProps {
  currency: WalletCurrency;
  balance: number;
  walletNumber?: string;
  cardHolder?: string;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onTransfer?: () => void;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat("ar-YE", {
    maximumFractionDigits: 0,
  }).format(value);

const currencyName = {
  YER: "الريال اليمني",
  SAR: "الريال السعودي",
};

const currencySymbol = {
  YER: "ر.ي",
  SAR: "ر.س",
};

function maskWalletNumber(number = "0000 0000 0000") {
  const clean = number.replace(/\s/g, "");

  if (clean.length < 4) return "•••• •••• ••••";

  return `•••• •••• ${clean.slice(-4)}`;
}

function WalletCard({
  currency,
  balance,
  walletNumber = "123456789012",
  cardHolder = "صاحب محفظة شهارة",
  onDeposit,
  onWithdraw,
  onTransfer,
}: WalletCardProps) {
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);

  const isYER = currency === "YER";

  const copyWalletNumber = async () => {
    try {
      await navigator.clipboard?.writeText(walletNumber);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      // Clipboard may be unavailable on some mobile browsers.
    }
  };

  return (
    <div
      className={[
        "relative min-w-[calc(100vw-48px)] max-w-[390px]",
        "overflow-hidden rounded-[28px]",
        "p-5 text-white",
        "shadow-[0_18px_45px_rgba(14,77,100,0.20)]",
        "transition-all duration-300",
        "active:scale-[0.985]",
        isYER
          ? "bg-gradient-to-br from-[#0E4D64] via-[#12627d] to-[#08394b]"
          : "bg-gradient-to-br from-[#173f4d] via-[#0E4D64] to-[#082e3b]",
      ].join(" ")}
    >
      {/* Yemeni geometric pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border-[22px] border-white" />
        <div className="absolute -left-20 bottom-[-70px] h-48 w-48 rotate-45 border-[18px] border-[#D4AF37]" />
        <div className="absolute right-20 top-20 h-20 w-20 rotate-45 border border-white" />
        <div className="absolute bottom-10 left-20 h-12 w-12 rotate-45 border border-white" />
      </div>

      <div className="relative z-10">
        {/* Card header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                <Wallet className="h-5 w-5 text-[#D4AF37]" />
              </div>

              <div>
                <p className="text-[11px] text-white/60">محفظة شهارة</p>
                <p className="text-sm font-bold">
                  {currencyName[currency]}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label="خيارات المحفظة"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* Card logo */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            <div className="mb-1 text-[10px] tracking-[0.18em] text-white/50">
              SHEHARA WALLET
            </div>

            <div className="text-lg font-black tracking-wide">
              شهارة
              <span className="mx-1 text-[#D4AF37]">•</span>
              SHEHARA
            </div>
          </div>

          <div className="flex h-10 w-14 items-center justify-center rounded-lg border border-white/20 bg-white/10">
            <CreditCard className="h-5 w-5 text-[#D4AF37]" />
          </div>
        </div>

        {/* Balance */}
        <div className="mt-7">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs text-white/60">الرصيد المتاح</span>

            <button
              type="button"
              onClick={() => setShowBalance((prev) => !prev)}
              className="text-white/60 transition hover:text-white"
              aria-label={showBalance ? "إخفاء الرصيد" : "إظهار الرصيد"}
            >
              {showBalance ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex items-end gap-2">
            <strong className="text-[30px] font-black leading-none tracking-tight">
              {showBalance ? formatNumber(balance) : "••••••"}
            </strong>

            <span className="mb-0.5 text-sm font-bold text-[#D4AF37]">
              {currencySymbol[currency]}
            </span>
          </div>
        </div>

        {/* Card number */}
        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={copyWalletNumber}
            className="flex items-center gap-2 text-xs tracking-[0.12em] text-white/70"
          >
            <span>{maskWalletNumber(walletNumber)}</span>

            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#D4AF37]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          <span className="text-[10px] text-white/50">
            {cardHolder}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onDeposit}
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl bg-white/10 text-[11px] font-bold backdrop-blur transition hover:bg-white/20 active:scale-95"
          >
            <ArrowDownLeft className="h-4 w-4 text-[#D4AF37]" />
            إيداع
          </button>

          <button
            type="button"
            onClick={onTransfer}
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl bg-white/10 text-[11px] font-bold backdrop-blur transition hover:bg-white/20 active:scale-95"
          >
            <Send className="h-4 w-4 text-[#D4AF37]" />
            تحويل
          </button>

          <button
            type="button"
            onClick={onWithdraw}
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl bg-white/10 text-[11px] font-bold backdrop-blur transition hover:bg-white/20 active:scale-95"
          >
            <ArrowUpRight className="h-4 w-4 text-[#D4AF37]" />
            سحب
          </button>
        </div>
      </div>
    </div>
  );
}

interface WalletCardsProps {
  yerBalance?: number;
  sarBalance?: number;
  yerWalletNumber?: string;
  sarWalletNumber?: string;
  cardHolder?: string;
  onDeposit?: (currency: WalletCurrency) => void;
  onWithdraw?: (currency: WalletCurrency) => void;
  onTransfer?: (currency: WalletCurrency) => void;
  onTransactions?: () => void;
}

export default function WalletCards({
  yerBalance = 0,
  sarBalance = 0,
  yerWalletNumber = "",
  sarWalletNumber = "",
  cardHolder = "صاحب محفظة شهارة",
  onDeposit,
  onWithdraw,
  onTransfer,
  onTransactions,
}: WalletCardsProps) {
  const [activeCurrency, setActiveCurrency] =
    useState<WalletCurrency>("YER");

  return (
    <section className="w-full" dir="rtl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0E4D64]/10">
              <Wallet className="h-5 w-5 text-[#0E4D64]" />
            </div>

            <h2 className="text-lg font-black text-[#0E4D64]">
              محفظتي
            </h2>
          </div>

          <p className="mt-1 pr-11 text-xs text-slate-500">
            أموالك معك أينما كنت
          </p>
        </div>

        <button
          type="button"
          onClick={onTransactions}
          className="flex items-center gap-1 text-xs font-bold text-[#D65A31]"
        >
          سجل العمليات
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Currency switcher */}
      <div className="mb-4 grid grid-cols-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
        <button
          type="button"
          onClick={() => setActiveCurrency("YER")}
          className={[
            "rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
            activeCurrency === "YER"
              ? "bg-[#0E4D64] text-white shadow-sm"
              : "text-slate-500",
          ].join(" ")}
        >
          🇾🇪 الريال اليمني
        </button>

        <button
          type="button"
          onClick={() => setActiveCurrency("SAR")}
          className={[
            "rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
            activeCurrency === "SAR"
              ? "bg-[#0E4D64] text-white shadow-sm"
              : "text-slate-500",
          ].join(" ")}
        >
          🇸🇦 الريال السعودي
        </button>
      </div>

      {/* Cards */}
      <div className="overflow-x-auto pb-3 scrollbar-hide">
        <div className="flex gap-4">
          {activeCurrency === "YER" ? (
            <>
              <WalletCard
                currency="YER"
                balance={yerBalance}
                walletNumber={yerWalletNumber}
                cardHolder={cardHolder}
                onDeposit={() => onDeposit?.("YER")}
                onWithdraw={() => onWithdraw?.("YER")}
                onTransfer={() => onTransfer?.("YER")}
              />

              <WalletCard
                currency="SAR"
                balance={sarBalance}
                walletNumber={sarWalletNumber}
                cardHolder={cardHolder}
                onDeposit={() => onDeposit?.("SAR")}
                onWithdraw={() => onWithdraw?.("SAR")}
                onTransfer={() => onTransfer?.("SAR")}
              />
            </>
          ) : (
            <>
              <WalletCard
                currency="SAR"
                balance={sarBalance}
                walletNumber={sarWalletNumber}
                cardHolder={cardHolder}
                onDeposit={() => onDeposit?.("SAR")}
                onWithdraw={() => onWithdraw?.("SAR")}
                onTransfer={() => onTransfer?.("SAR")}
              />

              <WalletCard
                currency="YER"
                balance={yerBalance}
                walletNumber={yerWalletNumber}
                cardHolder={cardHolder}
                onDeposit={() => onDeposit?.("YER")}
                onWithdraw={() => onWithdraw?.("YER")}
                onTransfer={() => onTransfer?.("YER")}
              />
            </>
          )}
        </div>
      </div>

      {/* Wallet information */}
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#0E4D64]/10 bg-white p-4">
          <p className="text-[11px] text-slate-400">
            إجمالي الرصيد اليمني
          </p>

          <p className="mt-1 text-base font-black text-[#0E4D64]">
            {formatNumber(yerBalance)}
            <span className="mr-1 text-xs text-[#D65A31]">
              ر.ي
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#0E4D64]/10 bg-white p-4">
          <p className="text-[11px] text-slate-400">
            إجمالي الرصيد السعودي
          </p>

          <p className="mt-1 text-base font-black text-[#0E4D64]">
            {formatNumber(sarBalance)}
            <span className="mr-1 text-xs text-[#D65A31]">
              ر.س
            </span>
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-4 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgba(14,77,100,0.06)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-[#0E4D64]">
              خدمات المحفظة
            </h3>

            <p className="mt-0.5 text-[11px] text-slate-400">
              اختر الخدمة التي تريد تنفيذها
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D65A31]/10">
            <Plus className="h-5 w-5 text-[#D65A31]" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onDeposit?.(activeCurrency)}
            className="flex flex-col items-center gap-2 rounded-2xl bg-[#FAF9F6] py-3 transition hover:bg-[#0E4D64]/5 active:scale-95"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0E4D64]/10">
              <ArrowDownLeft className="h-4 w-4 text-[#0E4D64]" />
            </span>

            <span className="text-[10px] font-bold text-[#0E4D64]">
              إيداع
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTransfer?.(activeCurrency)}
            className="flex flex-col items-center gap-2 rounded-2xl bg-[#FAF9F6] py-3 transition hover:bg-[#0E4D64]/5 active:scale-95"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/15">
              <Send className="h-4 w-4 text-[#9b7c12]" />
            </span>

            <span className="text-[10px] font-bold text-[#0E4D64]">
              تحويل
            </span>
          </button>

          <button
            type="button"
            onClick={() => onWithdraw?.(activeCurrency)}
            className="flex flex-col items-center gap-2 rounded-2xl bg-[#FAF9F6] py-3 transition hover:bg-[#0E4D64]/5 active:scale-95"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D65A31]/10">
              <ArrowUpRight className="h-4 w-4 text-[#D65A31]" />
            </span>

            <span className="text-[10px] font-bold text-[#0E4D64]">
              سحب
            </span>
          </button>

          <button
            type="button"
            onClick={onTransactions}
            className="flex flex-col items-center gap-2 rounded-2xl bg-[#FAF9F6] py-3 transition hover:bg-[#0E4D64]/5 active:scale-95"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0E4D64]/10">
              <ReceiptText className="h-4 w-4 text-[#0E4D64]" />
            </span>

            <span className="text-[10px] font-bold text-[#0E4D64]">
              العمليات
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
