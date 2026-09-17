import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  useEffect,
  useState,
} from "react";

import {
  ImagePlus,
  Save,
  Search,
  Smartphone,
  Upload,
} from "lucide-react";

import {
  toast,
} from "sonner";

import {
  AdminCard,
  Field,
  btnCls,
  inputCls,
} from "@/components/admin-ui";

import {
  fetchBranding,
  updateBranding,
  uploadBrandingImage,
  type BrandingSettings,
} from "@/lib/branding";

export const Route =
  createFileRoute(
    "/admin/branding",
  )({
    component:
      AdminBranding,
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
    label: "أيقونة تطبيق PWA",
    description:
      "الأيقونة العامة للتطبيق.",
    accept:
      "image/png,image/webp,image/jpeg",
  },
  {
    key: "pwa_icon_192_url",
    label:
      "أيقونة PWA — 192×192",
    description:
      "أيقونة تثبيت التطبيق للأجهزة.",
    accept:
      "image/png,image/webp",
  },
  {
    key: "pwa_icon_512_url",
    label:
      "أيقونة PWA — 512×512",
    description:
      "الأيقونة عالية الدقة للتطبيق.",
    accept:
      "image/png,image/webp",
  },
  {
    key: "splash_logo_url",
    label:
      "شعار شاشة البداية",
    description:
      "الشعار الظاهر عند بدء فتح التطبيق.",
    accept:
      "image/png,image/webp,image/jpeg",
  },
  {
    key: "splash_background_url",
    label:
      "خلفية شاشة البداية",
    description:
      "الصورة الخلفية لشاشة Splash.",
    accept:
      "image/png,image/webp,image/jpeg",
  },
  {
    key: "header_logo_url",
    label:
      "شعار القائمة العلوية",
    description:
      "الشعار المستخدم في Header.",
    accept:
      "image/png,image/webp,image/jpeg",
  },
  {
    key: "sidebar_logo_url",
    label:
      "شعار القائمة الجانبية",
    description:
      "الشعار المستخدم في القائمة الجانبية.",
    accept:
      "image/png,image/webp,image/jpeg",
  },
  {
    key: "auth_logo_url",
    label:
      "شعار الدخول وإنشاء الحساب",
    description:
      "الشعار المستخدم في واجهة المصادقة.",
    accept:
      "image/png,image/webp,image/jpeg",
  },
  {
    key: "app_background_url",
    label:
      "خلفية التطبيق بالكامل",
    description:
      "الخلفية العامة لكل واجهات المتجر.",
    accept:
      "image/png,image/webp,image/jpeg",
  },
  {
    key: "seo_icon_url",
    label:
      "أيقونة الموقع لمحركات البحث",
    description:
      "الأيقونة المستخدمة كـ favicon وبيانات الموقع.",
    accept:
      "image/png,image/webp",
  },
];

