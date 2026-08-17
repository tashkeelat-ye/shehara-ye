import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ExternalLink,
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


/**
 * =========================================================
 * تشكيلات للتسوق
 * إدارة القصص
 * =========================================================
 */


/**
 * مخطط التحقق من بيانات القصة.
 */
const storySchema = z
  .object({
    title: z
      .string()
      .trim()
      .max(
        120,
        "عنوان القصة طويل جداً",
      )
      .default(""),

    link_url: z
      .string()
      .trim()
      .max(
        500,
        "الرابط طويل جداً",
      )
      .default(""),

    sort_order: z
      .number({
        message:
          "الترتيب يجب أن يكون رقماً",
      })
      .int(
        "الترتيب يجب أن يكون رقماً صحيحاً",
      )
      .min(
        0,
        "الترتيب لا يمكن أن يكون سالباً",
      )
      .default(0),

    is_active: z
      .boolean()
      .default(true),

    starts_at: z
      .string()
      .default(""),

    expires_at: z
      .string()
      .default(""),
  })
  .superRefine(
    (
      values,
      context,
    ) => {
      if (
        values.link_url &&
        !/^https?:\/\/|^\//.test(
          values.link_url,
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [
            "link_url",
          ],
          message:
            "أدخل رابطاً صحيحاً مثل /products أو https://example.com",
        });
      }


      if (
        values.starts_at &&
        values.expires_at
      ) {
        const start =
          new Date(
            values.starts_at,
          ).getTime();

        const end =
          new Date(
            values.expires_at,
          ).getTime();

        if (
          Number.isFinite(
            start,
          ) &&
          Number.isFinite(
            end,
          ) &&
          end <= start
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              "expires_at",
            ],
            message:
              "تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية",
          });
        }
      }
    },
  );


type StoryFormValues =
  z.infer<
    typeof storySchema
  >;


type Story = {
  id: string;

  title: string;

  image_url: string;

  link_url: string | null;

  sort_order: number;

  is_active: boolean;

  starts_at: string | null;

  expires_at: string | null;

  created_at: string;

  updated_at: string;
};


const emptyForm: StoryFormValues =
  {
    title: "",
    link_url: "",
    sort_order: 0,
    is_active: true,
    starts_at: "",
    expires_at: "",
  };


/**
 * =========================================================
 * تحويل تاريخ قاعدة البيانات إلى قيمة datetime-local
 * =========================================================
 */
