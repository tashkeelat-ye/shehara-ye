import { useState } from "react";
import { Check, Copy, Eye, EyeOff, WalletCards } from "lucide-react";

type WalletCardProps = {
  balance: number;
  formattedBalance: string;
  customerName: string;
  phone: string;
  walletId: string;
};

export function WalletCard({
  balance: _balance,
  formattedBalance,
  customerName,
  phone,
  walletId,
}: WalletCardProps) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  async function copyWalletId() {
    if (!walletId) return;

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(walletId);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-label="بطاقة محفظة شهارة الرقمية"
      className="relative mx-auto aspect-[1.586/1] w-full max-w-[430px] overflow-hidden rounded-[22px] border border-white/10 bg-[#0D3B4D] text-white shadow-[0_24px_60px_-30px_rgba(13,59,77,.9)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -end-20 -top-24 h-56 w-56 rounded-full border border-white/[0.07]" />

        <div className="absolute -start-24 -bottom-28 h-64 w-64 rounded-full border border-[#E2723A]/[0.13]" />

        <BridgePattern />

        <div className="absolute inset-0 bg-gradient-to-br from-[#0D3B4D]/10 via-transparent to-[#082A38]/80" />
      </div>

      <div className="relative z-10 flex h-full flex-col p-[5.5%]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.08]">
              <img
                src="/logo.png"
                alt="شهارة"
                className="h-7 w-7 object-contain"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[8px] font-bold text-white/50">
                المحفظة الرقمية
              </p>

              <p className="mt-0.5 text-[13px] font-black">
                شهارة
              </p>
            </div>
          </div>

          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#E2723A]/15 text-[#E2723A]">
            <WalletCards className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] font-bold text-white/45">
                الرصيد المتاح
              </p>

              <div className="mt-1 flex items-center gap-1.5">
                <strong className="text-[25px] font-black leading-none tracking-tight text-[#F3A17E] sm:text-[29px]">
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
                  className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.07] text-white/60 transition active:scale-90"
                >
                  {visible ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="min-w-0 text-start">
              <p className="text-[7px] font-bold text-white/35">
                معرّف المحفظة
              </p>

              <button
                type="button"
                onClick={() => void copyWalletId()}
                disabled={!walletId}
                className="mt-1 flex max-w-[150px] items-center gap-1 rounded-lg px-1 py-0.5 text-[9px] font-mono font-bold text-white/80 disabled:opacity-50"
                title="نسخ معرف المحفظة"
              >
                <span
                  dir="ltr"
                  className="truncate"
                >
                  {walletId || "غير مضاف"}
                </span>

                {copied ? (
                  <Check className="h-3 w-3 shrink-0 text-[#F3A17E]" />
                ) : (
                  <Copy className="h-3 w-3 shrink-0 text-white/40" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-[4.5%] flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-white/30">
                صاحب المحفظة
              </p>

              <p className="mt-1 truncate text-[11px] font-bold text-white/90">
                {customerName || "عميل شهارة"}
              </p>
            </div>

            <div className="min-w-0 text-start">
              <p className="text-[7px] font-bold text-white/30">
                رقم الهاتف
              </p>

              <p
                dir="ltr"
                className="mt-1 truncate text-start text-[9px] text-white/55"
              >
                {phone || "—"}
              </p>
            </div>
          </div>

          <div className="mt-[3.5%] flex items-center gap-2">
            <span className="h-px flex-1 bg-white/[0.08]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#E2723A]" />
            <span className="h-px w-8 bg-white/[0.08]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function BridgePattern() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-[42%] w-full opacity-[0.11]"
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
    </svg>
  );
}
