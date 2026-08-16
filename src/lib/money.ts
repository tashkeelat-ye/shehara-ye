export type CurrencyCode = "YER" | "SAR";

export const CURRENCY_STORAGE_KEY = "tashkilat_currency_v1";

/**
 * القيمة الافتراضية لسعر الصرف (كم ريال يمني لكل ١ ريال سعودي) — تُستخدم فقط
 * قبل وصول قيمة site_settings.sar_rate الحيّة من قاعدة البيانات، ولا يجب
 * الاعتماد عليها لحسابات فعلية.
 */
export const DEFAULT_SAR_RATE = 140;

export const CURRENCIES: { code: CurrencyCode; label: string; suffix: string }[] = [
  { code: "YER", label: "الريال اليمني", suffix: "ر.ي" },
  { code: "SAR", label: "الريال السعودي", suffix: "ر.س" },
];

/**
 * ملاحظة معمارية مهمة:
 * لا تحتفظ هذه الوحدة بأي حالة عامة قابلة للتغيير (module-level mutable state).
 * كل الدوال هنا نقية (pure) وتأخذ العملة وسعر الصرف كوسائط صريحة، وذلك لسببين:
 *  1) التطبيق يُصيَّر على الخادم (SSR) — أي متغيّر عام قابل للتغيير هنا كان
 *     سيُشارَك بين كل الطلبات المتزامنة على نفس عملية Node، وقد يتسرّب اختيار
 *     عملة مستخدم إلى استجابة مستخدم آخر (race condition حقيقي).
 *  2) القراءة المباشرة لحالة عامة من داخل مكوّنات لا "تشترك" في react context
 *     تمنع React من إعادة التصيير عند تغيير العملة — وهو ما كان يسبب بقاء
 *     الأسعار المعروضة دون تحديث عند تبديل العملة من الواجهة.
 * استخدم useFormatPrice()/useCurrency() من currency-context.tsx داخل المكوّنات
 * بدل استدعاء formatMoney مباشرة، لضمان إعادة التصيير التلقائي عند تغيّر العملة.
 */

export function convertFromYer(
  amountYer: number,
  currency: CurrencyCode,
  sarRate: number = DEFAULT_SAR_RATE,
): number {
  const safeRate = sarRate > 0 ? sarRate : DEFAULT_SAR_RATE;
  return currency === "SAR" ? amountYer / safeRate : amountYer;
}

export function formatMoney(
  amountYer: number,
  currency: CurrencyCode = "YER",
  sarRate: number = DEFAULT_SAR_RATE,
): string {
  const value = convertFromYer(amountYer, currency, sarRate);
  if (currency === "SAR") {
    return `${value.toLocaleString("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ر.س`;
  }
  return `${Math.round(value).toLocaleString("ar-EG")} ر.ي`;
}

/** صيغة بالريال اليمني دائمًا، بصرف النظر عن العملة المختارة (للفواتير والإدارة). */
export function formatYer(amountYer: number): string {
  return `${Math.round(amountYer).toLocaleString("ar-EG")} ر.ي`;
}
