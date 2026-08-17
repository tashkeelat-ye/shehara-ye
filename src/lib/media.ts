import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export type MediaBucket =
  | "products"
  | "banners"
  | "categories"
  | "brands";

export function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.-]/g, "_")
    .replace(/_+/g, "_");

  return cleaned.slice(0, 160) || "image";
}

function validateImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("الملف المختار ليس صورة.");
  }

  const maxSize = 8 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("حجم الصورة يجب ألا يتجاوز 8 ميجابايت.");
  }
}

function getExtension(file: File) {
  const fromName = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (fromName) {
    return fromName;
  }

  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };

  return mimeMap[file.type] ?? "jpg";
}

/**
 * رفع صورة إلى Supabase Storage.
 *
 * هذه الدالة هي نقطة الرفع المركزية للوحة التحكم.
 *
 * Buckets المدعومة:
 * - products
 * - banners
 * - categories
 * - brands
 */
export async function uploadMedia(
  bucket: MediaBucket,
  file: File,
  folder = "admin",
): Promise<string> {
  validateImage(file);

  const extension = getExtension(file);

  const fileName = `${crypto.randomUUID()}-${safeFileName(
    file.name.replace(/\.[^/.]+$/, ""),
  )}.${extension}`;

  const path = `${folder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      uploadError.message ||
        "تعذر رفع الصورة إلى التخزين.",
    );
  }

  /*
   * نستخدم رابطًا موقعًا طويل الأمد حتى لا تعتمد
   * الواجهات الحالية على كون الـ bucket عامًا.
   */
  const { data, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, TEN_YEARS);

  if (signError || !data?.signedUrl) {
    throw new Error(
      signError?.message ||
        "تم رفع الصورة ولكن تعذر إنشاء رابط عرض الصورة.",
    );
  }

  return data.signedUrl;
}

/**
 * رفع عدة صور بالتتابع.
 *
 * لا تتوقف العملية بالكامل إذا فشل ملف واحد.
 */
export async function uploadManyMedia(
  bucket: MediaBucket,
  files: File[],
  folder = "admin",
): Promise<{
  urls: string[];
  errors: string[];
}> {
  const urls: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const url = await uploadMedia(
        bucket,
        file,
        folder,
      );

      urls.push(url);
    } catch (error) {
      errors.push(
        `${file.name}: ${
          error instanceof Error
            ? error.message
            : "تعذر رفع الملف"
        }`,
      );
    }
  }

  return {
    urls,
    errors,
  };
}

/**
 * رفع إيصال دفع إلى bucket خاص.
 *
 * لا يعيد رابطًا عامًا.
 * يعيد مسار الملف فقط حتى يتم إنشاء Signed URL
 * عند الحاجة للعرض.
 */
export async function uploadReceipt(
  userId: string,
  file: File,
): Promise<string> {
  validateImage(file);

  const fileName = `${Date.now()}-${crypto.randomUUID()}-${safeFileName(
    file.name,
  )}`;

  const path = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(
      error.message ||
        "تعذر رفع إيصال الدفع.",
    );
  }

  return path;
}
