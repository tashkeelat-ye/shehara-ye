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
  CheckCircle2,
  RefreshCw,
  Wallet,
  History,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
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
  label: string;
  recipient_name: string;
  phone: string;
  city: string;
  district: string;
  details: string;
  is_default: boolean;
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
    async () => {
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

        setRows(
          profilesResult.data ??
            [],
        );

        setVendors(
          vendorsResult.data ??
            [],
        );

        const map: Record<
          string,
          string[]
        > = {};

        for (const row of
          rolesResult.data ??
          []) {
          map[row.user_id] =
            [
              ...(map[
                row.user_id
              ] ?? []),
              row.role,
            ];
        }

        setRoles(map);
      } catch (error) {
        console.error(
          "[AdminUsers] load failed:",
          error,
        );

        toast.error(
          "تعذّر تحميل المستخدمين.",
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

  const roleOf = (
    id: string,
  ) => {
    return roles[id]?.length
      ? roles[id]
      : ["customer"];
  };

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
      roles,
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
      roles,
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
    setLoadingDetails(true);

    try {
      const [
        addressResult,
        transactionResult,
      ] = await Promise.all([
        supabase
          .from("addresses")
          .select(
            "id,label,recipient_name,phone,city,district,details,is_default",
          )
          .eq(
            "user_id",
            row.id,
          )
          .order(
            "is_default",
            {
              ascending: false,
            },
          )
          .returns<AddressRow[]>(),

        supabase
          .from(
            "wallet_transactions",
          )
          .select(
            "id,amount,balance_before,balance_after,transaction_type,reason,created_at",
          )
          .eq(
            "user_id",
            row.id,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .returns<TransactionRow[]>(),
      ]);

      if (addressResult.error) {
        throw addressResult.error;
      }

      if (
        transactionResult.error
      ) {
        throw transactionResult.error;
      }

      setAddresses(
        addressResult.data ??
          [],
      );

      setTransactions(
        transactionResult.data ??
          [],
      );
    } catch (error) {
      console.error(
        "[AdminUsers] details failed:",
        error,
      );

      toast.error(
        "تعذّر تحميل تفاصيل الحساب.",
      );
    } finally {
      setLoadingDetails(false);
    }
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
      const { error } =
        await supabase.rpc(
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

      await load();

      const updated =
        rows.find(
          (row) =>
            row.id ===
            selected.id,
        );

      if (updated) {
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
        error instanceof Error
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
      const { data, error } =
        await supabase.rpc(
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

      void data;

      toast.success(
        row.is_disabled
          ? "تم تفعيل الحساب."
          : "تم تعطيل الحساب.",
      );

      await load();

      if (
        selected?.id ===
        row.id
      ) {
        const refreshed =
          rows.find(
            (item) =>
              item.id ===
              row.id,
          );

        if (refreshed) {
          await openDetails(
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
        error instanceof Error
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
        </div>
      </AdminCard>

      {selected ? (
        <AdminCard
          title={`ملف الحساب: ${
            selected.full_name ||
            "بدون اسم"
          }`}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-border p-4">
              <h3 className="font-bold">
                البيانات الشخصية
              </h3>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
                <Info
                  icon={User}
                  label="الاسم الكامل"
                  value={
                    selected.full_name
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
                  label="البريد"
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
                    selected.first_name
                  }
                />

                <Info
                  icon={User}
                  label="اسم الأب"
                  value={
                    selected.second_name
                  }
                />

                <Info
                  icon={User}
                  label="اسم العائلة"
                  value={
                    selected.last_name
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

            <section className="rounded-2xl border border-border p-4">
              <h3 className="font-bold">
                المحفظة
              </h3>

              <p className="mt-3 text-2xl font-black text-primary">
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
                        event.target
                          .value as
                          | "delta"
                          | "set",
                      )
                    }
                    className="h-10 w-full rounded-xl border border-border bg-secondary px-3"
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
                        event.target
                          .value,
                      )
                    }
                    placeholder={
                      walletMode ===
                      "set"
                        ? "الرصيد النهائي"
                        : "مثال: 1000 أو -500"
                    }
                    className="h-10 w-full rounded-xl border border-border bg-secondary px-3"
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
                      event.target
                        .value,
                    )
                  }
                  placeholder="سبب إضافة أو خصم الرصيد..."
                  className="h-10 w-full rounded-xl border border-border bg-secondary px-3"
                />
              </label>

              <button
                type="button"
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
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

            <section className="rounded-2xl border border-border p-4">
              <h3 className="font-bold">
                المتجر المرتبط بالحساب
              </h3>

              {selectedVendor ? (
                <div className="mt-4 space-y-2 text-xs">
                  <Info
                    icon={Store}
                    label="اسم المتجر"
                    value={
                      selectedVendor.name
                    }
                  />

                  <Info
                    icon={MapPin}
                    label="المدينة"
                    value={
                      selectedVendor.city
                    }
                  />

                  <Info
                    icon={Phone}
                    label="الهاتف"
                    value={
                      selectedVendor.phone
                    }
                    dir="ltr"
                  />

                  <p>
                    {selectedVendor.description ||
                      "لا يوجد وصف."}
                  </p>

                  <div className="flex gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-1">
                      {selectedVendor.is_active &&
                      selectedVendor.account_enabled
                        ? "مفعّل"
                        : "غير مفعّل"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">
                  لا يوجد متجر مرتبط بهذا الحساب.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-border p-4">
              <h3 className="font-bold">
                عناوين العميل
              </h3>

              {loadingDetails ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  جارٍ التحميل...
                </p>
              ) : addresses.length ===
                0 ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  لا توجد عناوين مسجلة.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {addresses.map(
                    (address) => (
                      <div
                        key={
                          address.id
                        }
                        className="rounded-xl bg-secondary p-3 text-xs"
                      >
                        <p className="font-bold">
                          {address.label}
                          {address.is_default
                            ? " · الافتراضي"
                            : ""}
                        </p>

                        <p className="mt-1">
                          {address.recipient_name}
                        </p>

                        <p
                          dir="ltr"
                          className="mt-1"
                        >
                          {address.phone}
                        </p>

                        <p className="mt-1">
                          {address.city}
                          {address.district
                            ? ` · ${address.district}`
                            : ""}
                        </p>

                        <p className="mt-1">
                          {address.details ||
                            "لا توجد تفاصيل"}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="lg:col-span-2 rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />

                <h3 className="font-bold">
                  سجل معاملات المحفظة
                </h3>
              </div>

              {loadingDetails ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  جارٍ تحميل السجل...
                </p>
              ) : transactions.length ===
                0 ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  لا توجد معاملات مسجلة.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {transactions.map(
                    (transaction) => (
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
                                  : transaction.transaction_type}
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
        </AdminCard>
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
      <p className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>

      <p
        dir={dir}
        className="mt-1 font-medium"
      >
        {value}
      </p>
    </div>
  );
}
