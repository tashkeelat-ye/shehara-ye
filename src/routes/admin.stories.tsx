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
  created_at: string;
};

const DEFAULT_VALUES: StoryFormValues = {
  title: "",
  link_url: "",
  duration: 5,
  sort_order: 0,
};

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

    const { data, error } = await supabase
      .from("stories")
      .select(
        "id, title, image_url, link_url, duration, sort_order, is_active, created_at",
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Stories loading error:", error);
      toast.error("تعذر تحميل القصص: " + error.message);
      setStories([]);
    } else {
      setStories((data ?? []) as StoryRow[]);
    }

    setLoading(false);
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
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function closeForm() {
    if (saving) return;

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

  async function uploadStoryImage(file: File): Promise<string> {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const fileName = `${crypto.randomUUID()}.${extension}`;

    const filePath = `stories/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("stories")
      .upload(filePath, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(
        "تعذر رفع الصورة: " + uploadError.message,
      );
    }

    const { data } = supabase.storage
      .from("stories")
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error("تعذر الحصول على رابط الصورة");
    }

    return data.publicUrl;
  }

  async function saveStory(values: StoryFormValues) {
    if (!editingStory && !selectedImage) {
      toast.error("اختر صورة للقصة أولاً");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = editingStory?.image_url ?? "";

      if (selectedImage) {
        imageUrl = await uploadStoryImage(selectedImage);
      }

      const payload = {
        title: values.title.trim(),
        image_url: imageUrl,
        link_url: values.link_url.trim() || null,
        duration: values.duration,
        sort_order: values.sort_order,
        is_active: editingStory?.is_active ?? true,
      };

      if (editingStory) {
        const { error } = await supabase
          .from("stories")
          .update(payload)
          .eq("id", editingStory.id);

        if (error) {
          throw new Error(
            "تعذر تحديث القصة: " + error.message,
          );
        }

        toast.success("تم تحديث القصة بنجاح");
      } else {
        const { error } = await supabase
          .from("stories")
          .insert(payload);

        if (error) {
          throw new Error(
            "تعذر إضافة القصة: " + error.message,
          );
        }

        toast.success("تمت إضافة القصة بنجاح");
      }

      closeForm();
      await loadStories();
    } catch (error) {
      console.error("Story save error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حفظ القصة",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStory(story: StoryRow) {
    const { error } = await supabase
      .from("stories")
      .update({
        is_active: !story.is_active,
      })
      .eq("id", story.id);

    if (error) {
      toast.error("تعذر تغيير حالة القصة");
      return;
    }

    toast.success(
      story.is_active
        ? "تم إخفاء القصة"
        : "تم تفعيل القصة",
    );

    await loadStories();
  }

  async function deleteStory(story: StoryRow) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف القصة "${story.title}"؟`,
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", story.id);

    if (error) {
      toast.error("تعذر حذف القصة: " + error.message);
      return;
    }

    toast.success("تم حذف القصة");

    if (editingStory?.id === story.id) {
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
            onClick={openAddForm}
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
                قصص متجر تشكيلات
              </p>

              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                أضف صوراً عمودية لعرضها أعلى الصفحة الرئيسية
                بأسلوب القصص الحديثة.
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
              onClick={closeForm}
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
            onSubmit={handleSubmit(saveStory)}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="عنوان القصة">
                <input
                  {...register("title")}
                  className={inputCls}
                  placeholder="مثال: عروض العبايات"
                  maxLength={120}
                />

                {errors.title && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </Field>

              <Field label="الرابط عند الضغط">
                <input
                  {...register("link_url")}
                  className={inputCls}
                  placeholder="/products أو https://..."
                  dir="ltr"
                />

                {errors.link_url && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.link_url.message}
                  </p>
                )}
              </Field>

              <Field label="مدة العرض بالثواني">
                <input
                  {...register("duration")}
                  type="number"
                  min={1}
                  max={60}
                  className={inputCls}
                />

                {errors.duration && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.duration.message}
                  </p>
                )}
              </Field>

              <Field label="ترتيب القصة">
                <input
                  {...register("sort_order")}
                  type="number"
                  min={0}
                  className={inputCls}
                />

                {errors.sort_order && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.sort_order.message}
                  </p>
                )}
              </Field>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                صورة القصة
              </label>

              <div className="overflow-hidden rounded-2xl border border-border bg-secondary/30">
                {previewUrl || editingStory?.image_url ? (
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
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className={btnGhostCls}
                >
                  <ImagePlus className="h-4 w-4" />
                  {editingStory
                    ? "تغيير الصورة"
                    : "اختيار الصورة"}
                </button>

                {(previewUrl || selectedImage) && (
                  <button
                    type="button"
                    onClick={clearSelectedImage}
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
                disabled={saving}
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
                onClick={closeForm}
                disabled={saving}
                className={`${btnGhostCls} min-h-11`}
              >
