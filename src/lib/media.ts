import { supabase } from "@/integrations/supabase/client";

/** عشر سنوات بالثواني — رابط موقّع طويل الأمد للصور المعروضة للجميع. */
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function safeFileName(name: string) {
  return name.replace(/[^\w.-]/g, "_");
}

/** يرفع ملفًا إلى حاوية التخزين ويُعيد رابطًا قابلاً للعرض. */
export async function uploadMedia(
  bucket: "products" | "banners",
  file: File,
  folder = "admin",
): Promise<string> {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  const { data, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl) {
    throw new Error(signError?.message ?? "تعذّر إنشاء رابط الصورة");
  }
  return data.signedUrl;
}

/** يرفع عدة ملفات بالتتابع ويُعيد الروابط الناجحة. */
export async function uploadManyMedia(
  bucket: "products" | "banners",
  files: File[],
  folder = "admin",
): Promise<{ urls: string[]; errors: string[] }> {
  const urls: string[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      urls.push(await uploadMedia(bucket, file, folder));
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof Error ? e.message : "خطأ"}`);
    }
  }
  return { urls, errors };
}

/** يرفع إيصال تحويل إلى حاوية خاصة ويُعيد مسار الملف (وليس رابطًا عامًا). */
export async function uploadReceipt(userId: string, file: File): Promise<string> {
  const path = `${userId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return path;
}
