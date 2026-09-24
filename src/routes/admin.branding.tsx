import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ImagePlus,
  Palette,
  Save,
  Search,
  Smartphone,
  Type,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  AdminCard,
  Field,
  btnCls,
  inputCls,
} from "@/components/admin-ui";
import {
  applyBranding,
  fetchBranding,
  getExpectedImageName,
  type BrandingSettings,
  type ThemeColorKey,
  type ThemeMode,
  updateBranding,
  uploadBrandingImage,
  uploadCustomFont,
} from "@/lib/branding";

export const Route = createFileRoute("/admin/branding")({
  component: AdminBranding,
});

type ImageSettingKey =
  | "pwa_icon_url"
  | "pwa_icon_192_url"
  | "pwa_icon_512_url"
  | "splash_logo_url"
  | "splash_background_url"
  | "header_logo_url"
  | "sidebar_logo_url"
  | "auth_logo_url"
  | "app_background_url"
  | "seo_icon_url";

const IMAGE_FIELDS: {
  key: ImageSettingKey;
  label: string;
  description: string;
  accept: string;
}[] = [
  {
    key: "pwa_icon_url",
    label: "أيقونة التطبيق العامة",
    description: "الأيقونة العامة التي تعتمدها الهوية الرقمية للتطبيق.",
    accept: "image/png",
  },
  {
    key: "pwa_icon_192_url",
    label: "أيقونة PWA — 192×192",
    description: "أيقونة تثبيت التطبيق للأجهزة التي تعتمد مقاس 192.",
    accept: "image/png",
  },
  {
    key: "pwa_icon_512_url",
    label: "أيقونة PWA — 512×512",
    description: "الأيقونة عالية الدقة للتثبيت والشاشات الكبيرة.",
    accept: "image/png",
  },
  {
    key: "splash_logo_url",
    label: "شعار شاشة البداية",
    description: "الشعار الذي يظهر داخل شاشة Splash عند بدء التطبيق.",
    accept: "image/png",
  },
  {
    key: "splash_background_url",
    label: "خلفية شاشة البداية",
    description: "الخلفية المستخدمة في شاشة Splash.",
    accept: "image/png,image/jpeg,image/webp",
  },
  {
    key: "header_logo_url",
    label: "شعار القائمة العلوية",
    description: "الشعار الذي يظهر في Header للموقع والتطبيق.",
    accept: "image/png",
  },
  {
    key: "sidebar_logo_url",
    label: "شعار القائمة الجانبية",
    description: "الشعار المستخدم في القائمة الجانبية.",
    accept: "image/png",
  },
  {
    key: "auth_logo_url",
    label: "شعار الدخول والتسجيل",
    description: "الشعار المستخدم في صفحات تسجيل الدخول والحساب.",
    accept: "image/png",
  },
  {
    key: "app_background_url",
    label: "خلفية التطبيق بالكامل",
    description: "خلفية عامة قابلة للتطبيق على واجهات المتجر.",
    accept: "image/png,image/jpeg,image/webp",
  },
  {
    key: "seo_icon_url",
    label: "أيقونة الموقع لمحركات البحث",
    description: "الأيقونة المستخدمة في favicon وبيانات الموقع.",
    accept: "image/png",
  },
];

const COLOR_LABELS: Record<ThemeColorKey, string> = {
  "--brand-burgundy": "اللون الرئيسي للهوية",
  "--brand-burgundy-deep": "اللون الرئيسي الداكن",
  "--brand-burgundy-soft": "اللون الرئيسي الناعم",
  "--brand-burgundy-light": "اللون الرئيسي الفاتح",
  "--brand-gold": "اللون الثانوي/الذهبي",
  "--brand-gold-deep": "اللون الثانوي الداكن",
  "--brand-gold-soft": "اللون الثانوي الناعم",
  "--brand-gold-pale": "الخلفية الثانوية الفاتحة",
  "--brand-cream": "الكريمي الأساسي",
  "--brand-paper": "سطح الورق",
  "--brand-paper-deep": "سطح الورق الداكن",
  "--background": "خلفية التطبيق",
  "--foreground": "النص الأساسي",
  "--card": "خلفية البطاقات",
  "--card-foreground": "نص البطاقات",
  "--popover": "خلفية النوافذ المنبثقة",
  "--popover-foreground": "نص النوافذ المنبثقة",
  "--primary": "الأزرار والعناصر الرئيسية",
  "--primary-foreground": "نص الأزرار الرئيسية",
  "--secondary": "الأزرار/الخلفيات الثانوية",
  "--secondary-foreground": "نص العناصر الثانوية",
  "--muted": "الخلفيات الهادئة",
  "--muted-foreground": "النصوص الثانوية",
  "--accent": "لون التمييز",
  "--accent-foreground": "نص التمييز",
  "--accent-solid": "لون التمييز الصلب",
  "--accent-solid-foreground": "نص التمييز الصلب",
  "--brand-soft": "لون الهوية الناعم",
  "--destructive": "الأخطاء والحذف",
  "--destructive-foreground": "نص الأخطاء والحذف",
  "--border": "الحدود",
  "--input": "حدود حقول الإدخال",
  "--ring": "إطار التركيز",
  "--chart-1": "الرسم البياني 1",
  "--chart-2": "الرسم البياني 2",
  "--chart-3": "الرسم البياني 3",
  "--chart-4": "الرسم البياني 4",
  "--chart-5": "الرسم البياني 5",
  "--sidebar": "خلفية القائمة الجانبية",
  "--sidebar-foreground": "نص القائمة الجانبية",
  "--sidebar-primary": "العنصر الرئيسي للقائمة",
  "--sidebar-primary-foreground": "نص العنصر الرئيسي للقائمة",
  "--sidebar-accent": "تمييز القائمة الجانبية",
  "--sidebar-accent-foreground": "نص تمييز القائمة",
  "--sidebar-border": "حدود القائمة الجانبية",
  "--sidebar-ring": "إطار التركيز في القائمة",
};

