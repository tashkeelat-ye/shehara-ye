import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media";
import {
  fetchSettings,
  type Banner4to1,
} from "@/lib/store";

import {
  AdminCard,
  Field,
  btnCls,
  btnGhostCls,
  inputCls,
} from "@/components/admin-ui";

type DraftBanner = Banner4to1 & {
  localPreview?: string;
  uploading?: boolean;
};

export function Banners4to1Manager() {
  const [
    banners,
    setBanners,
  ] = useState<DraftBanner[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const fileRefs =
    useRef<
      Record<
        number,
        HTMLInputElement | null
      >
    >({});

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);

    try {
      const settings =
        await fetchSettings();

      setBanners(
        (
          settings?.custom_banners_4to1 ??
          []
        ).map((banner) => ({
          image:
            banner.image ?? "",
          link:
            banner.link ?? "",
          title:
            banner.title ?? "",
        })),
      );
    } catch (error) {
      console.error(
        "[Banners4to1Manager] load:",
        error,
      );

      toast.error(
        "تعذر تحميل شرائح 4:1.",
      );
    } finally {
      setLoading(false);
    }
  }

  function addBanner() {
    setBanners((current) => [
      ...current,
      {
        image: "",
        link: "",
        title: "",
      },
    ]);
  }

  function removeBanner(
    index: number,
  ) {
    setBanners((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index,
      ),
    );
  }

  function updateBanner(
    index: number,
    patch: Partial<DraftBanner>,
  ) {
    setBanners((current) =>
      current.map(
        (banner, itemIndex) =>
          itemIndex === index
            ? {
                ...banner,
                ...patch,
              }
            : banner,
      ),
    );
  }

  async function handleUpload(
    index: number,
    file: File,
  ) {
    if (
      !file.type.startsWith(
        "image/",
      )
    ) {
      toast.error(
        "يرجى اختيار صورة فقط.",
      );
      return;
    }

    const preview =
      URL.createObjectURL(file);

    updateBanner(index, {
      localPreview: preview,
      uploading: true,
    });

    try {
      const url =
        await uploadMedia(
          "banners",
          file,
          "home/4to1",
        );

      updateBanner(index, {
        image: url,
        localPreview: undefined,
        uploading: false,
      });

      toast.success(
        "تم رفع صورة الشريحة بنجاح.",
      );
    } catch (error) {
      updateBanner(index, {
        localPreview: undefined,
        uploading: false,
      });

      URL.revokeObjectURL(
        preview,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر رفع الصورة.",
      );
    }
  }

  async function save() {
    const invalid =
      banners.some(
        (banner) =>
          !banner.image.trim(),
      );

    if (invalid) {
      toast.error(
        "يجب رفع صورة لكل شريحة قبل الحفظ.",
      );
      return;
    }

    if (
      banners.some(
        (banner) =>
          banner.uploading,
      )
    ) {
      toast.error(
        "انتظر اكتمال رفع الصور.",
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: existing,
        error: findError,
      } = await supabase
        .from("site_settings")
        .select("id")
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      const payload =
        banners.map(
          ({
            image,
            link,
            title,
          }) => ({
            image:
              image.trim(),
            link:
              link?.trim() ?? "",
            title:
              title?.trim() ?? "",
          }),
        );

      if (existing) {
        const { error } =
          await supabase
            .from(
              "site_settings",
            )
            .update({
              custom_banners_4to1:
                payload,
            })
            .eq(
              "id",
              existing.id,
            );

        if (error) {
          throw error;
        }
      } else {
        const { error } =
          await supabase
            .from(
              "site_settings",
            )
            .insert({
              custom_banners_4to1:
                payload,
            });

        if (error) {
          throw error;
        }
      }

      toast.success(
        "تم حفظ شرائح 4:1 بنجاح.",
      );
    } catch (error) {
      console.error(
        "[Banners4to1Manager] save:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حفظ الشرائح.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground">
        جارٍ تحميل شرائح 4:1...
      </div>
    );
  }

  return (
    <AdminCard
      title="إدارة شرائح العروض والإعلانات (4:1)"
      action={
        <button
          type="button"
          className={btnCls}
          onClick={() =>
            void save()
          }
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}

          حفظ التغييرات
        </button>
      }
    >
      <p className="mb-5 text-xs leading-6 text-muted-foreground">
        ارفع صور الشرائح مباشرة من جهازك. ستظهر الصور في الواجهة الرئيسية بنسبة 4:1.
      </p>

      <div className="space-y-4">
        {banners.map(
          (
            banner,
            index,
          ) => {
            const preview =
              banner.localPreview ||
              banner.image;

            return (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-border/70 bg-secondary/20"
              >
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <span className="text-xs font-black">
                    الشريحة #
                    {(
                      index + 1
                    ).toLocaleString(
                      "ar-EG",
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      removeBanner(
                        index,
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-destructive/30 text-destructive"
                    aria-label="حذف الشريحة"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4">
                  <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-muted">
                    <div className="aspect-[4/1]">
                      {preview ? (
                        <img
                          src={preview}
                          alt={
                            banner.title ||
                            "معاينة الشريحة"
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            fileRefs.current[
                              index
                            ]?.click()
                          }
                          className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground"
                        >
                          <ImagePlus className="h-8 w-8" />
                          <span className="text-xs font-bold">
                            اختر صورة 4:1
                          </span>
                        </button>
                      )}

                      {banner.uploading ? (
                        <div className="absolute inset-0 grid place-items-center bg-background/70">
                          <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="عنوان الشريحة">
                      <input
                        className={inputCls}
                        value={
                          banner.title ||
                          ""
                        }
                        maxLength={120}
                        placeholder="عنوان اختياري"
                        onChange={(
                          event,
                        ) =>
                          updateBanner(
                            index,
                            {
                              title:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                      />
                    </Field>

                    <Field label="رابط الوجهة">
                      <input
                        dir="ltr"
                        className={inputCls}
                        value={
                          banner.link ||
                          ""
                        }
                        maxLength={300}
                        placeholder="/products"
                        onChange={(
                          event,
                        ) =>
                          updateBanner(
                            index,
                            {
                              link:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                      />
                    </Field>

                    <Field label="الصورة">
                      <input
                        ref={(element) => {
                          fileRefs.current[
                            index
                          ] =
                            element;
                        }}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        className="hidden"
                        onChange={(
                          event,
                        ) => {
                          const file =
                            event
                              .target
                              .files?.[0];

                          event.target.value =
                            "";

                          if (
                            file
                          ) {
                            void handleUpload(
                              index,
                              file,
                            );
                          }
                        }}
                      />

                      <button
                        type="button"
                        disabled={
                          banner.uploading
                        }
                        onClick={() =>
                          fileRefs.current[
                            index
                          ]?.click()
                        }
                        className={`${btnGhostCls} w-full`}
                      >
                        {banner.uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}

                        {banner.image
                          ? "استبدال الصورة"
                          : "رفع الصورة"}
                      </button>
                    </Field>
                  </div>

                  {banner.image ? (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-primary/5 px-3 py-2">
                      <span className="truncate text-[10px] text-muted-foreground">
                        تم رفع الصورة بنجاح
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          updateBanner(
                            index,
                            {
                              image: "",
                              localPreview:
                                undefined,
                            },
                          )
                        }
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                        إزالة
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          },
        )}

        <button
          type="button"
          onClick={addBanner}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-xs font-bold text-primary"
        >
          <Plus className="h-4 w-4" />
          إضافة شريحة جديدة
        </button>
      </div>
    </AdminCard>
  );
}

export default Banners4to1Manager;
