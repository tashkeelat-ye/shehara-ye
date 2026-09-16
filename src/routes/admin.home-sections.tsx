import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2,
  LayoutGrid,
  Image,
  ShoppingBag,
  Sparkles,
  Grid2X2,
  X,
} from "lucide-react";

import { toast } from "sonner";

import {
  AdminCard,
  btnCls,
  btnGhostCls,
  inputCls,
} from "@/components/admin-ui";

import { supabase } from "@/integrations/supabase/client";

export const Route =
  createFileRoute(
    "/admin/home-sections",
  )({
    component:
      AdminHomeSections,
  });

type SectionType =
  | "banner_sub"
  | "banner_main_copy"
  | "best_sellers"
  | "new_products"
  | "popular_categories";

type HomeSection = {
  id: string;
  section_key: string;
  title: string;
  sort_order: number;
  is_active: boolean;
  section_type: SectionType;
};

type DraftSection = {
  title: string;
  section_type: SectionType;
};

const TYPE_OPTIONS: Array<{
  value: SectionType;
  label: string;
  description: string;
  icon: typeof Image;
}> = [
  {
    value: "banner_sub",
    label: "البنر الفرعي",
    description:
      "عرض البنرات الفرعية 4:1",
    icon: Image,
  },
  {
    value: "banner_main_copy",
    label:
      "نسخة من البنر الرئيسي",
    description:
      "عرض نسخة من البنرات الرئيسية",
    icon: Image,
  },
  {
    value: "best_sellers",
    label: "الأكثر مبيعاً",
    description:
      "المنتجات الأعلى مبيعاً",
    icon: ShoppingBag,
  },
  {
    value: "new_products",
    label: "منتجات جديدة",
    description:
      "أحدث المنتجات المضافة",
    icon: Sparkles,
  },
  {
    value: "popular_categories",
    label: "أقسام رائجة",
    description:
      "الأقسام الأكثر طلباً",
    icon: Grid2X2,
  },
];

function getTypeInfo(
  type: SectionType,
) {
  return (
    TYPE_OPTIONS.find(
      (item) =>
        item.value === type,
    ) ??
    TYPE_OPTIONS[2]
  );
}

