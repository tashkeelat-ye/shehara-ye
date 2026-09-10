import { CreditCard, ShieldCheck } from "lucide-react";

type DigitalWalletCardProps = {
  name?: string | null;
  balance: number;
  currencyLabel?: string;
  accountNumber?: string;
  loading?: boolean;
  compact?: boolean;
  onClick?: () => void;
};

export function DigitalWalletCard({
  name,
  balance,
  currencyLabel = "ر.ي",
  accountNumber = "4567 •••• 3010",
  loading = false,
  compact = false,
  onClick,
}: DigitalWalletCardProps) {
  const formattedBalance = new Intl.NumberFormat("ar-YE", {
    maximumFractionDigits: 2,
  }).format(balance);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group relative block w-full overflow-hidden text-start ${
        compact ? "aspect-[1.586]" : "aspect-[1.586]"
      } rounded-[18px] border border-white/10 bg-[#0D3B4D] text-[#F6F2EE] shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition-transform duration-300 ${
        onClick ? "hover:-translate-y-0.5 active:translate-y-0" : ""
      }`}
      aria-label="المحفظة الرقمية"
    >
      {/* الخلفية */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(226,114,58,0.18),transparent_32%),linear-gradient(135deg,#0D3B4D_0%,#0A2A38_100%)]" />

      {/* نمط هندسي مستوحى من جسر شهارة */}
      <div className="absolute inset-0 opacity-[0.10]">
        <svg
          viewBox="0 0 800 500"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <path
            d="M65 405 C120 300 180 255 260 250 C335 245 370 175 400 135 C430 175 465 245 540 250 C620 255 680 300 735 405"
            fill="none"
            stroke="currentColor"
            strokeWidth="28"
          />

          <path
            d="M150 410 C185 330 235 295 300 292 C350 289 375 255 400 220 C425 255 450 289 500 292 C565 295 615 330 650 410"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
          />

          <path
            d="M250 405 C285 355 330 335 400 335 C470 335 515 355 550 405"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
          />
        </svg>
      </div>

      {/* زخرفة جانبية */}
      <div className="absolute -left-14 -top-14 h-36 w-36 rounded-full border border-[#E2723A]/10" />
      <div className="absolute -bottom-20 -right-16 h-44 w-44 rounded-full border border-white/[0.05]" />

      <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2723A]/30 bg-[#E2723A]/10">
              <span className="font-black text-xl leading-none text-[#E2723A]">
                ش
              </span>
            </div>

            <div className="text-right">
              <p className="text-[9px] font-medium tracking-[0.18em] text-white/50">
                SHEHARA
              </p>

              <p className="mt-0.5 text-[9px] font-medium text-white/45">
                المحفظة الرقمية
              </p>
            </div>
          </div>

          {/* Chip */}
          <div className="relative h-7 w-9 overflow-hidden rounded-[6px] border border-[#D6B978]/50 bg-gradient-to-br from-[#D8BF87] via-[#B59A62] to-[#8E7747] shadow-sm">
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-black/20" />
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-black/20" />
            <span className="absolute left-1/2 top-1/2 h-3 w-4 -translate-x-1/2 -translate-y-1/2 rounded-[3px] border border-black/20" />
          </div>
        </div>

        {/* Bridge silhouette + balance */}
        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
            <span className="select-none text-[62px] font-black tracking-[-0.15em] text-white/[0.035] sm:text-[76px]">
              شَهارة
            </span>
          </div>

          <div className="relative">
            <p className="text-[9px] font-medium text-white/50">
              الرصيد المتاح
            </p>

            <div
              className="mt-0.5 flex items-baseline gap-1"
              dir="rtl"
            >
              <span className="text-[24px] font-black tracking-tight text-[#E2723A] sm:text-[29px]">
                {loading ? "••••" : formattedBalance}
              </span>

              <span className="text-[10px] font-bold text-[#E2723A]/80">
                {currencyLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-white/75">
              {name?.trim() || "Shehara Customer"}
            </p>

            <p
              dir="ltr"
              className="mt-1 truncate text-[9px] font-mono tracking-[0.13em] text-white/45"
            >
              {accountNumber}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-white/35">
            <ShieldCheck className="h-3.5 w-3.5" />
            <CreditCard className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Orange highlight */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-l from-transparent via-[#E2723A]/60 to-transparent" />
    </button>
  );
}
