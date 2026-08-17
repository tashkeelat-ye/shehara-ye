import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AdminCard,
  Field,
  btnCls,
  btnGhostCls,
  inputCls,
} from "@/components/admin-ui";

import { YEMEN_GOVERNORATES } from "@/lib/yemen";

import {
  createManagedAccount,
  resetManagedAccountPassword,
  setManagedAccountDisabled,
} from "@/lib/admin.functions";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/couriers")({
  component: AdminCouriers,
});

type CourierRow = {
  id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  city: string | null;
  is_active: boolean;
  account_enabled: boolean;
  created_at?: string | null;
  orders_count: number;
};

type CourierForm = {
  name: string;
  phone: string;
  city: string;
  password: string;
};

const EMPTY_FORM: CourierForm = {
  name: "",
  phone: "",
  city: "",
  password: "",
};

function AdminCouriers() {
  const [rows, setRows] = useState<CourierRow[]>([]);
  const [form, setForm] =
    useState<CourierForm>(EMPTY_FORM);

  const [search, setSearch] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [actionId, setActionId] =
    useState<string | null>(null);

  const [resetRow, setResetRow] =
    useState<CourierRow | null>(null);

  const [resetPassword, setResetPassword] =
    useState("");

  const [resettingPassword, setResettingPassword] =
    useState(false);

  /**
   * =========================================================
   * تحميل عمال التوصيل
   * =========================================================
   */

  const load = useCallback(
    async () => {
      setLoading(true);

      try {
        const {
          data,
          error,
        } = await supabase
          .from("couriers")
          .select(
            "id,user_id,name,phone,city,is_active,account_enabled,created_at",
          )
          .order("name");

        if (error) {
          throw error;
        }

        const courierRows =
          (data ?? []) as Array<
            Omit<
              CourierRow,
              "orders_count"
            >
          >;

        /**
         * orders يحتوي على courier_id بالفعل.
         *
         * لا نفترض وجود أعمدة أخرى داخل orders.
         */
        const {
          data: orders,
          error:
            ordersError,
        } = await supabase
          .from("orders")
          .select("courier_id")
          .not(
            "courier_id",
            "is",
            null,
          );

        if (ordersError) {
          /**
           * في حال تعذر تحميل إحصائيات الطلبات،
           * لا نفشل صفحة المندوبين بالكامل.
           */
          console.error(
            "[AdminCouriers] Orders statistics error:",
            ordersError,
          );
        }

        const counts =
          new Map<
            string,
            number
          >();

        for (
          const order of
            orders ?? []
        ) {
          if (
            !order.courier_id
          ) {
            continue;
          }

          counts.set(
            order.courier_id,
            (counts.get(
              order.courier_id,
            ) ?? 0) + 1,
          );
        }

        setRows(
          courierRows.map(
            (courier) => ({
              ...courier,
              orders_count:
                counts.get(
                  courier.id,
                ) ?? 0,
            }),
          ),
        );
      } catch (error) {
        console.error(
          "[AdminCouriers] Load error:",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تحميل عمال التوصيل.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);


  /**
   * =========================================================
   * البحث
   * =========================================================
   */

  const filteredRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return rows;
      }

      return rows.filter(
        (row) =>
          row.name
            .toLowerCase()
            .includes(query) ||
          (row.phone ?? "")
            .toLowerCase()
            .includes(query) ||
          (row.city ?? "")
            .toLowerCase()
            .includes(query),
      );
    }, [
      rows,
      search,
    ]);


  /**
   * =========================================================
   * إنشاء عامل توصيل + حساب Auth
   * =========================================================
   */

  async function addCourier() {
    if (
      !form.name.trim()
    ) {
      toast.error(
        "أدخل اسم عامل التوصيل.",
      );
      return;
    }

    if (
      !form.phone.trim()
    ) {
      toast.error(
        "أدخل رقم الهاتف.",
      );
      return;
    }

    if (!form.city) {
      toast.error(
        "اختر المحافظة.",
      );
      return;
    }

    if (
      form.password.length < 8
    ) {
      toast.error(
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
      );
      return;
    }

    setSaving(true);

    try {
      const result =
        await createManagedAccount({
          data: {
            accountType:
              "courier",
            name:
              form.name.trim(),
            phone:
              form.phone.trim(),
            city:
              form.city,
            password:
              form.password,
            recordId:
              null,
          },
        });

      if (
        !result?.ok
      ) {
        throw new Error(
          "تعذر إنشاء حساب عامل التوصيل.",
        );
      }

      toast.success(
        "تم إنشاء عامل التوصيل وحساب الدخول بنجاح.",
      );

      setForm(
        EMPTY_FORM,
      );

      await load();
    } catch (error) {
      console.error(
        "[AdminCouriers] Create error:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر إنشاء عامل التوصيل.",
      );
    } finally {
      setSaving(false);
    }
  }


  /**
   * =========================================================
   * تفعيل / تعطيل حالة المندوب
   * =========================================================
   *
   * is_active = حالة المندوب التشغيلية.
   *
   * account_enabled = حالة حساب الدخول.
   *
   * لا نخلط بينهما.
   */

  async function toggleAvailability(
    row: CourierRow,
  ) {
    setActionId(row.id);

    try {
      const {
        error,
      } = await supabase
        .from("couriers")
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

      toast.success(
        row.is_active
          ? "تم جعل المندوب غير متاح."
          : "تم تفعيل المندوب.",
      );

      await load();
    } catch (error) {
      console.error(
        "[AdminCouriers] Availability error:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تحديث حالة المندوب.",
      );
    } finally {
      setActionId(null);
    }
  }


  /**
   * =========================================================
   * تفعيل / تعطيل حساب الدخول
   * =========================================================
   */

  async function toggleAccount(
    row: CourierRow,
  ) {
    if (!row.user_id) {
      toast.error(
        "هذا المندوب لا يملك حساب دخول مرتبطاً بعد.",
      );
      return;
    }

    setActionId(row.id);

    try {
      await setManagedAccountDisabled({
        data: {
          userId:
            row.user_id,
          disabled:
            row.account_enabled,
        },
      });

      toast.success(
        row.account_enabled
          ? "تم تعطيل حساب الدخول."
          : "تم تفعيل حساب الدخول.",
      );

      await load();
    } catch (error) {
      console.error(
        "[AdminCouriers] Account status error:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تحديث حساب الدخول.",
      );
    } finally {
      setActionId(null);
    }
  }


  /**
   * =========================================================
   * إعادة تعيين كلمة المرور
   * =========================================================
   */

  async function submitPasswordReset() {
    if (!resetRow) {
      return;
    }

    if (!resetRow.user_id) {
      toast.error(
        "هذا المندوب لا يملك حساب دخول.",
      );
      return;
    }

    if (
      resetPassword.length < 8
    ) {
      toast.error(
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
      );
      return;
    }

    setResettingPassword(
      true,
    );

    try {
      await resetManagedAccountPassword({
        data: {
          userId:
            resetRow.user_id,
          password:
            resetPassword,
        },
      });

      toast.success(
        "تم تغيير كلمة المرور بنجاح.",
      );

      setResetRow(null);
      setResetPassword("");
    } catch (error) {
      console.error(
        "[AdminCouriers] Password reset error:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تغيير كلمة المرور.",
      );
    } finally {
      setResettingPassword(
        false,
      );
    }
  }


  /**
   * =========================================================
   * حذف المندوب
   * =========================================================
   *
   * إذا كان مرتبطاً بحساب Auth، لا نحذفه.
   * نحتفظ بالسجل التاريخي للطلبات والحساب.
   */

  async function remove(
    row: CourierRow,
  ) {
    if (row.user_id) {
      toast.error(
        "لا يمكن حذف مندوب مرتبط بحساب دخول. عطّل الحساب والمندوب بدلاً من حذفه.",
      );
      return;
    }

    if (
      row.orders_count > 0
    ) {
      toast.error(
        "لا يمكن حذف مندوب لديه طلبات مسجلة. عطّل المندوب بدلاً من حذفه.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `هل تريد حذف ${row.name}؟`,
      );

    if (!confirmed) {
      return;
    }

    setActionId(row.id);

    try {
      const {
        error,
      } = await supabase
        .from("couriers")
        .delete()
        .eq(
          "id",
          row.id,
        );

      if (error) {
        throw error;
      }

      toast.success(
        "تم حذف عامل التوصيل.",
      );

      await load();
    } catch (error) {
      console.error(
        "[AdminCouriers] Delete error:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حذف عامل التوصيل.",
      );
    } finally {
      setActionId(null);
    }
  }


  /**
   * =========================================================
   * إحصائيات الصفحة
   * =========================================================
   */

  const total =
    rows.length;

  const active =
    rows.filter(
      (row) =>
        row.is_active,
    ).length;

  const accounts =
    rows.filter(
      (row) =>
        row.user_id &&
        row.account_enabled,
    ).length;

  const assignedOrders =
    rows.reduce(
      (
        totalOrders,
        row,
      ) =>
        totalOrders +
        row.orders_count,
      0,
    );


  return (
    <div
      dir="rtl"
      className="space-y-4"
    >
      {/* =====================================================
          العنوان
      ===================================================== */}

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">
          إدارة عمال التوصيل
        </h1>

        <p className="text-sm text-muted-foreground">
          إدارة المندوبين وحسابات الدخول والطلبات المسندة
          إليهم.
        </p>
      </div>


      {/* =====================================================
          الإحصائيات
      ===================================================== */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="إجمالي المندوبين"
          value={total}
        />

        <StatCard
          label="المتاحون"
          value={active}
        />

        <StatCard
          label="حسابات مفعّلة"
          value={accounts}
        />

        <StatCard
          label="الطلبات المسندة"
          value={assignedOrders}
        />
      </div>


      {/* =====================================================
          إضافة مندوب
      ===================================================== */}

      <AdminCard title="إضافة عامل توصيل">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="الاسم">
              <input
                className={inputCls}
                value={
                  form.name
                }
                maxLength={100}
                autoComplete="name"
                placeholder="اسم عامل التوصيل"
                onChange={(event) =>
                  setForm({
                    ...form,
                    name:
                      event.target
                        .value,
                  })
                }
              />
            </Field>

            <Field label="رقم الهاتف">
              <input
                dir="ltr"
                inputMode="tel"
                className={inputCls}
                value={
                  form.phone
                }
                maxLength={20}
                autoComplete="tel"
                placeholder="77xxxxxxx"
                onChange={(event) =>
                  setForm({
                    ...form,
                    phone:
                      event.target
                        .value,
                  })
                }
              />
            </Field>

            <Field label="المحافظة">
              <select
                className={inputCls}
                value={
                  form.city
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    city:
                      event.target
                        .value,
                  })
                }
              >
                <option value="">
                  اختر المحافظة
                </option>

                {YEMEN_GOVERNORATES.map(
                  (city) => (
                    <option
                      key={city}
                      value={city}
                    >
                      {city}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="كلمة مرور الدخول">
              <input
                dir="ltr"
                type="password"
                className={inputCls}
                value={
                  form.password
                }
                maxLength={72}
                autoComplete="new-password"
                placeholder="8 أحرف على الأقل"
                onChange={(event) =>
                  setForm({
                    ...form,
                    password:
                      event.target
                        .value,
                  })
                }
              />
            </Field>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-xs leading-6 text-muted-foreground">
            سيتم إنشاء حساب دخول حقيقي لعامل التوصيل
            وربطه تلقائياً بسجله. يمكن للمندوب استخدام
            رقم هاتفه لتسجيل الدخول بالطريقة المعتمدة
            في نظام المصادقة.
          </div>

          <button
            type="button"
            className={btnCls}
            disabled={saving}
            onClick={() =>
              void addCourier()
            }
          >
            {saving
              ? "جاري إنشاء الحساب..."
              : "إضافة عامل التوصيل"}
          </button>
        </div>
      </AdminCard>


      {/* =====================================================
          القائمة
      ===================================================== */}

      <AdminCard
        title={`عمال التوصيل (${filteredRows.length.toLocaleString(
          "ar-EG",
        )})`}
      >
        <div className="mb-4">
          <input
            className={inputCls}
            value={search}
            placeholder="بحث بالاسم أو الهاتف أو المحافظة..."
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />
        </div>

        {loading ? (
          <div className="rounded-xl border border-border/70 p-6 text-center text-sm text-muted-foreground">
            جاري تحميل عمال التوصيل...
          </div>
        ) : filteredRows.length ===
          0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              لا يوجد عمال توصيل
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              أضف أول عامل توصيل من النموذج أعلاه.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredRows.map(
              (row) => {
                const busy =
                  actionId ===
                  row.id;

                return (
                  <li
                    key={row.id}
                    className="rounded-2xl border border-border/70 bg-card p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      {/* المعلومات الأساسية */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-foreground">
                            {row.name}
                          </p>

                          <StatusBadge
                            active={
                              row.is_active
                            }
                            activeLabel="متاح"
                            inactiveLabel="غير متاح"
                          />

                          <StatusBadge
                            active={
                              Boolean(
                                row.user_id,
                              ) &&
                              row.account_enabled
                            }
                            activeLabel="حساب مفعّل"
                            inactiveLabel={
                              row.user_id
                                ? "حساب معطل"
                                : "بدون حساب"
                            }
                          />
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span dir="ltr">
                            {row.phone ||
                              "لا يوجد هاتف"}
                          </span>

                          <span>
                            {row.city ||
                              "لا توجد محافظة"}
                          </span>

                          <span>
                            {row.orders_count.toLocaleString(
                              "ar-EG",
                            )}{" "}
                            طلب مسند
                          </span>
                        </div>
                      </div>


                      {/* الإجراءات */}

                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        <button
                          type="button"
                          className={btnGhostCls}
                          disabled={busy}
                          onClick={() =>
                            void toggleAvailability(
                              row,
                            )
                          }
                        >
                          {row.is_active
                            ? "جعل غير متاح"
                            : "تفعيل المندوب"}
                        </button>

                        {row.user_id ? (
                          <>
                            <button
                              type="button"
                              className={btnGhostCls}
                              disabled={busy}
                              onClick={() =>
                                void toggleAccount(
                                  row,
                                )
                              }
                            >
                              {row.account_enabled
                                ? "تعطيل الحساب"
                                : "تفعيل الحساب"}
                            </button>

                            <button
                              type="button"
                              className={btnGhostCls}
                              disabled={busy}
                              onClick={() => {
                                setResetRow(
                                  row,
                                );
                                setResetPassword(
                                  "",
                                );
                              }}
                            >
                              تغيير كلمة المرور
                            </button>
                          </>
                        ) : null}

                        <button
                          type="button"
                          className={btnGhostCls}
                          disabled={
                            busy ||
                            Boolean(
                              row.user_id,
                            ) ||
                            row.orders_count >
                              0
                          }
                          onClick={() =>
                            void remove(
                              row,
                            )
                          }
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        )}
      </AdminCard>


      {/* =====================================================
          نافذة تغيير كلمة المرور
      ===================================================== */}

      {resetRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                تغيير كلمة المرور
              </h2>

              <p className="text-sm text-muted-foreground">
                تغيير كلمة مرور حساب:
                {" "}
                {resetRow.name}
              </p>
            </div>

            <div className="mt-5">
              <Field label="كلمة المرور الجديدة">
                <input
                  dir="ltr"
                  type="password"
                  autoFocus
                  className={inputCls}
                  value={
                    resetPassword
                  }
                  maxLength={72}
                  autoComplete="new-password"
                  placeholder="8 أحرف على الأقل"
                  onChange={(event) =>
                    setResetPassword(
                      event.target
                        .value,
                    )
                  }
                />
              </Field>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={btnGhostCls}
                disabled={
                  resettingPassword
                }
                onClick={() => {
                  setResetRow(
                    null,
                  );
                  setResetPassword(
                    "",
                  );
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                className={btnCls}
                disabled={
                  resettingPassword
                }
                onClick={() =>
                  void submitPasswordReset()
                }
              >
                {resettingPassword
                  ? "جاري الحفظ..."
                  : "حفظ كلمة المرور"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


/**
 * =========================================================
 * بطاقة إحصائية
 * =========================================================
 */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-foreground">
        {value.toLocaleString(
          "ar-EG",
        )}
      </p>
    </div>
  );
}


/**
 * =========================================================
 * Badge
 * =========================================================
 */

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={
        active
          ? "rounded-full bg-brand-soft px-2 py-0.5 text-xs text-primary"
          : "rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
      }
    >
      {active
        ? activeLabel
        : inactiveLabel}
    </span>
  );
}
