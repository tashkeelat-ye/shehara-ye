import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "light" | "dark";

export const THEME_COLOR_KEYS = [
  "--brand-burgundy",
  "--brand-burgundy-deep",
  "--brand-burgundy-soft",
  "--brand-burgundy-light",
  "--brand-gold",
  "--brand-gold-deep",
  "--brand-gold-soft",
  "--brand-gold-pale",
  "--brand-cream",
  "--brand-paper",
  "--brand-paper-deep",
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--accent-solid",
  "--accent-solid-foreground",
  "--brand-soft",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
] as const;

export type ThemeColorKey =
  (typeof THEME_COLOR_KEYS)[number];

export type ThemeColors = Record<
  ThemeMode,
  Record<ThemeColorKey, string>
>;

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
  theme_colors: ThemeColors;
  custom_font_url: string;
  custom_font_name: string;
  custom_font_original_name: string;
};

const BRANDING_BUCKET = "branding";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_FONT_SIZE = 8 * 1024 * 1024;
const FONT_FAMILY_FALLBACK = "CustomFont";

const LIGHT_DEFAULTS: Record<ThemeColorKey, string> = {
  "--brand-burgundy": "#0E4D64",
  "--brand-burgundy-deep": "#0A3D50",
  "--brand-burgundy-soft": "#17647E",
  "--brand-burgundy-light": "#25809B",
  "--brand-gold": "#D65A31",
  "--brand-gold-deep": "#B74624",
  "--brand-gold-soft": "#E98261",
  "--brand-gold-pale": "#F8DED5",
  "--brand-cream": "#FAF9F6",
  "--brand-paper": "#F4F7F8",
  "--brand-paper-deep": "#E4ECEF",
  "--background": "#FAF9F6",
  "--foreground": "#081D27",
  "--card": "#FFFFFF",
  "--card-foreground": "#081D27",
  "--popover": "#FFFFFF",
  "--popover-foreground": "#081D27",
  "--primary": "#0E4D64",
  "--primary-foreground": "#FFFFFF",
  "--secondary": "#E8F1F4",
  "--secondary-foreground": "#0E4D64",
  "--muted": "#EEF3F5",
  "--muted-foreground": "#5C7079",
  "--accent": "#F8DED5",
  "--accent-foreground": "#0E4D64",
  "--accent-solid": "#D65A31",
  "--accent-solid-foreground": "#FFFFFF",
  "--brand-soft": "#E8F1F4",
  "--destructive": "#B42318",
  "--destructive-foreground": "#FFFFFF",
  "--border": "#D7E3E7",
  "--input": "#D7E3E7",
  "--ring": "#D65A31",
  "--chart-1": "#0E4D64",
  "--chart-2": "#D65A31",
  "--chart-3": "#17647E",
  "--chart-4": "#E98261",
  "--chart-5": "#0A3D50",
  "--sidebar": "#FFFFFF",
  "--sidebar-foreground": "#081D27",
  "--sidebar-primary": "#0E4D64",
  "--sidebar-primary-foreground": "#FFFFFF",
  "--sidebar-accent": "#EEF3F5",
  "--sidebar-accent-foreground": "#0E4D64",
  "--sidebar-border": "#D7E3E7",
  "--sidebar-ring": "#D65A31",
};

const DARK_DEFAULTS: Record<ThemeColorKey, string> = {
  ...LIGHT_DEFAULTS,
  "--background": "#071B24",
  "--foreground": "#F5FAFC",
  "--card": "#0B2936",
  "--card-foreground": "#F5FAFC",
  "--popover": "#0B2936",
  "--popover-foreground": "#F5FAFC",
  "--primary": "#17647E",
  "--primary-foreground": "#FFFFFF",
  "--secondary": "#103847",
  "--secondary-foreground": "#F5FAFC",
  "--muted": "#103847",
  "--muted-foreground": "#B8C9CF",
  "--accent": "#3A2119",
  "--accent-foreground": "#F5FAFC",
  "--destructive": "#EF6B63",
  "--destructive-foreground": "#FFFFFF",
  "--border": "#2B4651",
  "--input": "#34505A",
  "--ring": "#D65A31",
  "--chart-1": "#17647E",
  "--chart-2": "#D65A31",
  "--chart-3": "#25809B",
  "--chart-4": "#E98261",
  "--chart-5": "#F5FAFC",
  "--sidebar": "#0B2936",
  "--sidebar-foreground": "#F5FAFC",
  "--sidebar-primary": "#17647E",
  "--sidebar-primary-foreground": "#FFFFFF",
  "--sidebar-accent": "#154252",
  "--sidebar-accent-foreground": "#F5FAFC",
  "--sidebar-border": "#2B4651",
  "--sidebar-ring": "#D65A31",
  "--brand-soft": "#103847",
};

