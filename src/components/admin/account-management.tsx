import {
  useCallback,
  useEffect,
  useMemo,
  useState,
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
  Phone,
  RefreshCw,
  Search,
  Smartphone,
  Store,
  User,
  Wallet,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/db";

type Section = "users" | "vendors";

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
  logo_url: string | null;
  description: string;
  is_active: boolean;
  account_enabled: boolean;
  created_at: string;
};

type Wallet = {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
};

type Transaction = {
  id: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  currency?: string;
  transaction_type?: string;
  kind?: string;
  description?: string;
  reason?: string;
  created_at: string;
};

type Activity = {
  first_visit_at?: string;
  last_active_at?: string;
  last_ip?: string;
  ip_country?: string;
  ip_region?: string;
  ip_city?: string;
  device_type?: string;
  os_name?: string;
  browser_name?: string;
  user_agent?: string;
  latitude?: number;
  longitude?: number;
  location_accuracy?: number;
  order_location_latitude?: number;
  order_location_longitude?: number;
  order_location_at?: string;
  last_path?: string;
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
  };
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
  vendor_name?: string;
  vendor_phone?: string;
  vendor_city?: string;
};

type Order = {
  id: string;
  order_number: string;
  invoice_number?: string | null;
  status: string;
  payment_status?: string;
  payment_method_code?: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  shipping_city?: string;
  shipping_district?: string;
  shipping_details?: string;
  created_at: string;
  updated_at: string;
  latitude?: number | null;
  longitude?: number | null;
  items: OrderItem[];
};

type UserDetails = {
  profile: UserRow;
  roles: string[];
  vendor?: VendorRow;
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
  profile?: UserRow;
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
  if (!value) return "غير متوفر";

  try {
    return new Intl.DateTimeFormat("ar-YE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatNumber(value: unknown) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) return "0";

  return new Intl.NumberFormat("ar-YE").format(number);
}

function money(value: unknown, currency = "YER") {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) return `0 ${currency}`;

  return `${formatPrice(number)} ${currency}`;
}

function statusLabel(status?: string) {
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

  return labels[status ?? ""] ?? status ?? "غير محدد";
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[65%] break-words text-left text-sm font-medium">
        {value || "غير متوفر"}
      </span>
    </div>
  );
}

