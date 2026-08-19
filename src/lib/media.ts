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

  /*
   * على الهواتف قد تكون صورة الإيصال من الكاميرا
   * بحجم كبير جدًا.
   *
   * نسمح بحد أقصى 8MB قبل الضغط.
   */
  const maxSize = 8 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      "حجم الصورة كبير جدًا. اختر صورة أقل من 8 ميجابايت.",
    );
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
 * =========================================================
 * ضغط صورة الإيصال قبل رفعها
 * =========================================================
 *
 * مهم جدًا للهواتف وشبكات 4G الضعيفة.
 *
 * صور الكاميرا قد تكون 5MB - 12MB أو أكثر.
 * لا نحتاج هذه الجودة لإيصال الدفع.
 */
async function compressReceiptImage(
  file: File,
): Promise<File> {
  validateImage(file);

  /*
   * إذا كانت الصورة صغيرة أصلًا فلا داعي لمعالجتها.
   */
  if (file.size <= 1.5 * 1024 * 1024) {
    return file;
  }

  /*
   * بعض المتصفحات قد لا توفر canvas أثناء الاختبار.
   */
  if (
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          new Error(
            "تعذر قراءة صورة الإيصال.",
          ),
        );

      image.src = objectUrl;
    });

    /*
     * نخفض أكبر ضلع إلى 1600px.
     */
    const maxDimension = 1600;

    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if (width > maxDimension || height > maxDimension) {
      const ratio =
        Math.min(
          maxDimension / width,
          maxDimension / height,
        );

      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas =
      document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(
      image,
      0,
      0,
      width,
      height,
    );

    const blob =
      await new Promise<Blob | null>(
        (resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.78,
          );
        },
      );

    if (!blob) {
      return file;
    }

    /*
     * إذا كان الناتج أكبر من الأصل، نحتفظ بالأصل.
     */
    if (blob.size >= file.size) {
      return file;
    }

    const baseName =
      file.name.replace(
        /\.[^/.]+$/,
        "",
      );

    return new File(
      [blob],
      `${baseName}.jpg`,
      {
        type: "image/jpeg",
        lastModified:
          Date.now(),
      },
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * =========================================================
 * رفع صورة عامة
 * =========================================================
 */
export async function uploadMedia(
  bucket: MediaBucket,
  file: File,
  folder = "admin",
): Promise<string> {
  validateImage(file);

  const extension =
    getExtension(file);

  const fileName =
    `${crypto.randomUUID()}-${safeFileName(
      file.name.replace(
        /\.[^/.]+$/,
        "",
      ),
    )}.${extension}`;

  const path =
    `${folder}/${fileName}`;

  const {
    error: uploadError,
  } = await supabase.storage
    .from(bucket)
    .upload(
      path,
      file,
      {
        contentType:
          file.type,
        cacheControl:
          "31536000",
        upsert: false,
      },
    );

  if (uploadError) {
    throw new Error(
      uploadError.message ||
        "تعذر رفع الصورة إلى التخزين.",
    );
  }

  const {
    data,
    error: signError,
  } =
    await supabase.storage
      .from(bucket)
      .createSignedUrl(
        path,
        TEN_YEARS,
      );

  if (
    signError ||
    !data?.signedUrl
  ) {
    throw new Error(
      signError?.message ||
        "تم رفع الصورة ولكن تعذر إنشاء رابط عرض الصورة.",
    );
  }

  return data.signedUrl;
}

/**
 * =========================================================
 * رفع عدة صور
 * =========================================================
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
      const url =
        await uploadMedia(
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
 * =========================================================
 * رفع إيصال الدفع
 * =========================================================
 *
 * النسخة الجديدة:
 *
 * 1. تتحقق من الصورة.
 * 2. تضغط الصورة على الهاتف.
 * 3. تستخدم اسمًا آمنًا.
 * 4. تعيد مسار Storage فقط.
 *
 * وهذا يمنع أغلب حالات:
 *
 * HTTP request cancelled
 *
 * الناتجة عن رفع صور الكاميرا الكبيرة.
 */
export async function uploadReceipt(
  userId: string,
  file: File,
): Promise<string> {
  if (!userId) {
    throw new Error(
      "تعذر تحديد حساب المستخدم.",
    );
  }

  validateImage(file);

  const compressed =
    await compressReceiptImage(file);

  const fileName =
    `${Date.now()}-${crypto.randomUUID()}-${safeFileName(
      compressed.name,
    )}`;

  const path =
    `${userId}/${fileName}`;

  let lastError: unknown = null;

  /*
   * محاولتان فقط.
   *
   * هذا مفيد جدًا عند ضعف شبكة الهاتف.
   */
  for (
    let attempt = 1;
    attempt <= 2;
    attempt++
  ) {
    try {
      const {
        error,
      } = await supabase.storage
        .from("receipts")
        .upload(
          path,
          compressed,
          {
            contentType:
              compressed.type ||
              "image/jpeg",
            cacheControl:
              "3600",
            upsert: false,
          },
        );

      if (!error) {
        return path;
      }

      lastError = error;

      /*
       * إذا كان الملف قد تم رفعه بالفعل فلا نعيد رفعه.
       */
      if (
        /already exists|duplicate/i.test(
          error.message,
        )
      ) {
        return path;
      }
    } catch (error) {
      lastError = error;
    }

    /*
     * انتظار بسيط قبل المحاولة الثانية.
     */
    if (attempt < 2) {
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            700,
          ),
      );
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : String(
          lastError ??
            "",
        );

  if (
    /cancel|abort|network|fetch|failed/i.test(
      message,
    )
  ) {
    throw new Error(
      "تعذر رفع صورة الإيصال بسبب اتصال الشبكة. تأكد من اتصال الإنترنت ثم حاول مرة أخرى.",
    );
  }

  throw new Error(
    message ||
      "تعذر رفع إيصال الدفع.",
  );
}
