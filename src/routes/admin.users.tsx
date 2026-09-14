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
  Search,
  Shield,
  User,
  Store,
  Ban,
  RefreshCw,
  Wallet,
  History,
  MapPin,
  Phone,
  Mail,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AdminCard,
  btnGhostCls,
} from "@/components/admin-ui";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/db";

export const Route =
  createFileRoute(
    "/admin/users",
  )({
    component:
      AdminUsers,
  });

type Row = {
  id: string;
  full_name: string;
  first_name: string;
  second_name: string;
  last_name: string;
  phone: string | null;
  contact_email: string | null;
  province: string;
  wallet_balance: number;
  is_disabled: boolean;
  accepted_terms: boolean;
  created_at: string;
};

type RoleRow = {
  user_id: string;
  role: string;
};

type VendorRow = {
  id: string;
  user_id: string | null;
  name: string;
  city: string;
  phone: string;
  description: string;
  is_active: boolean;
  account_enabled: boolean;
};

type AddressRow = {
  id: string;
  label?: string | null;
  recipient_name?: string | null;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  details?: string | null;
  is_default?: boolean | null;
  [key: string]: unknown;
};

type TransactionRow = {
  id: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  transaction_type: string;
  reason: string;
  created_at: string;
};

type AccountDetailsResponse = {
  addresses?: AddressRow[];
  transactions?: TransactionRow[];
};

type Filter =
  | "all"
  | "customer"
  | "vendor"
  | "admin"
  | "disabled";

