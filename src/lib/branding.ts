import { supabase } from "@/integrations/supabase/client";

export type BrandingSettings = {
  pwa_icon_url: string;
  pwa_icon_192_url: string;
  pwa_icon_512_url: string;

  splash_logo_url: string;
  splash_background_url: string;

  header_logo_url: string;
  sidebar_logo_url: string;
  auth_logo_url: string;

  app_background_url: string;

  seo_name: string;
  seo_description: string;
  seo_icon_url: string;
};

const BRANDING_BUCKET = "branding";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const DEFAULTS: BrandingSettings = {
  pwa_icon_url: "/icon-192.png",
  pwa_icon_192_url: "/icon-192.png",
  pwa_icon_512_url: "/icon-512.png",

  splash_logo_url: "/logo.png",
  splash_background_url: "/splash-background.png",

  header_logo_url: "/logo.png",
  sidebar_logo_url: "/logo.png",
  auth_logo_url: "/logo.png",

  app_background_url: "",

  seo_name: "شهارة للتسوق",
  seo_description:
    "شهارة | SHEHARA — متجر إلكتروني يمني للتسوق بسهولة وأمان.",
  seo_icon_url: "/icon-192.png",
};

let cachedBranding: BrandingSettings = {
  ...DEFAULTS,
};

let loadingPromise: Promise<BrandingSettings> | null = null;

const listeners = new Set<
  (branding: BrandingSettings) => void
>();

function normalize(
  value:
    | Partial<BrandingSettings>
    | null
    | undefined,
): BrandingSettings {
  return {
    pwa_icon_url:
      value?.pwa_icon_url ||
      DEFAULTS.pwa_icon_url,

    pwa_icon_192_url:
      value?.pwa_icon_192_url ||
      DEFAULTS.pwa_icon_192_url,

    pwa_icon_512_url:
      value?.pwa_icon_512_url ||
      DEFAULTS.pwa_icon_512_url,

    splash_logo_url:
      value?.splash_logo_url ||
      DEFAULTS.splash_logo_url,

    splash_background_url:
      value?.splash_background_url ||
      DEFAULTS.splash_background_url,

    header_logo_url:
      value?.header_logo_url ||
      DEFAULTS.header_logo_url,

    sidebar_logo_url:
      value?.sidebar_logo_url ||
      DEFAULTS.sidebar_logo_url,

    auth_logo_url:
      value?.auth_logo_url ||
      DEFAULTS.auth_logo_url,

    app_background_url:
      value?.app_background_url ||
      DEFAULTS.app_background_url,

    seo_name:
      value?.seo_name ||
      DEFAULTS.seo_name,

    seo_description:
      value?.seo_description ||
      DEFAULTS.seo_description,

    seo_icon_url:
      value?.seo_icon_url ||
      value?.pwa_icon_192_url ||
      DEFAULTS.seo_icon_url,
  };
}

function notify() {
  for (const listener of listeners) {
    try {
      listener(cachedBranding);
    } catch (error) {
      console.error(
        "[branding] listener failed:",
        error,
      );
    }
  }
}

export function getBranding(): BrandingSettings {
  return cachedBranding;
}

export function subscribeBranding(
  listener: (
    branding: BrandingSettings,
  ) => void,
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    error &&
    typeof error === "object"
  ) {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts: string[] = [];

    if (
      typeof candidate.message ===
        "string" &&
      candidate.message.trim()
    ) {
      parts.push(
        candidate.message.trim(),
      );
    }

    if (
      typeof candidate.details ===
        "string" &&
      candidate.details.trim()
    ) {
      parts.push(
        `التفاصيل: ${candidate.details.trim()}`,
      );
    }

    if (
      typeof candidate.hint ===
        "string" &&
      candidate.hint.trim()
    ) {
      parts.push(
        `التلميح: ${candidate.hint.trim()}`,
      );
    }

    if (
      typeof candidate.code ===
        "string" &&
      candidate.code.trim()
    ) {
      parts.push(
        `رمز الخطأ: ${candidate.code.trim()}`,
      );
    }

    if (parts.length > 0) {
      return parts.join(" — ");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? "");
}

