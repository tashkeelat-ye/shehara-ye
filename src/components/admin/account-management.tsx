import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Activity,
  Ban,
  CheckCircle2,
  Clock3,
  Eye,
  Globe,
  History,
  Laptop,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Shield,
  Smartphone,
  Store,
  User,
  Wallet,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

type Section =
  | "users"
  | "vendors";

type UserRow = {
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
  accepted_terms?: boolean;
  created_at: string;
  roles: string[];
  vendor?: VendorRow | null;
};

type VendorRow = {
  id: string;
  user_id: string | null;
  name: string;
  city: string;
  phone: string;
  logo_url?: string | null;
  description: string;
  is_active: boolean;
  account_enabled: boolean;
  created_at: string;
  product_count?: number;
  owner?: {
    id: string;
    full_name: string;
    phone: string | null;
    contact_email: string | null;
    province: string;
    is_disabled: boolean;
    created_at: string;
  } | null;
};

type Wallet = {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
};

type Transaction = {
  id: string;
  wallet_id?: string;
  user_id?: string;
  currency?: string;
  transaction_type?: string;
  kind?: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string | null;
  reason?: string | null;
  created_at: string;
};

type ActivityData = {
  first_visit_at?: string | null;
  last_active_at?: string | null;
  last_ip?: string | null;
  ip_country?: string | null;
  ip_region?: string | null;
  ip_city?: string | null;
  device_type?: string | null;
  os_name?: string | null;
  browser_name?: string | null;
  user_agent?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy?: number | null;
  last_path?: string | null;
};

type WishlistItem = {
  id: string;
  product_id: string;
  created_at: string;
  product?: Record<
    string,
    unknown
  > | null;
};

type OrderItem = {
  id: string;
  product_id?: string | null;
  product_name?: string | null;
  product_image?: string | null;
  unit_price?: number;
  quantity?: number;
  size?: string | null;
  color?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  vendor_phone?: string | null;
  vendor_city?: string | null;
};

type Order = {
  id: string;
  order_number: string;
  invoice_number?: string | null;
  status: string;
  payment_status?: string | null;
  payment_method_code?: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  shipping_city?: string | null;
  shipping_district?: string | null;
  shipping_details?: string | null;
  created_at: string;
  updated_at?: string;
  latitude?: number | null;
  longitude?: number | null;
  items: OrderItem[];
};

type UserDetails = {
  profile: UserRow;
  roles: string[];
  vendor?: VendorRow | null;
  wallets: Wallet[];
  transactions: Transaction[];
  addresses: Record<
    string,
    unknown
  >[];
  activity: ActivityData;
  wishlist: WishlistItem[];
  orders: Order[];
  metrics: {
    order_count: number;
    total_spent: number;
    average_order_value: number;
    delivered_count: number;
    cancelled_count: number;
  };
};

type VendorDetails = {
  vendor: VendorRow;
  profile?: UserRow | null;
  wallets: Wallet[];
  transactions: Transaction[];
  activity: ActivityData;
  products: Record<
    string,
    unknown
  >[];
  metrics: {
    product_count: number;
    order_item_count: number;
    units_sold: number;
    sales_value: number;
    distinct_orders: number;
  };
};

type DbClient = typeof supabase & {
  rpc: (
    fn: string,
    args?: Record<
      string,
      unknown
    >,
  ) => Promise<{
    data: unknown;
    error: {
      message: string;
    } | null;
  }>;
};

const db =
  supabase as unknown as DbClient;

function numberValue(
  value: unknown,
): number {
  const n = Number(
    value ?? 0,
  );

  return Number.isFinite(n)
    ? n
    : 0;
}

function formatNumber(
  value: unknown,
): string {
  return new Intl.NumberFormat(
    "ar-YE",
  ).format(
    numberValue(value),
  );
}

function money(
  value: unknown,
  currency = "YER",
): string {
  return `${formatNumber(value)} ${currency}`;
}