function SectionBox({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b pb-3">
        {icon}
        <h3 className="font-bold">{title}</h3>
      </div>

      {children}
    </section>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{title}</span>
        {icon}
      </div>

      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

export function AccountManagement({
  initialSection,
}: {
  initialSection: Section;
}) {
  const [section, setSection] =
    useState<Section>(initialSection);

  const [users, setUsers] =
    useState<UserRow[]>([]);

  const [vendors, setVendors] =
    useState<VendorRow[]>([]);

  const [roles, setRoles] =
    useState<Record<string, string[]>>({});

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [selectedUser, setSelectedUser] =
    useState<UserDetails | null>(null);

  const [selectedVendor, setSelectedVendor] =
    useState<VendorDetails | null>(null);

  const [walletAmount, setWalletAmount] =
    useState("");

  const [walletReason, setWalletReason] =
    useState("");

  const [walletMode, setWalletMode] =
    useState<"delta" | "set">("delta");

  const [walletCurrency, setWalletCurrency] =
    useState("YER");

  const [actionLoading, setActionLoading] =
    useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);

    try {
      const [
        usersResult,
        rolesResult,
        vendorsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id,full_name,first_name,second_name,last_name,phone,contact_email,province,wallet_balance,is_disabled,created_at",
          )
          .order("created_at", {
            ascending: false,
          })
          .returns<UserRow[]>(),

        supabase
          .from("user_roles")
          .select("user_id,role")
          .returns<RoleRow[]>(),

        supabase
          .from("vendors")
          .select(
            "id,user_id,name,city,phone,logo_url,description,is_active,account_enabled,created_at",
          )
          .order("created_at", {
            ascending: false,
          })
          .returns<VendorRow[]>(),
      ]);

      if (usersResult.error) {
        throw usersResult.error;
      }

      if (rolesResult.error) {
        throw rolesResult.error;
      }

      if (vendorsResult.error) {
        throw vendorsResult.error;
      }

      const roleMap: Record<string, string[]> = {};

      for (const row of rolesResult.data ?? []) {
        roleMap[row.user_id] ??= [];
        roleMap[row.user_id].push(row.role);
      }

      setUsers(usersResult.data ?? []);
      setVendors(vendorsResult.data ?? []);
      setRoles(roleMap);
    } catch (error) {
      console.error(
        "[AccountManagement] loadAccounts:",
        error,
      );

      toast.error(
        "تعذّر تحميل بيانات الحسابات.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const customerUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const userRoles = roles[user.id] ?? [];

      if (
        userRoles.includes("admin") ||
        userRoles.includes("vendor") ||
        userRoles.includes("courier")
      ) {
        return false;
      }

      if (!query) return true;

      return [
        user.full_name,
        user.first_name,
        user.second_name,
        user.last_name,
        user.phone,
        user.contact_email,
        user.province,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query),
        );
    });
  }, [users, roles, search]);

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return vendors;

    return vendors.filter((vendor) =>
      [
        vendor.name,
        vendor.city,
        vendor.phone,
        vendor.description,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query),
        ),
    );
  }, [vendors, search]);

  const openUserDetails = async (
    user: UserRow,
  ) => {
    setDetailsLoading(true);
    setSelectedVendor(null);

    try {
      const { data, error } =
        await supabase.rpc(
          "admin_get_user_account_details",
          {
            p_user_id: user.id,
          },
        );

      if (error) throw error;

      if (!data) {
        throw new Error(
          "لم تُرجع قاعدة البيانات تفاصيل الحساب.",
        );
      }

      setSelectedUser(
        data as UserDetails,
      );
    } catch (error) {
      console.error(
        "[AccountManagement] openUserDetails:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذّر تحميل تفاصيل حساب المستخدم.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const openVendorDetails = async (
    vendor: VendorRow,
  ) => {
    setDetailsLoading(true);
    setSelectedUser(null);

    try {
      const { data, error } =
        await supabase.rpc(
          "admin_get_vendor_account_details",
          {
            p_vendor_id: vendor.id,
          },
        );

      if (error) throw error;

      if (!data) {
        throw new Error(
          "لم تُرجع قاعدة البيانات تفاصيل التاجر.",
        );
      }

      setSelectedVendor(
        data as VendorDetails,
      );
    } catch (error) {
      console.error(
        "[AccountManagement] openVendorDetails:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذّر تحميل تفاصيل حساب التاجر.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedUser(null);
    setSelectedVendor(null);
    setWalletAmount("");
    setWalletReason("");
  };

  const updateWallet = async (
    userId: string,
  ) => {
    const amount = Number(walletAmount);

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
        "الرصيد النهائي لا يمكن أن يكون سالباً.",
      );
      return;
    }

    setActionLoading(true);

    try {
      const { error } =
        await supabase.rpc(
          "admin_update_wallet_balance",
          {
            p_user_id: userId,
            p_currency: walletCurrency,
            p_amount: amount,
            p_mode: walletMode,
            p_reason:
              walletReason.trim(),
          },
        );

      if (error) throw error;

      toast.success(
        "تم تحديث رصيد المحفظة بنجاح.",
      );

      setWalletAmount("");
      setWalletReason("");

      await loadAccounts();

      if (selectedUser) {
        await openUserDetails(
          selectedUser.profile,
        );
      } else if (selectedVendor) {
        await openVendorDetails(
          selectedVendor.vendor,
        );
      }
    } catch (error) {
      console.error(
        "[AccountManagement] updateWallet:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذّر تحديث رصيد المحفظة.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const toggleUserDisabled = async (
    user: UserRow,
  ) => {
    setActionLoading(true);

    try {
      const { error } =
        await supabase.rpc(
          "admin_set_user_disabled",
          {
            p_user_id: user.id,
            p_disabled:
              !user.is_disabled,
          },
        );

      if (error) throw error;

      toast.success(
        user.is_disabled
          ? "تم تفعيل حساب المستخدم."
          : "تم تعطيل حساب المستخدم.",
      );

      await loadAccounts();

      if (selectedUser) {
        await openUserDetails(
          selectedUser.profile,
        );
      }
    } catch (error) {
      console.error(
        "[AccountManagement] toggleUserDisabled:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذّر تحديث حالة الحساب.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const toggleVendor = async (
    vendor: VendorRow,
  ) => {
    setActionLoading(true);

    try {
      const enabled =
        !(
          vendor.is_active &&
          vendor.account_enabled
        );

      const { error } =
        await supabase.rpc(
          "admin_set_vendor_enabled",
          {
            p_vendor_id: vendor.id,
            p_enabled: enabled,
          },
        );

      if (error) throw error;

      toast.success(
        enabled
          ? "تم تفعيل حساب المتجر."
          : "تم تعطيل حساب المتجر.",
      );

      await loadAccounts();

      if (selectedVendor) {
        await openVendorDetails(
          selectedVendor.vendor,
        );
      }
    } catch (error) {
      console.error(
        "[AccountManagement] toggleVendor:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذّر تحديث حالة المتجر.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const currentUser =
    selectedUser?.profile;

  const currentVendor =
    selectedVendor?.vendor;

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* ====================================================== */}
      {/* Header */}
      {/* ====================================================== */}

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black">
            إدارة الحسابات
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            إدارة حسابات المستخدمين والتجار والبيانات
            الحقيقية المرتبطة بها.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadAccounts()
          }
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw
            className={
              loading
                ? "h-4 w-4 animate-spin"
                : "h-4 w-4"
            }
          />

          تحديث البيانات
        </button>
      </div>

      {/* ====================================================== */}
      {/* Sections */}
      {/* ====================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-2xl bg-primary/10 p-3">
              <Store className="h-6 w-6 text-primary" />
            </div>

            <span className="text-3xl font-black">
              {vendors.length}
            </span>
          </div>

          <div className="text-lg font-bold">
            إدارة حسابات التجار
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            المتاجر، أصحابها، المنتجات، المحفظة
            وحالة الحساب.
          </p>
        </button>

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
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-2xl bg-primary/10 p-3">
              <User className="h-6 w-6 text-primary" />
            </div>

            <span className="text-3xl font-black">
              {customerUsers.length}
            </span>
          </div>

          <div className="text-lg font-bold">
            حسابات المستخدمين
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            العملاء، النشاط، الطلبات، المحفظة
            والبيانات التقنية.
          </p>
        </button>
      </div>

      {/* ====================================================== */}
      {/* Search */}
      {/* ====================================================== */}

      <div className="rounded-2xl border bg-card p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder={
              section === "users"
                ? "البحث بالاسم أو الهاتف أو البريد..."
                : "البحث باسم المتجر أو المدينة أو الهاتف..."
            }
            className="w-full rounded-xl border bg-background py-3 pr-10 pl-4 outline-none ring-primary transition focus:ring-2"
          />
        </div>
      </div>

      {/* ====================================================== */}
      {/* Account list */}
      {/* ====================================================== */}

      {loading ? (
        <div className="rounded-3xl border bg-card p-12 text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="font-semibold">
            جاري تحميل الحسابات...
          </p>
        </div>
      ) : section === "users" ? (
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-bold">
              حسابات المستخدمين
            </h2>

            <p className="text-sm text-muted-foreground">
              {customerUsers.length} حساب
            </p>
          </div>

          {customerUsers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              لا توجد حسابات مطابقة للبحث.
            </div>
          ) : (
            <div className="divide-y">
              {customerUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-muted/30 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>

                    <div className="min-w-0">
                      <div className="truncate font-bold">
                        {user.full_name ||
                          "مستخدم بدون اسم"}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>
                          {user.phone ||
                            "بدون هاتف"}
                        </span>

                        {user.province && (
                          <span>
                            {user.province}
                          </span>
                        )}

                        <span>
                          {money(
                            user.wallet_balance,
                            "YER",
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
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
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      <Eye className="h-4 w-4" />
                      عرض التفاصيل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-bold">
              إدارة حسابات التجار
            </h2>

            <p className="text-sm text-muted-foreground">
              {filteredVendors.length} متجر
            </p>
          </div>

          {filteredVendors.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              لا توجد متاجر مطابقة للبحث.
            </div>
          ) : (
            <div className="divide-y">
              {filteredVendors.map((vendor) => {
                const enabled =
                  vendor.is_active &&
                  vendor.account_enabled;

                return (
                  <div
                    key={vendor.id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-muted/30 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
                        {vendor.logo_url ? (
                          <img
                            src={vendor.logo_url}
                            alt={vendor.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Store className="h-5 w-5 text-primary" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-bold">
                          {vendor.name}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>
                            {vendor.city}
                          </span>

                          <span>
                            {vendor.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
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
                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted"
                      >
                        <Eye className="h-4 w-4" />
                        عرض التفاصيل
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================== */}
      {/* Loading overlay */}
      {/* ====================================================== */}

      {detailsLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="rounded-3xl bg-card p-8 text-center shadow-2xl">
            <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="font-bold">
              جاري تحميل تفاصيل الحساب...
            </p>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* USER DETAILS MODAL */}
      {/* ====================================================== */}

      {selectedUser && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm md:p-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b bg-card p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <User className="h-6 w-6 text-primary" />
                </div>

                <div>
                  <h2 className="text-xl font-black">
                    تفاصيل حساب العميل
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    {currentUser?.full_name ||
                      "مستخدم"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="rounded-xl p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="space-y-5">
                {/* Metrics */}

                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <MetricCard
                    title="عدد الطلبات"
                    value={formatNumber(
                      selectedUser.metrics.order_count,
                    )}
                    icon={
                      <Package className="h-4 w-4 text-primary" />
                    }
                  />

                  <MetricCard
                    title="إجمالي الإنفاق"
                    value={money(
                      selectedUser.metrics.total_spent,
                      "YER",
                    )}
                    icon={
                      <Wallet className="h-4 w-4 text-primary" />
                    }
                  />

                  <MetricCard
                    title="متوسط الطلب"
                    value={money(
                      selectedUser.metrics.average_order_value,
                      "YER",
                    )}
                    icon={
                      <History className="h-4 w-4 text-primary" />
                    }
                  />

                  <MetricCard
                    title="تم التوصيل"
                    value={formatNumber(
                      selectedUser.metrics.delivered_count,
                    )}
                    icon={
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    }
                  />

                  <MetricCard
                    title="ملغاة"
                    value={formatNumber(
                      selectedUser.metrics.cancelled_count,
                    )}
                    icon={
                      <Ban className="h-4 w-4 text-destructive" />
                    }
                  />
                </div>

                {/* Personal data */}

                <SectionBox
                  title="البيانات الشخصية"
                  icon={
                    <User className="h-5 w-5 text-primary" />
                  }
                >
                  <DetailRow
                    label="الاسم الأول"
                    value={currentUser?.first_name}
                  />

                  <DetailRow
                    label="الاسم الثاني"
                    value={currentUser?.second_name}
                  />

                  <DetailRow
                    label="الاسم الأخير"
                    value={currentUser?.last_name}
                  />

                  <DetailRow
                    label="الاسم الكامل"
                    value={currentUser?.full_name}
                  />

                  <DetailRow
                    label="رقم الهاتف"
                    value={currentUser?.phone}
                  />

                  <DetailRow
                    label="البريد الإلكتروني"
                    value={currentUser?.contact_email}
                  />

                  <DetailRow
                    label="المحافظة"
                    value={currentUser?.province}
                  />

                  <DetailRow
                    label="تاريخ إنشاء الحساب"
                    value={formatDate(
                      currentUser?.created_at,
                    )}
                  />

                  <DetailRow
                    label="حالة الحساب"
                    value={
                      currentUser?.is_disabled
                        ? "معطل"
                        : "نشط"
                    }
                  />

                  <DetailRow
                    label="الصلاحيات"
                    value={
                      selectedUser.roles.length
                        ? selectedUser.roles.join("، ")
                        : "مستخدم"
                    }
                  />
                </SectionBox>

                {/* Technical + location */}

                <SectionBox
                  title="1. البيانات التقنية والجغرافية"
                  icon={
                    <Globe className="h-5 w-5 text-primary" />
                  }
                >
                  <DetailRow
                    label="عنوان IP"
                    value={
                      selectedUser.activity.last_ip
                    }
                  />

                  <DetailRow
                    label="الدولة"
                    value={
                      selectedUser.activity.ip_country
                    }
                  />

                  <DetailRow
                    label="المنطقة"
                    value={
                      selectedUser.activity.ip_region
                    }
                  />

                  <DetailRow
                    label="المدينة"
                    value={
                      selectedUser.activity.ip_city
                    }
                  />

                  <DetailRow
                    label="نوع الجهاز"
                    value={
                      selectedUser.activity.device_type
                    }
                  />

                  <DetailRow
                    label="نظام التشغيل"
                    value={
                      selectedUser.activity.os_name
                    }
                  />

                  <DetailRow
                    label="المتصفح"
                    value={
                      selectedUser.activity.browser_name
                    }
                  />

                  <DetailRow
                    label="User Agent"
                    value={
                      selectedUser.activity.user_agent
                    }
                  />

                  <DetailRow
                    label="خط العرض"
                    value={
                      selectedUser.activity.latitude
                    }
                  />

                  <DetailRow
                    label="خط الطول"
                    value={
                      selectedUser.activity.longitude
                    }
                  />

                  <DetailRow
                    label="دقة الموقع"
                    value={
                      selectedUser.activity.location_accuracy
                        ? `${selectedUser.activity.location_accuracy} متر`
                        : undefined
                    }
                  />

                  {selectedUser.activity.latitude &&
                    selectedUser.activity.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${selectedUser.activity.latitude},${selectedUser.activity.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold hover:bg-muted"
                      >
                        <MapPin className="h-4 w-4" />
                        فتح موقع العميل على الخريطة
                      </a>
                    )}
                </SectionBox>

                {/* Visits */}

                <SectionBox
                  title="2. بيانات الزيارات والتفاعل"
                  icon={
                    <Clock3 className="h-5 w-5 text-primary" />
                  }
                >
                  <DetailRow
                    label="تاريخ أول زيارة"
                    value={formatDate(
                      selectedUser.activity
                        .first_visit_at,
                    )}
                  />

                  <DetailRow
                    label="آخر نشاط"
                    value={formatDate(
                      selectedUser.activity
                        .last_active_at,
                    )}
                  />

                  <DetailRow
                    label="آخر صفحة"
                    value={
                      selectedUser.activity.last_path
                    }
                  />

                  <div className="mt-5">
                    <h4 className="mb-3 font-bold">
                      قائمة الرغبات
                    </h4>

                    {selectedUser.wishlist.length ===
                    0 ? (
                      <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                        لا توجد منتجات في قائمة الرغبات.
                      </p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {selectedUser.wishlist.map(
                          (item) => (
                            <div
                              key={item.id}
                              className="rounded-xl border p-3"
                            >
                              <div className="font-bold">
                                {item.product?.name ||
                                  item.product_id}
                              </div>

                              {item.product && (
                                <div className="mt-1 text-sm text-muted-foreground">
                                  {money(
                                    item.product.price,
                                    "YER",
                                  )}
                                </div>
                              )}

                              <div className="mt-1 text-xs text-muted-foreground">
                                أضيفت في{" "}
                                {formatDate(
                                  item.created_at,
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </SectionBox>

                {/* Wallet */}

                <SectionBox
                  title="المحفظة المالية"
                  icon={
                    <Wallet className="h-5 w-5 text-primary" />
                  }
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedUser.wallets.length ===
                    0 ? (
                      <div className="rounded-xl bg-muted p-4 text-sm">
                        لا توجد محافظ مسجلة.
                      </div>
                    ) : (
                      selectedUser.wallets.map(
                        (wallet) => (
                          <div
                            key={wallet.id}
                            className="rounded-2xl border p-4"
                          >
                            <div className="text-xs text-muted-foreground">
                              العملة
                            </div>

                            <div className="mt-1 text-xl font-black">
                              {wallet.currency}
                            </div>

                            <div className="mt-2 text-lg font-bold">
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

                  <div className="mt-5 rounded-2xl border bg-muted/30 p-4">
                    <h4 className="mb-4 font-bold">
                      تعديل رصيد المحفظة
                    </h4>

                    <div className="grid gap-3 md:grid-cols-2">
                      <select
                        value={walletMode}
                        onChange={(event) =>
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
                          إضافة / خصم من الرصيد
                        </option>

                        <option value="set">
                          تعيين الرصيد النهائي
                        </option>
                      </select>

                      <select
                        value={walletCurrency}
                        onChange={(event) =>
                          setWalletCurrency(
                            event.target.value,
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
                        value={walletAmount}
                        onChange={(event) =>
                          setWalletAmount(
                            event.target.value,
                          )
                        }
                        placeholder={
                          walletMode === "delta"
                            ? "المبلغ (+ للإضافة / - للخصم)"
                            : "الرصيد النهائي"
                        }
                        className="rounded-xl border bg-background px-3 py-3"
                      />

                      <input
                        value={walletReason}
                        onChange={(event) =>
                          setWalletReason(
                            event.target.value,
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
                          currentUser!.id,
                        )
                      }
                      className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {actionLoading && (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      )}

                      تحديث الرصيد
                    </button>
                  </div>

                  <div className="mt-5">
                    <h4 className="mb-3 font-bold">
                      سجل معاملات المحفظة
                    </h4>

                    {selectedUser.transactions.length ===
                    0 ? (
                      <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                        لا توجد معاملات مسجلة.
                      </p>
                    ) : (
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
                              (transaction) => (
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

                                  <td className="max-w-[240px] p-3">
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
                    )}
                  </div>
                </SectionBox>

                {/* Addresses */}

                <SectionBox
                  title="عناوين الشحن"
                  icon={
                    <MapPin className="h-5 w-5 text-primary" />
                  }
                >
                  {selectedUser.addresses.length ===
                  0 ? (
                    <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                      لا توجد عناوين محفوظة.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedUser.addresses.map(
                        (address, index) => (
                          <pre
                            key={index}
                            className="overflow-x-auto rounded-xl bg-muted p-4 text-xs"
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
                  )}
                </SectionBox>

                {/* Orders */}

                <SectionBox
                  title="3. سجل العمليات والطلبات"
                  icon={
                    <Package className="h-5 w-5 text-primary" />
                  }
                >
                  {selectedUser.orders.length ===
                  0 ? (
                    <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                      لا توجد طلبات لهذا العميل.
                    </p>
                  ) : (
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
                                  {order.order_number}
                                </div>

                                <div className="mt-1 text-xs text-muted-foreground">
                                  {formatDate(
                                    order.created_at,
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold">
                                  {statusLabel(
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
                                  order.invoice_number ||
                                  "غير متوفر"
                                }
                              />

                              <DetailRow
                                label="الدفع"
                                value={
                                  order.payment_method_code ||
                                  order.payment_status ||
                                  "غير متوفر"
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
                              {order.items.map(
                                (item) => (
                                  <div
                                    key={item.id}
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
                  )}
                </SectionBox>

                {/* Account controls */}

                <SectionBox
                  title="إدارة حالة الحساب"
                  icon={
                    currentUser?.is_disabled ? (
                      <Ban className="h-5 w-5 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )
                  }
                >
                  <p className="mb-4 text-sm text-muted-foreground">
                    يمكن للإدارة تفعيل أو تعطيل الحساب
                    مباشرة من قاعدة البيانات.
                  </p>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      void toggleUserDisabled(
                        currentUser!,
                      )
                    }
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50 ${
                      currentUser?.is_disabled
                        ? "bg-emerald-600"
                        : "bg-destructive"
                    }`}
                  >
                    {currentUser?.is_disabled ? (
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

      {/* ====================================================== */}
      {/* VENDOR DETAILS MODAL */}
      {/* ====================================================== */}

      {selectedVendor && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm md:p-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b bg-card p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <Store className="h-6 w-6 text-primary" />
                </div>

                <div>
                  <h2 className="text-xl font-black">
                    تفاصيل حساب التاجر
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    {currentVendor?.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="rounded-xl p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="space-y-5">
                {/* Vendor metrics */}

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <MetricCard
                    title="عدد عمليات البيع"
                    value={formatNumber(
                      selectedVendor.metrics
                        .order_item_count,
                    )}
                    icon={
                      <Package className="h-4 w-4 text-primary" />
                    }
                  />

                  <MetricCard
                    title="الوحدات المباعة"
                    value={formatNumber(
                      selectedVendor.metrics
                        .units_sold,
                    )}
                    icon={
                      <Package className="h-4 w-4 text-primary" />
                    }
                  />

                  <MetricCard
                    title="قيمة المبيعات"
                    value={money(
                      selectedVendor.metrics
                        .sales_value,
                      "YER",
                    )}
                    icon={
                      <Wallet className="h-4 w-4 text-primary" />
                    }
                  />

                  <MetricCard
                    title="طلبات مختلفة"
                    value={formatNumber(
                      selectedVendor.metrics
                        .distinct_orders,
                    )}
                    icon={
                      <History className="h-4 w-4 text-primary" />
                    }
                  />
                </div>

                {/* Vendor data */}

                <SectionBox
                  title="بيانات المتجر"
                  icon={
                    <Store className="h-5 w-5 text-primary" />
                  }
                >
                  <DetailRow
                    label="اسم المتجر"
                    value={currentVendor?.name}
                  />

                  <DetailRow
                    label="المدينة"
                    value={currentVendor?.city}
                  />

                  <DetailRow
                    label="رقم الهاتف"
                    value={currentVendor?.phone}
                  />

                  <DetailRow
                    label="الوصف"
                    value={
                      currentVendor?.description
                    }
                  />

                  <DetailRow
                    label="تاريخ التسجيل"
                    value={formatDate(
                      currentVendor?.created_at,
                    )}
                  />

                  <DetailRow
                    label="حالة المتجر"
                    value={
                      currentVendor?.is_active &&
                      currentVendor?.account_enabled
                        ? "نشط"
                        : "معطل"
                    }
                  />

                  <DetailRow
                    label="معرّف التاجر"
                    value={currentVendor?.id}
                  />

                  <DetailRow
                    label="معرّف المستخدم"
                    value={currentVendor?.user_id}
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
                        selectedVendor.profile
                          .full_name
                      }
                    />

                    <DetailRow
                      label="الهاتف"
                      value={
                        selectedVendor.profile.phone
                      }
                    />

                    <DetailRow
                      label="البريد"
                      value={
                        selectedVendor.profile
                          .contact_email
                      }
                    />

                    <DetailRow
                      label="المحافظة"
                      value={
                        selectedVendor.profile
                          .province
                      }
                    />
                  </SectionBox>
                )}

                {/* Technical */}

                <SectionBox
                  title="البيانات التقنية والجغرافية"
                  icon={
                    <Globe className="h-5 w-5 text-primary" />
                  }
                >
                  <DetailRow
                    label="عنوان IP"
                    value={
                      selectedVendor.activity
                        .last_ip
                    }
                  />

                  <DetailRow
                    label="الدولة"
                    value={
                      selectedVendor.activity
                        .ip_country
                    }
                  />

                  <DetailRow
                    label="المنطقة"
                    value={
                      selectedVendor.activity
                        .ip_region
                    }
                  />

                  <DetailRow
                    label="المدينة"
                    value={
                      selectedVendor.activity
                        .ip_city
                    }
                  />

                  <DetailRow
                    label="نوع الجهاز"
                    value={
                      selectedVendor.activity
                        .device_type
                    }
                  />

                  <DetailRow
                    label="نظام التشغيل"
                    value={
                      selectedVendor.activity
                        .os_name
                    }
                  />

                  <DetailRow
                    label="المتصفح"
                    value={
                      selectedVendor.activity
                        .browser_name
                    }
                  />

                  <DetailRow
                    label="أول زيارة"
                    value={formatDate(
                      selectedVendor.activity
                        .first_visit_at,
                    )}
                  />

                  <DetailRow
                    label="آخر نشاط"
                    value={formatDate(
                      selectedVendor.activity
                        .last_active_at,
                    )}
                  />

                  {selectedVendor.activity
                    .latitude &&
                    selectedVendor.activity
                      .longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${selectedVendor.activity.latitude},${selectedVendor.activity.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold hover:bg-muted"
                      >
                        <MapPin className="h-4 w-4" />
                        فتح الموقع على الخريطة
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
                  {selectedVendor.wallets.length ===
                  0 ? (
                    <p className="rounded-xl bg-muted p-4 text-sm">
                      لا توجد محفظة مسجلة.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedVendor.wallets.map(
                        (wallet) => (
                          <div
                            key={wallet.id}
                            className="rounded-2xl border p-4"
                          >
                            <div className="text-xs text-muted-foreground">
                              {wallet.currency}
                            </div>

                            <div className="mt-2 text-xl font-black">
                              {money(
                                wallet.balance,
                                wallet.currency,
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {currentVendor?.user_id && (
                    <div className="mt-5 rounded-2xl border bg-muted/30 p-4">
                      <h4 className="mb-4 font-bold">
                        تعديل رصيد التاجر
                      </h4>

                      <div className="grid gap-3 md:grid-cols-2">
                        <select
                          value={walletMode}
                          onChange={(event) =>
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
                          value={walletCurrency}
                          onChange={(event) =>
                            setWalletCurrency(
                              event.target.value,
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
                          value={walletAmount}
                          onChange={(event) =>
                            setWalletAmount(
                              event.target.value,
                            )
                          }
                          placeholder="المبلغ"
                          className="rounded-xl border bg-background px-3 py-3"
                        />

                        <input
                          value={walletReason}
                          onChange={(event) =>
                            setWalletReason(
                              event.target.value,
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
                            currentVendor.user_id!,
                          )
                        }
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"
                      >
                        {actionLoading && (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        )}

                        تحديث الرصيد
                      </button>
                    </div>
                  )}

                  <div className="mt-5">
                    <h4 className="mb-3 font-bold">
                      سجل معاملات المحفظة
                    </h4>

                    {selectedVendor.transactions.length ===
                    0 ? (
                      <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                        لا توجد معاملات.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="p-3 text-right">
                                التاريخ
                              </th>
                              <th className="p-3 text-right">
                                النوع
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
                              (transaction) => (
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
                                      "—"}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
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
                  {selectedVendor.products.length ===
                  0 ? (
                    <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                      لا توجد منتجات مرتبطة بهذا المتجر.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {selectedVendor.products.map(
                        (product, index) => {
                          const productName =
                            String(
                              product.name ??
                                `منتج ${index + 1}`,
                            );

                          const price =
                            product.price;

                          const active =
                            Boolean(
                              product.is_active,
                            );

                          return (
                            <div
                              key={
                                String(
                                  product.id ??
                                    index,
                                )
                              }
                              className="overflow-hidden rounded-2xl border"
                            >
                              {Array.isArray(
                                product.images,
                              ) &&
                                product.images[0] && (
                                  <img
                                    src={String(
                                      product
                                        .images[0],
                                    )}
                                    alt={
                                      productName
                                    }
                                    className="h-40 w-full object-cover"
                                  />
                                )}

                              <div className="p-4">
                                <div className="font-bold">
                                  {productName}
                                </div>

                                <div className="mt-2 font-black">
                                  {money(
                                    price,
                                    "YER",
                                  )}
                                </div>

                                <div className="mt-2">
                                  <span
                                    className={`rounded-full px-2 py-1 text-xs font-bold ${
                                      active
                                        ? "bg-emerald-500/10 text-emerald-600"
                                        : "bg-destructive/10 text-destructive"
                                    }`}
                                  >
                                    {active
                                      ? "نشط"
                                      : "غير نشط"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </SectionBox>

                {/* Raw vendor account data */}

                <SectionBox
                  title="بيانات تقنية إضافية"
                  icon={
                    <Laptop className="h-5 w-5 text-primary" />
                  }
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailRow
                      label="معرّف المتجر"
                      value={currentVendor?.id}
                    />

                    <DetailRow
                      label="معرّف المستخدم"
                      value={currentVendor?.user_id}
                    />

                    <DetailRow
                      label="آخر مسار"
                      value={
                        selectedVendor.activity
                          .last_path
                      }
                    />

                    <DetailRow
                      label="الموقع الجغرافي"
                      value={
                        selectedVendor.activity
                          .latitude &&
                        selectedVendor.activity
                          .longitude
                          ? `${selectedVendor.activity.latitude}, ${selectedVendor.activity.longitude}`
                          : undefined
                      }
                    />
                  </div>
                </SectionBox>

                {/* Vendor controls */}

                <SectionBox
                  title="إدارة حالة المتجر"
                  icon={
                    currentVendor?.is_active &&
                    currentVendor?.account_enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Ban className="h-5 w-5 text-destructive" />
                    )
                  }
                >
                  <p className="mb-4 text-sm text-muted-foreground">
                    تغيير حالة المتجر يتم مباشرة من خلال
                    دالة الإدارة الآمنة في قاعدة البيانات.
                  </p>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      void toggleVendor(
                        currentVendor!,
                      )
                    }
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50 ${
                      currentVendor?.is_active &&
                      currentVendor?.account_enabled
                        ? "bg-destructive"
                        : "bg-emerald-600"
                    }`}
                  >
                    {currentVendor?.is_active &&
                    currentVendor?.account_enabled ? (
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
