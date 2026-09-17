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
  value: Partial<BrandingSettings> | null | undefined,
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
    listener(cachedBranding);
  }
}

export function getBranding(): BrandingSettings {
  return cachedBranding;
}

export function subscribeBranding(
  listener: (branding: BrandingSettings) => void,
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
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
      data as Partial<BrandingSettings> | null,
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
      pwa_icon_url: next.pwa_icon_url,
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
    throw error;
  }

  cachedBranding = normalize(
    data as Partial<BrandingSettings> | null,
  );

  notify();

  return cachedBranding;
}

export async function uploadBrandingImage(
  file: File,
  key: keyof BrandingSettings,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error(
      "الملف المختار ليس صورة.",
    );
  }

  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      "حجم الصورة يجب ألا يتجاوز 10 ميجابايت.",
    );
  }

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") ||
    "png";

  const path =
    `site/${key}-${crypto.randomUUID()}.${extension}`;

  const {
    error,
  } = await supabase.storage
    .from("branding")
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

  if (error) {
    throw error;
  }

  const {
    data,
  } = supabase.storage
    .from("branding")
    .getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error(
      "تعذر إنشاء رابط الصورة.",
    );
  }

  return data.publicUrl;
}

function setLink(
  rel: string,
  href: string,
  id: string,
) {
  if (
    typeof document === "undefined"
  ) {
    return;
  }

  let link =
    document.querySelector<HTMLLinkElement>(
      `link#${id}`,
    );

  if (!link) {
    link =
      document.createElement("link");

    link.id = id;
    link.rel = rel;

    document.head.appendChild(link);
  }

  link.href = href;
}

function updateMeta(
  name: string,
  content: string,
) {
  if (
    typeof document === "undefined"
  ) {
    return;
  }

  let meta =
    document.querySelector<HTMLMetaElement>(
      `meta[name="${name}"]`,
    );

  if (!meta) {
    meta =
      document.createElement("meta");

    meta.name = name;

    document.head.appendChild(meta);
  }

  meta.content = content;
}

function applySeo(
  branding: BrandingSettings,
) {
  if (
    typeof document === "undefined"
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
    typeof document === "undefined"
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
  applyBranding(cachedBranding);

  void fetchBranding().then(
    applyBranding,
  );
}

if (
  typeof window !== "undefined"
) {
  subscribeBranding(
    applyBranding,
  );

  initializeBranding();
}
