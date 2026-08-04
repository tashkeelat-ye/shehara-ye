export type CurrencyCode = "YER" | "SAR";

export const CURRENCY_STORAGE_KEY = "tashkilat_currency_v1";

export const CURRENCIES: { code: CurrencyCode; label: string; suffix: string }[] = [
  { code: "YER", label: "الريال اليمني", suffix: "ر.ي" },
  { code: "SAR", label: "الريال السعودي", suffix: "ر.س" },
];

/** الأسعار مخزّنة دائمًا بالريال اليمني، والتحويل يتم عند العرض فقط. */
let currency: CurrencyCode = "YER";
let sarRate = 140;

export function setMoneyConfig(next: CurrencyCode, rate?: number) {
  currency = next;
  if (typeof rate === "number" && rate > 0) sarRate = rate;
}

export function getCurrency(): CurrencyCode {
  return currency;
}

export function getSarRate(): number {
  return sarRate;
}

export function convertFromYer(amountYer: number): number {
  return currency === "SAR" ? amountYer / sarRate : amountYer;
}

export function formatMoney(amountYer: number): string {
  const value = convertFromYer(amountYer);
  if (currency === "SAR") {
    return `${value.toLocaleString("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ر.س`;
  }
  return `${Math.round(value).toLocaleString("ar-EG")} ر.ي`;
}

/** صيغة بالريال اليمني دائمًا (للفواتير والإدارة). */
export function formatYer(amountYer: number): string {
  return `${Math.round(amountYer).toLocaleString("ar-EG")} ر.ي`;
}