const COLOR_GROUPS: { title: string; keys: ThemeColorKey[] }[] = [
  {
    title: "ألوان الهوية الأساسية",
    keys: [
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
    ],
  },
  {
    title: "ألوان واجهة التطبيق",
    keys: [
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
    ],
  },
  {
    title: "الحالة والحدود والقوائم",
    keys: [
      "--destructive",
      "--destructive-foreground",
      "--border",
      "--input",
      "--ring",
      "--sidebar",
      "--sidebar-foreground",
      "--sidebar-primary",
      "--sidebar-primary-foreground",
      "--sidebar-accent",
      "--sidebar-accent-foreground",
      "--sidebar-border",
      "--sidebar-ring",
    ],
  },
  {
    title: "ألوان الرسوم البيانية",
    keys: ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"],
  },
];

function cloneBranding(value: BrandingSettings): BrandingSettings {
  return {
    ...value,
    theme_colors: {
      light: { ...value.theme_colors.light },
      dark: { ...value.theme_colors.dark },
    },
  };
}

function isHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

async function validateImageDimensions(
  file: File,
  key: ImageSettingKey,
): Promise<void> {
  const required =
    key === "pwa_icon_url" || key === "pwa_icon_192_url"
      ? [192, 192]
      : key === "pwa_icon_512_url"
        ? [512, 512]
        : null;

  if (!required) return;

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    try {
      if (bitmap.width !== required[0] || bitmap.height !== required[1]) {
        throw new Error(
          `تم رفض الصورة. يجب أن تكون أبعادها ${required[0]}×${required[1]} بكسل بالضبط.`,
        );
      }
    } finally {
      bitmap.close();
    }
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("تعذر قراءة أبعاد الصورة."));
      image.src = objectUrl;
    });
    if (dimensions.width !== required[0] || dimensions.height !== required[1]) {
      throw new Error(
        `تم رفض الصورة. يجب أن تكون أبعادها ${required[0]}×${required[1]} بكسل بالضبط.`,
      );
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function AdminBranding() {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [mode, setMode] = useState<ThemeMode>("light");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [fontUploading, setFontUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    void fetchBranding()
      .then((value) => {
        if (mounted) {
          setBranding(cloneBranding(value));
          applyBranding(value);
        }
      })
      .catch((error) => {
        console.error("[AdminBranding]", error);
        toast.error(error instanceof Error ? error.message : "تعذر تحميل إعدادات الهوية.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeColors = useMemo<Record<ThemeColorKey, string>>(
    () => branding?.theme_colors[mode] ?? ({} as Record<ThemeColorKey, string>),
    [branding, mode],
  );

  function setColor(key: ThemeColorKey, value: string) {
    if (!branding) return;
    const next = cloneBranding(branding);
    next.theme_colors[mode][key] = value;
    setBranding(next);
    applyBranding(next);
  }

  async function handleImageUpload(key: ImageSettingKey, file: File | undefined) {
    if (!file || !branding) return;
    setUploading(key);
    try {
      await validateImageDimensions(file, key);
      const url = await uploadBrandingImage(file, key);
      const saved = await updateBranding({ [key]: url } as Partial<BrandingSettings>);
      setBranding(cloneBranding(saved));
      toast.success("تم رفع الصورة وتثبيتها فعلياً في الهوية.");
    } catch (error) {
      console.error("[AdminBranding] image upload", error);
      toast.error(error instanceof Error ? error.message : "تعذر رفع الصورة.");
    } finally {
      setUploading(null);
    }
  }

  async function handleFontUpload(file: File | undefined) {
    if (!file) return;
    setFontUploading(true);
    try {
      const saved = await uploadCustomFont(file);
      setBranding(cloneBranding(saved));
      applyBranding(saved);
      toast.success("تم رفع الخط وتطبيقه على واجهات التطبيق والموقع.");
    } catch (error) {
      console.error("[AdminBranding] font upload", error);
      toast.error(error instanceof Error ? error.message : "تعذر رفع الخط.");
    } finally {
      setFontUploading(false);
    }
  }

  async function saveAll() {
    if (!branding) return;

    const invalid = (Object.entries(branding.theme_colors) as Array<[ThemeMode, Record<ThemeColorKey, string>]>).flatMap(
      ([theme, colors]) =>
        Object.entries(colors)
          .filter(([, value]) => !isHex(String(value)))
          .map(([key]) => `${theme}:${key}`),
    );

    if (invalid.length) {
      toast.error("يوجد لون غير صالح. استخدم HEX بصيغة #RRGGBB قبل الحفظ.");
      return;
    }

    setSaving(true);
    try {
      const saved = await updateBranding(branding);
      setBranding(cloneBranding(saved));
      applyBranding(saved);
      toast.success("تم حفظ الهوية والألوان وإعدادات محركات البحث بنجاح.");
    } catch (error) {
      console.error("[AdminBranding] save", error);
      toast.error(error instanceof Error ? error.message : "تعذر حفظ الهوية.");
    } finally {
      setSaving(false);
    }
  }

  if (!branding) {
    return (
      <div dir="rtl" className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        جارٍ تحميل إعدادات الهوية...
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-5 pb-10">
      <AdminCard title="هوية التطبيق والموقع — تحكم حقيقي متصل بقاعدة البيانات">
        <div className="mb-5 rounded-2xl border border-primary/10 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-primary">التحكم المركزي بالهوية</h2>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                كل تغيير في الصور أو الخط أو الألوان يُحفظ في Supabase ويُطبَّق على الواجهة مباشرة، مع التحقق من الملفات قبل قبولها.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {IMAGE_FIELDS.map((field) => {
            const value = branding[field.key];
            const busy = uploading === field.key;
            const expected = getExpectedImageName(field.key);
            return (
              <div key={field.key} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-black">{field.label}</h3>
                    <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{field.description}</p>
                  </div>
                  <ImagePlus className="h-4 w-4 shrink-0 text-primary" />
                </div>

                <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3">
                  <div className="flex min-h-28 items-center justify-center overflow-hidden rounded-lg bg-card">
                    {value ? (
                      <img src={value} alt={field.label} className="max-h-36 max-w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">لا توجد صورة</span>
                    )}
                  </div>

                  <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[10px] leading-5 text-amber-800 dark:text-amber-200">
                    <strong>اسم الملف المطلوب:</strong> <span dir="ltr">{expected}</span>
                    <br />
                    إذا كان الاسم مختلفاً فسيتم رفض الملف ولن يتم رفعه أو حفظه.
                  </div>

                  <label className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-bold hover:bg-accent ${busy ? "pointer-events-none opacity-60" : ""}`}>
                    <Upload className="h-4 w-4" />
                    {busy ? "جارٍ الرفع والحفظ..." : "رفع واستبدال الصورة فعلياً"}
                    <input
                      type="file"
                      accept={field.accept}
                      className="hidden"
                      disabled={busy || saving}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        void handleImageUpload(field.key, file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                <input
                  dir="ltr"
                  className={`${inputCls} mt-2 text-[10px]`}
                  value={value}
                  disabled
                  readOnly
                />
              </div>
            );
          })}
        </div>
      </AdminCard>

      <AdminCard title="الخط الرئيسي للتطبيق والموقع">
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Type className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-black">رفع خط TTF وتطبيقه على كامل الواجهة</h3>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                يُقبل ملف TTF فقط. بعد الرفع يتم تخزينه في Supabase Storage وتطبيقه عبر @font-face على النصوص والأزرار والحقول والقوائم.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="اسم ملف الخط الحالي">
            <input className={inputCls} dir="ltr" value={branding.custom_font_original_name} readOnly disabled />
          </Field>
          <Field label="اسم عائلة الخط داخل التطبيق">
            <input className={inputCls} dir="ltr" value={branding.custom_font_name} readOnly disabled />
          </Field>
        </div>

        <label className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-xs font-bold hover:bg-accent ${fontUploading ? "pointer-events-none opacity-60" : ""}`}>
          <Upload className="h-4 w-4" />
          {fontUploading ? "جارٍ رفع الخط وتطبيقه..." : "رفع ملف خط TTF جديد"}
          <input
            type="file"
            accept=".ttf,font/ttf,application/x-font-ttf"
            className="hidden"
            disabled={fontUploading || saving}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              void handleFontUpload(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </AdminCard>

      <AdminCard title="ألوان وهوية التطبيق بالكامل">
        <div className="mb-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Palette className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-black">تعديل اللون بالكود مع معاينة فورية</h3>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                عدّل أي متغير من المتغيرات الأساسية، وستتغير الأزرار والنصوص والخلفيات والبطاقات والحدود والقوائم والرسوم البيانية فوراً. الحفظ يثبت القيم في قاعدة البيانات.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
          {(["light", "dark"] as ThemeMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded-xl px-3 py-2.5 text-xs font-black transition ${mode === item ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              {item === "light" ? "الوضع الفاتح" : "الوضع الليلي"}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {COLOR_GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-3 text-xs font-black">{group.title}</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.keys.map((key) => {
                  const value = activeColors[key] || "#000000";
                  const valid = isHex(value);
                  return (
                    <div key={key} className="rounded-xl border border-border bg-background p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-5 w-5 shrink-0 rounded-md border border-border" style={{ backgroundColor: valid ? value : "transparent" }} />
                        <p className="min-w-0 flex-1 truncate text-[10px] font-bold">{COLOR_LABELS[key]}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={valid ? value : "#000000"}
                          onChange={(event) => setColor(key, event.target.value.toUpperCase())}
                          className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-card p-1"
                          aria-label={COLOR_LABELS[key]}
                        />
                        <input
                          dir="ltr"
                          value={value}
                          onChange={(event) => setColor(key, event.target.value.toUpperCase())}
                          className={`${inputCls} flex-1 font-mono text-[11px]`}
                          aria-label={`كود ${COLOR_LABELS[key]}`}
                        />
                      </div>
                      {!valid ? <p className="mt-1 text-[9px] text-destructive">استخدم كود HEX بصيغة #RRGGBB.</p> : null}
                      <p dir="ltr" className="mt-1 truncate text-[8px] text-muted-foreground">{key}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-secondary/30 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-card p-4">
              <p className="text-[10px] text-muted-foreground">الأزرار الرئيسية</p>
              <button type="button" className="mt-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground">
                معاينة الزر
              </button>
            </div>
            <div className="rounded-xl bg-card p-4">
              <p className="text-[10px] text-muted-foreground">الخلفية والبطاقات</p>
              <div className="mt-2 rounded-xl border border-border bg-background p-3 text-xs font-bold">معاينة بطاقة</div>
            </div>
            <div className="rounded-xl bg-card p-4">
              <p className="text-[10px] text-muted-foreground">النصوص</p>
              <p className="mt-2 text-sm font-black text-foreground">نص أساسي</p>
              <p className="mt-1 text-[10px] text-muted-foreground">نص ثانوي</p>
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="بيانات محركات البحث">
        <div className="mb-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Search className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-black">SEO وبيانات ظهور الموقع</h3>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                تُحفظ البيانات في site_settings وتُطبق فوراً على عنوان الصفحة والوصف وfavicon وبيانات PWA.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="اسم الموقع في محركات البحث">
            <input className={inputCls} value={branding.seo_name} maxLength={150} onChange={(e) => setBranding({ ...branding, seo_name: e.target.value })} />
          </Field>
          <Field label="وصف الموقع لمحركات البحث">
            <textarea className={`${inputCls} min-h-24 resize-y`} value={branding.seo_description} maxLength={500} onChange={(e) => setBranding({ ...branding, seo_description: e.target.value })} />
          </Field>
          <Field label="رابط أيقونة SEO الحالية">
            <input dir="ltr" className={inputCls} value={branding.seo_icon_url} readOnly disabled />
          </Field>
        </div>
      </AdminCard>

      <button
        type="button"
        className={`${btnCls} sticky bottom-3 z-20 inline-flex w-full items-center justify-center gap-2 py-3 shadow-lg`}
        disabled={saving || Boolean(uploading) || fontUploading}
        onClick={() => void saveAll()}
      >
        {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Save className="h-4 w-4" />}
        {saving ? "جارٍ الحفظ..." : "حفظ الهوية والألوان والإعدادات"}
        {!saving ? <Check className="h-4 w-4" /> : null}
      </button>
    </div>
  );
}