function createFriendlyStorageError(
  error: unknown,
): Error {
  const message =
    getErrorMessage(error);

  if (
    /bucket.*not found|not found.*bucket/i.test(
      message,
    )
  ) {
    return new Error(
      "مخزن صور الهوية (branding) غير موجود في Supabase. نفّذ Migration إصلاح الهوية أولًا.",
    );
  }

  if (
    /row-level security|rls|not authorized|unauthorized|permission|forbidden/i.test(
      message,
    )
  ) {
    return new Error(
      "ليس لديك صلاحية رفع صور الهوية. تأكد من تسجيل الدخول بحساب إداري ومن تطبيق صلاحيات Storage الخاصة بـ branding.",
    );
  }

  if (
    /network|fetch|failed to fetch|abort|cancel/i.test(
      message,
    )
  ) {
    return new Error(
      "تعذر الاتصال بخدمة التخزين. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.",
    );
  }

  return new Error(
    message ||
      "تعذر رفع صورة الهوية.",
  );
}

function createFriendlyDatabaseError(
  error: unknown,
): Error {
  const message =
    getErrorMessage(error);

  if (
    /column .* does not exist|schema cache|could not find.*column/i.test(
      message,
    )
  ) {
    return new Error(
      "حقول الهوية غير موجودة في قاعدة البيانات أو لم يتم تحديث مخطط Supabase. نفّذ Migration الهوية ثم أعد المحاولة.",
    );
  }

  if (
    /row-level security|rls|permission|not authorized|unauthorized|forbidden/i.test(
      message,
    )
  ) {
    return new Error(
      "ليس لديك صلاحية حفظ إعدادات الهوية. يجب أن يكون الحساب مسجلًا كمسؤول.",
    );
  }

  return new Error(
    message ||
      "تعذر حفظ إعدادات الهوية.",
  );
}

export async function fetchBranding(): Promise<BrandingSettings> {
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    const {
      data,
      error,
    } = await supabase
      .from("site_settings")
      .select(
        [
          "pwa_icon_url",
          "pwa_icon_192_url",
          "pwa_icon_512_url",
          "splash_logo_url",
          "splash_background_url",
          "header_logo_url",
          "sidebar_logo_url",
          "auth_logo_url",
          "app_background_url",
          "seo_name",
          "seo_description",
          "seo_icon_url",
        ].join(","),
      )
      .eq("id", true)
      .maybeSingle();

    if (error) {
      console.warn(
        "[branding] Failed to load branding settings:",
        error,
      );

      return cachedBranding;
    }

    cachedBranding = normalize(
      data as
        | Partial<BrandingSettings>
        | null,
    );

    notify();

    return cachedBranding;
  })();

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export async function updateBranding(
  patch: Partial<BrandingSettings>,
): Promise<BrandingSettings> {
  const current = cachedBranding;

  const next = normalize({
    ...current,
    ...patch,
  });

  const {
    data,
    error,
  } = await supabase
    .from("site_settings")
    .update({
      pwa_icon_url:
        next.pwa_icon_url,

      pwa_icon_192_url:
        next.pwa_icon_192_url,

      pwa_icon_512_url:
        next.pwa_icon_512_url,

      splash_logo_url:
        next.splash_logo_url,

      splash_background_url:
        next.splash_background_url,

      header_logo_url:
        next.header_logo_url,

      sidebar_logo_url:
        next.sidebar_logo_url,

      auth_logo_url:
        next.auth_logo_url,

      app_background_url:
        next.app_background_url,

      seo_name:
        next.seo_name,

      seo_description:
        next.seo_description,

      seo_icon_url:
        next.seo_icon_url,
    })
    .eq("id", true)
    .select(
      [
        "pwa_icon_url",
        "pwa_icon_192_url",
        "pwa_icon_512_url",
        "splash_logo_url",
        "splash_background_url",
        "header_logo_url",
        "sidebar_logo_url",
        "auth_logo_url",
        "app_background_url",
        "seo_name",
        "seo_description",
        "seo_icon_url",
      ].join(","),
    )
    .maybeSingle();

  if (error) {
    throw createFriendlyDatabaseError(
      error,
    );
  }

  if (!data) {
    throw new Error(
      "تعذر تأكيد حفظ إعدادات الهوية. لم تُرجع قاعدة البيانات السجل المحدث.",
    );
  }

  cachedBranding = normalize(
    data as Partial<BrandingSettings>,
  );

  notify();

  return cachedBranding;
}

