import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
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
  Store,
  User,
  Wallet,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/db";

type Section = "users" | "vendors";

type Role = string;

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
  created_at: string;
  roles: Role[];
  vendor?: VendorRow | null;
};

type VendorRow = {
  id: string;
  user_id: string | null;
  name: string;
  city: string;
  phone: string;
  logo_url: string | null;
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
  description?: string;
  reason?: string;
  created_at: string;
};

type Activity = {
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
  product?: {
    id: string;
    name: string;
    price: number;
    old_price?: number | null;
    images?: string[];
    is_active?: boolean;
    vendor_id?: string | null;
  } | null;
};

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string;
  unit_price: number;
  quantity: number;
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
  updated_at: string;
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
  addresses: Record<string, unknown>[];
  activity: Activity;
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
  activity: Activity;
  products: Record<string, unknown>[];
  metrics: {
    order_item_count: number;
    units_sold: number;
    sales_value: number;
    distinct_orders: number;
  };
};

function formatDate(value?: string | null) {
  if (!value) {
    return "غير متوفر";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ar-YE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("ar-YE").format(
    numberValue(value),
  );
}

function money(
  value: unknown,
  currency = "YER",
) {
  return `${formatPrice(
    numberValue(value),
  )} ${currency}`;
}

function orderStatusLabel(
  status?: string | null,
) {
  const labels: Record<string, string> = {
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

  return labels[status ?? ""] ??
    status ??
    "غير محدد";
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

function MetricCard({
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
      <div className="mb-2 flex items-center justify-between gap-2">
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
) {
  return role === "admin" ||
    role === "super_admin";
}

export function AccountManagement({
  initialSection,
}: {
  initialSection: Section;
}) {
  const [section, setSection] =
    useState<Section>(
      initialSection,
    );

  const [users, setUsers] =
    useState<UserRow[]>([]);

  const [vendors, setVendors] =
    useState<VendorRow[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [selectedUser, setSelectedUser] =
    useState<UserDetails | null>(
      null,
    );

  const [selectedVendor, setSelectedVendor] =
    useState<VendorDetails | null>(
      null,
    );

  const [walletAmount, setWalletAmount] =
    useState("");

  const [walletReason, setWalletReason] =
    useState("");

  const [walletCurrency, setWalletCurrency] =
    useState("YER");

  const [walletMode, setWalletMode] =
    useState<"delta" | "set">(
      "delta",
    );

  const [actionLoading, setActionLoading] =
    useState(false);

  /*
   * ============================================================
   * تحميل قوائم الحسابات
   * ============================================================
   */

  const loadAccounts =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const [
            usersResponse,
            vendorsResponse,
          ] = await Promise.all([
            supabase.rpc(
              "admin_list_user_accounts",
            ),

            supabase.rpc(
              "admin_list_vendor_accounts",
            ),
          ]);

          if (usersResponse.error) {
            throw usersResponse.error;
          }

          if (vendorsResponse.error) {
            throw vendorsResponse.error;
          }

          const usersData =
            Array.isArray(
              usersResponse.data,
            )
              ? usersResponse.data
              : [];

          const vendorsData =
            Array.isArray(
              vendorsResponse.data,
            )
              ? vendorsResponse.data
              : [];

          setUsers(
            usersData
              .map(
                (item) =>
                  item as unknown as UserRow,
              )
              .filter(
                (user) =>
                  !(
                    user.roles ?? []
                  ).some(
                    isAdminRole,
                  ),
              ),
          );

          setVendors(
            vendorsData.map(
              (item) =>
                item as unknown as VendorRow,
            ),
          );
        } catch (error) {
          console.error(
            "[AccountManagement] loadAccounts",
            error,
          );

          toast.error(
            error instanceof Error
              ? error.message
              : "تعذر تحميل الحسابات.",
          );

          setUsers([]);
          setVendors([]);
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  /*
   * ============================================================
   * البحث
   * ============================================================
   */

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
                String(value)
                  .toLowerCase()
                  .includes(query),
            ),
      );
    }, [users, search]);

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
            vendor.owner?.full_name,
            vendor.owner?.contact_email,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(value)
                  .toLowerCase()
                  .includes(query),
            ),
      );
    }, [vendors, search]);

  /*
   * ============================================================
   * تفاصيل المستخدم
   * ============================================================
   */

  const openUserDetails =
    async (
      user: UserRow,
    ) => {
      setDetailsLoading(true);

      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "admin_get_user_account_details",
            {
              p_user_id: user.id,
            },
          );

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "لم تُرجع قاعدة البيانات تفاصيل الحساب.",
          );
        }

        setSelectedVendor(null);

        setSelectedUser(
          data as unknown as UserDetails,
        );
      } catch (error) {
        console.error(
          "[AccountManagement] openUserDetails",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تحميل تفاصيل المستخدم.",
        );
      } finally {
        setDetailsLoading(false);
      }
    };

  /*
   * ============================================================
   * تفاصيل التاجر
   * ============================================================
   */

  const openVendorDetails =
    async (
      vendor: VendorRow,
    ) => {
      setDetailsLoading(true);

      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "admin_get_vendor_account_details",
            {
              p_vendor_id: vendor.id,
            },
          );

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "لم تُرجع قاعدة البيانات تفاصيل المتجر.",
          );
        }

        setSelectedUser(null);

        setSelectedVendor(
          data as unknown as VendorDetails,
        );
      } catch (error) {
        console.error(
          "[AccountManagement] openVendorDetails",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تحميل تفاصيل التاجر.",
        );
      } finally {
        setDetailsLoading(false);
      }
    };

  /*
   * ============================================================
   * إغلاق التفاصيل
   * ============================================================
   */

  const closeDetails =
    () => {
      setSelectedUser(null);
      setSelectedVendor(null);

      setWalletAmount("");
      setWalletReason("");
    };

  /*
   * ============================================================
   * تعديل المحفظة
   * ============================================================
   */

  const updateWallet =
    async (
      userId: string,
    ) => {
      const amount =
        Number(walletAmount);

      if (
        !Number.isFinite(amount)
      ) {
        toast.error(
          "أدخل مبلغاً صحيحاً.",
        );

        return;
      }

      if (
        walletMode === "delta" &&
        amount === 0
      ) {
        toast.error(
          "مبلغ التعديل لا يمكن أن يكون صفراً.",
        );

        return;
      }

      if (
        walletMode === "set" &&
        amount < 0
      ) {
        toast.error(
          "لا يمكن تعيين رصيد سالب.",
        );

        return;
      }

      setActionLoading(true);

      try {
        const {
          error,
        } =
          await supabase.rpc(
            "admin_update_wallet_balance",
            {
              p_user_id: userId,
              p_currency:
                walletCurrency,
              p_amount: amount,
              p_mode: walletMode,
              p_reason:
                walletReason.trim() ||
                "تعديل رصيد من الإدارة",
            },
          );

        if (error) {
          throw error;
        }

        toast.success(
          "تم تحديث الرصيد بنجاح.",
        );

        setWalletAmount("");
        setWalletReason("");

        await loadAccounts();

        if (selectedUser) {
          await openUserDetails(
            selectedUser.profile,
          );
        }

        if (
          selectedVendor &&
          selectedVendor.vendor.user_id
        ) {
          await openVendorDetails(
            selectedVendor.vendor,
          );
        }
      } catch (error) {
        console.error(
          "[AccountManagement] updateWallet",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تحديث الرصيد.",
        );
      } finally {
        setActionLoading(false);
      }
    };

  /*
   * ============================================================
   * تعطيل / تفعيل المستخدم
   * ============================================================
   */

  const toggleUser =
    async (
      user: UserRow,
    ) => {
      setActionLoading(true);

      try {
        const {
          error,
        } =
          await supabase.rpc(
            "admin_set_user_disabled",
            {
              p_user_id: user.id,
              p_disabled:
                !user.is_disabled,
            },
          );

        if (error) {
          throw error;
        }

        toast.success(
          user.is_disabled
            ? "تم تفعيل الحساب."
            : "تم تعطيل الحساب.",
        );

        await loadAccounts();

        if (selectedUser) {
          await openUserDetails(
            selectedUser.profile,
          );
        }
      } catch (error) {
        console.error(
          "[AccountManagement] toggleUser",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تغيير حالة الحساب.",
        );
      } finally {
        setActionLoading(false);
      }
    };

  /*
   * ============================================================
   * تعطيل / تفعيل التاجر
   * ============================================================
   */

  const toggleVendor =
    async (
      vendor: VendorRow,
    ) => {
      setActionLoading(true);

      const enabled =
        !(
          vendor.is_active &&
          vendor.account_enabled
        );

      try {
        const {
          error,
        } =
          await supabase.rpc(
            "admin_set_vendor_enabled",
            {
              p_vendor_id:
                vendor.id,
              p_enabled: enabled,
            },
          );

        if (error) {
          throw error;
        }

        toast.success(
          enabled
            ? "تم تفعيل المتجر."
            : "تم تعطيل المتجر.",
        );

        await loadAccounts();

        if (selectedVendor) {
          await openVendorDetails(
            vendor,
          );
        }
      } catch (error) {
        console.error(
          "[AccountManagement] toggleVendor",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تغيير حالة المتجر.",
        );
      } finally {
        setActionLoading(false);
      }
    };

  /*
   * ============================================================
   * واجهة الصفحة
   * ============================================================
   */

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* Header */}

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black">
            إدارة المستخدمين والتجار
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            إدارة الحسابات والبيانات المالية والتقنية
            والطلبات من قاعدة البيانات الحقيقية.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadAccounts()
          }
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw
            className={
              loading
                ? "h-4 w-4 animate-spin"
                : "h-4 w-4"
            }
          />

          تحديث
        </button>
      </div>

      {/* Sections */}

      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setSection("users");
            setSearch("");
          }}
          className={`rounded-3xl border p-6 text-right transition ${
            section === "users"
              ? "border-primary bg-primary/5 shadow-md"
              : "bg-card hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="rounded-2xl bg-primary/10 p-3">
              <User className="h-6 w-6 text-primary" />
            </div>

            <strong className="text-3xl">
              {users.length}
            </strong>
          </div>

          <h2 className="mt-4 text-lg font-black">
            حسابات المستخدمين
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            العملاء والطلبات والمحفظة والنشاط والموقع.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setSection("vendors");
            setSearch("");
          }}
          className={`rounded-3xl border p-6 text-right transition ${
            section === "vendors"
              ? "border-primary bg-primary/5 shadow-md"
              : "bg-card hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="rounded-2xl bg-primary/10 p-3">
              <Store className="h-6 w-6 text-primary" />
            </div>

            <strong className="text-3xl">
              {vendors.length}
            </strong>
          </div>

          <h2 className="mt-4 text-lg font-black">
            حسابات التجار
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            المتاجر وأصحابها والمنتجات والمبيعات.
          </p>
        </button>
      </div>

      {/* Search */}

      <div className="rounded-2xl border bg-card p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder={
              section === "users"
                ? "ابحث بالاسم أو الهاتف أو البريد..."
                : "ابحث باسم المتجر أو الهاتف أو المدينة..."
            }
            className="w-full rounded-xl border bg-background py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Loading */}

      {loading ? (
        <div className="rounded-3xl border bg-card p-12 text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />

          <p className="font-bold">
            جاري تحميل البيانات...
          </p>
        </div>
      ) : section === "users" ? (
        /* ======================================================
         * USERS
         * ====================================================== */

        <div className="overflow-hidden rounded-3xl border bg-card">
          <div className="border-b p-5">
            <h2 className="font-black">
              حسابات المستخدمين
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {filteredUsers.length} حساب
            </p>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              لا توجد حسابات.
            </div>
          ) : (
            <div className="divide-y">
              {filteredUsers.map(
                (user) => (
                  <div
                    key={user.id}
                    className="flex flex-col gap-4 p-5 hover:bg-muted/30 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>

                      <div>
                        <div className="font-black">
                          {user.full_name ||
                            "بدون اسم"}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>
                            {user.phone ||
                              "بدون هاتف"}
                          </span>

                          <span>
                            {user.province ||
                              "بدون محافظة"}
                          </span>

                          <span>
                            {money(
                              user.wallet_balance,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          user.is_disabled
                            ? "bg-destructive/10 text-destructive"
                            : "bg-emerald-500/10 text-emerald-600"
                        }`}
                      >
                        {user.is_disabled
                          ? "معطل"
                          : "نشط"}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          void openUserDetails(
                            user,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold hover:bg-muted"
                      >
                        <Eye className="h-4 w-4" />

                        التفاصيل
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      ) : (
        /* ======================================================
         * VENDORS
         * ====================================================== */

        <div className="overflow-hidden rounded-3xl border bg-card">
          <div className="border-b p-5">
            <h2 className="font-black">
              حسابات التجار
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {filteredVendors.length} متجر
            </p>
          </div>

          {filteredVendors.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              لا توجد متاجر.
            </div>
          ) : (
            <div className="divide-y">
              {filteredVendors.map(
                (vendor) => {
                  const enabled =
                    vendor.is_active &&
                    vendor.account_enabled;

                  return (
                    <div
                      key={vendor.id}
                      className="flex flex-col gap-4 p-5 hover:bg-muted/30 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
                          {vendor.logo_url ? (
                            <img
                              src={
                                vendor.logo_url
                              }
                              alt={
                                vendor.name
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Store className="h-5 w-5 text-primary" />
                          )}
                        </div>

                        <div>
                          <div className="font-black">
                            {vendor.name}
                          </div>

                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>
                              {vendor.city ||
                                "بدون مدينة"}
                            </span>

                            <span>
                              {vendor.phone ||
                                "بدون هاتف"}
                            </span>

                            <span>
                              المنتجات:{" "}
                              {formatNumber(
                                vendor.product_count,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            enabled
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {enabled
                            ? "نشط"
                            : "معطل"}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            void openVendorDetails(
                              vendor,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />

                          التفاصيل
                        </button>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
       * DETAIL LOADING
       * ======================================================== */}

      {detailsLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="rounded-3xl bg-card p-8 text-center shadow-2xl">
            <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />

            <p className="font-bold">
              جاري تحميل التفاصيل...
            </p>
          </div>
        </div>
      )}

      {/* ========================================================
       * USER MODAL
       * ======================================================== */}

      {selectedUser && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm md:p-6"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b bg-card p-5">
              <div>
                <h2 className="text-xl font-black">
                  تفاصيل المستخدم
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {
                    selectedUser.profile
                      .full_name
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="rounded-xl p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 md:p-6">
              <div className="space-y-5">
                {/* Metrics */}

                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <MetricCard
                    title="الطلبات"
                    value={formatNumber(
                      selectedUser.metrics
                        .order_count,
                    )}
                    icon={
                      <Package className="h-4 w-4 text-primary" />
                    }
                  />

                  <MetricCard
                    title="إجمالي الإنفاق"
                    value={money(
                      selectedUser.metrics
                        .total_spent,
                    )}
                    icon={
                      <Wallet className="h-4 w-4 text-primary" />
                    }
                  />

                  <MetricCard
                    title="متوسط الطلب"
                    value={money(
                      selectedUser.metrics
                        .average_order_value,
                    )}
                    icon={
                      <History className="h-4 w-4 text-primary" />
                    }
                  />

                  <MetricCard
                    title="تم التوصيل"
                    value={formatNumber(
                      selectedUser.metrics
                        .delivered_count,
                    )}
                    icon={
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    }
                  />

                  <MetricCard
                    title="ملغاة"
                    value={formatNumber(
                      selectedUser.metrics
                        .cancelled_count,
                    )}
                    icon={
                      <Ban className="h-4 w-4 text-destructive" />
                    }
                  />
                </div>

                {/* Personal */}

                <SectionBox
                  title="البيانات الشخصية"
                  icon={
                    <User className="h-5 w-5 text-primary" />
                  }
                >
                  <DetailRow
                    label="الاسم الكامل"
                    value={
                      selectedUser.profile
                        .full_name
                    }
                  />

                  <DetailRow
                    label="الهاتف"
                    value={
                      selectedUser.profile.phone
                    }
                  />

                  <DetailRow
                    label="البريد"
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
                    value={formatDate(
                      selectedUser.profile
                        .created_at,
                    )}
                  />

                  <DetailRow
                    label="الحالة"
                    value={
                      selectedUser.profile
                        .is_disabled
                        ? "معطل"
                        : "نشط"
                    }
                  />

                  <DetailRow
                    label="الصلاحيات"
                    value={
                      selectedUser.roles?.join(
                        "، ",
                      ) ||
                      "مستخدم"
                    }
                  />
                </SectionBox>

                {/* Technical */}

                <SectionBox
                  title="1. البيانات التقنية والموقع"
                  icon={
                    <Globe className="h-5 w-5 text-primary" />
                  }
                >
                  <DetailRow
                    label="IP"
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
                    label="أول زيارة"
                    value={formatDate(
                      selectedUser.activity
                        ?.first_visit_at,
                    )}
                  />

                  <DetailRow
                    label="آخر نشاط"
                    value={formatDate(
                      selectedUser.activity
                        ?.last_active_at,
                    )}
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

                  {selectedUser.activity
                    ?.latitude != null &&
                    selectedUser.activity
                      ?.longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${selectedUser.activity.latitude},${selectedUser.activity.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold hover:bg-muted"
                      >
                        <MapPin className="h-4 w-4" />
                        فتح الموقع
                      </a>
                    )}
                </SectionBox>

                {/* Wishlist */}

                <SectionBox
                  title="2. قائمة الرغبات"
                  icon={
                    <History className="h-5 w-5 text-primary" />
                  }
                >
                  {selectedUser.wishlist
                    ?.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedUser.wishlist.map(
                        (item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border p-4"
                          >
                            <div className="font-bold">
                              {
                                item.product
                                  ?.name
                              }
                            </div>

                            <div className="mt-1 text-sm text-muted-foreground">
                              {item.product
                                ? money(
                                    item
                                      .product
                                      .price,
                                  )
                                : "غير متوفر"}
                            </div>

                            <div className="mt-1 text-xs text-muted-foreground">
                              {formatDate(
                                item.created_at,
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                      لا توجد منتجات في قائمة الرغبات.
                    </p>
                  )}
                </SectionBox>

                {/* Wallet */}

                <SectionBox
                  title="المحفظة"
                  icon={
                    <Wallet className="h-5 w-5 text-primary" />
                  }
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedUser.wallets
                      ?.length ? (
                      selectedUser.wallets.map(
                        (wallet) => (
                          <div
                            key={wallet.id}
                            className="rounded-2xl border p-4"
                          >
                            <div className="text-xs text-muted-foreground">
                              {
                                wallet.currency
                              }
                            </div>

                            <div className="mt-2 text-2xl font-black">
                              {money(
                                wallet.balance,
                                wallet.currency,
                              )}
                            </div>
                          </div>
                        ),
                      )
                    ) : (
                      <p className="rounded-xl bg-muted p-4 text-sm">
                        لا توجد محفظة.
                      </p>
                    )}
                  </div>

                  <div className="mt-5 rounded-2xl border bg-muted/30 p-4">
                    <h4 className="mb-4 font-black">
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
                        className="rounded-xl border bg-background px-3 py-3"
                      >
                        <option value="delta">
                          إضافة / خصم
                        </option>

                        <option value="set">
                          تعيين الرصيد النهائي
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
                        className="rounded-xl border bg-background px-3 py-3"
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
                        placeholder="المبلغ"
                        className="rounded-xl border bg-background px-3 py-3"
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
                        className="rounded-xl border bg-background px-3 py-3"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={
                        actionLoading ||
                        !walletAmount
                      }
                      onClick={() =>
                        void updateWallet(
                          selectedUser
                            .profile.id,
                        )
                      }
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {actionLoading && (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      )}

                      حفظ الرصيد
                    </button>
                  </div>

                  <div className="mt-5">
                    <h4 className="mb-3 font-black">
                      سجل معاملات المحفظة
                    </h4>

                    {selectedUser
                      .transactions
                      ?.length ? (
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="p-3 text-right">
                                التاريخ
                              </th>

                              <th className="p-3 text-right">
                                العملية
                              </th>

                              <th className="p-3 text-right">
                                المبلغ
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
                                    {formatDate(
                                      transaction.created_at,
                                    )}
                                  </td>

                                  <td className="p-3">
                                    {transaction.transaction_type ||
                                      transaction.kind ||
                                      "عملية"}
                                  </td>

                                  <td className="p-3 font-bold">
                                    {money(
                                      transaction.amount,
                                      transaction.currency ||
                                        "YER",
                                    )}
                                  </td>

                                  <td className="p-3">
                                    {money(
                                      transaction.balance_before,
                                      transaction.currency ||
                                        "YER",
                                    )}
                                  </td>

                                  <td className="p-3">
                                    {money(
                                      transaction.balance_after,
                                      transaction.currency ||
                                        "YER",
                                    )}
                                  </td>

                                  <td className="p-3">
                                    {transaction.description ||
                                      transaction.reason ||
                                      "—"}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                        لا توجد معاملات.
                      </p>
                    )}
                  </div>
                </SectionBox>

                {/* Orders */}

                <SectionBox
                  title="3. الطلبات والـCRM"
                  icon={
                    <Package className="h-5 w-5 text-primary" />
                  }
                >
                  {selectedUser.orders
                    ?.length ? (
                    <div className="space-y-4">
                      {selectedUser.orders.map(
                        (order) => (
                          <div
                            key={order.id}
                            className="rounded-2xl border p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="font-black">
                                  الطلب #
                                  {
                                    order.order_number
                                  }
                                </div>

                                <div className="mt-1 text-xs text-muted-foreground">
                                  {formatDate(
                                    order.created_at,
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold">
                                  {orderStatusLabel(
                                    order.status,
                                  )}
                                </span>

                                <span className="font-black">
                                  {money(
                                    order.total,
                                    order.currency,
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-2 md:grid-cols-3">
                              <DetailRow
                                label="الفاتورة"
                                value={
                                  order.invoice_number
                                }
                              />

                              <DetailRow
                                label="طريقة الدفع"
                                value={
                                  order.payment_method_code ||
                                  order.payment_status
                                }
                              />

                              <DetailRow
                                label="المدينة"
                                value={
                                  order.shipping_city
                                }
                              />
                            </div>

                            <div className="mt-4 space-y-2">
                              {order.items?.map(
                                (item) => (
                                  <div
                                    key={
                                      item.id
                                    }
                                    className="rounded-xl bg-muted/40 p-3"
                                  >
                                    <div className="font-bold">
                                      {
                                        item.product_name
                                      }
                                    </div>

                                    <div className="mt-1 text-sm text-muted-foreground">
                                      الكمية:{" "}
                                      {formatNumber(
                                        item.quantity,
                                      )}{" "}
                                      ×{" "}
                                      {money(
                                        item.unit_price,
                                        order.currency,
                                      )}
                                    </div>

                                    {item.vendor_name && (
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        المورد:{" "}
                                        {
                                          item.vendor_name
                                        }
                                      </div>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                      لا توجد طلبات.
                    </p>
                  )}
                </SectionBox>

                {/* Addresses */}

                <SectionBox
                  title="عناوين العميل"
                  icon={
                    <MapPin className="h-5 w-5 text-primary" />
                  }
                >
                  {selectedUser.addresses
                    ?.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedUser.addresses.map(
                        (
                          address,
                          index,
                        ) => (
                          <pre
                            key={
                              index
                            }
                            className="overflow-auto rounded-xl bg-muted p-4 text-xs"
                          >
                            {JSON.stringify(
                              address,
                              null,
                              2,
                            )}
                          </pre>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                      لا توجد عناوين محفوظة.
                    </p>
                  )}
                </SectionBox>

                {/* Account state */}

                <SectionBox
                  title="إدارة حالة الحساب"
                  icon={
                    selectedUser.profile
                      .is_disabled ? (
                      <Ban className="h-5 w-5 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )
                  }
                >
                  <button
                    type="button"
                    disabled={
                      actionLoading
                    }
                    onClick={() =>
                      void toggleUser(
                        selectedUser.profile,
                      )
                    }
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50 ${
                      selectedUser.profile
                        .is_disabled
                        ? "bg-emerald-600"
                        : "bg-destructive"
                    }`}
                  >
                    {selectedUser.profile
                      .is_disabled ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        تفعيل الحساب
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4" />
                        تعطيل الحساب
                      </>
                    )}
                  </button>
                </SectionBox>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
       * VENDOR MODAL
       * ======================================================== */}

      {selectedVendor && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm md:p-6"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b bg-card p-5">
              <div>
                <h2 className="text-xl font-black">
                  تفاصيل المتجر
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {
                    selectedVendor.vendor
                      .name
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="rounded-xl p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 md:p-6">
              <div className="space-y-5">
                {/* Vendor metrics */}

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <MetricCard
                    title="عمليات البيع"
                    value={formatNumber(
                      selectedVendor
                        .metrics
                        .order_item_count,
                    )}
                    icon={
                      <Package className="h-4 w-4 text-primary" />
                    }
                  />

                  <MetricCard
                    title="الوحدات المباعة"
                    value={formatNumber(
                      selectedVendor
                        .metrics
                        .units_sold,
                    )}
                    icon={
                      <Package className="h-4 w-4 text-primary" />
                    }
                  />

                  <MetricCard
                    title="قيمة المبيعات"
                    value={money(
                      selectedVendor
                        .metrics
                        .sales_value,
                    )}
                    icon={
                      <Wallet className="h-4 w-4 text-primary" />
                    }
                  />

                  <MetricCard
                    title="طلبات مختلفة"
                    value={formatNumber(
                      selectedVendor
                        .metrics
                        .distinct_orders,
                    )}
                    icon={
                      <History className="h-4 w-4 text-primary" />
                    }
                  />
                </div>

                {/* Vendor */}

                <SectionBox
                  title="بيانات المتجر"
                  icon={
                    <Store className="h-5 w-5 text-primary" />
                  }
                >
                  <DetailRow
                    label="اسم المتجر"
                    value={
                      selectedVendor.vendor
                        .name
                    }
                  />

                  <DetailRow
                    label="المدينة"
                    value={
                      selectedVendor.vendor
                        .city
                    }
                  />

                  <DetailRow
                    label="الهاتف"
                    value={
                      selectedVendor.vendor
                        .phone
                    }
                  />

                  <DetailRow
                    label="الوصف"
                    value={
                      selectedVendor.vendor
                        .description
                    }
                  />

                  <DetailRow
                    label="تاريخ التسجيل"
                    value={formatDate(
                      selectedVendor.vendor
                        .created_at,
                    )}
                  />

                  <DetailRow
                    label="حالة المتجر"
                    value={
                      selectedVendor.vendor
                        .is_active &&
                      selectedVendor.vendor
                        .account_enabled
                        ? "نشط"
                        : "معطل"
                    }
                  />

                  <DetailRow
                    label="عدد المنتجات"
                    value={formatNumber(
                      selectedVendor.vendor
                        .product_count ??
                        selectedVendor.products
                          ?.length,
                    )}
                  />
                </SectionBox>

                {/* Owner */}

                {selectedVendor.profile && (
                  <SectionBox
                    title="بيانات صاحب المتجر"
                    icon={
                      <User className="h-5 w-5 text-primary" />
                    }
                  >
                    <DetailRow
                      label="الاسم"
                      value={
                        selectedVendor
                          .profile
                          .full_name
                      }
                    />

                    <DetailRow
                      label="الهاتف"
                      value={
                        selectedVendor
                          .profile
                          .phone
                      }
                    />

                    <DetailRow
                      label="البريد"
                      value={
                        selectedVendor
                          .profile
                          .contact_email
                      }
                    />

                    <DetailRow
                      label="المحافظة"
                      value={
                        selectedVendor
                          .profile
                          .province
                      }
                    />
                  </SectionBox>
                )}

                {/* Technical */}

                <SectionBox
                  title="البيانات التقنية والنشاط"
                  icon={
                    <Laptop className="h-5 w-5 text-primary" />
                  }
                >
                  <DetailRow
                    label="IP"
                    value={
                      selectedVendor.activity
                        ?.last_ip
                    }
                  />

                  <DetailRow
                    label="الدولة"
                    value={
                      selectedVendor.activity
                        ?.ip_country
                    }
                  />

                  <DetailRow
                    label="المدينة"
                    value={
                      selectedVendor.activity
                        ?.ip_city
                    }
                  />

                  <DetailRow
                    label="نوع الجهاز"
                    value={
                      selectedVendor.activity
                        ?.device_type
                    }
                  />

                  <DetailRow
                    label="نظام التشغيل"
                    value={
                      selectedVendor.activity
                        ?.os_name
                    }
                  />

                  <DetailRow
                    label="المتصفح"
                    value={
                      selectedVendor.activity
                        ?.browser_name
                    }
                  />

                  <DetailRow
                    label="أول زيارة"
                    value={formatDate(
                      selectedVendor
                        .activity
                        ?.first_visit_at,
                    )}
                  />

                  <DetailRow
                    label="آخر نشاط"
                    value={formatDate(
                      selectedVendor
                        .activity
                        ?.last_active_at,
                    )}
                  />

                  {selectedVendor.activity
                    ?.latitude != null &&
                    selectedVendor.activity
                      ?.longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${selectedVendor.activity.latitude},${selectedVendor.activity.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold hover:bg-muted"
                      >
                        <MapPin className="h-4 w-4" />
                        فتح الموقع
                      </a>
                    )}
                </SectionBox>

                {/* Wallet */}

                <SectionBox
                  title="محفظة التاجر"
                  icon={
                    <Wallet className="h-5 w-5 text-primary" />
                  }
                >
                  {selectedVendor.wallets
                    ?.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedVendor.wallets.map(
                        (wallet) => (
                          <div
                            key={
                              wallet.id
                            }
                            className="rounded-2xl border p-4"
                          >
                            <div className="text-xs text-muted-foreground">
                              {
                                wallet.currency
                              }
                            </div>

                            <div className="mt-2 text-2xl font-black">
                              {money(
                                wallet.balance,
                                wallet.currency,
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-muted p-4 text-sm">
                      لا توجد محفظة.
                    </p>
                  )}

                  {selectedVendor.vendor
                    .user_id && (
                    <div className="mt-5 rounded-2xl border bg-muted/30 p-4">
                      <h4 className="mb-4 font-black">
                        تعديل رصيد التاجر
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
                          className="rounded-xl border bg-background px-3 py-3"
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
                          className="rounded-xl border bg-background px-3 py-3"
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
                          placeholder="المبلغ"
                          className="rounded-xl border bg-background px-3 py-3"
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
                          className="rounded-xl border bg-background px-3 py-3"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={
                          actionLoading ||
                          !walletAmount
                        }
                        onClick={() =>
                          void updateWallet(
                            selectedVendor
                              .vendor
                              .user_id!,
                          )
                        }
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
                      >
                        {actionLoading && (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        )}

                        حفظ الرصيد
                      </button>
                    </div>
                  )}

                  <div className="mt-5">
                    <h4 className="mb-3 font-black">
                      سجل المعاملات
                    </h4>

                    {selectedVendor
                      .transactions
                      ?.length ? (
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="p-3 text-right">
                                التاريخ
                              </th>

                              <th className="p-3 text-right">
                                العملية
                              </th>

                              <th className="p-3 text-right">
                                المبلغ
                              </th>

                              <th className="p-3 text-right">
                                قبل
                              </th>

                              <th className="p-3 text-right">
                                بعد
                              </th>

                              <th className="p-3 text-right">
                                الوصف
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {selectedVendor.transactions.map(
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
                                    {formatDate(
                                      transaction.created_at,
                                    )}
                                  </td>

                                  <td className="p-3">
                                    {transaction.transaction_type ||
                                      transaction.kind ||
                                      "عملية"}
                                  </td>

                                  <td className="p-3 font-bold">
                                    {money(
                                      transaction.amount,
                                      transaction.currency ||
                                        "YER",
                                    )}
                                  </td>

                                  <td className="p-3">
                                    {money(
                                      transaction.balance_before,
                                      transaction.currency ||
                                        "YER",
                                    )}
                                  </td>

                                  <td className="p-3">
                                    {money(
                                      transaction.balance_after,
                                      transaction.currency ||
                                        "YER",
                                    )}
                                  </td>

                                  <td className="p-3">
                                    {transaction.description ||
                                      transaction.reason ||
                                      "—"}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                        لا توجد معاملات.
                      </p>
                    )}
                  </div>
                </SectionBox>

                {/* Products */}

                <SectionBox
                  title="منتجات المتجر"
                  icon={
                    <Package className="h-5 w-5 text-primary" />
                  }
                >
                  {selectedVendor.products
                    ?.length ? (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {selectedVendor.products.map(
                        (
                          product,
                          index,
                        ) => {
                          const id =
                            String(
                              product.id ??
                                index,
                            );

                          const name =
                            String(
                              product.name ??
                                "منتج بدون اسم",
                            );

                          const price =
                            numberValue(
                              product.price,
                            );

                          const images =
                            Array.isArray(
                              product.images,
                            )
                              ? product.images
                              : [];

                          return (
                            <div
                              key={id}
                              className="overflow-hidden rounded-2xl border"
                            >
                              {images[0] && (
                                <img
                                  src={String(
                                    images[0],
                                  )}
                                  alt={name}
                                  className="h-40 w-full object-cover"
                                />
                              )}

                              <div className="p-4">
                                <div className="font-bold">
                                  {name}
                                </div>

                                <div className="mt-2 font-black">
                                  {money(
                                    price,
                                  )}
                                </div>

                                <div className="mt-2 text-xs text-muted-foreground">
                                  {product.is_active
                                    ? "منتج نشط"
                                    : "منتج غير نشط"}
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                      لا توجد منتجات مرتبطة بهذا المتجر.
                    </p>
                  )}
                </SectionBox>

                {/* Vendor status */}

                <SectionBox
                  title="إدارة حالة المتجر"
                  icon={
                    selectedVendor.vendor
                      .is_active &&
                    selectedVendor.vendor
                      .account_enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Ban className="h-5 w-5 text-destructive" />
                    )
                  }
                >
                  <button
                    type="button"
                    disabled={
                      actionLoading
                    }
                    onClick={() =>
                      void toggleVendor(
                        selectedVendor.vendor,
                      )
                    }
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50 ${
                      selectedVendor.vendor
                        .is_active &&
                      selectedVendor.vendor
                        .account_enabled
                        ? "bg-destructive"
                        : "bg-emerald-600"
                    }`}
                  >
                    {selectedVendor.vendor
                      .is_active &&
                    selectedVendor.vendor
                      .account_enabled ? (
                      <>
                        <Ban className="h-4 w-4" />
                        تعطيل المتجر
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        تفعيل المتجر
                      </>
                    )}
                  </button>
                </SectionBox>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
