import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Bike,
  CheckCircle2,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
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
  createCourierAccount,
  listCourierAccounts,
  resetCourierPassword,
  setCourierAccountEnabled,
  setCourierActive,
  updateCourierAccount,
} from "@/lib/courier-admin.functions";

export const Route = createFileRoute(
  "/admin/couriers",
)({
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
  created_at: string | null;
  orders_count: number;
};

type FormState = {
  name: string;
  phone: string;
  city: string;
  password: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  city: "",
  password: "",
};

function AdminCouriers() {
  const [rows, setRows] = useState<CourierRow[]>(
    [],
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editing, setEditing] =
    useState<CourierRow | null>(null);

  const [form, setForm] =
    useState<FormState>(
      EMPTY_FORM,
    );

  const [resetRow, setResetRow] =
    useState<CourierRow | null>(null);

  const [resetPassword, setResetPassword] =
    useState("");

  const [resetting, setResetting] =
    useState(false);

  const [actionId, setActionId] =
    useState<string | null>(null);

  const load = useCallback(
    async () => {
      setLoading(true);

      try {
        const result =
          await listCourierAccounts();

        setRows(
          result.couriers as CourierRow[],
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

  const filteredRows = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase();

    if (!q) {
      return rows;
    }

    return rows.filter(
      (row) =>
        row.name
          .toLowerCase()
          .includes(q) ||
        (row.phone ?? "")
          .toLowerCase()
          .includes(q) ||
        (row.city ?? "")
          .toLowerCase()
          .includes(q),
    );
  }, [rows, search]);

  const total = rows.length;

  const active = rows.filter(
    (row) => row.is_active,
  ).length;

  const enabledAccounts =
    rows.filter(
      (row) =>
        row.account_enabled &&
        Boolean(row.user_id),
    ).length;

  const assignedOrders =
    rows.reduce(
      (sum, row) =>
        sum + row.orders_count,
      0,
    );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(row: CourierRow) {
    setEditing(row);

    setForm({
      name: row.name,
      phone: row.phone ?? "",
      city: row.city ?? "",
      password: "",
    });

    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function saveCourier() {
    if (!form.name.trim()) {
      toast.error("أدخل اسم عامل التوصيل.");
      return;
    }

    if (!form.phone.trim()) {
      toast.error("أدخل رقم الهاتف.");
      return;
    }

    if (!form.city) {
      toast.error("اختر المحافظة.");
      return;
    }

    if (!editing && form.password.length < 8) {
      toast.error(
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
      );
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        await updateCourierAccount({
          data: {
            courierId: editing.id,
            name: form.name.trim(),
            phone: form.phone.trim(),
            city: form.city,
          },
        });

        toast.success(
          "تم تعديل بيانات عامل التوصيل بنجاح.",
        );
      } else {
        await createCourierAccount({
          data: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            city: form.city,
            password: form.password,
          },
        });

        toast.success(
          "تم إنشاء عامل التوصيل وحساب الدخول بنجاح.",
        );
      }

      closeForm();
      await load();
    } catch (error) {
      console.error(
        "[AdminCouriers] Save error:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حفظ بيانات عامل التوصيل.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(
    row: CourierRow,
  ) {
    setActionId(row.id);

    try {
      await setCourierActive({
        data: {
          courierId: row.id,
          active: !row.is_active,
        },
      });

      toast.success(
        row.is_active
          ? "تم إيقاف العامل عن استقبال الطلبات."
          : "تم تفعيل العامل.",
      );

      await load();
    } catch (error) {
      console.error(
        "[AdminCouriers] Active status error:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تحديث حالة العامل.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function toggleAccount(
    row: CourierRow,
  ) {
    if (!row.user_id) {
      toast.error(
        "هذا العامل لا يملك حساب دخول مرتبطاً.",
      );
      return;
    }

    setActionId(row.id);

    try {
      await setCourierAccountEnabled({
        data: {
          courierId: row.id,
          enabled:
            !row.account_enabled,
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

  async function submitPasswordReset() {
    if (!resetRow) {
      return;
    }

    if (!resetPassword.trim()) {
      toast.error(
        "أدخل كلمة المرور الجديدة.",
      );
      return;
    }

    if (resetPassword.length < 8) {
      toast.error(
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
      );
      return;
    }

    setResetting(true);

    try {
      await resetCourierPassword({
        data: {
          courierId: resetRow.id,
          password: resetPassword,
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
      setResetting(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">
            إدارة عمال التوصيل
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            إنشاء وإدارة حسابات عمال التوصيل وربطها
            مباشرة بنظام الطلبات.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className={btnCls}
        >
          <Plus className="h-4 w-4" />
          إضافة عامل توصيل
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Bike className="h-5 w-5" />}
          label="إجمالي العمال"
          value={total}
        />

        <StatCard
          icon={
            <CheckCircle2 className="h-5 w-5" />
          }
          label="العاملون"
          value={active}
        />

        <StatCard
          icon={
            <ShieldCheck className="h-5 w-5" />
          }
          label="حسابات الدخول"
          value={enabledAccounts}
        />

        <StatCard
          icon={
            <UserCheck className="h-5 w-5" />
          }
          label="طلبات مسندة"
          value={assignedOrders}
        />
      </div>

      <AdminCard>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">
              العمال المسجلون
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              البيانات محفوظة في قاعدة البيانات وحساب
              الدخول مرتبط بحساب العامل.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              className={`${inputCls} pr-9`}
              placeholder="بحث بالاسم أو الهاتف أو المحافظة"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            جارٍ تحميل عمال التوصيل...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center">
            <Bike className="mx-auto h-10 w-10 text-muted-foreground" />

            <p className="mt-3 text-sm font-semibold">
              لا يوجد عمال توصيل
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              أضف أول عامل توصيل من زر «إضافة عامل توصيل».
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRows.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-border bg-secondary/30 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Bike className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">
                          {row.name}
                        </h3>

                        <StatusBadge
                          active={row.is_active}
                          label={
                            row.is_active
                              ? "نشط"
                              : "متوقف"
                          }
                        />

                        <StatusBadge
                          active={
                            row.account_enabled
                          }
                          label={
                            row.account_enabled
                              ? "دخول مفعل"
                              : "دخول معطل"
                          }
                        />
                      </div>

                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                        <span>
                          الهاتف:{" "}
                          {row.phone ?? "—"}
                        </span>

                        <span>
                          المحافظة:{" "}
                          {row.city ?? "—"}
                        </span>

                        <span>
                          الطلبات:{" "}
                          {row.orders_count}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openEdit(row)
                      }
                      className={btnGhostCls}
                    >
                      <Pencil className="h-4 w-4" />
                      تعديل
                    </button>

                    <button
                      type="button"
                      disabled={
                        actionId === row.id
                      }
                      onClick={() =>
                        void toggleActive(
                          row,
                        )
                      }
                      className={btnGhostCls}
                    >
                      {row.is_active ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}

                      {row.is_active
                        ? "إيقاف"
                        : "تفعيل"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        actionId === row.id
                      }
                      onClick={() =>
                        void toggleAccount(
                          row,
                        )
                      }
                      className={btnGhostCls}
                    >
                      <ShieldCheck className="h-4 w-4" />

                      {row.account_enabled
                        ? "تعطيل الدخول"
                        : "تفعيل الدخول"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setResetRow(row);
                        setResetPassword("");
                      }}
                      className={btnGhostCls}
                    >
                      <KeyRound className="h-4 w-4" />
                      كلمة المرور
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {showForm ? (
        <Modal
          title={
            editing
              ? "تعديل عامل التوصيل"
              : "إضافة عامل توصيل"
          }
          onClose={closeForm}
        >
          <div className="space-y-4">
            <Field
              label="اسم عامل التوصيل"
              htmlFor="courier-name"
            >
              <input
                id="courier-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={inputCls}
                placeholder="مثال: محمد أحمد"
              />
            </Field>

            <Field
              label="رقم الهاتف"
              htmlFor="courier-phone"
            >
              <input
                id="courier-phone"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value.replace(
                      /[^\d]/g,
                      "",
                    ),
                  }))
                }
                inputMode="numeric"
                dir="ltr"
                maxLength={9}
                className={inputCls}
                placeholder="7XXXXXXXX"
              />
            </Field>

            <Field
              label="المحافظة"
              htmlFor="courier-city"
            >
              <select
                id="courier-city"
                value={form.city}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                className={inputCls}
              >
                <option value="">
                  اختر المحافظة
                </option>

                {YEMEN_GOVERNORATES.map(
                  (governorate) => (
                    <option
                      key={governorate}
                      value={governorate}
                    >
                      {governorate}
                    </option>
                  ),
                )}
              </select>
            </Field>

            {!editing ? (
              <Field
                label="كلمة المرور"
                htmlFor="courier-password"
              >
                <input
                  id="courier-password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password:
                        event.target.value,
                    }))
                  }
                  maxLength={72}
                  className={inputCls}
                  placeholder="8 أحرف على الأقل"
                />
              </Field>
            ) : (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs leading-6 text-muted-foreground">
                لتغيير كلمة المرور استخدم زر
                «كلمة المرور» من بطاقة العامل.
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={closeForm}
                className={btnGhostCls}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void saveCourier()
                }
                className={btnCls}
              >
                {saving
                  ? "جارٍ الحفظ..."
                  : editing
                    ? "حفظ التعديلات"
                    : "إنشاء الحساب"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {resetRow ? (
        <Modal
          title={`تغيير كلمة مرور ${resetRow.name}`}
          onClose={() => {
            if (!resetting) {
              setResetRow(null);
              setResetPassword("");
            }
          }}
        >
          <div className="space-y-4">
            <Field
              label="كلمة المرور الجديدة"
              htmlFor="reset-courier-password"
            >
              <input
                id="reset-courier-password"
                type="password"
                value={resetPassword}
                onChange={(event) =>
                  setResetPassword(
                    event.target.value,
                  )
                }
                maxLength={72}
                className={inputCls}
                placeholder="8 أحرف على الأقل"
              />
            </Field>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                disabled={resetting}
                onClick={() => {
                  setResetRow(null);
                  setResetPassword("");
                }}
                className={btnGhostCls}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={resetting}
                onClick={() =>
                  void submitPasswordReset()
                }
                className={btnCls}
              >
                {resetting
                  ? "جارٍ التغيير..."
                  : "تغيير كلمة المرور"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}

        <span className="text-xs text-muted-foreground">
          {label}
        </span>
      </div>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
        active
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      {label}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-2xl"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-bold">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-muted-foreground"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