export const DEFAULT_THEME_COLORS: ThemeColors = {
  light: { ...LIGHT_DEFAULTS },
  dark: { ...DARK_DEFAULTS },
};

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
  theme_colors: DEFAULT_THEME_COLORS,
  custom_font_url: "/custom-font.ttf",
  custom_font_name: FONT_FAMILY_FALLBACK,
  custom_font_original_name: "custom-font.ttf",
};

let cachedBranding: BrandingSettings = structuredClone(DEFAULTS);
let loadingPromise: Promise<BrandingSettings> | null = null;
const listeners = new Set<(branding: BrandingSettings) => void>();

function cloneTheme(value: Partial<ThemeColors> | null | undefined): ThemeColors {
  const light = {
    ...LIGHT_DEFAULTS,
    ...(value?.light ?? {}),
  } as Record<ThemeColorKey, string>;

  const dark = {
    ...DARK_DEFAULTS,
    ...(value?.dark ?? {}),
  } as Record<ThemeColorKey, string>;

  return { light, dark };
}

function normalize(value: Partial<BrandingSettings> | null | undefined): BrandingSettings {
  return {
    pwa_icon_url: value?.pwa_icon_url || DEFAULTS.pwa_icon_url,
    pwa_icon_192_url: value?.pwa_icon_192_url || DEFAULTS.pwa_icon_192_url,
    pwa_icon_512_url: value?.pwa_icon_512_url || DEFAULTS.pwa_icon_512_url,
    splash_logo_url: value?.splash_logo_url || DEFAULTS.splash_logo_url,
    splash_background_url: value?.splash_background_url || DEFAULTS.splash_background_url,
    header_logo_url: value?.header_logo_url || DEFAULTS.header_logo_url,
    sidebar_logo_url: value?.sidebar_logo_url || DEFAULTS.sidebar_logo_url,
    auth_logo_url: value?.auth_logo_url || DEFAULTS.auth_logo_url,
    app_background_url: value?.app_background_url || DEFAULTS.app_background_url,
    seo_name: value?.seo_name || DEFAULTS.seo_name,
    seo_description: value?.seo_description || DEFAULTS.seo_description,
    seo_icon_url: value?.seo_icon_url || value?.pwa_icon_192_url || DEFAULTS.seo_icon_url,
    theme_colors: cloneTheme(value?.theme_colors),
    custom_font_url: value?.custom_font_url || DEFAULTS.custom_font_url,
    custom_font_name: value?.custom_font_name || DEFAULTS.custom_font_name,
    custom_font_original_name:
      value?.custom_font_original_name || DEFAULTS.custom_font_original_name,
  };
}

function notify() {
  for (const listener of listeners) {
    try {
      listener(cachedBranding);
    } catch (error) {
      console.error("[branding] listener failed:", error);
    }
  }
}

export function getBranding(): BrandingSettings {
  return cachedBranding;
}

export function subscribeBranding(listener: (branding: BrandingSettings) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts: string[] = [];
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      parts.push(candidate.message.trim());
    }
    if (typeof candidate.details === "string" && candidate.details.trim()) {
      parts.push(`التفاصيل: ${candidate.details.trim()}`);
    }
    if (typeof candidate.hint === "string" && candidate.hint.trim()) {
      parts.push(`التلميح: ${candidate.hint.trim()}`);
    }
    if (typeof candidate.code === "string" && candidate.code.trim()) {
      parts.push(`رمز الخطأ: ${candidate.code.trim()}`);
    }
    if (parts.length) return parts.join(" — ");
  }
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

