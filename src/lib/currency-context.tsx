import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "@/lib/store";
import {
  CURRENCIES,
  CURRENCY_STORAGE_KEY,
  DEFAULT_SAR_RATE,
  formatMoney,
  type CurrencyCode,
} from "@/lib/money";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  sarRate: number;
  /** يهيّئ دالة عرض سعر تتحدّث تلقائيًا مع تغيّر العملة أو سعر الصرف. */
  formatPrice: (amountYer: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // القيمة الافتراضية دائمًا "YER" على الخادم والعميل قبل التهيئة — هذا مقصود
  // ويمنع أي حالة مشتركة بين طلبات SSR مختلفة (لا يوجد module-level state بعد الآن).
  const [currency, setCurrencyState] = useState<CurrencyCode>("YER");
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const sarRate = settings?.sar_rate && settings.sar_rate > 0 ? settings.sar_rate : DEFAULT_SAR_RATE;

  // قراءة العملة المحفوظة من localStorage تتم فقط على العميل بعد التهيئة
  // (useEffect لا يعمل أثناء SSR إطلاقًا)، فلا يوجد أي تأثير جانبي أثناء التصيير.
  useEffect(() => {
    const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (saved === "SAR" || saved === "YER") setCurrencyState(saved);
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, code);
  }, []);

  const formatPrice = useCallback(
    (amountYer: number) => formatMoney(amountYer, currency, sarRate),
    [currency, sarRate],
  );

  const value = useMemo(
    () => ({ currency, setCurrency, sarRate, formatPrice }),
    [currency, setCurrency, sarRate, formatPrice],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    return {
      currency: "YER",
      setCurrency: () => undefined,
      sarRate: DEFAULT_SAR_RATE,
      formatPrice: (amountYer: number) => formatMoney(amountYer, "YER"),
    };
  }
  return ctx;
}

/**
 * استخدم هذا الـ hook داخل أي مكوّن يعرض سعرًا بدل استيراد formatMoney مباشرة.
 * المكوّن يشترك تلقائيًا في CurrencyContext فيُعاد تصييره فور تبديل المستخدم للعملة.
 */
export function useFormatPrice(): (amountYer: number) => string {
  return useCurrency().formatPrice;
}

export function CurrencySwitcher({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  return (
    <div
      className={`inline-flex overflow-hidden rounded-xl border border-border ${className}`}
      role="group"
      aria-label="اختيار العملة"
    >
      {CURRENCIES.map((c) => (
        <button
          key={c.code}
          type="button"
          onClick={() => setCurrency(c.code)}
          aria-pressed={currency === c.code}
          className={`px-2.5 py-1.5 text-[11px] transition-colors ${
            currency === c.code
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {c.suffix}
        </button>
      ))}
    </div>
  );
}