function dateText(
  value?: string | null,
): string {
  if (!value) {
    return "غير متوفر";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "ar-YE",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function statusText(
  status?: string | null,
): string {
  const map: Record<
    string,
    string
  > = {
    pending: "قيد المراجعة",
    confirmed: "تم التأكيد",
    processing: "جاري التجهيز",
    shipped: "تم الشحن",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
    returned: "مسترجع",
    new: "جديد",
    accepted: "تم القبول",
    ready: "جاهز",
  };

  return (
    map[status ?? ""] ??
    status ??
    "غير محدد"
  );
}

function SectionBox({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b pb-3">
        {icon}
        <h3 className="font-bold">
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-3 last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">
        {label}
      </span>

      <span className="max-w-[70%] break-words text-left text-sm font-medium">
        {value || "غير متوفر"}
      </span>
    </div>
  );
}

function Metric({
  title,
  value,
  icon,
}: {
  title: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {title}
        </span>

        {icon}
      </div>

      <div className="text-lg font-black">
        {value}
      </div>
    </div>
  );
}

function isAdminRole(
  role: string,
): boolean {
  return (
    role === "admin" ||
    role === "super_admin"
  );
}

export function AccountManagement({
  initialSection,
}: {
  initialSection: Section;
}) {
  const [
    section,
    setSection,
  ] =
    useState<Section>(
      initialSection,
    );

  const [
    users,
    setUsers,
  ] =
    useState<UserRow[]>(
      [],
    );

  const [
    vendors,
    setVendors,
  ] =
    useState<VendorRow[]>(
      [],
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    selectedUser,
    setSelectedUser,
  ] =
    useState<UserDetails | null>(
      null,
    );

  const [
    selectedVendor,
    setSelectedVendor,
  ] =
    useState<VendorDetails | null>(
      null,
    );

  const [
    detailsLoading,
    setDetailsLoading,
  ] =
    useState(false);

  const [
    walletAmount,
    setWalletAmount,
  ] =
    useState("");

  const [
    walletReason,
    setWalletReason,
  ] =
    useState("");

  const [
    walletCurrency,
    setWalletCurrency,
  ] =
    useState("YER");

  const [
    walletMode,
    setWalletMode,
  ] =
    useState<
      "delta" | "set"
    >("delta");

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

  const [
    searchType,
    setSearchType,
  ] =
    useState<
      "all" | "users" | "vendors"
    >("all");

  const loadAccounts =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const [
            usersResult,
            vendorsResult,
          ] =
            await Promise.all([
              db.rpc(
                "admin_list_user_accounts",
              ),
              db.rpc(
                "admin_list_vendor_accounts",
              ),
            ]);

          if (
            usersResult.error
          ) {
            throw new Error(
              usersResult.error
                .message,
            );
          }

          if (
            vendorsResult.error
          ) {
            throw new Error(
              vendorsResult.error
                .message,
            );
          }

          const usersData =
            Array.isArray(
              usersResult.data,
            )
              ? usersResult.data
              : [];

          const vendorsData =
            Array.isArray(
              vendorsResult.data,
            )
              ? vendorsResult.data
              : [];

          const normalizedUsers =
            usersData
              .map(
                (
                  value,
                ) =>
                  value as UserRow,
              )
              .filter(
                (
                  user,
                ) =>
                  !(
                    user.roles ??
                    []
                  ).some(
                    isAdminRole,
                  ),
              );

          setUsers(
            normalizedUsers,
          );

          setVendors(
            vendorsData.map(
              (
                value,
              ) =>
                value as VendorRow,
            ),
          );
        } catch (
          error
        ) {
          console.error(
            "[AccountManagement] loadAccounts",
            error,
          );

          toast.error(
            error instanceof Error
              ? error.message
              : "تعذر تحميل الحسابات.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(
    () => {
      void loadAccounts();
    },
    [loadAccounts],
  );

  const filteredUsers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return users;
      }

      return users.filter(
        (user) =>
          [
            user.full_name,
            user.first_name,
            user.second_name,
            user.last_name,
            user.phone,
            user.contact_email,
            user.province,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(
                  value,
                )
                  .toLowerCase()
                  .includes(
                    query,
                  ),
            ),
      );
    }, [
      users,
      search,
    ]);

  const filteredVendors =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return vendors;
      }

      return vendors.filter(
        (vendor) =>
          [
            vendor.name,
            vendor.city,
            vendor.phone,
            vendor.description,
            vendor.owner
              ?.full_name,
            vendor.owner
              ?.phone,
            vendor.owner
              ?.contact_email,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(
                  value,
                )
                  .toLowerCase()
                  .includes(
                    query,
                  ),
            ),
      );
    }, [
      vendors,
      search,
    ]);

  const openUser =
    async (
      user: UserRow,
    ) => {
      setDetailsLoading(
        true,
      );

      setSelectedVendor(
        null,
      );

      try {
        const result =
          await db.rpc(
            "admin_get_user_account_details",
            {
              p_user_id:
                user.id,
            },
          );

        if (result.error) {
          throw new Error(
            result.error.message,
          );
        }

        if (
          !result.data
        ) {
          throw new Error(
            "لم تُرجع قاعدة البيانات تفاصيل الحساب.",
          );
        }

        setSelectedUser(
          result.data as UserDetails,
        );
      } catch (
        error
      ) {
        console.error(
          "[AccountManagement] openUser",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تحميل تفاصيل الحساب.",
        );
      } finally {
        setDetailsLoading(
          false,
        );
      }
    };

  const openVendor =
    async (
      vendor: VendorRow,
    ) => {
      setDetailsLoading(
        true,
      );

      setSelectedUser(
        null,
      );

      try {
        const result =
          await db.rpc(
            "admin_get_vendor_account_details",
            {
              p_vendor_id:
                vendor.id,
            },
          );

        if (result.error) {
          throw new Error(
            result.error.message,
          );
        }

        if (
          !result.data
        ) {
          throw new Error(
            "لم تُرجع قاعدة البيانات تفاصيل المتجر.",
          );
        }

        setSelectedVendor(
          result.data as VendorDetails,
        );
      } catch (
        error
      ) {
        console.error(
          "[AccountManagement] openVendor",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تحميل تفاصيل المتجر.",
        );
      } finally {
        setDetailsLoading(
          false,
        );
      }
    };

  const closeDetails =
    () => {
      if (
        detailsLoading ||
        actionLoading
      ) {
        return;
      }

      setSelectedUser(
        null,
      );

      setSelectedVendor(
        null,
      );

      setWalletAmount(
        "",
      );

      setWalletReason(
        "",
      );
    };

  const adjustWallet =
    async () => {
      if (
        !selectedUser
      ) {
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
        walletMode ===
          "set" &&
        amount < 0
      ) {
        toast.error(
          "الرصيد لا يمكن أن يكون سالباً.",
        );
        return;
      }

      setActionLoading(
        true,
      );

      try {
        const result =
          await db.rpc(
            "admin_update_wallet_balance",
            {
              p_user_id:
                selectedUser.profile
                  .id,

              p_currency:
                walletCurrency,

              p_amount:
                amount,

              p_mode:
                walletMode,

              p_reason:
                walletReason.trim(),
            },
          );

        if (result.error) {
          throw new Error(
            result.error.message,
          );
        }

        toast.success(
          "تم تعديل الرصيد وتسجيل العملية في سجل المحفظة.",
        );

        setWalletAmount(
          "",
        );

        setWalletReason(
          "",
        );

        await loadAccounts();

        const refreshed =
          await db.rpc(
            "admin_get_user_account_details",
            {
              p_user_id:
                selectedUser.profile
                  .id,
            },
          );

        if (
          !refreshed.error &&
          refreshed.data
        ) {
          setSelectedUser(
            refreshed.data as UserDetails,
          );
        }
      } catch (
        error
      ) {
        console.error(
          "[AccountManagement] wallet",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تعديل الرصيد.",
        );
      } finally {
        setActionLoading(
          false,
        );
      }
    };

  const toggleUser =
    async (
      user: UserRow,
    ) => {
      setActionLoading(
        true,
      );

      try {
        const result =
          await db.rpc(
            "admin_set_user_disabled",
            {
              p_user_id:
                user.id,

              p_disabled:
                !user.is_disabled,
            },
          );

        if (result.error) {
          throw new Error(
            result.error.message,
          );
        }

        toast.success(
          user.is_disabled
            ? "تم تفعيل الحساب."
            : "تم تعطيل الحساب.",
        );

        await loadAccounts();

        if (
          selectedUser
            ?.profile.id ===
          user.id
        ) {
          await openUser(
            {
              ...user,
              is_disabled:
                !user.is_disabled,
            },
          );
        }
      } catch (
        error
      ) {
        console.error(
          "[AccountManagement] toggleUser",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تحديث حالة الحساب.",
        );
      } finally {
        setActionLoading(
          false,
        );
      }
    };

  const toggleVendor =
    async (
      vendor: VendorRow,
    ) => {
      setActionLoading(
        true,
      );

      try {
        const result =
          await db.rpc(
            "admin_set_vendor_enabled",
            {
              p_vendor_id:
                vendor.id,

              p_enabled:
                !vendor.account_enabled,
            },
          );

        if (result.error) {
          throw new Error(
            result.error.message,
          );
        }

        toast.success(
          vendor.account_enabled
            ? "تم تعطيل المتجر."
            : "تم تفعيل المتجر.",
        );

        await loadAccounts();

        if (
          selectedVendor
            ?.vendor.id ===
          vendor.id
        ) {
          await openVendor(
            {
              ...vendor,
              account_enabled:
                !vendor.account_enabled,
              is_active:
                !vendor.is_active,
            },
          );
        }
      } catch (
        error
      ) {
        console.error(
          "[AccountManagement] toggleVendor",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تحديث حالة المتجر.",
        );
      } finally {
        setActionLoading(
          false,
        );
      }
    };

  const userStats =
    useMemo(
      () => ({
        total:
          users.length,

        disabled:
          users.filter(
            (u) =>
              u.is_disabled,
          ).length,

        withVendor:
          users.filter(
            (u) =>
              Boolean(
                u.vendor,
              ),
          ).length,
      }),
      [users],
    );

  const vendorStats =
    useMemo(
      () => ({
        total:
          vendors.length,

        active:
          vendors.filter(
            (v) =>
              v.account_enabled &&
              v.is_active,
          ).length,

        disabled:
          vendors.filter(
            (v) =>
              !v.account_enabled ||
              !v.is_active,
          ).length,

        products:
          vendors.reduce(
            (
              total,
              vendor,
            ) =>
              total +
              numberValue(
                vendor.product_count,
              ),
            0,
          ),
      }),
      [vendors],
    );

  return (
    <div
      dir="rtl"
      className="space-y-4"
    >
      {/* ======================================================
          رأس الصفحة
      ====================================================== */}

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <h1 className="text-xl font-black">
              إدارة الحسابات
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              إدارة حسابات العملاء والتجار
              والبيانات المرتبطة بها مباشرة من قاعدة البيانات.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadAccounts()
            }
            disabled={
              loading
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            تحديث البيانات
          </button>
        </div>

        {/* ====================================================
            التبويبات
        ==================================================== */}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              setSection(
                "users",
              )
            }
            className={`rounded-xl px-4 py-3 font-bold transition ${
              section ===
              "users"
                ? "bg-primary text-primary-foreground"
                : "border bg-background"
            }`}
          >
            <User className="ml-2 inline h-4 w-4" />
            حسابات المستخدمين
            <span className="mr-2 text-xs opacity-80">
              ({users.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setSection(
                "vendors",
              )
            }
            className={`rounded-xl px-4 py-3 font-bold transition ${
              section ===
              "vendors"
                ? "bg-primary text-primary-foreground"
                : "border bg-background"
            }`}
          >
            <Store className="ml-2 inline h-4 w-4" />
            حسابات التجار
            <span className="mr-2 text-xs opacity-80">
              ({vendors.length})
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================
          البحث
      ====================================================== */}

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">

          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder={
                section ===
                "users"
                  ? "ابحث بالاسم أو الهاتف أو البريد أو المحافظة..."
                  : "ابحث باسم المتجر أو الهاتف أو المدينة أو مالك المتجر..."
              }
              className="w-full rounded-xl border bg-background py-3 pl-4 pr-10 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={
              searchType
            }
            onChange={(
              event,
            ) =>
              setSearchType(
                event.target
                  .value as
                  | "all"
                  | "users"
                  | "vendors",
              )
            }
            className="rounded-xl border bg-background px-4 py-3"
          >
            <option value="all">
              الكل
            </option>

            <option value="users">
              المستخدمون
            </option>

            <option value="vendors">
              التجار
            </option>
          </select>
        </div>
      </div>

      {/* ======================================================
          إحصاءات المستخدمين
      ====================================================== */}

      {section ===
        "users" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Metric
            title="إجمالي المستخدمين"
            value={
              userStats.total
            }
            icon={
              <User className="h-5 w-5" />
            }
          />

          <Metric
            title="الحسابات المعطلة"
            value={
              userStats.disabled
            }
            icon={
              <Ban className="h-5 w-5" />
            }
          />

          <Metric
            title="لديهم متجر مرتبط"
            value={
              userStats.withVendor
            }
            icon={
              <Store className="h-5 w-5" />
            }
          />
        </div>
      )}

      {/* ======================================================
          إحصاءات التجار
      ====================================================== */}

      {section ===
        "vendors" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric
            title="إجمالي التجار"
            value={
              vendorStats.total
            }
            icon={
              <Store className="h-5 w-5" />
            }
          />

          <Metric
            title="المتاجر النشطة"
            value={
              vendorStats.active
            }
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
          />

          <Metric
            title="المتاجر المعطلة"
            value={
              vendorStats.disabled
            }
            icon={
              <Ban className="h-5 w-5" />
            }
          />

          <Metric
            title="إجمالي المنتجات"
            value={
              vendorStats.products
            }
            icon={
              <Package className="h-5 w-5" />
            }
          />
        </div>
      )}

      {/* ======================================================
          تحميل
      ====================================================== */}

      {loading && (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <RefreshCw className="mx-auto mb-3 h-7 w-7 animate-spin" />

          <p className="font-bold">
            جاري تحميل البيانات الحقيقية...
          </p>
        </div>
      )}

      {/* ======================================================
          قائمة المستخدمين
      ====================================================== */}

      {!loading &&
        section ===
          "users" && (
          <div className="grid gap-3">
            {filteredUsers.length ===
            0 ? (
              <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
                لا توجد حسابات مطابقة.
              </div>
            ) : (
              filteredUsers.map(
                (
                  user,
                ) => (
                  <div
                    key={
                      user.id
                    }
                    className="rounded-2xl border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-6 w-6 text-primary" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-black">
                            {
                              user.full_name ||
                              "بدون اسم"
                            }
                          </h3>

                          <p className="text-sm text-muted-foreground">
                            {
                              user.phone ||
                              "بدون هاتف"
                            }
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {
                              user.contact_email ||
                              "بدون بريد"
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            user.is_disabled
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {user.is_disabled
                            ? "معطل"
                            : "نشط"}
                        </span>

                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                          رصيد:{" "}
                          {money(
                            user.wallet_balance,
                          )}
                        </span>

                        {user.vendor && (
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold">
                            <Store className="ml-1 inline h-3 w-3" />
                            تاجر
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void openUser(
                              user,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                          عرض التفاصيل
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionLoading
                          }
                          onClick={() =>
                            void toggleUser(
                              user,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold hover:bg-muted disabled:opacity-50"
                        >
                          {user.is_disabled ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}

                          {user.is_disabled
                            ? "تفعيل"
                            : "تعطيل"}
                        </button>
                      </div>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        )}

      {/* ======================================================
          قائمة التجار
      ====================================================== */}

      {!loading &&
        section ===
          "vendors" && (
          <div className="grid gap-3">
            {filteredVendors.length ===
            0 ? (
              <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
                لا توجد متاجر مطابقة.
              </div>
            ) : (
              filteredVendors.map(
                (
                  vendor,
                ) => (
                  <div
                    key={
                      vendor.id
                    }
                    className="rounded-2xl border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Store className="h-6 w-6 text-primary" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-black">
                            {
                              vendor.name
                            }
                          </h3>

                          <p className="text-sm text-muted-foreground">
                            {
                              vendor.city ||
                              "بدون مدينة"
                            }
                            {" · "}
                            {
                              vendor.phone ||
                              "بدون هاتف"
                            }
                          </p>

                          <p className="text-xs text-muted-foreground">
                            المالك:{" "}
                            {
                              vendor.owner
                                ?.full_name ||
                              "غير مرتبط"
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            vendor.account_enabled &&
                            vendor.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {vendor.account_enabled &&
                          vendor.is_active
                            ? "نشط"
                            : "معطل"}
                        </span>

                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                          المنتجات:{" "}
                          {
                            vendor.product_count ??
                            0
                          }
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void openVendor(
                              vendor,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                          تفاصيل المتجر
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionLoading
                          }
                          onClick={() =>
                            void toggleVendor(
                              vendor,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold hover:bg-muted disabled:opacity-50"
                        >
                          {vendor.account_enabled &&
                          vendor.is_active ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}

                          {vendor.account_enabled &&
                          vendor.is_active
                            ? "تعطيل"
                            : "تفعيل"}
                        </button>
                      </div>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        )}

      {/* ======================================================
          نافذة تفاصيل المستخدم
      ====================================================== */}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-background shadow-2xl">

            <div className="flex shrink-0 items-center justify-between border-b bg-card p-4">
              <div>
                <h2 className="text-xl font-black">
                  تفاصيل الحساب
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {
                    selectedUser.profile.full_name ||
                    "بدون اسم"
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeDetails
                }
                className="rounded-full bg-muted p-3 hover:bg-muted/70"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              {detailsLoading && (
                <div className="mb-4 rounded-xl bg-muted p-4 text-center">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  جاري تحميل أحدث بيانات الحساب...
                </div>
              )}

              <div className="grid gap-4">

                {/* ------------------------------------------------
                    البيانات الشخصية
                ------------------------------------------------ */}

                <SectionBox
                  title="البيانات الشخصية"
                  icon={
                    <User className="h-5 w-5" />
                  }
                >
                  <div className="grid gap-2 md:grid-cols-2">
                    <DetailRow
                      label="الاسم الكامل"
                      value={
                        selectedUser.profile
                          .full_name
                      }
                    />

                    <DetailRow
                      label="رقم الهاتف"
                      value={
                        selectedUser.profile
                          .phone
                      }
                    />

                    <DetailRow
                      label="البريد الإلكتروني"
                      value={
                        selectedUser.profile
                          .contact_email
                      }
                    />

                    <DetailRow
                      label="المحافظة"
                      value={
                        selectedUser.profile
                          .province
                      }
                    />

                    <DetailRow
                      label="تاريخ التسجيل"
                      value={dateText(
                        selectedUser.profile
                          .created_at,
                      )}
                    />

                    <DetailRow
                      label="الشروط"
                      value={
                        selectedUser.profile
                          .accepted_terms
                          ? "تم القبول"
                          : "غير مؤكد"
                      }
                    />

                    <DetailRow
                      label="الأدوار"
                      value={
                        selectedUser.roles
                          ?.join(
                            "، ",
                          ) ||
                        "عميل"
                      }
                    />

                    <DetailRow
                      label="حالة الحساب"
                      value={
                        selectedUser.profile
                          .is_disabled
                          ? "معطل"
                          : "نشط"
                      }
                    />
                  </div>
                </SectionBox>

                {/* ------------------------------------------------
                    البيانات التقنية
                ------------------------------------------------ */}

                <SectionBox
                  title="البيانات التقنية والموقع"
                  icon={
                    <Laptop className="h-5 w-5" />
                  }
                >
                  <div className="grid gap-2 md:grid-cols-2">
                    <DetailRow
                      label="نوع الجهاز"
                      value={
                        selectedUser.activity
                          ?.device_type
                      }
                    />

                    <DetailRow
                      label="نظام التشغيل"
                      value={
                        selectedUser.activity
                          ?.os_name
                      }
                    />

                    <DetailRow
                      label="المتصفح"
                      value={
                        selectedUser.activity
                          ?.browser_name
                      }
                    />

                    <DetailRow
                      label="عنوان IP"
                      value={
                        selectedUser.activity
                          ?.last_ip
                      }
                    />

                    <DetailRow
                      label="الدولة"
                      value={
                        selectedUser.activity
                          ?.ip_country
                      }
                    />

                    <DetailRow
                      label="المنطقة"
                      value={
                        selectedUser.activity
                          ?.ip_region
                      }
                    />

                    <DetailRow
                      label="المدينة"
                      value={
                        selectedUser.activity
                          ?.ip_city
                      }
                    />

                    <DetailRow
                      label="آخر صفحة"
                      value={
                        selectedUser.activity
                          ?.last_path
                      }
                    />

                    <DetailRow
                      label="خط العرض"
                      value={
                        selectedUser.activity
                          ?.latitude
                      }
                    />

                    <DetailRow
                      label="خط الطول"
                      value={
                        selectedUser.activity
                          ?.longitude
                      }
                    />

                    <DetailRow
                      label="دقة الموقع"
                      value={
                        selectedUser.activity
                          ?.location_accuracy
                          ? `${selectedUser.activity.location_accuracy} متر`
                          : undefined
                      }
                    />
                  </div>
                </SectionBox>

                {/* ------------------------------------------------
                    الجلسات والزيارات
                ------------------------------------------------ */}

                <SectionBox
                  title="الزيارات والنشاط"
                  icon={
                    <Activity className="h-5 w-5" />
                  }
                >
                  <div className="grid gap-2 md:grid-cols-2">
                    <DetailRow
                      label="أول زيارة"
                      value={dateText(
                        selectedUser.activity
                          ?.first_visit_at,
                      )}
                    />

                    <DetailRow
                      label="آخر نشاط"
                      value={dateText(
                        selectedUser.activity
                          ?.last_active_at,
                      )}
                    />

                    <DetailRow
                      label="User Agent"
                      value={
                        selectedUser.activity
                          ?.user_agent
                      }
                    />
                  </div>
                </SectionBox>

                {/* ------------------------------------------------
                    المؤشرات
                ------------------------------------------------ */}

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Metric
                    title="عدد الطلبات"
                    value={
                      selectedUser.metrics
                        .order_count
                    }
                    icon={
                      <Package className="h-5 w-5" />
                    }
                  />

                  <Metric
                    title="إجمالي الإنفاق"
                    value={money(
                      selectedUser.metrics
                        .total_spent,
                    )}
                    icon={
                      <Wallet className="h-5 w-5" />
                    }
                  />

                  <Metric
                    title="متوسط الطلب"
                    value={money(
                      selectedUser.metrics
                        .average_order_value,
                    )}
                    icon={
                      <Activity className="h-5 w-5" />
                    }
                  />

                  <Metric
                    title="تم التوصيل"
                    value={
                      selectedUser.metrics
                        .delivered_count
                    }
                    icon={
                      <CheckCircle2 className="h-5 w-5" />
                    }
                  />
                </div>

                {/* ------------------------------------------------
                    المحفظة
                ------------------------------------------------ */}

                <SectionBox
                  title="المحفظة"
                  icon={
                    <Wallet className="h-5 w-5" />
                  }
                >
                  <div className="space-y-4">

                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedUser.wallets
                        .length ===
                      0 ? (
                        <div className="rounded-xl bg-muted p-4 text-sm">
                          لا توجد محفظة مسجلة.
                        </div>
                      ) : (
                        selectedUser.wallets.map(
                          (
                            wallet,
                          ) => (
                            <div
                              key={
                                wallet.id
                              }
                              className="rounded-xl border p-4"
                            >
                              <div className="text-xs text-muted-foreground">
                                {
                                  wallet.currency
                                }
                              </div>

                              <div className="mt-1 text-2xl font-black">
                                {money(
                                  wallet.balance,
                                  wallet.currency,
                                )}
                              </div>
                            </div>
                          ),
                        )
                      )}
                    </div>

                    <div className="rounded-2xl border bg-muted/30 p-4">
                      <h4 className="mb-4 font-bold">
                        تعديل الرصيد
                      </h4>

                      <div className="grid gap-3 md:grid-cols-2">

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
                          className="rounded-xl border bg-background px-4 py-3"
                        >
                          <option value="delta">
                            إضافة / خصم
                          </option>

                          <option value="set">
                            تعيين الرصيد
                          </option>
                        </select>

                        <select
                          value={
                            walletCurrency
                          }
                          onChange={(
                            event,
                          ) =>
                            setWalletCurrency(
                              event.target
                                .value,
                            )
                          }
                          className="rounded-xl border bg-background px-4 py-3"
                        >
                          <option value="YER">
                            ريال يمني
                          </option>

                          <option value="SAR">
                            ريال سعودي
                          </option>
                        </select>

                        <input
                          type="number"
                          inputMode="decimal"
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
                          placeholder="القيمة"
                          className="rounded-xl border bg-background px-4 py-3"
                        />

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
                          placeholder="سبب العملية"
                          className="rounded-xl border bg-background px-4 py-3"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={
                          actionLoading
                        }
                        onClick={() =>
                          void adjustWallet()
                        }
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
                      >
                        <Wallet className="h-4 w-4" />
                        {actionLoading
                          ? "جاري التنفيذ..."
                          : "تنفيذ العملية"}
                      </button>
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 font-bold">
                        <History className="h-5 w-5" />
                        سجل معاملات المحفظة
                      </h4>

                      {selectedUser
                        .transactions
                        .length ===
                      0 ? (
                        <div className="rounded-xl bg-muted p-4 text-center text-sm">
                          لا توجد معاملات مسجلة.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border">
                          <table className="w-full min-w-[700px] text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="p-3 text-right">
                                  التاريخ
                                </th>

                                <th className="p-3 text-right">
                                  العملية
                                </th>

                                <th className="p-3 text-right">
                                  القيمة
                                </th>

                                <th className="p-3 text-right">
                                  قبل
                                </th>

                                <th className="p-3 text-right">
                                  بعد
                                </th>

                                <th className="p-3 text-right">
                                  السبب
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {selectedUser.transactions.map(
                                (
                                  transaction,
                                ) => (
                                  <tr
                                    key={
                                      transaction.id
                                    }
                                    className="border-t"
                                  >
                                    <td className="p-3">
                                      {dateText(
                                        transaction.created_at,
                                      )}
                                    </td>

                                    <td className="p-3 font-bold">
                                      {
                                        transaction.transaction_type ||
                                        transaction.kind ||
                                        "غير محدد"
                                      }
                                    </td>

                                    <td className="p-3 font-bold">
                                      {money(
                                        transaction.amount,
                                        transaction.currency ||
                                          "YER",
                                      )}
                                    </td>

                                    <td className="p-3">
                                      {formatNumber(
                                        transaction.balance_before,
                                      )}
                                    </td>

                                    <td className="p-3">
                                      {formatNumber(
                                        transaction.balance_after,
                                      )}
                                    </td>

                                    <td className="p-3">
                                      {
                                        transaction.reason ||
                                        transaction.description ||
                                        "—"
                                      }
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </SectionBox>

                {/* ------------------------------------------------
                    المتجر المرتبط
                ------------------------------------------------ */}

                <SectionBox
                  title="المتجر المرتبط بالحساب"
                  icon={
                    <Store className="h-5 w-5" />
                  }
                >
                  {selectedUser.vendor ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <DetailRow
                        label="اسم المتجر"
                        value={
                          selectedUser
                            .vendor
                            .name
                        }
                      />

                      <DetailRow
                        label="الهاتف"
                        value={
                          selectedUser
                            .vendor
                            .phone
                        }
                      />

                      <DetailRow
                        label="المدينة"
                        value={
                          selectedUser
                            .vendor
                            .city
                        }
                      />

                      <DetailRow
                        label="الحالة"
                        value={
                          selectedUser
                            .vendor
                            .account_enabled
                            ? "مفعل"
                            : "معطل"
                        }
                      />

                      <DetailRow
                        label="الوصف"
                        value={
                          selectedUser
                            .vendor
                            .description
                        }
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl bg-muted p-4 text-center">
                      لا يوجد متجر مرتبط بهذا الحساب.
                    </div>
                  )}
                </SectionBox>

                {/* ------------------------------------------------
                    العناوين
                ------------------------------------------------ */}

                <SectionBox
                  title="عناوين العميل"
                  icon={
                    <MapPin className="h-5 w-5" />
                  }
                >
                  {selectedUser
                    .addresses
                    .length ===
                  0 ? (
                    <div className="rounded-xl bg-muted p-4 text-center">
                      لا توجد عناوين مسجلة.
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedUser.addresses.map(
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
                            className="rounded-xl border p-4"
                          >
                            {Object.entries(
                              address,
                            )
                              .filter(
                                ([
                                  ,
                                  value,
                                ]) =>
                                  value !==
                                    null &&
                                  value !==
                                    undefined &&
                                  value !==
                                    "",
                              )
                              .slice(
                                0,
                                10,
                              )
                              .map(
                                ([
                                  key,
                                  value,
                                ]) => (
                                  <DetailRow
                                    key={
                                      key
                                    }
                                    label={
                                      key
                                    }
                                    value={
                                      String(
                                        value,
                                      )