function friendlyDatabaseError(error: unknown): Error {
  const message = getErrorMessage(error);
  if (/column .* does not exist|schema cache|could not find.*column/i.test(message)) {
    return new Error("حقول الهوية الجديدة غير موجودة في قاعدة البيانات. نفّذ Migration الهوية والهوية البصرية أولاً.");
  }
  if (/row-level security|rls|permission|not authorized|unauthorized|forbidden/i.test(message)) {
    return new Error("ليس لديك صلاحية حفظ الهوية. يجب أن يكون الحساب مسجلاً كمسؤول.");
  }
  return new Error(message || "تعذر حفظ إعدادات الهوية.");
}

function friendlyStorageError(error: unknown): Error {
  const message = getErrorMessage(error);
  if (/bucket.*not found|not found.*bucket/i.test(message)) {
    return new Error("مخزن branding غير موجود. نفّذ Migration الهوية والهوية البصرية أولاً.");
  }
  if (/row-level security|rls|permission|not authorized|unauthorized|forbidden/i.test(message)) {
    return new Error("ليس لديك صلاحية رفع ملفات الهوية. تأكد من تسجيل الدخول بحساب إداري.");
  }
  return new Error(message || "تعذر رفع الملف.");
}

async function requireAdminSession(): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) {
    throw new Error("يجب تسجيل الدخول بحساب إداري قبل تنفيذ هذه العملية.");
  }
}

const BRANDING_SELECT = [
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
  "theme_colors",
  "custom_font_url",
  "custom_font_name",
  "custom_font_original_name",
].join(",");

export async function fetchBranding(): Promise<BrandingSettings> {
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select(BRANDING_SELECT)
      .eq("id", true)
      .maybeSingle();

    if (error) {
      console.warn("[branding] load failed:", error);
      return cachedBranding;
    }

    cachedBranding = normalize(data as Partial<BrandingSettings> | null);
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
  await requireAdminSession();

  const next = normalize({
    ...cachedBranding,
    ...patch,
    theme_colors: patch.theme_colors
      ? cloneTheme(patch.theme_colors)
      : cachedBranding.theme_colors,
  });

  const { data, error } = await supabase
    .from("site_settings")
    .update({
      pwa_icon_url: next.pwa_icon_url,
      pwa_icon_192_url: next.pwa_icon_192_url,
      pwa_icon_512_url: next.pwa_icon_512_url,
      splash_logo_url: next.splash_logo_url,
      splash_background_url: next.splash_background_url,
      header_logo_url: next.header_logo_url,
      sidebar_logo_url: next.sidebar_logo_url,
      auth_logo_url: next.auth_logo_url,
      app_background_url: next.app_background_url,
      seo_name: next.seo_name,
      seo_description: next.seo_description,
      seo_icon_url: next.seo_icon_url,
      theme_colors: next.theme_colors,
      custom_font_url: next.custom_font_url,
      custom_font_name: next.custom_font_name,
      custom_font_original_name: next.custom_font_original_name,
    })
    .eq("id", true)
    .select(BRANDING_SELECT)
    .maybeSingle();

  if (error) throw friendlyDatabaseError(error);
  if (!data) throw new Error("تعذر تأكيد حفظ الهوية. لم تُرجع قاعدة البيانات السجل المحدث.");

  cachedBranding = normalize(data as Partial<BrandingSettings>);
  notify();
  return cachedBranding;
}

const EXPECTED_IMAGE_NAMES: Record<string, string> = {
  pwa_icon_url: "icon-192.png",
  pwa_icon_192_url: "icon-192.png",
  pwa_icon_512_url: "icon-512.png",
  splash_logo_url: "logo.png",
  splash_background_url: "splash-background.png",
  header_logo_url: "logo.png",
  sidebar_logo_url: "logo.png",
  auth_logo_url: "logo.png",
  app_background_url: "app-background.png",
  seo_icon_url: "favicon.png",
};

export function getExpectedImageName(key: string): string {
  return EXPECTED_IMAGE_NAMES[key] || "اسم الملف المطلوب غير محدد";
}

async function readFileHeader(file: File, length = 16): Promise<Uint8Array> {
  const buffer = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(buffer);
}

function hasBytes(header: Uint8Array, bytes: number[]): boolean {
  if (header.length < bytes.length) return false;
  return bytes.every((value, index) => header[index] === value);
}

