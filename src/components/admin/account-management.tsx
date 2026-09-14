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
  Shield,
  Smartphone,
  Store,
  User,
  Wallet,
  X,
} from "lucide-react";

import { toast } from "sonner";

import {
  AdminCard,
  btnGhostCls,
} from "@/components/admin-ui";

import { supabase } from "@/integrations/supabase/client";

import { formatPrice } from "@/lib/db";

type Section =
  | "users"
  | "vendors";

type WalletRow = {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
};

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
  latitude?: number;
  longitude?: number;
  location_accuracy?: number;
  order_location_latitude?: number;
  order_location_longitude?: number;
  order_location_at?: string;
  last_path?: string;
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

export function AccountManagement({
  initialSection,
}: {
  initialSection: Section;
}) {
  const [
    section,
    setSection,
  ] = useState<Section>(
    initialSection,
  );

  const [users, setUsers] =
    useState<UserRow[]>([]);

  const [vendors, setVendors] =
    useState<VendorRow[]>([]);

  const [roles, setRoles] =
    useState<
      Record<
        string,
        string[]
      >
    >({});

  const [wallets, setWallets] =
    useState<WalletRow[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    selectedUser,
    setSelectedUser,
  ] = useState<UserDetails | null>(
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
  ] = useState(false);

  const [
    walletCurrency,
    setWalletCurrency,
  ] = useState("YER");

  const [
    walletMode,
    setWalletMode,
  ] = useState<
    "delta" | "set"
  >("delta");

  const [
    walletAmount,
    setWalletAmount,
  ] = useState("");

  const [
    walletReason,
    setWalletReason,
  ] = useState("");

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const load =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const [
            usersResult,
            rolesResult,
            vendorsResult,
            walletsResult,
          ] =
            await Promise.all([
              supabase
                .from(
                  "profiles",
                )
                .select(
                  "id,full_name,first_name,second_name,last_name,phone,contact_email,province,wallet_balance,is_disabled,created_at",
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  },
                )
                .returns<
                  UserRow[]
                >(),

              supabase
                .from(
                  "user_roles",
                )
                .select(
                  "user_id,role",
                )
                .returns<
                  RoleRow[]
                >(),

              supabase
                .from(
                  "vendors",
                )
                .select(
                  "id,user_id,name,city,phone,logo_url,description,is_active,account_enabled,created_at",
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  },
                )
                .returns<
                  VendorRow[]
                >(),

              supabase
                .from(
                  "wallets",
                )
                .select(
                  "id,user_id,currency,balance",
                )
                .returns<
                  WalletRow[]
                >(),
            ]);

          if (
            usersResult.error
          ) {
            throw usersResult.error;
          }

          if (
            rolesResult.error
          ) {
            throw rolesResult.error;
          }

          if (
            vendorsResult.error
          ) {
            throw vendorsResult.error;
          }

          if (
            walletsResult.error
          ) {
            throw walletsResult.error;
          }

          const roleMap: Record<
            string,
            string[]
          > = {};

          for (
            const row of
              rolesResult.data ??
              []
          ) {
            roleMap[
              row.user_id
            ] ??= [];

            roleMap[
              row.user_id
            ].push(
              row.role,
            );
          }

          setUsers(
            usersResult.data ??
              [],
          );

          setVendors(
            vendorsResult.data ??
              [],
          );

          setRoles(
            roleMap,
          );

          setWallets(
            walletsResult.data ??
              [],
          );
        } catch (error) {
          console.error(
            "[AccountManagement] load failed:",
            error,
          );

          toast.error(
            "تعذّر تحميل بيانات الحسابات.",
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

  const customerUsers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return users.filter(
        (user) => {
          const userRoles =
            roles[
              user.id
            ] ?? [];

          const isVendor =
            userRoles.includes(
              "vendor",
            );

          const isAdmin =
            userRoles.includes(
              "admin",
            );

          const isCourier =
            userRoles.includes(
              "courier",
            );

          if (
            isVendor ||
            isAdmin ||
            isCourier
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return (
            user.full_name
              .toLowerCase()
              .includes(
                query,
              ) ||
            String(
              user.phone ??
                "",
            )
              .toLowerCase()
              .includes(
                query,
              ) ||
            String(
              user.contact_email ??
                "",
            )
              .toLowerCase()
              .includes(
                query,
              )
          );
        },
      );
    }, [
      users,
      roles,
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
          vendor.name
            .toLowerCase()
            .includes(query) ||
          vendor.city
            .toLowerCase()
            .includes(query) ||
          vendor.phone
            .toLowerCase()
            .includes(query),
      );
    }, [
      vendors,
      search,
    ]);

  async function openUser(
    user: UserRow,
  ) {
    setDetailsLoading(true);

    setSelectedVendor(
      null,
    );

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "admin_get_user_account_details",
          {
            p_user_id:
              user.id,
          },
        );

      if (error) {
        throw error;
      }

      setSelectedUser(
        data as UserDetails,
      );
    } catch (error) {
      console.error(
        "[AccountManagement] user details failed:",
        error,
      );

      toast.error(
        "تعذّر تحميل تفاصيل حساب المستخدم.",
      );
    } finally {
      setDetailsLoading(
        false,
      );
    }
  }

  async function openVendor(
    vendor: VendorRow,
  ) {
    setDetailsLoading(true);

    setSelectedUser(null);

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "admin_get_vendor_account_details",
          {
            p_vendor_id:
              vendor.id,
          },
        );

      if (error) {
        throw error;
      }

      setSelectedVendor(
        data as VendorDetails,
      );
    } catch (error) {
      console.error(
        "[AccountManagement] vendor details failed:",
        error,
      );

      toast.error(
        "تعذّر تحميل تفاصيل حساب التاجر.",
      );
    } finally {
      setDetailsLoading(
        false,
      );
    }
  }

  function closeDetails() {
    setSelectedUser(
      null,
    );

    setSelectedVendor(
      null,
    );

    setWalletAmount("");

    setWalletReason("");
  }

  async function updateWallet(
    userId: string,
  ) {
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
        "أدخل مبلغاً صحيحاً.",
      );

      return;
    }

    if (
      walletMode ===
        "delta" &&
      amount === 0
    ) {
      toast.error(
        "مبلغ التعديل لا يمكن أن يكون صفراً.",
      );

      return;
    }

    if (
      walletMode ===
        "set" &&
      amount < 0
    ) {
      toast.error(
        "الرصيد النهائي لا يمكن أن يكون سالباً.",
      );

      return;
    }

    setActionLoading(
      true,
    );

    try {
      const {
        error,
      } =
        await supabase.rpc(
          "admin_update_wallet_balance",
          {
            p_user_id:
              userId,

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

      if (error) {
        throw error;
      }

      toast.success(
        "تم تحديث المحفظة وتسجيل العملية في السجل.",
      );

      setWalletAmount("");

      setWalletReason("");

      await load();

      if (
        selectedUser
      ) {
        await openUser(
          selectedUser.profile,
        );
      }

      if (
        selectedVendor
      ) {
        await openVendor(
          selectedVendor.vendor,
        );
      }
    } catch (error) {
      console.error(
        "[AccountManagement] wallet update failed:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذّر تحديث المحفظة.",
      );
    } finally {
      setActionLoading(
        false,
      );
    }
  }

  async function toggleUser(
    user: UserRow,
  ) {
    setActionLoading(
      true,
    );

    try {
      const {
        error,
      } =
        await supabase.rpc(
          "admin_set_user_disabled",
          {
            p_user_id:
              user.id,

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

      await load();

      if (
        selectedUser?.profile
          .id === user.id
      ) {
        await openUser(
          {
            ...user,
            is_disabled:
              !user.is_disabled,
          },
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذّر تحديث حالة الحساب.",
      );
    } finally {
      setActionLoading(
        false,
      );
    }
  }

  async function toggleVendor(
    vendor: VendorRow,
  ) {
    setActionLoading(
      true,
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

            p_enabled:
              !(
                vendor.is_active &&
                vendor.account_enabled
              ),
          },
        );

      if (error) {
        throw error;
      }

      toast.success(
        vendor.is_active &&
        vendor.account_enabled
          ? "تم إيقاف المتجر."
          : "تم تفعيل المتجر.",
      );

      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذّر تحديث حالة المتجر.",
      );
    } finally {
      setActionLoading(
        false,
      );
    }
  }

  return (
    <div
      dir="rtl"
      className="space-y-4"
    >
      <AdminCard title="إدارة الحسابات">
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              setSection(
                "users",
              )
            }
            className={`rounded-2xl border p-5 text-right transition ${
              section ===
              "users"
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-primary" />

              <div>
                <p className="font-black">
                  حسابات المستخدمين
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  العملاء والبيانات والطلبات والمحفظة
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setSection(
                "vendors",
              )
            }
            className={`rounded-2xl border p-5 text-right transition ${
              section ===
              "vendors"
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center gap-3">
              <Store className="h-6 w-6 text-primary" />

              <div>
                <p className="font-black">
                  إدارة حسابات التجار
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  المتاجر والمنتجات والمبيعات والحسابات
                </p>
              </div>
            </div>
          </button>
        </div>
      </AdminCard>

      <AdminCard
        title={
          section ===
          "users"
            ? "حسابات المستخدمين"
            : "إدارة حسابات التجار"
        }
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
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
                  ? "البحث بالاسم أو الهاتف أو البريد..."
                  : "البحث باسم المتجر أو المدينة أو الهاتف..."
              }
              className="h-11 w-full rounded-2xl border border-border bg-secondary px-10 text-sm outline-none"
            />
          </div>

          <button
            type="button"
            className={btnGhostCls}
            onClick={() =>
              void load()
            }
            disabled={
              loading
            }
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
      </AdminCard>

      {section ===
      "users" ? (
        <AdminCard
          title={`العملاء (${customerUsers.length})`}
        >
          <div className="space-y-2">
            {customerUsers.map(
              (user) => (
                <div
                  key={
                    user.id
                  }
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        {user.full_name ||
                          "بدون اسم"}
                      </p>

                      <p
                        dir="ltr"
                        className="mt-1 text-xs text-muted-foreground"
                      >
                        {user.phone ||
                          "لا يوجد هاتف"}
                      </p>
                    </div>

                    <WalletSummary
                      wallets={wallets.filter(
                        (wallet) =>
                          wallet.user_id ===
                          user.id,
                      )}
                    />

                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                        user.is_disabled
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {user.is_disabled
                        ? "معطل"
                        : "نشط"}
                    </span>

                    <button
                      type="button"
                      className={btnGhostCls}
                      onClick={() =>
                        void openUser(
                          user,
                        )
                      }
                    >
                      <Eye className="h-4 w-4" />

                      التفاصيل
                    </button>

                    <button
                      type="button"
                      className={btnGhostCls}
                      disabled={
                        actionLoading
                      }
                      onClick={() =>
                        void toggleUser(
                          user,
                        )
                      }
                    >
                      {user.is_disabled
                        ? "تفعيل"
                        : "تعطيل"}
                    </button>
                  </div>
                </div>
              ),
            )}

            {!loading &&
            customerUsers.length ===
              0 ? (
              <Empty />
            ) : null}
          </div>
        </AdminCard>
      ) : (
        <AdminCard
          title={`التجار (${filteredVendors.length})`}
        >
          <div className="space-y-2">
            {filteredVendors.map(
              (vendor) => (
                <div
                  key={
                    vendor.id
                  }
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                      {vendor.logo_url ? (
                        <img
                          src={
                            vendor.logo_url
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Store className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        {vendor.name}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {vendor.city}
                      </p>

                      <p
                        dir="ltr"
                        className="mt-1 text-xs text-muted-foreground"
                      >
                        {vendor.phone}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                        vendor.is_active &&
                        vendor.account_enabled
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {vendor.is_active &&
                      vendor.account_enabled
                        ? "مفعّل"
                        : "متوقف"}
                    </span>

                    <button
                      type="button"
                      className={btnGhostCls}
                      onClick={() =>
                        void openVendor(
                          vendor,
                        )
                      }
                    >
                      <Eye className="h-4 w-4" />

                      التفاصيل
                    </button>

                    <button
                      type="button"
                      className={btnGhostCls}
                      disabled={
                        actionLoading
                      }
                      onClick={() =>
                        void toggleVendor(
                          vendor,
                        )
                      }
                    >
                      {vendor.is_active &&
                      vendor.account_enabled
                        ? "إيقاف"
                        : "تفعيل"}
                    </button>
                  </div>
                </div>
              ),
            )}

            {!loading &&
            filteredVendors.length ===
              0 ? (
              <Empty />
            ) : null}
          </div>
        </AdminCard>
      )}

      {selectedUser ? (
        <UserModal
          details={
            selectedUser
          }
          detailsLoading={
            detailsLoading
          }
          walletCurrency={
            walletCurrency
          }
          walletMode={
            walletMode
          }
          walletAmount={
            walletAmount
          }
          walletReason={
            walletReason
          }
          actionLoading={
            actionLoading
          }
          onClose={
            closeDetails
          }
          onCurrencyChange={
            setWalletCurrency
          }
          onModeChange={
            setWalletMode
          }
          onAmountChange={
            setWalletAmount
          }
          onReasonChange={
            setWalletReason
          }
          onWalletUpdate={() =>
            void updateWallet(
              selectedUser
                .profile.id,
            )
          }
          onToggle={() =>
            void toggleUser(
              selectedUser.profile,
            )
          }
        />
      ) : null}

      {selectedVendor ? (
        <VendorModal
          details={
            selectedVendor
          }
          detailsLoading={
            detailsLoading
          }
          walletCurrency={
            walletCurrency
          }
          walletMode={
            walletMode
          }
          walletAmount={
            walletAmount
          }
          walletReason={
            walletReason
          }
          actionLoading={
            actionLoading
          }
          onClose={
            closeDetails
          }
          onCurrencyChange={
            setWalletCurrency
          }
          onModeChange={
            setWalletMode
          }
          onAmountChange={
            setWalletAmount
          }
          onReasonChange={
            setWalletReason
          }
          onWalletUpdate={() =>
            selectedVendor
              .vendor.user_id
              ? void updateWallet(
                  selectedVendor
                    .vendor
                    .user_id!,
                )
              : undefined
          }
          onToggle={() =>
            void toggleVendor(
              selectedVendor.vendor,
            )
          }
        />
      ) : null}
    </div>
  );
}

function WalletSummary({
  wallets,
}: {
  wallets: WalletRow[];
}) {
  if (
    wallets.length ===
    0
  ) {
    return (
      <span className="text-[10px] text-muted-foreground">
        لا توجد محفظة
      </span>
    );
  }

  return (
    <div className="flex gap-2">
      {wallets.map(
        (wallet) => (
          <span
            key={
              wallet.id
            }
            className="rounded-xl bg-primary/10 px-3 py-2 text-[10px] font-bold text-primary"
          >
            {wallet.currency}:{" "}
            {formatPrice(
              Number(
                wallet.balance,
              ),
            )}
          </span>
        ),
      )}
    </div>
  );
}

function UserModal({
  details,
  detailsLoading,
  walletCurrency,
  walletMode,
  walletAmount,
  walletReason,
  actionLoading,
  onClose,
  onCurrencyChange,
  onModeChange,
  onAmountChange,
  onReasonChange,
  onWalletUpdate,
  onToggle,
}: {
  details: UserDetails;
  detailsLoading: boolean;
  walletCurrency: string;
  walletMode: "delta" | "set";
  walletAmount: string;
  walletReason: string;
  actionLoading: boolean;
  onClose: () => void;
  onCurrencyChange: (
    value: string,
  ) => void;
  onModeChange: (
    value:
      | "delta"
      | "set",
  ) => void;
  onAmountChange: (
    value: string,
  ) => void;
  onReasonChange: (
    value: string,
  ) => void;
  onWalletUpdate: () => void;
  onToggle: () => void;
}) {
  const profile =
    details.profile;

  const metrics =
    details.metrics;

  const activity =
    details.activity;

  return (
    <Modal
      title="تفاصيل حساب المستخدم"
      subtitle={
        profile.full_name
      }
      onClose={
        onClose
      }
      loading={
        detailsLoading
      }
    >
      <div className="space-y-4">
        <Section title="البيانات الشخصية">
          <Info
            icon={User}
            label="الاسم الكامل"
            value={
              profile.full_name ||
              "غير مسجل"
            }
          />

          <Info
            icon={Phone}
            label="الهاتف"
            value={
              profile.phone ||
              "غير مسجل"
            }
            dir="ltr"
          />

          <Info
            icon={Globe}
            label="البريد الإلكتروني"
            value={
              profile.contact_email ||
              "غير مسجل"
            }
            dir="ltr"
          />

          <Info
            icon={MapPin}
            label="المحافظة"
            value={
              profile.province ||
              "غير محددة"
            }
          />

          <Info
            icon={User}
            label="الاسم الأول"
            value={
              profile.first_name ||
              "غير مسجل"
            }
          />

          <Info
            icon={User}
            label="اسم الأب"
            value={
              profile.second_name ||
              "غير مسجل"
            }
          />

          <Info
            icon={User}
            label="اسم العائلة"
            value={
              profile.last_name ||
              "غير مسجل"
            }
          />

          <Info
            icon={Clock3}
            label="تاريخ إنشاء الحساب"
            value={new Date(
              profile.created_at,
            ).toLocaleString(
              "ar-YE",
            )}
          />
        </Section>

        <Section title="البيانات التقنية والجوغرافية — Technical & Location Data">
          <Info
            icon={Globe}
            label="عنوان IP"
            value={
              activity.last_ip ||
              "لم يتم تسجيله بعد"
            }
            dir="ltr"
          />

          <Info
            icon={Globe}
            label="الدولة"
            value={
              activity.ip_country ||
              "غير متوفر"
            }
          />

          <Info
            icon={MapPin}
            label="المدينة حسب IP"
            value={
              activity.ip_city ||
              "غير متوفر"
            }
          />

          <Info
            icon={Smartphone}
            label="نوع الجهاز"
            value={
              activity.device_type ||
              "غير متوفر"
            }
          />

          <Info
            icon={Laptop}
            label="نظام التشغيل"
            value={
              activity.os_name ||
              "غير متوفر"
            }
          />

          <Info
            icon={Globe}
            label="المتصفح"
            value={
              activity.browser_name ||
              "غير متوفر"
            }
          />

          <Info
            icon={MapPin}
            label="إحداثيات الجهاز"
            value={
              activity.latitude !==
                undefined &&
              activity.longitude !==
                undefined
                ? `${activity.latitude}, ${activity.longitude}`
                : "لم يتم الحصول على إذن الموقع"
            }
            dir="ltr"
          />

          {activity.latitude !==
            undefined &&
          activity.longitude !==
            undefined ? (
            <a
              href={`https://www.google.com/maps?q=${activity.latitude},${activity.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              <MapPin className="h-4 w-4" />

              فتح الموقع على الخريطة
            </a>
          ) : null}

          {activity.order_location_latitude !==
            undefined &&
          activity.order_location_longitude !==
            undefined ? (
            <Info
              icon={MapPin}
              label="آخر موقع شحن محفوظ من طلب"
              value={`${activity.order_location_latitude}, ${activity.order_location_longitude}`}
              dir="ltr"
            />
          ) : null}
        </Section>

        <Section title="بيانات الزيارات والتفاعل — Analytical & Session Data">
          <Info
            icon={Clock3}
            label="أول زيارة مسجلة للحساب"
            value={
              activity.first_visit_at
                ? new Date(
                    activity.first_visit_at,
                  ).toLocaleString(
                    "ar-YE",
                  )
                : "لم يتم التسجيل بعد"
            }
          />

          <Info
            icon={Clock3}
            label="آخر نشاط"
            value={
              activity.last_active_at
                ? new Date(
                    activity.last_active_at,
                  ).toLocaleString(
                    "ar-YE",
                  )
                : "لم يتم التسجيل بعد"
            }
          />

          <Info
            icon={Globe}
            label="آخر صفحة"
            value={
              activity.last_path ||
              "غير متوفر"
            }
            dir="ltr"
          />

          <Info
            icon={Package}
            label="قائمة الرغبات"
            value={`${details.wishlist.length} منتج`}
          />
        </Section>

        <Section title="قائمة الرغبات — Wishlist">
          {details.wishlist.length ===
          0 ? (
            <Empty />
          ) : (
            details.wishlist.map(
              (item) => (
                <div
                  key={
                    item.id
                  }
                  className="rounded-xl border border-border p-3"
                >
                  <p className="font-bold">
                    {
                      item.product
                        ?.name
                    }
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatPrice(
                      Number(
                        item.product
                          ?.price ??
                          0,
                      ),
                    )}
                  </p>
                </div>
              ),
            )
          )}
        </Section>

        <Section title="سجل العمليات والطلبات — Order History & CRM">
          <Metric
            label="عدد الطلبات"
            value={
              metrics.order_count
            }
          />

          <Metric
            label="إجمالي المشتريات"
            value={formatPrice(
              Number(
                metrics.total_spent,
              ),
            )}
          />

          <Metric
            label="متوسط قيمة الطلب AOV"
            value={formatPrice(
              Number(
                metrics.average_order_value,
              ),
            )}
          />

          <Metric
            label="طلبات تم توصيلها"
            value={
              metrics.delivered_count
            }
          />

          <Metric
            label="طلبات ملغاة"
            value={
              metrics.cancelled_count
            }
          />
        </Section>

        <Section title="الطلبات بالتفصيل">
          {details.orders.length ===
          0 ? (
            <Empty />
          ) : (
            details.orders.map(
              (order) => (
                <div
                  key={
                    order.id
                  }
                  className="rounded-2xl border border-border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-black">
                        {order.order_number}
                      </p>

                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(
                          order.created_at,
                        ).toLocaleString(
                          "ar-YE",
                        )}
                      </p>
                    </div>

                    <Status
                      value={
                        order.status
                      }
                    />
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <Metric
                      label="الإجمالي"
                      value={formatPrice(
                        Number(
                          order.total,
                        ),
                      )}
                    />

                    <Metric
                      label="الدفع"
                      value={
                        order.payment_method_code ||
                        "غير محدد"
                      }
                    />

                    <Metric
                      label="حالة الدفع"
                      value={
                        order.payment_status ||
                        "غير محدد"
                      }
                    />
                  </div>

                  <div className="mt-3 space-y-2">
                    {order.items.map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className="rounded-xl bg-secondary p-3"
                        >
                          <p className="font-semibold">
                            {
                              item.product_name
                            }
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            الكمية:{" "}
                            {
                              item.quantity
                            }
                            {" · "}
                            السعر:{" "}
                            {formatPrice(
                              Number(
                                item.unit_price,
                              ),
                            )}
                          </p>

                          {item.vendor_name ? (
                            <p className="mt-1 text-xs text-primary">
                              المورد:{" "}
                              {
                                item.vendor_name
                              }
                            </p>
                          ) : null}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ),
            )
          )}
        </Section>

        <Section title="المحفظة">
          {details.wallets.length ===
          0 ? (
            <Empty />
          ) : (
            details.wallets.map(
              (wallet) => (
                <div
                  key={
                    wallet.id
                  }
                  className="rounded-xl bg-primary/10 p-4"
                >
                  <p className="text-xs">
                    {wallet.currency}
                  </p>

                  <p className="mt-1 text-xl font-black text-primary">
                    {formatPrice(
                      Number(
                        wallet.balance,
                      ),
                    )}
                  </p>
                </div>
              ),
            )
          )}

          <WalletEditor
            currency={
              walletCurrency
            }
            mode={
              walletMode
            }
            amount={
              walletAmount
            }
            reason={
              walletReason
            }
            loading={
              actionLoading
            }
            onCurrency={
              onCurrencyChange
            }
            onMode={
              onModeChange
            }
            onAmount={
              onAmountChange
            }
            onReason={
              onReasonChange
            }
            onSubmit={
              onWalletUpdate
            }
          />
        </Section>

        <Section title="سجل معاملات المحفظة">
          {details.transactions.length ===
          0 ? (
            <Empty />
          ) : (
            details.transactions.map(
              (transaction) => (
                <Transaction
                  key={
                    transaction.id
                  }
                  transaction={
                    transaction
                  }
                />
              ),
            )
          )}
        </Section>

        <Section title="عناوين العميل">
          {details.addresses.length ===
          0 ? (
            <Empty />
          ) : (
            details.addresses.map(
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
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(
                      address,
                      null,
                      2,
                    )}
                  </pre>
                </div>
              ),
            )
          )}
        </Section>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              actionLoading
            }
            onClick={
              onToggle
            }
            className="rounded-xl bg-secondary px-4 py-3 text-xs font-bold"
          >
            {profile.is_disabled
              ? "تفعيل الحساب"
              : "تعطيل الحساب"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function VendorModal({
  details,
  detailsLoading,
  walletCurrency,
  walletMode,
  walletAmount,
  walletReason,
  actionLoading,
  onClose,
  onCurrencyChange,
  onModeChange,
  onAmountChange,
  onReasonChange,
  onWalletUpdate,
  onToggle,
}: {
  details: VendorDetails;
  detailsLoading: boolean;
  walletCurrency: string;
  walletMode: "delta" | "set";
  walletAmount: string;
  walletReason: string;
  actionLoading: boolean;
  onClose: () => void