function AdminBranding() {
  const [
    branding,
    setBranding,
  ] =
    useState<BrandingSettings | null>(
      null,
    );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void fetchBranding()
      .then(setBranding)
      .catch((error) => {
        console.error(
          "[AdminBranding]",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تحميل إعدادات الهوية.",
        );
      });
  }, []);

  function setValue<
    K extends keyof BrandingSettings,
  >(
    key: K,
    value: BrandingSettings[K],
  ) {
    setBranding(
      (current) =>
        current
          ? {
              ...current,
              [key]: value,
            }
          : current,
    );
  }

  async function handleUpload(
    key: ImageSettingKey,
    file: File | undefined,
  ) {
    if (!file || !branding) {
      return;
    }

    setUploading(key);

    try {
      const url =
        await uploadBrandingImage(
          file,
          key,
        );

      setValue(
        key,
        url,
      );

      toast.success(
        "تم رفع الصورة بنجاح. اضغط حفظ لتثبيت التغيير.",
      );
    } catch (error) {
      console.error(
        "[AdminBranding] upload failed",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر رفع الصورة.",
      );
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (!branding) {
      return;
    }

    if (uploading) {
      toast.warning(
        "انتظر حتى يكتمل رفع الصورة الحالية.",
      );
      return;
    }

    setSaving(true);

    try {
      const saved =
        await updateBranding(
          branding,
        );

      setBranding(saved);

      toast.success(
        "تم حفظ هوية التطبيق والموقع بنجاح.",
      );
    } catch (error) {
      console.error(
        "[AdminBranding] save failed",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حفظ إعدادات الهوية.",
      );
    } finally {
      setSaving(false);
    }
  }

  const busy =
    saving || Boolean(uploading);

  if (!branding) {
    return (
      <div
        dir="rtl"
        className="
          rounded-2xl
          border
          border-border
          bg-card
          p-6
          text-center
          text-xs
          text-muted-foreground
        "
      >
        جارٍ تحميل إعدادات الهوية...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="space-y-5"
    >
      <AdminCard
        title="هوية التطبيق والموقع"
      >
        <div
          className="
            mb-5
            rounded-2xl
            border
            border-[#0E4D64]/10
            bg-[#F4F7F8]
            p-4
          "
        >
          <div
            className="
              flex
              items-start
              gap-3
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-[#0E4D64]
                text-white
              "
            >
              <Smartphone className="h-5 w-5" />
            </div>

            <div>
              <h2
                className="
                  text-sm
                  font-black
                  text-[#0E4D64]
                "
              >
                التحكم المركزي بالهوية
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  leading-6
                  text-muted-foreground
                "
              >
                غيّر الصور المستخدمة في
                التطبيق والموقع من هنا دون
                تعديل ملفات المشروع.
              </p>
            </div>
          </div>
        </div>

        <div
          className="
            grid
            gap-4
            md:grid-cols-2
          "
        >
          {IMAGE_FIELDS.map(
            (field) => {
              const value =
                branding[field.key];

              const isUploading =
                uploading ===
                field.key;

              return (
                <div
                  key={field.key}
                  className="
                    rounded-2xl
                    border
                    border-border
                    bg-background
                    p-4
                  "
                >
                  <div
                    className="
                      mb-3
                      flex
                      items-start
                      justify-between
                      gap-3
                    "
                  >
                    <div>
                      <h3
                        className="
                          text-xs
                          font-bold
                        "
                      >
                        {field.label}
                      </h3>

                      <p
                        className="
                          mt-1
                          text-[10px]
                          leading-5
                          text-muted-foreground
                        "
                      >
                        {field.description}
                      </p>
                    </div>

                    <ImagePlus
                      className="
                        h-4
                        w-4
                        shrink-0
                        text-[#D65A31]
                      "
                    />
                  </div>

                  <div
                    className="
                      mb-3
                      flex
                      min-h-28
                      items-center
                      justify-center
                      overflow-hidden
                      rounded-xl
                      border
                      border-dashed
                      border-border
                      bg-secondary
                    "
                  >
                    {value ? (
                      <img
                        src={value}
                        alt={
                          field.label
                        }
                        className="
                          max-h-32
                          max-w-full
                          object-contain
                        "
                      />
                    ) : (
                      <span
                        className="
                          text-[10px]
                          text-muted-foreground
                        "
                      >
                        لا توجد صورة
                      </span>
                    )}
                  </div>

                  <label
                    className={`
                      flex
                      cursor-pointer
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-border
                      bg-secondary
                      px-3
                      py-2.5
                      text-xs
                      font-semibold
                      transition-colors
                      hover:bg-accent
                      ${
                        isUploading
                          ? "pointer-events-none opacity-60"
                          : ""
                      }
                    `}
                  >
                    <Upload className="h-4 w-4" />

                    {isUploading
                      ? "جارٍ الرفع..."
                      : "رفع صورة جديدة"}

                    <input
                      type="file"
                      accept={
                        field.accept
                      }
                      className="hidden"
                      disabled={
                        saving
                      }
                      onChange={(
                        event,
                      ) => {
                        const file =
                          event
                            .currentTarget
                            .files?.[0];

                        void handleUpload(
                          field.key,
                          file,
                        );

                        event.currentTarget.value =
                          "";
                      }}
                    />
                  </label>

                  <input
                    dir="ltr"
                    className={`
                      ${inputCls}
                      mt-2
                      text-[10px]
                    `}
                    value={value}
                    disabled={busy}
                    onChange={(
                      event,
                    ) =>
                      setValue(
                        field.key,
                        event.target
                          .value,
                      )
                    }
                    placeholder="رابط الصورة"
                  />
                </div>
              );
            },
          )}
        </div>

        <button
          type="button"
          className={`
            ${btnCls}
            mt-5
            inline-flex
            items-center
            gap-2
          `}
          onClick={() => {
            void save();
          }}
          disabled={busy}
        >
          <Save className="h-4 w-4" />

          {saving
            ? "جارٍ الحفظ..."
            : "حفظ جميع إعدادات الهوية"}
        </button>
      </AdminCard>

      <AdminCard
        title="بيانات محركات البحث"
      >
        <div
          className="
            mb-5
            flex
            items-start
            gap-3
            rounded-2xl
            border
            border-[#0E4D64]/10
            bg-[#F4F7F8]
            p-4
          "
        >
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-[#0E4D64]
              text-white
            "
          >
            <Search className="h-5 w-5" />
          </div>

          <div>
            <h3
              className="
                text-sm
                font-black
                text-[#0E4D64]
              "
            >
              SEO وبيانات ظهور الموقع
            </h3>

            <p
              className="
                mt-1
                text-xs
                leading-6
                text-muted-foreground
              "
            >
              هذه البيانات تتحكم في اسم
              الموقع ووصفه والأيقونة التي
              تستخدمها صفحات الموقع.
            </p>
          </div>
        </div>

        <div
          className="
            grid
            gap-3
            md:grid-cols-2
          "
        >
          <Field
            label="الاسم الذي يظهر في محركات البحث"
          >
            <input
              className={inputCls}
              value={
                branding.seo_name
              }
              maxLength={150}
              disabled={saving}
              onChange={(event) =>
                setValue(
                  "seo_name",
                  event.target.value,
                )
              }
            />
          </Field>

          <Field
            label="وصف الموقع لمحركات البحث"
          >
            <textarea
              className={`
                ${inputCls}
                min-h-28
                resize-y
              `}
              value={
                branding.seo_description
              }
              maxLength={500}
              disabled={saving}
              onChange={(event) =>
                setValue(
                  "seo_description",
                  event.target.value,
                )
              }
            />
          </Field>

          <Field
            label="أيقونة الموقع"
          >
            <input
              dir="ltr"
              className={inputCls}
              value={
                branding.seo_icon_url
              }
              disabled={saving}
              onChange={(event) =>
                setValue(
                  "seo_icon_url",
                  event.target.value,
                )
              }
            />
          </Field>
        </div>

        <button
          type="button"
          className={`
            ${btnCls}
            mt-4
            inline-flex
            items-center
            gap-2
          `}
          onClick={() => {
            void save();
          }}
          disabled={busy}
        >
          <Save className="h-4 w-4" />

          {saving
            ? "جارٍ الحفظ..."
            : "حفظ بيانات البحث"}
        </button>
      </AdminCard>
    </div>
  );
}