function AdminHomeSections() {
  const [rows, setRows] =
    useState<HomeSection[]>([]);

  const [busy, setBusy] =
    useState(false);

  const [showCreate, setShowCreate] =
    useState(false);

  const [draft, setDraft] =
    useState<DraftSection>({
      title: "",
      section_type:
        "best_sellers",
    });

  const load = useCallback(
    async () => {
      const {
        data,
        error,
      } = await supabase
        .from("home_sections")
        .select(
          "id,section_key,title,sort_order,is_active,section_type",
        )
        .order("sort_order", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setRows(
        (data ?? []) as HomeSection[],
      );
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel =
      supabase
        .channel(
          "admin-home-sections",
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "home_sections",
          },
          () => {
            void load();
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [load]);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          a.sort_order -
          b.sort_order,
      ),
    [rows],
  );

  async function createSection() {
    const title =
      draft.title.trim();

    if (!title) {
      toast.error(
        "اكتب اسم القسم.",
      );
      return;
    }

    setBusy(true);

    try {
      const maxOrder =
        sorted.length
          ? Math.max(
              ...sorted.map(
                (row) =>
                  row.sort_order,
              ),
            )
          : 0;

      const sectionKey =
        `custom_${crypto.randomUUID()}`;

      const {
        error,
      } = await supabase
        .from("home_sections")
        .insert({
          section_key:
            sectionKey,
          title,
          sort_order:
            maxOrder + 1,
          is_active: true,
          section_type:
            draft.section_type,
        });

      if (error) {
        throw error;
      }

      toast.success(
        "تمت إضافة القسم بنجاح.",
      );

      setDraft({
        title: "",
        section_type:
          "best_sellers",
      });

      setShowCreate(false);

      await load();
    } catch (error) {
      console.error(
        "[HomeSections] create failed:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر إضافة القسم.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateTitle(
    row: HomeSection,
    title: string,
  ) {
    const value =
      title.trim();

    if (!value) {
      toast.error(
        "اسم القسم لا يمكن أن يكون فارغاً.",
      );
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from("home_sections")
        .update({
          title: value,
        })
        .eq("id", row.id);

      if (error) {
        throw error;
      }

      toast.success(
        "تم حفظ اسم القسم.",
      );

      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حفظ القسم.",
      );
    }
  }

  async function toggle(
    row: HomeSection,
  ) {
    setBusy(true);

    try {
      const {
        error,
      } = await supabase
        .from("home_sections")
        .update({
          is_active:
            !row.is_active,
        })
        .eq("id", row.id);

      if (error) {
        throw error;
      }

      toast.success(
        row.is_active
          ? "تم إخفاء القسم."
          : "تم إظهار القسم.",
      );

      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تحديث القسم.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function move(
    row: HomeSection,
    direction: -1 | 1,
  ) {
    const index =
      sorted.findIndex(
        (item) =>
          item.id === row.id,
      );

    const other =
      sorted[index + direction];

    if (!other) {
      return;
    }

    setBusy(true);

    try {
      const firstOrder =
        row.sort_order;

      const secondOrder =
        other.sort_order;

      const first =
        await supabase
          .from("home_sections")
          .update({
            sort_order:
              secondOrder,
          })
          .eq("id", row.id);

      if (first.error) {
        throw first.error;
      }

      const second =
        await supabase
          .from("home_sections")
          .update({
            sort_order:
              firstOrder,
          })
          .eq("id", other.id);

      if (second.error) {
        throw second.error;
      }

      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تغيير ترتيب القسم.",
      );

      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(
    row: HomeSection,
  ) {
    const confirmed =
      window.confirm(
        `هل أنت متأكد من حذف قسم «${row.title}»؟`,
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);

    try {
      const {
        error,
      } = await supabase
        .from("home_sections")
        .delete()
        .eq("id", row.id);

      if (error) {
        throw error;
      }

      toast.success(
        "تم حذف القسم.",
      );

      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حذف القسم.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="space-y-5"
    >
      <AdminCard
        title="ترتيب الصفحة الرئيسية"
        actions={
          <button
            type="button"
            className={btnCls}
            onClick={() =>
              setShowCreate(
                true,
              )
            }
          >
            <Plus className="h-4 w-4" />
            إضافة قسم
          </button>
        }
      >
        <p className="mb-5 text-xs leading-6 text-muted-foreground">
          أنشئ أقساماً جديدة للصفحة الرئيسية،
          حدد نوع المحتوى والاسم ثم تحكم
          في ترتيب القسم وإظهاره للعملاء.
        </p>

        <div className="space-y-3">
          {sorted.map(
            (row, index) => {
              const type =
                getTypeInfo(
                  row.section_type,
                );

              const Icon =
                type.icon;

              return (
                <div
                  key={row.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          defaultValue={
                            row.title
                          }
                          className={`${inputCls} min-w-[180px] flex-1`}
                          onBlur={(
                            event,
                          ) => {
                            if (
                              event
                                .target
                                .value
                                .trim() !==
                              row.title.trim()
                            ) {
                              void updateTitle(
                                row,
                                event
                                  .target
                                  .value,
                              );
                            }
                          }}
                        />

                        {!row.is_active && (
                          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">
                            مخفي
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                        <span>
                          {type.label}
                        </span>

                        <span>
                          {type.description}
                        </span>

                        <span>
                          الترتيب:{" "}
                          {
                            row.sort_order
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className={btnGhostCls}
                        disabled={
                          busy ||
                          index ===
                            0
                        }
                        onClick={() =>
                          void move(
                            row,
                            -1,
                          )
                        }
                        aria-label="تحريك للأعلى"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        className={btnGhostCls}
                        disabled={
                          busy ||
                          index ===
                            sorted.length -
                              1
                        }
                        onClick={() =>
                          void move(
                            row,
                            1,
                          )
                        }
                        aria-label="تحريك للأسفل"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        className={btnGhostCls}
                        disabled={
                          busy
                        }
                        onClick={() =>
                          void toggle(
                            row,
                          )
                        }
                        aria-label={
                          row.is_active
                            ? "إخفاء"
                            : "إظهار"
                        }
                      >
                        {row.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        className={`${btnGhostCls} text-destructive`}
                        disabled={
                          busy
                        }
                        onClick={() =>
                          void remove(
                            row,
                          )
                        }
                        aria-label="حذف القسم"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>

        {sorted.length ===
          0 && (
          <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
            <LayoutGrid className="mx-auto h-10 w-10 text-muted-foreground/50" />

            <p className="mt-3 text-sm font-bold">
              لا توجد أقسام.
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              ابدأ بإضافة أول قسم للصفحة الرئيسية.
            </p>
          </div>
        )}
      </AdminCard>

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            dir="rtl"
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="text-lg font-extrabold">
                  إضافة قسم جديد
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  اختر نوع القسم وحدد الاسم الذي سيظهر للعملاء.
                </p>
              </div>

              <button
                type="button"
                className={btnGhostCls}
                onClick={() =>
                  setShowCreate(
                    false,
                  )
                }
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-xs font-bold">
                  اسم القسم
                </label>

                <input
                  value={
                    draft.title
                  }
                  onChange={(
                    event,
                  ) =>
                    setDraft(
                      (
                        current,
                      ) => ({
                        ...current,
                        title:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className={inputCls}
                  placeholder="مثال: أفضل المنتجات هذا الأسبوع"
                  maxLength={100}
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-3 block text-xs font-bold">
                  نوع القسم
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {TYPE_OPTIONS.map(
                    (option) => {
                      const Icon =
                        option.icon;

                      const active =
                        draft.section_type ===
                        option.value;

                      return (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          onClick={() =>
                            setDraft(
                              (
                                current,
                              ) => ({
                                ...current,
                                section_type:
                                  option.value,
                              }),
                            )
                          }
                          className={`rounded-2xl border p-4 text-right transition ${
                            active
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border bg-card hover:bg-secondary/50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>

                            <div>
                              <p className="text-xs font-extrabold">
                                {
                                  option.label
                                }
                              </p>

                              <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                                {
                                  option.description
                                }
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-border p-5">
              <button
                type="button"
                className={btnCls}
                disabled={
                  busy
                }
                onClick={() =>
                  void createSection()
                }
              >
                <Save className="h-4 w-4" />

                {busy
                  ? "جارٍ الحفظ..."
                  : "إضافة القسم"}
              </button>

              <button
                type="button"
                className={btnGhostCls}
                disabled={
                  busy
                }
                onClick={() =>
                  setShowCreate(
                    false,
                  )
                }
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