function AdminUsers() {
  const [rows, setRows] =
    useState<Row[]>([]);

  const [roles, setRoles] =
    useState<
      Record<
        string,
        string[]
      >
    >({});

  const [vendors, setVendors] =
    useState<
      VendorRow[]
    >([]);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<Filter>("all");

  const [loading, setLoading] =
    useState(true);

  const [selected, setSelected] =
    useState<Row | null>(null);

  const [selectedVendor, setSelectedVendor] =
    useState<VendorRow | null>(null);

  const [addresses, setAddresses] =
    useState<AddressRow[]>([]);

  const [transactions, setTransactions] =
    useState<TransactionRow[]>([]);

  const [loadingDetails, setLoadingDetails] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState<string | null>(null);

  const [walletAmount, setWalletAmount] =
    useState("");

  const [walletReason, setWalletReason] =
    useState("");

  const [walletMode, setWalletMode] =
    useState<
      "delta" | "set"
    >("delta");

  const [walletBusy, setWalletBusy] =
    useState(false);

  const [busyId, setBusyId] =
    useState<string | null>(null);

  const load = useCallback(
    async (): Promise<Row[]> => {
      setLoading(true);

      try {
        const [
          profilesResult,
          rolesResult,
          vendorsResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id,full_name,first_name,second_name,last_name,phone,contact_email,province,wallet_balance,is_disabled,accepted_terms,created_at",
            )
            .order(
              "created_at",
              {
                ascending: false,
              },
            )
            .returns<Row[]>(),

          supabase
            .from("user_roles")
            .select(
              "user_id,role",
            )
            .returns<RoleRow[]>(),

          supabase
            .from("vendors")
            .select(
              "id,user_id,name,city,phone,description,is_active,account_enabled",
            )
            .returns<VendorRow[]>(),
        ]);

        if (profilesResult.error) {
          throw profilesResult.error;
        }

        if (rolesResult.error) {
          throw rolesResult.error;
        }

        if (vendorsResult.error) {
          throw vendorsResult.error;
        }

        const nextRows =
          profilesResult.data ??
          [];

        const nextVendors =
          vendorsResult.data ??
          [];

        setRows(nextRows);
        setVendors(nextVendors);

        const map: Record<
          string,
          string[]
        > = {};

        for (
          const row of
            rolesResult.data ??
            []
        ) {
          map[row.user_id] =
            [
              ...(map[
                row.user_id
              ] ?? []),
              row.role,
            ];
        }

        setRoles(map);

        return nextRows;
      } catch (error) {
        console.error(
          "[AdminUsers] load failed:",
          error,
        );

        toast.error(
          "تعذّر تحميل المستخدمين.",
        );

        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const roleOf = useCallback(
    (
      id: string,
    ) => {
      return roles[id]?.length
        ? roles[id]
        : ["customer"];
    },
    [roles],
  );

  const filteredRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return rows.filter(
        (row) => {
          const userRoles =
            roleOf(row.id);

          if (
            filter ===
              "disabled" &&
            !row.is_disabled
          ) {
            return false;
          }

          if (
            filter !==
              "all" &&
            filter !==
              "disabled" &&
            !userRoles.includes(
              filter,
            )
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return (
            row.full_name
              .toLowerCase()
              .includes(query) ||
            String(
              row.phone ??
                "",
            )
              .toLowerCase()
              .includes(query) ||
            String(
              row.contact_email ??
                "",
            )
              .toLowerCase()
              .includes(query)
          );
        },
      );
    }, [
      rows,
      roleOf,
      search,
      filter,
    ]);

  const stats =
    useMemo(() => {
      let customers = 0;
      let vendorCount = 0;
      let admins = 0;
      let disabled = 0;

      for (const row of rows) {
        const current =
          roleOf(row.id);

        if (
          current.includes(
            "customer",
          )
        ) {
          customers++;
        }

        if (
          current.includes(
            "vendor",
          )
        ) {
          vendorCount++;
        }

        if (
          current.includes(
            "admin",
          )
        ) {
          admins++;
        }

        if (
          row.is_disabled
        ) {
          disabled++;
        }
      }

      return {
        total: rows.length,
        customers,
        vendors: vendorCount,
        admins,
        disabled,
      };
    }, [
      rows,
      roleOf,
    ]);

  async function openDetails(
    row: Row,
  ) {
    setSelected(row);

    setSelectedVendor(
      vendors.find(
        (vendor) =>
          vendor.user_id ===
          row.id,
      ) ?? null,
    );

    setAddresses([]);
    setTransactions([]);
    setDetailsError(null);
    setLoadingDetails(true);

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        "admin_get_user_account_details",
        {
          p_user_id:
            row.id,
        },
      );

      if (error) {
        throw error;
      }

      const result =
        data as
          | AccountDetailsResponse
          | null;

      setAddresses(
        Array.isArray(
          result?.addresses,
        )
          ? result.addresses
          : [],
      );

      setTransactions(
        Array.isArray(
          result?.transactions,
        )
          ? result.transactions
          : [],
      );
    } catch (error) {
      console.error(
        "[AdminUsers] details failed:",
        error,
      );

      const message =
        error instanceof Error &&
        error.message
          ? error.message
          : "تعذّر تحميل تفاصيل الحساب.";

      setDetailsError(
        message,
      );

      toast.error(
        "تعذّر تحميل تفاصيل الحساب.",
      );
    } finally {
      setLoadingDetails(false);
    }
  }

  function closeDetails() {
    if (loadingDetails) {
      return;
    }

    setSelected(null);
    setSelectedVendor(null);
    setAddresses([]);
    setTransactions([]);
    setDetailsError(null);
  }

  async function adjustWallet() {
    if (!selected) {
      return;
    }

    const amount =
      Number(
        walletAmount,
      );

    if (
      !Number.isFinite(
        amount,
      )
    ) {
      toast.error(
        "أدخل قيمة صحيحة.",
      );
      return;
    }

    if (
      walletMode ===
        "delta" &&
      amount === 0
    ) {
      toast.error(
        "قيمة التعديل لا يمكن أن تكون صفراً.",
      );
      return;
    }

    if (
      walletMode === "set" &&
      amount < 0
    ) {
      toast.error(
        "الرصيد لا يمكن أن يكون سالباً.",
      );
      return;
    }

    setWalletBusy(true);

    try {
      const {
        error,
      } = await supabase.rpc(
        "admin_adjust_user_wallet",
        {
          p_user_id:
            selected.id,
          p_amount:
            amount,
          p_reason:
            walletReason.trim(),
          p_mode:
            walletMode,
        },
      );

      if (error) {
        throw error;
      }

      toast.success(
        "تم تحديث رصيد المحفظة وتسجيل العملية.",
      );

      setWalletAmount("");
      setWalletReason("");

      const refreshedRows =
        await load();

      const updated =
        refreshedRows.find(
          (row) =>
            row.id ===
            selected.id,
        );

      if (updated) {
        setSelected(updated);

        setSelectedVendor(
          vendors.find(
            (vendor) =>
              vendor.user_id ===
              updated.id,
          ) ?? null,
        );

        await openDetails(
          updated,
        );
      }
    } catch (error) {
      console.error(
        "[AdminUsers] wallet failed:",
        error,
      );

      toast.error(
        error instanceof Error &&
          error.message
          ? error.message
          : "تعذّر تعديل الرصيد.",
      );
    } finally {
      setWalletBusy(false);
    }
  }

  async function toggleDisabled(
    row: Row,
  ) {
    setBusyId(row.id);

    try {
      const {
        error,
      } = await supabase.rpc(
        "admin_set_user_disabled",
        {
          p_user_id:
            row.id,
          p_disabled:
            !row.is_disabled,
        },
      );

      if (error) {
        throw error;
      }

      toast.success(
        row.is_disabled
          ? "تم تفعيل الحساب."
          : "تم تعطيل الحساب.",
      );

      const refreshedRows =
        await load();

      if (
        selected?.id ===
        row.id
      ) {
        const refreshed =
          refreshedRows.find(
            (item) =>
              item.id ===
              row.id,
          );

        if (refreshed) {
          setSelected(
            refreshed,
          );
        }
      }
    } catch (error) {
      console.error(
        "[AdminUsers] toggle failed:",
        error,
      );

      toast.error(
        error instanceof Error &&
          error.message
          ? error.message
          : "تعذّر تحديث حالة الحساب.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      dir="rtl"
      className="space-y-4"
    >
      <AdminCard title="إدارة المستخدمين">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Stat
            icon={User}
            label="الإجمالي"
            value={stats.total}
          />

          <Stat
            icon={User}
            label="العملاء"
            value={
              stats.customers
            }
          />

          <Stat
            icon={Store}
            label="التجار"
            value={
              stats.vendors
            }
          />

          <Stat
            icon={Shield}
            label="الإدارة"
            value={
              stats.admins
            }
          />

          <Stat
            icon={Ban}
            label="المعطّلون"
            value={
              stats.disabled
            }
          />
        </div>
      </AdminCard>

      <AdminCard title="البحث والتصفية">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="الاسم أو الهاتف أو البريد..."
            className="h-11 w-full rounded-2xl border border-border bg-secondary px-10 text-sm outline-none"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto">
          {(
            [
              [
                "all",
                "الكل",
              ],
              [
                "customer",
                "العملاء",
              ],
              [
                "vendor",
                "التجار",
              ],
              [
                "admin",
                "الإدارة",
              ],
              [
                "disabled",
                "المعطّلون",
              ],
            ] as const
          ).map(
            ([
              value,
              label,
            ]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFilter(
                    value,
                  )
                }
                className={`shrink-0 rounded-full px-4 py-2 text-xs ${
                  filter ===
                  value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary"
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </AdminCard>

      <AdminCard
        title={`المستخدمون (${filteredRows.length})`}
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className={btnGhostCls}
            onClick={() =>
              void load()
            }
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            تحديث
          </button>
        </div>

        <div className="space-y-2">
          {filteredRows.map(
            (row) => {
              const userRoles =
                roleOf(row.id);

              return (
                <div
                  key={row.id}
                  className="rounded-2xl border border-border bg-card p-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      {userRoles.includes(
                        "vendor",
                      ) ? (
                        <Store className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {row.full_name ||
                          "بدون اسم"}
                      </p>

                      <p
                        dir="ltr"
                        className="text-xs text-muted-foreground"
                      >
                        {row.phone ||
                          "لا يوجد هاتف"}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-1">
                        {userRoles.map(
                          (role) => (
                            <span
                              key={
                                role
                              }
                              className="rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary"
                            >
                              {role ===
                              "vendor"
                                ? "تاجر"
                                : role ===
                                    "admin"
                                  ? "إدارة"
                                  : role ===
                                      "courier"
                                    ? "مندوب"
                                    : "عميل"}
                            </span>
                          ),
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-primary">
                        {formatPrice(
                          Number(
                            row.wallet_balance,
                          ) || 0,
                        )}
                      </p>

                      <p className="text-[10px] text-muted-foreground">
                        المحفظة
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[10px] ${
                        row.is_disabled
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {row.is_disabled
                        ? "معطّل"
                        : "نشط"}
                    </span>

                    <button
                      type="button"
                      className={btnGhostCls}
                      onClick={() =>
                        void openDetails(
                          row,
                        )
                      }
                    >
                      عرض التفاصيل
                    </button>

                    <button
                      type="button"
                      className={btnGhostCls}
                      disabled={
                        busyId ===
                        row.id
                      }
                      onClick={() =>
                        void toggleDisabled(
                          row,
                        )
                      }
                    >
                      {row.is_disabled
                        ? "تفعيل"
                        : "تعطيل"}
                    </button>
                  </div>
                </div>
              );
            },
          )}

          {!loading &&
          filteredRows.length ===
            0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              لا توجد حسابات مطابقة للبحث أو التصفية.
            </div>
          ) : null}
        </div>
      </AdminCard>

      {/* ======================================================
          نافذة تفاصيل الحساب
          ====================================================== */}

      {selected ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-details-title"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            {/* رأس النافذة */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h2
                  id="account-details-title"
                  className="truncate text-lg font-black sm:text-xl"
                >
                  تفاصيل الحساب
                </h2>

                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {selected.full_name ||
                    "بدون اسم"}
                </p>
              </div>

              <button
                type="button"
                aria-label="إغلاق"
                onClick={
                  closeDetails
                }
                disabled={
                  loadingDetails
                }
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary transition hover:bg-secondary/70 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* محتوى النافذة */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {loadingDetails ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />

                  <p className="text-sm font-semibold">
                    جارٍ تحميل تفاصيل الحساب...
                  </p>
                </div>
              ) : (
                <>
                  {detailsError ? (
                    <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                      <p className="font-bold text-destructive">
                        تعذّر تحميل بعض تفاصيل الحساب
                      </p>

                      <p className="mt-2 break-words text-xs text-destructive/80">
                        {detailsError}
                      </p>

                      <button
                        type="button"
                        className="mt-3 rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground"
                        onClick={() =>
                          void openDetails(
                            selected,
                          )
                        }
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : null}

                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* البيانات الشخصية */}
                    <section className="rounded-2xl border border-border p-4">
                      <h3 className="font-bold">
                        البيانات الشخصية
                      </h3>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Info
                          icon={User}
                          label="الاسم الكامل"
                          value={
                            selected.full_name ||
                            "غير مسجل"
                          }
                        />

                        <Info
                          icon={Phone}
                          label="الهاتف"
                          value={
                            selected.phone ||
                            "غير مسجل"
                          }
                          dir="ltr"
                        />

                        <Info
                          icon={Mail}
                          label="البريد الإلكتروني"
                          value={
                            selected.contact_email ||
                            "غير مسجل"
                          }
                          dir="ltr"
                        />

                        <Info
                          icon={MapPin}
                          label="المحافظة"
                          value={
                            selected.province ||
                            "غير محددة"
                          }
                        />

                        <Info
                          icon={User}
                          label="الاسم الأول"
                          value={
                            selected.first_name ||
                            "غير مسجل"
                          }
                        />

                        <Info
                          icon={User}
                          label="اسم الأب"
                          value={
                            selected.second_name ||
                            "غير مسجل"
                          }
                        />

                        <Info
                          icon={User}
                          label="اسم العائلة"
                          value={
                            selected.last_name ||
                            "غير مسجل"
                          }
                        />

                        <Info
                          icon={User}
                          label="تاريخ التسجيل"
                          value={new Date(
                            selected.created_at,
                          ).toLocaleString(
                            "ar-YE",
                          )}
                        />
                      </div>
                    </section>

                    {/* المحفظة */}
                    <section className="rounded-2xl border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />

                        <h3 className="font-bold">
                          المحفظة
                        </h3>
                      </div>

                      <p className="mt-4 text-2xl font-black text-primary">
                        {formatPrice(
                          Number(
                            selected.wallet_balance,
                          ) || 0,
                        )}
                      </p>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <label className="text-xs">
                          <span className="mb-1 block">
                            نوع العملية
                          </span>

                          <select
                            value={
                              walletMode
                            }
                            onChange={(
                              event,
                            ) =>
                              setWalletMode(
                                event
                                  .target
                                  .value as
                                  | "delta"
                                  | "set",
                              )
                            }
                            className="h-10 w-full rounded-xl border border-border bg-secondary px-3 outline-none"
                          >
                            <option value="delta">
                              إضافة / خصم
                            </option>

                            <option value="set">
                              تحديد رصيد جديد
                            </option>
                          </select>
                        </label>

                        <label className="text-xs">
                          <span className="mb-1 block">
                            القيمة
                          </span>

                          <input
                            type="number"
                            step="0.01"
                            value={
                              walletAmount
                            }
                            onChange={(
                              event,
                            ) =>
                              setWalletAmount(
                                event
                                  .target
                                  .value,
                              )
                            }
                            placeholder={
                              walletMode ===
                              "set"
                                ? "الرصيد النهائي"
                                : "مثال: 1000 أو -500"
                            }
                            className="h-10 w-full rounded-xl border border-border bg-secondary px-3 outline-none"
                          />
                        </label>
                      </div>

                      <label className="mt-2 block text-xs">
                        <span className="mb-1 block">
                          سبب العملية
                        </span>

                        <input
                          value={
                            walletReason
                          }
                          onChange={(
                            event,
                          ) =>
                            setWalletReason(
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="سبب إضافة أو خصم الرصيد..."
                          className="h-10 w-full rounded-xl border border-border bg-secondary px-3 outline-none"
                        />
                      </label>

                      <button
                        type="button"
                        className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
                        disabled={
                          walletBusy
                        }
                        onClick={() =>
                          void adjustWallet()
                        }
                      >
                        <Wallet className="h-4 w-4" />

                        {walletBusy
                          ? "جارٍ التنفيذ..."
                          : "تنفيذ العملية"}
                      </button>
                    </section>

                    {/* المتجر */}
                    <section className="rounded-2xl border border-border p-4">
                      <div className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-primary" />

                        <h3 className="font-bold">
                          المتجر المرتبط بالحساب
                        </h3>
                      </div>

                      {selectedVendor ? (
                        <div className="mt-4 space-y-4">
                          <Info
                            icon={Store}
                            label="اسم المتجر"
                            value={
                              selectedVendor.name ||
                              "غير مسجل"
                            }
                          />

                          <Info
                            icon={MapPin}
                            label="المدينة"
                            value={
                              selectedVendor.city ||
                              "غير محددة"
                            }
                          />

                          <Info
                            icon={Phone}
                            label="هاتف المتجر"
                            value={
                              selectedVendor.phone ||
                              "غير مسجل"
                            }
                            dir="ltr"
                          />

                          <div>
                            <p className="text-xs text-muted-foreground">
                              وصف المتجر
                            </p>

                            <p className="mt-1 text-sm">
                              {selectedVendor.description ||
                                "لا يوجد وصف."}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                                selectedVendor.is_active &&
                                selectedVendor.account_enabled
                                  ? "bg-primary/10 text-primary"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {selectedVendor.is_active &&
                              selectedVendor.account_enabled
                                ? "المتجر مفعّل"
                                : "المتجر غير مفعّل"}
                            </span>

                            <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-bold">
                              ID:{" "}
                              {selectedVendor.id}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl bg-secondary p-4 text-center text-xs text-muted-foreground">
                          لا يوجد متجر مرتبط بهذا الحساب.
                        </div>
                      )}
                    </section>

                    {/* العناوين */}
                    <section className="rounded-2xl border border-border p-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />

                        <h3 className="font-bold">
                          عناوين العميل
                        </h3>
                      </div>

                      {addresses.length ===
                      0 ? (
                        <div className="mt-4 rounded-xl bg-secondary p-4 text-center text-xs text-muted-foreground">
                          لا توجد عناوين مسجلة.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-2">
                          {addresses.map(
                            (
                              address,
                              index,
                            ) => (
                              <div
                                key={
                                  String(
                                    address.id ??
                                      index,
                                  )
                                }
                                className="rounded-xl bg-secondary p-3 text-xs"
                              >
                                {address.label ? (
                                  <p className="font-bold">
                                    {
                                      address.label
                                    }

                                    {address.is_default
                                      ? " · الافتراضي"
                                      : ""}
                                  </p>
                                ) : null}

                                {address.recipient_name ? (
                                  <p className="mt-1">
                                    {
                                      address.recipient_name
                                    }
                                  </p>
                                ) : null}

                                {address.phone ? (
                                  <p
                                    dir="ltr"
                                    className="mt-1"
                                  >
                                    {
                                      address.phone
                                    }
                                  </p>
                                ) : null}

                                {address.city ||
                                address.district ? (
                                  <p className="mt-1">
                                    {
                                      address.city
                                    }

                                    {address.district
                                      ? ` · ${address.district}`
                                      : ""}
                                  </p>
                                ) : null}

                                {address.details ? (
                                  <p className="mt-1">
                                    {
                                      address.details
                                    }
                                  </p>
                                ) : null}

                                {!address.label &&
                                !address.recipient_name &&
                                !address.phone &&
                                !address.city &&
                                !address.district &&
                                !address.details ? (
                                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all text-[10px]">
                                    {JSON.stringify(
                                      address,
                                      null,
                                      2,
                                    )}
                                  </pre>
                                ) : null}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </section>

                    {/* سجل المحفظة */}
                    <section className="rounded-2xl border border-border p-4 lg:col-span-2">
                      <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />

                        <h3 className="font-bold">
                          سجل معاملات المحفظة
                        </h3>
                      </div>

                      {transactions.length ===
                      0 ? (
                        <div className="mt-4 rounded-xl bg-secondary p-4 text-center text-xs text-muted-foreground">
                          لا توجد معاملات مسجلة.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-2">
                          {transactions.map(
                            (
                              transaction,
                            ) => (
                              <div
                                key={
                                  transaction.id
                                }
                                className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold">
                                    {transaction.transaction_type ===
                                    "admin_credit"
                                      ? "إضافة من الإدارة"
                                      : transaction.transaction_type ===
                                          "admin_debit"
                                        ? "خصم من الإدارة"
                                        : transaction.transaction_type ===
                                            "opening_balance"
                                          ? "رصيد افتتاحي"
                                          : transaction.transaction_type ||
                                            "معاملة"}
                                  </p>

                                  <p className="mt-1 text-muted-foreground">
                                    {transaction.reason ||
                                      "بدون سبب"}
                                  </p>

                                  <p className="mt-1 text-[10px] text-muted-foreground">
                                    {new Date(
                                      transaction.created_at,
                                    ).toLocaleString(
                                      "ar-YE",
                                    )}
                                  </p>
                                </div>

                                <p
                                  className={`font-black ${
                                    Number(
                                      transaction.amount,
                                    ) >= 0
                                      ? "text-primary"
                                      : "text-destructive"
                                  }`}
                                >
                                  {Number(
                                    transaction.amount,
                                  ) >= 0
                                    ? "+"
                                    : ""}

                                  {formatPrice(
                                    Number(
                                      transaction.amount,
                                    ),
                                  )}
                                </p>

                                <div className="text-left">
                                  <p className="text-[10px] text-muted-foreground">
                                    قبل
                                  </p>

                                  <p>
                                    {formatPrice(
                                      Number(
                                        transaction.balance_before,
                                      ),
                                    )}
                                  </p>
                                </div>

                                <div className="text-left">
                                  <p className="text-[10px] text-muted-foreground">
                                    بعد
                                  </p>

                                  <p className="font-bold">
                                    {formatPrice(
                                      Number(
                                        transaction.balance_after,
                                      ),
                                    )}
                                  </p>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </section>
                  </div>
                </>
              )}
            </div>

            {/* تذييل النافذة */}
            <div className="flex shrink-0 justify-end border-t border-border bg-card px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={
                  closeDetails
                }
                disabled={
                  loadingDetails
                }
                className="rounded-xl bg-secondary px-5 py-2.5 text-xs font-bold transition hover:bg-secondary/70 disabled:opacity-50"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-primary" />

      <p className="mt-2 text-lg font-bold">
        {value.toLocaleString(
          "ar-EG",
        )}
      </p>

      <p className="text-[10px] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: typeof User;
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />

        {label}
      </p>

      <p
        dir={dir}
        className="mt-1 break-words font-medium"
      >
        {value}
      </p>
    </div>
  );
}
