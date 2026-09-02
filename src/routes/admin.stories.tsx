import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CirclePlus,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  AdminCard,
  Field,
  btnCls,
  btnGhostCls,
  inputCls,
} from "@/components/admin-ui";

export const Route = createFileRoute("/admin/stories")({
  component: AdminStories,
});

const storySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "عنوان القصة مطلوب")
    .max(120, "عنوان القصة طويل جداً"),

  link_url: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        value.startsWith("/") ||
        /^https?:\/\/.+/i.test(value),
      "أدخل رابطاً صحيحاً",
    ),

  duration: z.coerce
    .number()
    .int()
    .min(1, "المدة يجب أن تكون ثانية واحدة على الأقل")
    .max(60, "المدة لا يمكن أن تتجاوز 60 ثانية"),

  sort_order: z.coerce
    .number()
    .int()
    .min(0, "الترتيب لا يمكن أن يكون سالباً"),
});

type StoryFormValues = z.infer<typeof storySchema>;

type StoryRow = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  duration: number;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

const DEFAULT_VALUES: StoryFormValues = {
  title: "",
  link_url: "",
  duration: 5,
  sort_order: 0,
};

/**
 * جدول stories أُضيف إلى قاعدة البيانات بعد آخر نسخة
 * مولدة من Supabase types.ts، لذلك يتم عزله هنا
 * بدلاً من تحويل كامل عميل Supabase إلى any.
 *
 * عند إعادة توليد types.ts من Supabase يمكن إزالة
 * هذا النوع واستخدام supabase.from("stories") مباشرة.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storiesTable = () => (supabase as any).from("stories");

function AdminStories() {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<StoryRow | null>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<StoryFormValues>({
    resolver: zodResolver(storySchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const loadStories = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await storiesTable()
        .select(
          [
            "id",
            "title",
            "image_url",
            "link_url",
            "duration",
            "sort_order",
            "is_active",
            "starts_at",
            "expires_at",
            "created_at",
          ].join(","),
        )
        .order("sort_order", {
          ascending: true,
        })
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("Stories loading error:", error);
        toast.error("تعذر تحميل القصص: " + error.message);
        setStories([]);
        return;
      }

      setStories((data ?? []) as StoryRow[]);
    } catch (error) {
      console.error("Stories loading error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تحميل القصص",
      );

      setStories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearSelectedImage() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setSelectedImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openAddForm() {
    setEditingStory(null);
    clearSelectedImage();

    reset({
      ...DEFAULT_VALUES,
      sort_order: stories.length,
    });

    setFormOpen(true);

    window.setTimeout(() => {
      document
        .getElementById("stories-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function openEditForm(story: StoryRow) {
    setEditingStory(story);
    clearSelectedImage();

    reset({
      title: story.title,
      link_url: story.link_url ?? "",
      duration: story.duration ?? 5,
      sort_order: story.sort_order ?? 0,
    });

    setFormOpen(true);

    window.setTimeout(() => {
      document
        .getElementById("stories-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditingStory(null);
    clearSelectedImage();
    reset(DEFAULT_VALUES);
  }

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار صورة فقط");
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 8 ميجابايت");
      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(file);

    setSelectedImage(file);
    setPreviewUrl(url);
  }

  async function uploadStoryImage(
    file: File,
  ): Promise<string> {
    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";

    const fileName = `${crypto.randomUUID()}.${extension}`;

    const filePath = `stories/${fileName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("stories")
        .upload(
          filePath,
          file,
          {
            cacheControl: "31536000",
            upsert: false,
            contentType: file.type,
          },
        );

    if (uploadError) {
      throw new Error(
        "تعذر رفع الصورة: " +
          uploadError.message,
      );
    }

    const { data } =
      supabase.storage
        .from("stories")
        .getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error(
        "تعذر الحصول على رابط الصورة",
      );
    }

    return data.publicUrl;
  }

  async function saveStory(
    values: StoryFormValues,
  ) {
    if (
      !editingStory &&
      !selectedImage
    ) {
      toast.error(
        "اختر صورة للقصة أولاً",
      );
      return;
    }

    setSaving(true);

    try {
      let imageUrl =
        editingStory?.image_url ??
        "";

      if (selectedImage) {
        imageUrl =
          await uploadStoryImage(
            selectedImage,
          );
      }

      const payload = {
        title: values.title.trim(),
        image_url: imageUrl,
        link_url:
          values.link_url.trim() ||
          null,
        duration: values.duration,
        sort_order:
          values.sort_order,
        is_active:
          editingStory?.is_active ??
          true,
      };

      if (editingStory) {
        const { error } =
          await storiesTable()
            .update(payload)
            .eq(
              "id",
              editingStory.id,
            );

        if (error) {
          throw new Error(
            "تعذر تحديث القصة: " +
              error.message,
          );
        }

        toast.success(
          "تم تحديث القصة بنجاح",
        );
      } else {
        const { error } =
          await storiesTable()
            .insert(payload);

        if (error) {
          throw new Error(
            "تعذر إضافة القصة: " +
              error.message,
          );
        }

        toast.success(
          "تمت إضافة القصة بنجاح",
        );
      }

      closeForm();
      await loadStories();
    } catch (error) {
      console.error(
        "Story save error:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حفظ القصة",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStory(
    story: StoryRow,
  ) {
    const { error } =
      await storiesTable()
        .update({
          is_active:
            !story.is_active,
        })
        .eq(
          "id",
          story.id,
        );

    if (error) {
      console.error(
        "Story toggle error:",
        error,
      );

      toast.error(
        "تعذر تغيير حالة القصة: " +
          error.message,
      );

      return;
    }

    toast.success(
      story.is_active
        ? "تم إخفاء القصة"
        : "تم تفعيل القصة",
    );

    await loadStories();
  }

  async function deleteStory(
    story: StoryRow,
  ) {
    const confirmed =
      window.confirm(
        `هل أنت متأكد من حذف القصة "${story.title}"؟`,
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await storiesTable()
        .delete()
        .eq(
          "id",
          story.id,
        );

    if (error) {
      toast.error(
        "تعذر حذف القصة: " +
          error.message,
      );

      return;
    }

    toast.success(
      "تم حذف القصة",
    );

    if (
      editingStory?.id ===
      story.id
    ) {
      closeForm();
    }

    await loadStories();
  }

  return (
    <div
      dir="rtl"
      className="space-y-4"
    >
      <AdminCard
        title="إدارة القصص"
        action={
          <button
            type="button"
            onClick={
              openAddForm
            }
            className={`${btnCls} gap-1.5`}
          >
            <CirclePlus className="h-4 w-4" />
            إضافة قصة
          </button>
        }
      >
        <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <ImagePlus className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">
                قصص متجر شهارة
              </p>

              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                أضف صوراً عمودية لعرضها أعلى الصفحة الرئيسية بأسلوب القصص الحديثة.
              </p>
            </div>
          </div>
        </div>
      </AdminCard>

      {formOpen && (
        <AdminCard
          title={
            editingStory
              ? "تعديل القصة"
              : "إضافة قصة جديدة"
          }
          action={
            <button
              type="button"
              onClick={
                closeForm
              }
              disabled={saving}
              className={`${btnGhostCls} h-9 w-9 p-0`}
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          }
        >
          <form
            id="stories-form"
            onSubmit={handleSubmit(
              saveStory,
            )}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="عنوان القصة">
                <input
                  {...register(
                    "title",
                  )}
                  className={
                    inputCls
                  }
                  placeholder="مثال: عروض العبايات"
                  maxLength={
                    120
                  }
                />

                {errors.title && (
                  <p className="mt-1 text-xs text-destructive">
                    {
                      errors.title
                        .message
                    }
                  </p>
                )}
              </Field>

              <Field label="الرابط عند الضغط">
                <input
                  {...register(
                    "link_url",
                  )}
                  className={
                    inputCls
                  }
                  placeholder="/products أو https://..."
                  dir="ltr"
                />

                {errors.link_url && (
                  <p className="mt-1 text-xs text-destructive">
                    {
                      errors
                        .link_url
                        .message
                    }
                  </p>
                )}
              </Field>

              <Field label="مدة العرض بالثواني">
                <input
                  {...register(
                    "duration",
                  )}
                  type="number"
                  min={1}
                  max={60}
                  className={
                    inputCls
                  }
                />

                {errors.duration && (
                  <p className="mt-1 text-xs text-destructive">
                    {
                      errors
                        .duration
                        .message
                    }
                  </p>
                )}
              </Field>

              <Field label="ترتيب القصة">
                <input
                  {...register(
                    "sort_order",
                  )}
                  type="number"
                  min={0}
                  className={
                    inputCls
                  }
                />

                {errors.sort_order && (
                  <p className="mt-1 text-xs text-destructive">
                    {
                      errors
                        .sort_order
                        .message
                    }
                  </p>
                )}
              </Field>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                صورة القصة
              </label>

              <div className="overflow-hidden rounded-2xl border border-border bg-secondary/30">
                {previewUrl ||
                editingStory?.image_url ? (
                  <div className="relative mx-auto aspect-[9/16] w-full max-w-[260px] overflow-hidden bg-muted">
                    <img
                      src={
                        previewUrl ||
                        editingStory?.image_url ||
                        ""
                      }
                      alt="معاينة القصة"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="flex min-h-52 w-full flex-col items-center justify-center gap-3 p-6 text-center transition-colors hover:bg-secondary"
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                      <ImagePlus className="h-6 w-6" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">
                        اختر صورة القصة
                      </p>

                      <p className="mt-1 text-[11px] text-muted-foreground">
                        يفضل استخدام صورة عمودية 9:16
                      </p>
                    </div>
                  </button>
                )}
              </div>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/*"
                onChange={
                  handleImageChange
                }
                className="hidden"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className={
                    btnGhostCls
                  }
                >
                  <ImagePlus className="h-4 w-4" />

                  {editingStory
                    ? "تغيير الصورة"
                    : "اختيار الصورة"}
                </button>

                {(
                  previewUrl ||
                  selectedImage
                ) && (
                  <button
                    type="button"
                    onClick={
                      clearSelectedImage
                    }
                    className={`${btnGhostCls} text-destructive`}
                  >
                    <X className="h-4 w-4" />
                    إزالة الصورة الجديدة
                  </button>
                )}
              </div>

              <p className="text-[10px] leading-5 text-muted-foreground">
                الحد الأقصى لحجم الصورة 8 ميجابايت.
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
              <button
                type="submit"
                disabled={
                  saving
                }
                className={`${btnCls} min-h-11 flex-1`}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />

                    {editingStory
                      ? "حفظ التعديلات"
                      : "إضافة القصة"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={
                  saving
                }
                className={`${btnGhostCls} min-h-11`}
              >
                إلغاء
              </button>
            </div>
          </form>
        </AdminCard>
      )}

      <AdminCard
        title={`القصص (${stories.length})`}
      >
        {loading ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : stories.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border px-4 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <ImagePlus className="h-6 w-6" />
            </div>

            <p className="mt-3 text-sm font-semibold">
              لا توجد قصص حالياً
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              أضف أول قصة لمتجر شهارة.
            </p>

            <button
              type="button"
              onClick={
                openAddForm
              }
              className={`${btnCls} mt-4`}
            >
              <CirclePlus className="h-4 w-4" />
              إضافة قصة
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stories.map(
              (story) => (
                <div
                  key={
                    story.id
                  }
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="relative aspect-[9/16] bg-muted">
                    <img
                      src={
                        story.image_url
                      }
                      alt={
                        story.title
                      }
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />

                    <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md ${
                          story.is_active
                            ? "bg-emerald-500/90 text-white"
                            : "bg-black/60 text-white"
                        }`}
                      >
                        {story.is_active
                          ? "نشطة"
                          : "مخفية"}
                      </span>

                      <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
                        {story.duration}s
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 p-3">
                    <div>
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {story.title}
                      </h3>

                      <p className="mt-1 text-[10px] text-muted-foreground">
                        الترتيب:{" "}
                        {
                          story.sort_order
                        }
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(
                            story,
                          )
                        }
                        className={`${btnGhostCls} min-h-9 px-2`}
                        aria-label="تعديل القصة"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          تعديل
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleStory(
                            story,
                          )
                        }
                        className={`${btnGhostCls} min-h-9 px-2`}
                        aria-label={
                          story.is_active
                            ? "إخفاء القصة"
                            : "تفعيل القصة"
                        }
                      >
                        {story.is_active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}

                        <span className="hidden sm:inline">
                          {story.is_active
                            ? "إخفاء"
                            : "تفعيل"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteStory(
                            story,
                          )
                        }
                        className={`${btnGhostCls} min-h-9 px-2 text-destructive hover:text-destructive`}
                        aria-label="حذف القصة"
                      >
                        <Trash2 className="h-4 w-4" />

                        <span className="hidden sm:inline">
                          حذف
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

export default AdminStories;