export async function uploadBrandingImage(
  file: File,
  key: keyof BrandingSettings,
): Promise<string> {
  if (!file) {
    throw new Error(
      "لم يتم اختيار صورة.",
    );
  }

  if (!file.type.startsWith("image/")) {
    throw new Error(
      "الملف المختار ليس صورة.",
    );
  }

  if (file.size <= 0) {
    throw new Error(
      "ملف الصورة فارغ أو غير صالح.",
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(
      "حجم الصورة يجب ألا يتجاوز 10 ميجابايت.",
    );
  }

  const {
    data: sessionData,
    error: sessionError,
  } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(
      "تعذر التحقق من جلسة تسجيل الدخول.",
    );
  }

  if (!sessionData.session?.user) {
    throw new Error(
      "يجب تسجيل الدخول قبل رفع صورة الهوية.",
    );
  }

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        "",
      ) ||
    "png";

  const safeExtension =
    [
      "png",
      "jpg",
      "jpeg",
      "webp",
      "gif",
      "avif",
    ].includes(extension)
      ? extension
      : "png";

  const path =
    `site/${key}-${crypto.randomUUID()}.${safeExtension}`;

  let uploadError: unknown = null;

  try {
    const result =
      await supabase.storage
        .from(BRANDING_BUCKET)
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

    uploadError =
      result.error;
  } catch (error) {
    uploadError = error;
  }

  if (uploadError) {
    throw createFriendlyStorageError(
      uploadError,
    );
  }

  const {
    data,
  } = supabase.storage
    .from(BRANDING_BUCKET)
    .getPublicUrl(path);

  const publicUrl =
    data?.publicUrl?.trim();

  if (!publicUrl) {
    throw new Error(
      "تم رفع الصورة ولكن تعذر إنشاء رابط عام لها.",
    );
  }

  return publicUrl;
}

function setLink(
  rel: string,
  href: string,
  id: string,
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  let link =
    document.querySelector<HTMLLinkElement>(
      `link#${id}`,
    );

  if (!link) {
    link =
      document.createElement(
        "link",
      );

    link.id = id;
    link.rel = rel;

    document.head.appendChild(
      link,
    );
  }

  link.href = href;
}

function updateMeta(
  name: string,
  content: string,
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  let meta =
    document.querySelector<HTMLMetaElement>(
      `meta[name="${name}"]`,
    );

  if (!meta) {
    meta =
      document.createElement(
        "meta",
      );

    meta.name = name;

    document.head.appendChild(
      meta,
    );
  }

  meta.content = content;
}

function applySeo(
  branding: BrandingSettings,
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  document.title =
    branding.seo_name;

  updateMeta(
    "description",
    branding.seo_description,
  );

  setLink(
    "icon",
    branding.seo_icon_url,
    "dynamic-favicon",
  );

  updateMeta(
    "application-name",
    branding.seo_name,
  );

  updateMeta(
    "apple-mobile-web-app-title",
    branding.seo_name,
  );
}

function applyBackground(
  branding: BrandingSettings,
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  const root =
    document.documentElement;

  if (
    branding.app_background_url
  ) {
    root.style.setProperty(
      "--shehara-app-background-image",
      `url("${branding.app_background_url}")`,
    );

    root.style.setProperty(
      "--shehara-app-background-enabled",
      "1",
    );
  } else {
    root.style.removeProperty(
      "--shehara-app-background-image",
    );

    root.style.setProperty(
      "--shehara-app-background-enabled",
      "0",
    );
  }
}

export function applyBranding(
  branding: BrandingSettings,
) {
  applySeo(branding);
  applyBackground(branding);
}

export function initializeBranding() {
  applyBranding(
    cachedBranding,
  );

  void fetchBranding()
    .then(applyBranding)
    .catch((error) => {
      console.warn(
        "[branding] initialization failed:",
        error,
      );
    });
}

if (
  typeof window !==
  "undefined"
) {
  subscribeBranding(
    applyBranding,
  );

  initializeBranding();
}