function toDateTimeLocal(
  value:
    | string
    | null,
): string {
  if (!value) {
    return "";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }


  const pad =
    (number: number) =>
      String(
        number,
      ).padStart(
        2,
        "0",
      );


  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(
    date.getDate(),
  )}T${pad(
    date.getHours(),
  )}:${pad(
    date.getMinutes(),
  )}`;
}


/**
 * =========================================================
 * تحويل datetime-local إلى ISO
 * =========================================================
 */
function toISOStringOrNull(
  value: string,
): string | null {
  if (!value) {
    return null;
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }


  return date.toISOString();
}


/**
 * =========================================================
 * اسم ملف آمن
 * =========================================================
 */
function safeFileName(
  name: string,
): string {
  return name
    .replace(
      /[^\w.-]/g,
      "_",
    )
    .slice(
      -180,
    );
}


/**
 * =========================================================
 * استخراج مسار الملف من Public URL
 * =========================================================
 */
function getStoragePathFromUrl(
  url: string,
): string | null {
  const marker =
    "/storage/v1/object/public/stories/";

  const index =
    url.indexOf(
      marker,
    );


  if (
    index === -1
  ) {
    return null;
  }


  return decodeURIComponent(
    url.slice(
      index +
        marker.length,
    ),
  );
}


/**
 * =========================================================
 * رفع صورة القصة
 * =========================================================
 */
async function uploadStoryImage(
  file: File,
): Promise<string> {
  if (
    !file.type.startsWith(
      "image/",
    )
  ) {
    throw new Error(
      "الملف المختار ليس صورة",
    );
  }


  if (
    file.size >
    8 * 1024 * 1024
  ) {
    throw new Error(
      "حجم الصورة يجب ألا يتجاوز 8 ميجابايت",
    );
  }


  const extension =
    file.name.includes(
      ".",
    )
      ? file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg"
      : "jpg";


  const path =
    `admin/${Date.now()}-${Math.random()
      .toString(36)
      .slice(
        2,
        9,
      )}-${safeFileName(
      file.name.replace(
        /\.[^.]+$/,
        "",
      ),
    )}.${extension}`;


  const {
    error,
  } =
    await supabase.storage
      .from(
        "stories",
      )
      .upload(
        path,
        file,
        {
          contentType:
            file.type,
          upsert: false,
        },
      );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  const {
    data,
  } =
    supabase.storage
      .from(
        "stories",
      )
      .getPublicUrl(
        path,
      );


  if (
    !data?.publicUrl
  ) {
    throw new Error(
      "تعذر إنشاء رابط الصورة",
    );
  }


  return data.publicUrl;
}


/**
 * =========================================================
 * Route
 * =========================================================
 */
export const Route =
  createFileRoute(
    "/admin/stories",
  )({
    component:
      AdminStories,
  });


/**
 * =========================================================
 * الصفحة
 * =========================================================
 */
function AdminStories() {
  const [
    rows,
    setRows,
  ] =
    useState<Story[]>(
      [],
    );


  const [
    editing,
    setEditing,
  ] =
    useState<Story | null>(
      null,
    );


  const [
    imageUrl,
    setImageUrl,
  ] =
    useState("");


  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null,
    );


  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    busy,
    setBusy,
  ] =
    useState(false);


  const [
    uploading,
    setUploading,
  ] =
    useState(false);


  const form =
    useForm<StoryFormValues>({
      resolver:
        zodResolver(
          storySchema,
        ),

      defaultValues:
        emptyForm,
    });


  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: {
      errors,
    },
  } = form;


  /**
   * =======================================================
   * تحميل القصص
   * =======================================================
   */
  const load =
    useCallback(
      async () => {
        setLoading(
          true,
        );


        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query =
          (supabase as any)
            .from(
              "stories",
            )
            .select(
              [
                "id",
                "title",
                "image_url",
                "link_url",
                "sort_order",
                "is_active",
                "starts_at",
                "expires_at",
                "created_at",
                "updated_at",
              ].join(","),
            )
            .order(
              "sort_order",
              {
                ascending:
                  true,
              },
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            );


        const {
          data,
          error,
        } =
          await query;


        if (
          error
        ) {
          toast.error(
            "تعذر تحميل القصص: " +
              error.message,
          );


          setRows(
            [],
          );
        } else {
          setRows(
            (data as Story[]) ??
              [],
          );
        }


        setLoading(
          false,
        );
      },
      [],
    );


  useEffect(() => {
    void load();
  }, [
    load,
  ]);


  /**
   * =======================================================
   * إنشاء قصة جديدة
   * =======================================================
   */
  function startNew() {
    setEditing(
      null,
    );

    setImageUrl(
      "",
    );

    setSelectedFile(
      null,
    );

    setPreviewUrl(
      "",
    );


    reset({
      ...emptyForm,
      sort_order:
        rows.length,
    });
  }


  /**
   * =======================================================
   * تعديل قصة
   * =======================================================
   */
  function startEdit(
    story: Story,
  ) {
    setEditing(
      story,
    );

    setImageUrl(
      story.image_url,
    );

    setSelectedFile(
      null,
    );

    setPreviewUrl(
      story.image_url,
    );


    reset({
      title:
        story.title ??
        "",

      link_url:
        story.link_url ??
        "",

      sort_order:
        Number(
          story.sort_order ??
            0,
        ),

      is_active:
        Boolean(
          story.is_active,
        ),

      starts_at:
        toDateTimeLocal(
          story.starts_at,
        ),

      expires_at:
        toDateTimeLocal(
          story.expires_at,
        ),
    });


    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }


  /**
   * =======================================================
   * إلغاء التحرير
   * =======================================================
   */
  function cancelEdit() {
    setEditing(
      null,
    );

    setImageUrl(
      "",
    );

    setSelectedFile(
      null,
    );

    setPreviewUrl(
      "",
    );

    reset(
      emptyForm,
    );
  }


  /**
   * =======================================================
   * اختيار الصورة
   * =======================================================
   */
  function handleFileChange(
    file:
      | File
      | null,
  ) {
    if (!file) {
      return;
    }


    if (
      !file.type.startsWith(
        "image/",
      )
    ) {
      toast.error(
        "يرجى اختيار صورة فقط",
      );

      return;
    }


    if (
      file.size >
      8 * 1024 * 1024
    ) {
      toast.error(
        "حجم الصورة يجب ألا يتجاوز 8 ميجابايت",
      );

      return;
    }


    setSelectedFile(
      file,
    );


    const localUrl =
      URL.createObjectURL(
        file,
      );


    setPreviewUrl(
      localUrl,
    );
  }


  /**
   * =======================================================
   * رفع الصورة
   * =======================================================
   */
  async function uploadSelectedImage(): Promise<string | null> {
    if (
      !selectedFile
    ) {
      return imageUrl ||
        null;
    }


    setUploading(
      true,
    );


    try {
      const url =
        await uploadStoryImage(
          selectedFile,
        );


      setImageUrl(
        url,
      );


      setSelectedFile(
        null,
      );


      toast.success(
        "تم رفع صورة القصة بنجاح",
      );


      return url;
    } catch (
      error
    ) {
      toast.error(
        "تعذر رفع الصورة: " +
          (error instanceof
          Error
            ? error.message
            : "خطأ غير معروف"),
      );


      return null;
    } finally {
      setUploading(
        false,
      );
    }
  }


  /**
   * =======================================================
   * حفظ القصة
   * =======================================================
   */
  const save =
    handleSubmit(
      async (
        values,
      ) => {
        setBusy(
          true,
        );


        try {
          let finalImageUrl =
            imageUrl;


          if (
            selectedFile
          ) {
            const uploaded =
              await uploadSelectedImage();


            if (
              !uploaded
            ) {
              setBusy(
                false,
              );

              return;
            }


            finalImageUrl =
              uploaded;
          }


          if (
            !finalImageUrl
          ) {
            toast.error(
              "يجب رفع صورة القصة أولاً",
            );

            setBusy(
              false,
            );

            return;
          }


          const payload = {
            title:
              values.title
                .trim(),

            image_url:
              finalImageUrl,

            link_url:
              values.link_url
                .trim() ||
              null,

            sort_order:
              values.sort_order,

            is_active:
              values.is_active,

            starts_at:
              toISOStringOrNull(
                values.starts_at,
              ),

            expires_at:
              toISOStringOrNull(
                values.expires_at,
              ),
          };


          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const storiesTable =
            (supabase as any).from(
              "stories",
            );


          if (
            editing
          ) {
            const {
              error,
            } =
              await storiesTable
                .update(
                  payload,
                )
                .eq(
                  "id",
                  editing.id,
                );


            if (
              error
            ) {
              throw new Error(
                error.message,
              );
            }


            /*
             * إذا تم رفع صورة جديدة أثناء تعديل قصة،
             * نحاول حذف الصورة القديمة من Storage.
             */
            if (
              editing.image_url &&
              editing.image_url !==
                finalImageUrl
            ) {
              const oldPath =
                getStoragePathFromUrl(
                  editing.image_url,
                );


              if (
                oldPath
              ) {
                await supabase.storage
                  .from(
                    "stories",
                  )
                  .remove([
                    oldPath,
                  ]);
              }
            }


            toast.success(
              "تم تحديث القصة بنجاح",
            );
          } else {
            const {
              data,
              error,
            } =
              await storiesTable
                .insert({
                  ...payload,
                  created_by:
                    (
                      await supabase
                        .auth
                        .getUser()
                    ).data.user
                      ?.id ??
                    null,
                })
                .select()
                .single();


            if (
              error
            ) {
              throw new Error(
                error.message,
              );
            }


            if (
              !data
            ) {
              throw new Error(
                "تعذر تأكيد إنشاء القصة",
              );
            }


            toast.success(
              "تمت إضافة القصة بنجاح",
            );
          }


          cancelEdit();

          await load();
        } catch (
          error
        ) {
          toast.error(
            "تعذر حفظ القصة: " +
              (error instanceof
              Error
                ? error.message
                : "خطأ غير معروف"),
          );
        } finally {
          setBusy(
            false,
          );
        }
      },
    );


  /**
   * =======================================================
   * تفعيل / تعطيل
   * =======================================================
   */
  async function toggleStory(
    story: Story,
  ) {
    setBusy(
      true,
    );


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {
      error,
    } =
      await (supabase as any)
        .from(
          "stories",
        )
        .update({
          is_active:
            !story.is_active,
        })
        .eq(
          "id",
          story.id,
        );


    setBusy(
      false,
    );


    if (
      error
    ) {
      toast.error(
        "تعذر تغيير حالة القصة: " +
          error.message,
      );

      return;
    }


    toast.success(
      story.is_active
        ? "تم تعطيل القصة"
        : "تم تفعيل القصة",
    );


    await load();
  }


  /**
   * =======================================================
   * تغيير الترتيب
   * =======================================================
   */
  async function moveStory(
    story: Story,
    direction:
      | -1
      | 1,
  ) {
    const sorted =
      [
        ...rows,
      ].sort(
        (
          a,
          b,
        ) =>
          a.sort_order -
          b.sort_order,
      );


    const index =
      sorted.findIndex(
        (
          row,
        ) =>
          row.id ===
          story.id,
      );


    const other =
      sorted[
        index +
          direction
      ];


    if (
      !other
    ) {
      return;
    }


    setBusy(
      true,
    );


    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const table =
        (supabase as any).from(
          "stories",
        );


      const first =
        await table
          .update({
            sort_order:
              other.sort_order,
          })
          .eq(
            "id",
            story.id,
          );


      if (
        first.error
      ) {
        throw new Error(
          first.error.message,
        );
      }


      const second =
        await table
          .update({
            sort_order:
              story.sort_order,
          })
          .eq(
            "id",
            other.id,
          );


      if (
        second.error
      ) {
        throw new Error(
          second.error.message,
        );
      }


      await load();
    } catch (
      error
    ) {
      toast.error(
        "تعذر تغيير الترتيب: " +
          (error instanceof
          Error
            ? error.message
            : "خطأ غير معروف"),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }


  /**
   * =======================================================
   * حذف قصة
   * =======================================================
   */
  async function removeStory(
    story: Story,
  ) {
    const confirmed =
      window.confirm(
        `هل تريد حذف قصة "${story.title || "بدون عنوان"}" نهائياً؟`,
      );


    if (
      !confirmed
    ) {
      return;
    }


    setBusy(
      true,
    );


    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result =
        await (supabase as any)
          .from(
            "stories",
          )
          .delete()
          .eq(
            "id",
            story.id,
          );


      if (
        result.error
      ) {
        throw new Error(
          result.error.message,
        );
      }


      const path =
        getStoragePathFromUrl(
          story.image_url,
        );


      if (
        path
      ) {
        await supabase.storage
          .from(
            "stories",
          )
          .remove([
            path,
          ]);
      }


      toast.success(
        "تم حذف القصة",
      );


      if (
        editing?.id ===
        story.id
      ) {
        cancelEdit();
      }


      await load();
    } catch (
      error
    ) {
      toast.error(
        "تعذر حذف القصة: " +
          (error instanceof
          Error
            ? error.message
            : "خطأ غير معروف"),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }


  /**
   * =======================================================
   * تنسيق التاريخ
   * =======================================================
   */
  function formatDate(
    value:
      | string
      | null,
  ) {
    if (!value) {
      return "غير محدد";
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "غير محدد";
    }


    return date.toLocaleString(
      "ar-YE",
      {
        dateStyle:
          "medium",
        timeStyle:
          "short",
      },
    );
  }


  return (
    <div
      dir="rtl"
      className="
        space-y-4
        pb-8
      "
    >
      {/* =================================================
          رأس الصفحة
          ================================================= */}

      <div
        className="
          rounded-2xl
          border
          border-[#C99A3B]/20
          bg-gradient-to-l
          from-[#4A1525]
          to-[#641C32]
          p-4
          text-white
          shadow-sm
          md:p-6
        "
      >
        <div
          className="
            flex
            flex-wrap
            items-center
            justify-between
            gap-3
          "
        >
          <div>
            <p
              className="
                text-[11px]
                font-medium
                text-[#E0B85C]
              "
            >
              تشكيلات للتسوق
            </p>

            <h1
              className="
                mt-1
                text-xl
                font-bold
              "
            >
              إدارة القصص
            </h1>

            <p
              className="
                mt-1
                text-xs
                leading-5
                text-white/70
              "
            >
              إدارة القصص التي تظهر أعلى الصفحة
              الرئيسية للمتجر.
            </p>
          </div>

          <button
            type="button"
            className="
              inline-flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-[#E0B85C]/50
              bg-[#E0B85C]
              px-4
              text-xs
              font-bold
              text-[#4A1525]
              transition
              active:scale-95
              disabled:opacity-50
            "
            onClick={
              startNew
            }
            disabled={
              busy
            }
          >
            <Plus className="h-4 w-4" />

            قصة جديدة
          </button>
        </div>
      </div>


      {/* =================================================
          نموذج الإضافة / التعديل
          ================================================= */}

      {(editing ||
        imageUrl ||
        previewUrl) && (
        <AdminCard
          title={
            editing
              ? "تعديل القصة"
              : "إضافة قصة جديدة"
          }
          action={
            <button
              type="button"
              className="
                inline-flex
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                border
                border-border
                text-muted-foreground
              "
              onClick={
                cancelEdit
              }
              aria-label="إغلاق النموذج"
            >
              <X className="h-4 w-4" />
            </button>
          }
        >
          <form
            onSubmit={
              save
            }
            className="
              space-y-4
            "
          >
            {/* =============================================
                الصورة
                ============================================= */}

            <div
              className="
                rounded-2xl
                border
                border-[#C99A3B]/20
                bg-[#4A1525]/5
                p-3
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  sm:flex-row
                "
              >
                <div
                  className="
                    relative
                    mx-auto
                    h-48
                    w-32
                    shrink-0
                    overflow-hidden
                    rounded-2xl
                    border
                    border-[#C99A3B]/30
                    bg-[#4A1525]/10
                    sm:mx-0
                  "
                >
                  {previewUrl ? (
                    <img
                      src={
                        previewUrl
                      }
                      alt="معاينة القصة"
                      className="
                        h-full
                        w-full
                        object-cover
                      "
                    />
                  ) : (
                    <div
                      className="
                        flex
                        h-full
                        w-full
                        flex-col
                        items-center
                        justify-center
                        gap-2
                        text-muted-foreground
                      "
                    >
                      <ImagePlus className="h-8 w-8" />

                      <span className="text-[10px]">
                        معاينة الصورة
                      </span>
                    </div>
                  )}
                </div>

                <div
                  className="
                    flex
                    min-w-0
                    flex-1
                    flex-col
                    justify-center
                    gap-2
                  "
                >
                  <p
                    className="
                      text-sm
                      font-bold
                      text-foreground
                    "
                  >
                    صورة القصة
                  </p>

                  <p
                    className="
                      text-[11px]
                      leading-5
                      text-muted-foreground
                    "
                  >
                    يفضل استخدام صورة رأسية
                    بنسبة 9:16 للحصول على أفضل
                    مظهر على الهاتف.
                  </p>

                  <label
                    className="
                      inline-flex
                      min-h-10
                      cursor-pointer
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-border
                      bg-secondary
                      px-3
                      text-xs
                      font-medium
                      text-foreground
                    "
                  >
                    <ImagePlus className="h-4 w-4" />

                    اختيار صورة

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(
                        event,
                      ) => {
                        handleFileChange(
                          event
                            .target
                            .files?.[0] ??
                            null,
                        );

                        event.currentTarget.value =
                          "";
                      }}
                    />
                  </label>

                  {selectedFile ? (
                    <p
                      className="
                        truncate
                        text-[10px]
                        text-muted-foreground
                      "
                    >
                      {selectedFile.name}
                    </p>
                  ) : null}

                  {selectedFile ? (
                    <button
                      type="button"
                      disabled={
                        uploading ||
                        busy
                      }
                      onClick={() => {
                        void uploadSelectedImage();
                      }}
                      className={btnGhostCls}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />

                          جارٍ الرفع...
                        </>
                      ) : (
                        <>
                          <ImagePlus className="h-4 w-4" />

                          رفع الصورة الآن
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>


            {/* =============================================
                الحقول
                ============================================= */}

            <div
              className="
                grid
                gap-3
                sm:grid-cols-2
              "
            >
              <Field label="عنوان القصة">
                <input
                  {...register(
                    "title",
                  )}
                  className={
                    inputCls
                  }
                  placeholder="مثال: عروض الصيف"
                  maxLength={120}
                />

                {errors.title ? (
                  <p
                    className="
                      mt-1
                      text-[10px]
                      text-destructive
                    "
                  >
                    {
                      errors.title
                        .message
                    }
                  </p>
                ) : null}
              </Field>


              <Field label="رابط القصة — اختياري">
                <input
                  {...register(
                    "link_url",
                  )}
                  dir="ltr"
                  className={
                    inputCls
                  }
                  placeholder="/products أو https://..."
                  maxLength={500}
                />

                {errors.link_url ? (
                  <p
                    className="
                      mt-1
                      text-[10px]
                      text-destructive
                    "
                  >
                    {
                      errors
                        .link_url
                        .message
                    }
                  </p>
                ) : null}
              </Field>


              <Field label="ترتيب القصة">
                <input
                  type="number"
                  {...register(
                    "sort_order",
                    {
                      valueAsNumber:
                        true,
                    },
                  )}
                  className={
                    inputCls
                  }
                  min={0}
                />

                {errors.sort_order ? (
                  <p
                    className="
                      mt-1
                      text-[10px]
                      text-destructive
                    "
                  >
                    {
                      errors
                        .sort_order
                        .message
                    }
                  </p>
                ) : null}
              </Field>


              <Field label="تاريخ بداية الظهور — اختياري">
                <div className="relative">
                  <CalendarDays
                    className="
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      h-4
                      w-4
                      -translate-y-1/2
                      text-muted-foreground
                    "
                  />

                  <input
                    type="datetime-local"
                    {...register(
                      "starts_at",
                    )}
                    className={`${inputCls} pr-9`}
                  />
                </div>
              </Field>


              <Field label="تاريخ انتهاء الظهور — اختياري">
                <div className="relative">
                  <CalendarDays
                    className="
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      h-4
                      w-4
                      -translate-y-1/2
                      text-muted-foreground
                    "
                  />

                  <input
                    type="datetime-local"
                    {...register(
                      "expires_at",
                    )}
                    className={`${inputCls} pr-9`}
                  />
                </div>

                {errors.expires_at ? (
                  <p
                    className="
                      mt-1
                      text-[10px]
                      text-destructive
                    "
                  >
                    {
                      errors
                        .expires_at
                        .message
                    }
                  </p>
                ) : null}
              </Field>


              <div
                className="
                  flex
                  items-end
                "
              >
                <label
                  className="
                    flex
                    min-h-10
                    w-full
                    cursor-pointer
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-border
                    bg-secondary
                    px-3
                    text-xs
                    font-medium
                  "
                >
                  <input
                    type="checkbox"
                    {...register(
                      "is_active",
                    )}
                    className="
                      h-4
                      w-4
                      accent-[#4A1525]
                    "
                  />

                  القصة مفعّلة وتظهر للزوار
                </label>
              </div>
            </div>


            {/* =============================================
                أزرار الحفظ
                ============================================= */}

            <div
              className="
                flex
                flex-col-reverse
                gap-2
                sm:flex-row
                sm:justify-end
              "
            >
              <button
                type="button"
                className={
                  btnGhostCls
                }
                onClick={
                  cancelEdit
                }
                disabled={
                  busy ||
                  uploading
                }
              >
                إلغاء
              </button>

              <button
                type="submit"
                className={
                  btnCls
                }
                disabled={
                  busy ||
                  uploading
                }
              >
                {busy ||
                uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />

                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    {editing ? (
                      <Pencil className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}

                    {editing
                      ? "حفظ التعديلات"
                      : "إضافة القصة"}
                  </>
                )}
              </button>
            </div>
          </form>
        </AdminCard>
      )}


      {/* =================================================
          قائمة القصص
          ================================================= */}

      <AdminCard
        title={`القصص (${rows.length.toLocaleString(
          "ar-EG",
        )})`}
        action={
          <button
            type="button"
            className={
              btnGhostCls
            }
            onClick={
              startNew
            }
            disabled={
              busy
            }
          >
            <Plus className="h-4 w-4" />

            إضافة
          </button>
        }
      >
        {loading ? (
          <div
            className="
              flex
              min-h-32
              items-center
              justify-center
              gap-2
              text-xs
              text-muted-foreground
            "
          >
            <Loader2 className="h-4 w-4 animate-spin" />

            جارٍ تحميل القصص...
          </div>
        ) : rows.length ===
          0 ? (
          <div
            className="
              flex
              min-h-40
              flex-col
              items-center
              justify-center
              gap-2
              rounded-2xl
              border
              border-dashed
              border-[#C99A3B]/30
              bg-[#4A1525]/5
              p-5
              text-center
            "
          >
            <ImagePlus
              className="
                h-8
                w-8
                text-[#C99A3B]
              "
            />

            <p
              className="
                text-sm
                font-bold
                text-foreground
              "
            >
              لا توجد قصص بعد
            </p>

            <p
              className="
                max-w-xs
                text-[11px]
                leading-5
                text-muted-foreground
              "
            >
              أضف أول قصة لتظهر أعلى الصفحة
              الرئيسية للمتجر.
            </p>

            <button
              type="button"
              className={
                btnCls
              }
              onClick={
                startNew
              }
            >
              <Plus className="h-4 w-4" />

              إضافة أول قصة
            </button>
          </div>
        ) : (
          <div
            className="
              space-y-2
            "
          >
            {[
              ...rows,
            ]
              .sort(
                (
                  a,
                  b,
                ) =>
                  a.sort_order -
                  b.sort_order,
              )
              .map(
                (
                  story,
                ) => (
                  <article
                    key={
                      story.id
                    }
                    className="
                      overflow-hidden
                      rounded-2xl
                      border
                      border-border/70
                      bg-card
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        gap-3
                        p-3
                        sm:flex-row
                        sm:items-center
                      "
                    >
                      {/* الصورة */}

                      <div
                        className="
                          relative
                          mx-auto
                          h-32
                          w-24
                          shrink-0
                          overflow-hidden
                          rounded-xl
                          bg-muted
                          sm:mx-0
                        "
                      >
                        <img
                          src={
                            story.image_url
                          }
                          alt={
                            story.title ||
                            "قصة"
                          }
                          className="
                            h-full
                            w-full
                            object-cover
                          "
                          loading="lazy"
                        />

                        <span
                          className="
                            absolute
                            right-1.5
                            top-1.5
                            rounded-full
                            bg-black/55
                            px-2
                            py-0.5
                            text-[9px]
                            font-bold
                            text-white
                            backdrop-blur-sm
                          "
                        >
                          #
                          {
                            story.sort_order
                          }
                        </span>
                      </div>


                      {/* المعلومات */}

                      <div
                        className="
                          min-w-0
                          flex-1
                        "
                      >
                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-2
                          "
                        >
                          <h3
                            className="
                              min-w-0
                              truncate
                              text-sm
                              font-bold
                              text-foreground
                            "
                          >
                            {story.title ||
                              "بدون عنوان"}
                          </h3>

                          {story.is_active ? (
                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1
                                rounded-full
                                bg-emerald-500/10
                                px-2
                                py-1
                                text-[9px]
                                font-bold
                                text-emerald-700
                              "
                            >
                              <Eye className="h-3 w-3" />

                              مفعّلة
                            </span>
                          ) : (
                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1
                                rounded-full
                                bg-muted
                                px-2
                                py-1
                                text-[9px]
                                font-bold
                                text-muted-foreground
                              "
                            >
                              <EyeOff className="h-3 w-3" />

                              معطّلة
                            </span>
                          )}
                        </div>


                        {story.link_url ? (
                          <div
                            className="
                              mt-2
                              flex
                              items-center
                              gap-1.5
                              text-[10px]
                              text-muted-foreground
                            "
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />

                            <span
                              dir="ltr"
                              className="truncate"
                            >
                              {
                                story.link_url
                              }
                            </span>
                          </div>
                        ) : (
                          <p
                            className="
                              mt-2
                              text-[10px]
                              text-muted-foreground
                            "
                          >
                            بدون رابط
                          </p>
                        )}


                        <div
                          className="
                            mt-2
                            grid
                            gap-1
                            text-[10px]
                            text-muted-foreground
                            sm:grid-cols-2
                          "
                        >
                          <span>
                            البداية:{" "}
                            {formatDate(
                              story.starts_at,
                            )}
                          </span>

                          <span>
                            الانتهاء:{" "}
                            {formatDate(
                              story.expires_at,
                            )}
                          </span>
                        </div>
                      </div>


                      {/* الإجراءات */}

                      <div
                        className="
                          grid
                          grid-cols-2
                          gap-1.5
                          sm:flex
                          sm:flex-col
                        "
                      >
                        <button
                          type="button"
                          className={
                            btnGhostCls
                          }
                          onClick={() =>
                            moveStory(
                              story,
                              -1,
                            )
                          }
                          disabled={
                            busy
                          }
                          aria-label="تحريك للأعلى"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />

                          أعلى
                        </button>

                        <button
                          type="button"
                          className={
                            btnGhostCls
                          }
                          onClick={() =>
                            moveStory(
                              story,
                              1,
                            )
                          }
                          disabled={
                            busy
                          }
                          aria-label="تحريك للأسفل"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />

                          أسفل
                        </button>

                        <button
                          type="button"
                          className={
                            btnGhostCls
                          }
                          onClick={() =>
                            toggleStory(
                              story,
                            )
                          }
                          disabled={
                            busy
                          }
                        >
                          {story.is_active ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />

                              تعطيل
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" />

                              تفعيل
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className={
                            btnGhostCls
                          }
                          onClick={() =>
                            startEdit(
                              story,
                            )
                          }
                          disabled={
                            busy
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />

                          تعديل
                        </button>

                        <button
                          type="button"
                          className="
                            inline-flex
                            h-10
                            items-center
                            justify-center
                            gap-1.5
                            rounded-xl
                            border
                            border-destructive/40
                            px-3
                            text-xs
                            text-destructive
                          "
                          onClick={() =>
                            void removeStory(
                              story,
                            )
                          }
                          disabled={
                            busy
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />

                          حذف
                        </button>
                      </div>
                    </div>
                  </article>
                ),
              )}
          </div>
        )}
      </AdminCard>

      {/* =================================================
          معلومات الاستخدام
          ================================================= */}

      <div
        className="
          rounded-2xl
          border
          border-[#C99A3B]/20
          bg-[#4A1525]/5
          p-4
        "
      >
        <p
          className="
            text-xs
            font-bold
            text-[#4A1525]
          "
        >
          نصيحة لتصميم القصص
        </p>

        <p
          className="
            mt-1
            text-[11px]
            leading-5
            text-muted-foreground
          "
        >
          استخدم صوراً رأسية بنسبة 9:16، ويفضل
          أن تكون واضحة ومناسبة لشاشات الهاتف.
          القصص المفعلة فقط والتي تقع ضمن فترة
          العرض ستظهر للزوار.
        </p>
      </div>
    </div>
  );
}