function isValidImageSignature(header: Uint8Array, type: string): boolean {
  const normalized = type.toLowerCase();
  if (normalized === "image/png") {
    return hasBytes(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (normalized === "image/jpeg" || normalized === "image/jpg") {
    return hasBytes(header, [0xff, 0xd8, 0xff]);
  }
  if (normalized === "image/webp") {
    return hasBytes(header, [0x52, 0x49, 0x46, 0x46]) &&
      header.length >= 12 &&
      hasBytes(header.slice(8), [0x57, 0x45, 0x42, 0x50]);
  }
  if (normalized === "image/gif") {
    return (
      hasBytes(header, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
      hasBytes(header, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    );
  }
  return true;
}

async function validateTtfFile(file: File): Promise<void> {
  const header = await readFileHeader(file, 12);
  const validSfnt =
    hasBytes(header, [0x00, 0x01, 0x00, 0x00]) ||
    hasBytes(header, [0x74, 0x72, 0x75, 0x65]);

  if (!validSfnt) {
    throw new Error(
      "تم رفض الملف. محتوى الملف لا يحمل ترويسة TTF صحيحة. ملفات OTF أو ملفات أخرى لا تُقبل هنا.",
    );
  }
}

export async function uploadBrandingImage(
  file: File,
  key: keyof BrandingSettings,
): Promise<string> {
  if (!(key in EXPECTED_IMAGE_NAMES)) {
    throw new Error("هذا الحقل لا يدعم رفع الصور.");
  }
  if (!file) throw new Error("لم يتم اختيار صورة.");

  const expected = EXPECTED_IMAGE_NAMES[key as string];
  if (file.name !== expected) {
    throw new Error(`تم رفض الصورة. اسم الملف يجب أن يكون بالضبط: ${expected}`);
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("الملف المختار ليس صورة.");
  }
  if (file.size <= 0) throw new Error("ملف الصورة فارغ أو غير صالح.");
  if (file.size > MAX_IMAGE_SIZE) throw new Error("حجم الصورة يجب ألا يتجاوز 10 ميجابايت.");

  const header = await readFileHeader(file);
  if (!isValidImageSignature(header, file.type)) {
    throw new Error("تم رفض الصورة لأن محتوى الملف لا يطابق نوع الصورة المعلن.");
  }

  await requireAdminSession();

  const extension = expected.split(".").pop()!.toLowerCase();
  const path = `site/${expected}`;
  const { error } = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(path, file, {
      contentType: file.type || `image/${extension === "jpg" ? "jpeg" : extension}`,
      cacheControl: "31536000",
      upsert: true,
    });

  if (error) throw friendlyStorageError(error);

  const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(path);
  const url = data?.publicUrl?.trim();
  if (!url) throw new Error("تم رفع الصورة ولكن تعذر إنشاء رابطها العام.");

  return `${url}?v=${Date.now()}`;
}

export async function uploadCustomFont(file: File): Promise<BrandingSettings> {
  if (!file) throw new Error("لم يتم اختيار ملف الخط.");
  if (!file.name.toLowerCase().endsWith(".ttf")) {
    throw new Error("تم رفض الملف. يجب أن يكون الخط بصيغة TTF فقط.");
  }
  if (file.size <= 0) throw new Error("ملف الخط فارغ أو غير صالح.");
  if (file.size > MAX_FONT_SIZE) throw new Error("حجم ملف الخط يجب ألا يتجاوز 8 ميجابايت.");
  await validateTtfFile(file);

  await requireAdminSession();

  const path = "fonts/custom-font.ttf";
  const { error } = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(path, file, {
      contentType: "font/ttf",
      cacheControl: "31536000",
      upsert: true,
    });

  if (error) throw friendlyStorageError(error);

  const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(path);
  const url = data?.publicUrl?.trim();
  if (!url) throw new Error("تم رفع الخط ولكن تعذر إنشاء رابطه العام.");

  const family = "CustomFont";
  return updateBranding({
    custom_font_url: `${url}?v=${Date.now()}`,
    custom_font_name: family,
    custom_font_original_name: file.name,
  });
}

function setImportantProperty(
  root: HTMLElement,
  key: string,
  value: string,
) {
  root.style.setProperty(key, value, "important");
}

function applyThemeColors(branding: BrandingSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const mode: ThemeMode = root.classList.contains("dark") ? "dark" : "light";
  const colors = branding.theme_colors[mode];

  for (const key of THEME_COLOR_KEYS) {
    setImportantProperty(root, key, colors[key]);
  }

  if (typeof document.body !== "undefined") {
    document.body.style.setProperty("background-color", colors["--background"], "important");
    document.body.style.setProperty("color", colors["--foreground"], "important");
  }

  const legacyStyleId = "shehara-dynamic-brand-overrides";
  let legacyStyle = document.getElementById(legacyStyleId) as HTMLStyleElement | null;
  if (!legacyStyle) {
    legacyStyle = document.createElement("style");
    legacyStyle.id = legacyStyleId;
    document.head.appendChild(legacyStyle);
  }
  legacyStyle.textContent = `
    .shehara-app [class*="bg-[#4A1525]"], [class*="bg-[#4A1525]"], .shehara-app [class*="bg-[#071E28]"], [class*="bg-[#071E28]"] { background-color: var(--brand-burgundy) !important; }
    .shehara-app [class*="bg-[#35101C]"], [class*="bg-[#35101C]"], .shehara-app [class*="bg-[#0A3D50]"], [class*="bg-[#0A3D50]"] { background-color: var(--brand-burgundy-deep) !important; }
    .shehara-app [class*="bg-[#6A263A]"], [class*="bg-[#6A263A]"] { background-color: var(--brand-burgundy-soft) !important; }
    .shehara-app [class*="text-[#4A1525]"], [class*="text-[#4A1525]"], .shehara-app [class*="text-[#071E28]"], [class*="text-[#071E28]"] { color: var(--brand-burgundy) !important; }
    .shehara-app [class*="text-[#35101C]"], [class*="text-[#35101C]"], .shehara-app [class*="text-[#0A3D50]"], [class*="text-[#0A3D50]"] { color: var(--brand-burgundy-deep) !important; }
    .shehara-app [class*="text-[#E0B85C]"], [class*="text-[#E0B85C]"], .shehara-app [class*="text-[#D65A31]"], [class*="text-[#D65A31]"] { color: var(--brand-gold) !important; }
    .shehara-app [class*="border-[#E0B85C]"], [class*="border-[#E0B85C]"], .shehara-app [class*="border-[#D65A31]"], [class*="border-[#D65A31]"] { border-color: color-mix(in srgb, var(--brand-gold) 30%, transparent) !important; }
    .shehara-app [class*="border-[#4A1525]"], [class*="border-[#4A1525]"], .shehara-app [class*="border-[#0E4D64]"], [class*="border-[#0E4D64]"] { border-color: color-mix(in srgb, var(--brand-burgundy) 22%, transparent) !important; }
  `;

  setImportantProperty(
    root,
    "--font-sans",
    `"${branding.custom_font_name || FONT_FAMILY_FALLBACK}", "Tajawal", "Tahoma", sans-serif`,
  );
  setImportantProperty(
    root,
    "--font-display",
    `"${branding.custom_font_name || FONT_FAMILY_FALLBACK}", "Tajawal", "Tahoma", sans-serif`,
  );
}

function applyCustomFont(branding: BrandingSettings) {
  if (typeof document === "undefined") return;
  const id = "shehara-dynamic-font";
  let style = document.getElementById(id) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = id;
    document.head.appendChild(style);
  }

  const url = branding.custom_font_url || DEFAULTS.custom_font_url;
  const family = branding.custom_font_name || FONT_FAMILY_FALLBACK;
  style.textContent = `
    @font-face {
      font-family: "${family.replace(/"/g, "")}";
      src: url("${url.replace(/"/g, "\\\"")}") format("truetype");
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
    }
    .shehara-app,
    .shehara-app *,
    body,
    button,
    input,
    textarea,
    select {
      font-family: "${family.replace(/"/g, "")}", "Tajawal", "Tahoma", sans-serif !important;
    }
  `;
}

function setLink(rel: string, href: string, id: string) {
  if (typeof document === "undefined") return;
  let link = document.querySelector<HTMLLinkElement>(`link#${id}`);
  if (!link && (rel === "manifest" || rel === "icon")) {
    link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  }
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = rel;
    document.head.appendChild(link);
  } else {
    link.id = id;
    link.rel = rel;
  }
  link.href = href;
}

function updateMeta(name: string, content: string) {
  if (typeof document === "undefined") return;
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

let dynamicManifestUrl: string | null = null;

function applyManifest(branding: BrandingSettings) {
  if (typeof document === "undefined") return;
  const manifest = {
    name: branding.seo_name,
    short_name: branding.seo_name.slice(0, 30),
    description: branding.seo_description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    dir: "rtl",
    lang: "ar",
    background_color: branding.theme_colors.light["--background"],
    theme_color: branding.theme_colors.light["--primary"],
    icons: [
      {
        src: branding.pwa_icon_192_url,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: branding.pwa_icon_192_url,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: branding.pwa_icon_512_url,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: branding.pwa_icon_512_url,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  const blob = new Blob([JSON.stringify(manifest)], {
    type: "application/manifest+json",
  });
  const nextUrl = URL.createObjectURL(blob);
  if (dynamicManifestUrl) URL.revokeObjectURL(dynamicManifestUrl);
  dynamicManifestUrl = nextUrl;
  setLink("manifest", nextUrl, "dynamic-manifest");
}

function updateMetaByProperty(property: string, content: string) {
  if (typeof document === "undefined") return;
  let meta = document.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`,
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("property", property);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function updateCanonical(branding: BrandingSettings) {
  if (typeof document === "undefined") return;
  const current = new URL(window.location.href);
  current.hash = "";
  current.search = "";
  setLink("canonical", current.toString(), "dynamic-canonical");
  updateMetaByProperty("og:title", branding.seo_name);
  updateMetaByProperty("og:description", branding.seo_description);
  updateMetaByProperty("og:image", branding.seo_icon_url);
  updateMetaByProperty("og:type", "website");
  updateMetaByProperty("og:locale", "ar_YE");
  updateMetaByProperty("twitter:card", "summary");
  updateMetaByProperty("twitter:title", branding.seo_name);
  updateMetaByProperty("twitter:description", branding.seo_description);
  updateMetaByProperty("twitter:image", branding.seo_icon_url);
}

function applySeo(branding: BrandingSettings) {
  if (typeof document === "undefined") return;
  document.title = branding.seo_name;
  updateMeta("description", branding.seo_description);
  updateMeta("application-name", branding.seo_name);
  updateMeta("apple-mobile-web-app-title", branding.seo_name);
  setLink("icon", branding.seo_icon_url, "dynamic-favicon");
  setLink("apple-touch-icon", branding.pwa_icon_192_url, "dynamic-apple-touch-icon");
  updateCanonical(branding);
}

function applyBackground(branding: BrandingSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;
  if (branding.app_background_url) {
    setImportantProperty(root, "--shehara-app-background-image", `url("${branding.app_background_url}")`);
    setImportantProperty(root, "--shehara-app-background-enabled", "1");
    body.style.setProperty("background-image", `url("${branding.app_background_url}")`, "important");
    body.style.setProperty("background-size", "cover", "important");
    body.style.setProperty("background-attachment", "fixed", "important");
    body.style.setProperty("background-position", "center", "important");
  } else {
    root.style.removeProperty("--shehara-app-background-image");
    root.style.removeProperty("--shehara-app-background-enabled");
    body.style.removeProperty("background-image");
    body.style.removeProperty("background-size");
    body.style.removeProperty("background-attachment");
    body.style.removeProperty("background-position");
  }
}

export function applyBranding(branding: BrandingSettings) {
  applyThemeColors(branding);
  applyCustomFont(branding);
  applySeo(branding);
  applyBackground(branding);
  applyManifest(branding);
}

export function initializeBranding() {
  applyBranding(cachedBranding);
  void fetchBranding().then(applyBranding).catch((error) => {
    console.warn("[branding] initialization failed:", error);
  });
}

if (typeof window !== "undefined") {
  subscribeBranding(applyBranding);
  initializeBranding();

  const observer = new MutationObserver(() => {
    applyThemeColors(cachedBranding);
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}
