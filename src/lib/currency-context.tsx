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
  setMoneyConfig,
  type CurrencyCode,
} from "@/lib/money";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  sarRate: number;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("YER");
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const sarRate = settings?.sar_rate && settings.sar_rate > 0 ? settings.sar_rate : 140;

  useEffect(() => {
    const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (saved === "SAR" || saved === "YER") setCurrencyState(saved);
  }, []);

  // يُطبَّق قبل أي عرض للأسعار في هذه الدورة
  setMoneyConfig(currency, sarRate);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setMoneyConfig(code);
    setCurrencyState(code);
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, code);
  }, []);

  const value = useMemo(
    () => ({ currency, setCurrency, sarRate }),
    [currency, setCurrency, sarRate],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) return { currency: "YER", setCurrency: () => undefined, sarRate: 140 };
  return ctx;
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
