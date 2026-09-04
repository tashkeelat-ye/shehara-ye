import { useState, type ReactNode } from "react";
import { Check, Copy, Eye, EyeOff, WalletCards } from "lucide-react";

type WalletCardProps = {
  balance: number;
  formattedBalance: string;
  customerName: string;
  phone: string;
  customerCode: string;
};

export function WalletCard({
  balance,
  formattedBalance,
  customerName,
  phone,
  customerCode,
}: WalletCardProps) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  async function copyCustomerCode() {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(customerCode);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  }

  const maskedPhone = maskPhone(phone);

  return (
    <section
      aria-label="محفظة شهارة الرقمية"
      className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0D3B4D] text-white shadow-[0_28px_70px_-38px_rgba(13,59,77,.95)]"
    >
      {/* الخلفية الهندسية */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -end-20 -top-24 h-64 w-64 rounded-full border border-white/[0.07]" />
        <div className="absolute -start-28 -bottom-32 h-72 w-72 rounded-full border border-[#E2723A]/[0.12]" />

        <BridgePattern />

        <div className="absolute inset-0 bg-gradient-to-br from-[#0D3B4D]/20 via-transparent to-[#082A38]/80" />
      </div>

      <div className="relative z-10 p-5 sm:p-6">
        {/* رأس البطاقة */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur">
              <img
                src="/logo.png"
                alt="شهارة"
                className="h-8 w-8 object-contain"
              />
            </div>

            <div>
              <p className="text-[9px] font-bold tracking-wide text-white/55">
                المحفظة الرقمية
              </p>

              <p className="mt-0.5 text-sm font-black">
                شهارة
              </p>
            </div>
          </div>

          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E2723A]/15 text-[#E2723A]">
            <WalletCards className="h-5 w-5" />
          </div>
        </div>

        {/* الرصيد */}
        <div className="mt-7">
          <p className="text-[9px] font-bold text-white/50">
            الرصيد المتاح
          </p>

          <div className="mt-1 flex items-center gap-2">
            <strong
              className="text-[28px] font-black leading-none tracking-tight text-[#F3A17E] sm:text-[32px]"
              dir="rtl"
            >
              {visible ? formattedBalance : "••••••"}
            </strong>

            <button
              type="button"
              onClick={() => setVisible((value) => !value)}
              aria-label={
                visible
                  ? "إخفاء رصيد المحفظة"
                  : "إظهار رصيد المحفظة"
              }
              className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.07] text-white/60 transition hover:bg-white/10 hover:text-white active:scale-90"
            >
              {visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* بيانات العميل */}
        <div className="mt-8 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/35">
              صاحب المحفظة
            </p>

            <p className="mt-1 truncate text-[12px] font-bold text-white/90">
              {customerName || "عميل شهارة"}
            </p>

            <p
              dir="ltr"
              className="mt-1 truncate text-start text-[9px] text-white/45"
            >
              {maskedPhone || "—"}
            </p>
          </div>

          <div className="text-start">
            <p className="text-[8px] font-bold text-white/35">
              معرّف العميل
            </p>

            <button
              type="button"
              onClick={() => void copyCustomerCode()}
              className="mt-1 flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-[9px] font-mono font-bold text-white/75 transition hover:bg-white/[0.06] hover:text-white"
              title="نسخ معرّف العميل"
            >
              <span dir="ltr">
                {customerCode}
              </span>

              {copied ? (
                <Check className="h-3 w-3 text-[#F3A17E]" />
              ) : (
                <Copy className="h-3 w-3 text-white/40" />
              )}
            </button>
          </div>
        </div>

        {/* خط زخرفي */}
        <div className="mt-5 flex items-center gap-2">
          <span className="h-px flex-1 bg-white/[0.08]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#E2723A]" />
          <span className="h-px w-10 bg-white/[0.08]" />
        </div>
      </div>
    </section>
  );
}

function maskPhone(phone: string) {
  const value = phone.replace(/\s+/g, "");

  if (!value) {
    return "";
  }

  if (value.length <= 6) {
    return value;
  }

  return `${value.slice(0, 3)} •••• ${value.slice(-3)}`;
}

function BridgePattern() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-x-0 bottom-5 h-32 w-full opacity-[0.11]"
      viewBox="0 0 600 150"
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d="M35 112 C145 55 190 55 300 112 C410 55 455 55 565 112"
        stroke="currentColor"
        strokeWidth="7"
      />

      <path
        d="M125 112 V72 C125 20 225 20 225 72 V112"
        stroke="currentColor"
        strokeWidth="5"
      />

      <path
        d="M375 112 V72 C375 20 475 20 475 72 V112"
        stroke="currentColor"
        strokeWidth="5"
      />

      <path
        d="M35 115 H565"
        stroke="currentColor"
        strokeWidth="4"
      />

      <path
        d="M80 103 L115 88 M520 103 L485 88"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );
}
