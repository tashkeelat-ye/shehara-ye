import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  toast,
} from "sonner";

import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
} from "lucide-react";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  AdminCard,
  Field,
  btnCls,
  btnGhostCls,
  inputCls,
} from "@/components/admin-ui";

import {
  uploadMedia,
} from "@/lib/media";

import {
  fetchBanners,
  type Banner,
} from "@/lib/store";

import {
  Banners4to1Manager,
} from "@/components/admin/Banners4to1Manager";

export const Route =
  createFileRoute(
    "/admin/banners",
  )({
    component:
      AdminBanners,
  });

type Draft =
  Omit<Banner, "id"> & {
    id?: string;
  };

type RealtimeDetail = {
  table: string;
  eventType?:
    | "INSERT"
    | "UPDATE"
    | "DELETE"
    | "*";
};

const empty: Draft = {
  title:
    "",
  subtitle:
    "",
  cta_label:
    "تسوّق الآن",
  link_url:
    "",
  image_url:
    "",
  sort_order:
    0,
  is_active:
    true,
};

function AdminBanners() {
  const [
    rows,
    setRows,
  ] = useState<
    Banner[]
  >([]);

  const [
    editing,
    setEditing,
  ] = useState<
    Draft | null
  >(null);

  const [
    busy,
    setBusy,
  ] = useState(false);

  /**
   * =========================================================
   * تحميل البانرات الأساسية
   * =========================================================
   */

  const load =
    useCallback(
      async () => {
        try {
          const data =
            await fetchBanners(
              false,
            );

          setRows(
            data,
          );
        } catch (error) {
          console.error(
            "[AdminBanners] load:",
            error,
          );

          toast.error(
            "تعذر تحميل البانرات.",
          );
        }
      },
      [],
    );

  /**
   * =========================================================
   * التحميل الأولي
   * =========================================================
   */

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * =========================================================
   * Realtime للبنرات الأساسية
   *
   * أي إضافة أو تعديل أو حذف في جدول banners
   * يتم عكسه فوراً في لوحة الإدارة.
   * =========================================================
   */

  useEffect(() => {
    const handleRealtime =
      (
        event: Event,
      ) => {
        const customEvent =
          event as CustomEvent<RealtimeDetail>;

        if (
          customEvent.detail?.table !==
          "banners"
        ) {
          return;
        }

        void load();
      };

    window.addEventListener(
      "shehara:realtime",
      handleRealtime,
    );

    return () => {
      window.removeEventListener(
        "shehara:realtime",
        handleRealtime,
      );
    };
  }, [load]);

  /**
   * =========================================================
   * حفظ البانر
   * =========================================================
   */

  async function save() {
    if (!editing) {
      return;
    }

    if (
      !editing.image_url
    ) {
      toast.error(
        "ارفع صورة البانر أولاً",
      );
      return;
    }

    setBusy(true);

    try {
      const payload = {
        ...editing,
      };

      delete (
        payload as {
          id?: string;
        }
      ).id;

      const result =
        editing.id
          ? await supabase
              .from("banners")
              .update(
                payload,
              )
              .eq(
                "id",
                editing.id,
              )
          : await supabase
              .from("banners")
              .insert(
                payload,
              );

      if (
        result.error
      ) {
        throw result.error;
      }

      toast.success(
        "تم حفظ البانر",
      );

      setEditing(
        null,
      );

      await load();
    } catch (error) {
      console.error(
        "[AdminBanners] save:",
        error,
      );

      toast.error(
        "تعذّر الحفظ: " +
          (
            error instanceof Error
              ? error.message
              : "حدث خطأ غير متوقع"
          ),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  /**
   * =========================================================
   * تفعيل / تعطيل
   * =========================================================
   */

  async function toggle(
    row: Banner,
  ) {
    try {
      const {
        error,
      } = await supabase
        .from("banners")
        .update({
          is_active:
            !row.is_active,
        })
        .eq(
          "id",
          row.id,
        );

      if (error) {
        throw error;
      }

      await load();
    } catch (error) {
      console.error(
        "[AdminBanners] toggle:",
        error,
      );

      toast.error(
        "تعذّر التحديث",
      );
    }
  }

  /**
   * =========================================================
   * تغيير ترتيب البانر
   * =========================================================
   */

  async function move(
    row: Banner,
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
        (item) =>
          item.id ===
          row.id,
      );

    if (
      index === -1
    ) {
      return;
    }

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

    try {
      const results =
        await Promise.all([
          supabase
            .from(
              "banners",
            )
            .update({
              sort_order:
                other.sort_order,
            })
            .eq(
              "id",
              row.id,
            ),

          supabase
            .from(
              "banners",
            )
            .update({
              sort_order:
                row.sort_order,
            })
            .eq(
              "id",
              other.id,
            ),
        ]);

      const failed =
        results.find(
          (
            result,
          ) =>
            result.error,
        );

      if (
        failed?.error
      ) {
        throw failed.error;
      }

      await load();
    } catch (error) {
      console.error(
        "[AdminBanners] move:",
        error,
      );

      toast.error(
        "تعذّر تغيير ترتيب البانر.",
      );

      await load();
    }
  }

  /**
   * =========================================================
   * حذف البانر
   * =========================================================
   */

  async function remove(
    row: Banner,
  ) {
    if (
      !window.confirm(
        "حذف هذا البانر؟",
      )
    ) {
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from("banners")
        .delete()
        .eq(
          "id",
          row.id,
        );

      if (error) {
        throw error;
      }

      toast.success(
        "تم الحذف",
      );

      await load();
    } catch (error) {
      console.error(
        "[AdminBanners] remove:",
        error,
      );

      toast.error(
        "تعذّر الحذف: " +
          (
            error instanceof Error
              ? error.message
              : ""
          ),
      );
    }
  }

  /**
   * =========================================================
   * رفع صورة البانر الأساسي
   * =========================================================
   */

  async function upload(
    file: File,
  ) {
    if (!editing) {
      return;
    }

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

    setBusy(true);

    try {
      const url =
        await uploadMedia(
          "banners",
          file,
        );

      setEditing(
        {
          ...editing,
          image_url:
            url,
        },
      );

      toast.success(
        "تم رفع الصورة",
      );
    } catch (error) {
      console.error(
        "[AdminBanners] upload:",
        error,
      );

      toast.error(
        "تعذّر رفع الصورة: " +
          (
            error instanceof Error
              ? error.message
              : ""
          ),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  const sortedRows =
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

  /**
   * =========================================================
   * الواجهة
   * =========================================================
   */

  return (
    <div className="space-y-8">
      {/* ===================================================
          إدارة بنرات 4:1
          =================================================== */}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6">
        <Banners4to1Manager />
      </div>

      <hr className="border-border" />

      {/* ===================================================
          البانرات الأساسية
          =================================================== */}

      <AdminCard
        title={`الإعلانات والعروض الأساسية (${rows.length.toLocaleString(
          "ar-EG",
        )})`}
        action={
          <button
            type="button"
            className={
              btnCls
            }
            onClick={() =>
              setEditing({
                ...empty,
                sort_order:
                  rows.length +
                  1,
              })
            }
          >
            <Plus className="h-4 w-4" />

            بانر جديد
          </button>
        }
      >
        <ul className="space-y-2">
          {sortedRows.map(
            (
              row,
            ) => (
              <li
                key={
                  row.id
                }
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-border/70
                  p-2
                  text-xs
                "
              >
                <img
                  src={
                    row.image_url
                  }
                  alt={
                    row.title ||
                    "بانر"
                  }
                  loading="lazy"
                  className="
                    h-12
                    w-20
                    shrink-0
                    rounded-lg
                    bg-muted
                    object-cover
                  "
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground">
                    {row.title ||
                      "بدون عنوان"}
                  </p>

                  <p
                    dir="ltr"
                    className="truncate text-muted-foreground"
                  >
                    {row.link_url ||
                      "بدون رابط"}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="أعلى"
                  className={
                    btnGhostCls
                  }
                  onClick={() =>
                    void move(
                      row,
                      -1,
                    )
                  }
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  aria-label="أسفل"
                  className={
                    btnGhostCls
                  }
                  onClick={() =>
                    void move(
                      row,
                      1,
                    )
                  }
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  className={
                    btnGhostCls
                  }
                  onClick={() =>
                    void toggle(
                      row,
                    )
                  }
                >
                  {row.is_active
                    ? "تعطيل"
                    : "تفعيل"}
                </button>

                <button
                  type="button"
                  className={
                    btnGhostCls
                  }
                  onClick={() =>
                    setEditing(
                      {
                        ...row,
                      },
                    )
                  }
                >
                  تعديل
                </button>

                <button
                  type="button"
                  aria-label="حذف"
                  onClick={() =>
                    void remove(
                      row,
                    )
                  }
                  className="
                    inline-flex
                    h-10
                    items-center
                    rounded-xl
                    border
                    border-destructive/40
                    px-3
                    text-destructive
                  "
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ),
          )}

          {rows.length ===
          0 ? (
            <li className="text-muted-foreground">
              لا توجد بانرات أساسية بعد.
            </li>
          ) : null}
        </ul>
      </AdminCard>

      {/* ===================================================
          نموذج إضافة / تعديل
          =================================================== */}

      {editing ? (
        <AdminCard
          title={
            editing.id
              ? "تعديل بانر أساسي"
              : "بانر أساسي جديد"
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="العنوان">
              <input
                className={
                  inputCls
                }
                maxLength={
                  120
                }
                value={
                  editing.title
                }
                onChange={(
                  event,
                ) =>
                  setEditing({
                    ...editing,
                    title:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field label="النص الفرعي">
              <input
                className={
                  inputCls
                }
                maxLength={
                  200
                }
                value={
                  editing.subtitle
                }
                onChange={(
                  event,
                ) =>
                  setEditing({
                    ...editing,
                    subtitle:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field label="نص الزر">
              <input
                className={
                  inputCls
                }
                maxLength={
                  40
                }
                value={
                  editing.cta_label
                }
                onChange={(
                  event,
                ) =>
                  setEditing({
                    ...editing,
                    cta_label:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field label="رابط الوجهة (مثال: /products أو /category/fashion)">
              <input
                dir="ltr"
                className={
                  inputCls
                }
                maxLength={
                  300
                }
                value={
                  editing.link_url
                }
                onChange={(
                  event,
                ) =>
                  setEditing({
                    ...editing,
                    link_url:
                      event
                        .target
                        .value,
                  })
                }
              />
            </Field>

            <Field label="الترتيب">
              <input
                type="number"
                className={
                  inputCls
                }
                value={
                  editing.sort_order
                }
                onChange={(
                  event,
                ) =>
                  setEditing({
                    ...editing,
                    sort_order:
                      Number(
                        event
                          .target
                          .value,
                      ),
                  })
                }
              />
            </Field>

            <Field label="صورة البانر">
              <div className="flex items-center gap-2">
                {editing.image_url ? (
                  <img
                    src={
                      editing.image_url
                    }
                    alt=""
                    className="
                      h-14
                      w-24
                      rounded-lg
                      object-cover
                    "
                  />
                ) : null}

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  aria-label="رفع صورة بانر"
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
                      void upload(
                        file,
                      );
                    }
                  }}
                  className="text-xs"
                />
              </div>
            </Field>

            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={
                  editing.is_active
                }
                onChange={(
                  event,
                ) =>
                  setEditing({
                    ...editing,
                    is_active:
                      event
                        .target
                        .checked,
                  })
                }
              />

              مُفعّل
            </label>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={
                busy
              }
              className={
                btnCls
              }
              onClick={() =>
                void save()
              }
            >
              {busy
                ? "جارٍ الحفظ..."
                : "حفظ"}
            </button>

            <button
              type="button"
              className={
                btnGhostCls
              }
              onClick={() =>
                setEditing(
                  null,
                )
              }
            >
              إلغاء
            </button>
          </div>
        </AdminCard>
      ) : null}
    </div>
  );
}
