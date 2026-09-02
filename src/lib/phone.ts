/** أدوات معالجة أرقام الهواتف اليمنية */

/** يحوّل أي صيغة إلى 9 أرقام تبدأ بـ 7 (مثال: 7XXXXXXXX) */
export function normalizeYemeniPhone(input: string): string {
  let digits = (input || "").replace(/[^\d]/g, "");
  if (digits.startsWith("00967")) digits = digits.slice(5);
  else if (digits.startsWith("967")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function isValidYemeniPhone(input: string): boolean {
  return /^7[0137]\d{7}$/.test(normalizeYemeniPhone(input));
}

/** بريد داخلي مشتق من رقم الهاتف (لأن المصادقة تتطلب بريدًا) */
export function phoneToEmail(input: string): string {
  return `${normalizeYemeniPhone(input)}@shehara.app`;
}

export function formatPhone(input: string): string {
  const p = normalizeYemeniPhone(input);
  return p ? `+967 ${p}` : "";
}
