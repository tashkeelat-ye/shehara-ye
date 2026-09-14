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
  History,
  Laptop,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Shield,
  Store,
  User,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Section = "users" | "vendors";
type AnyRecord = Record<string, unknown>;

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
  created_at?: string;
  updated_at?: string;
};

type Transaction = {
  id: string;
  wallet_id?: string | null;
  user_id?: string;
  currency?: string;
  transaction_type?: string;
  kind?: string | null;
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
  order_location_latitude?: number | null;
  order_location_longitude?: number | null;
  order_location_at?: string | null;
};

type WishlistItem = {
  id: string;
  product_id: string;
  created_at: string;
  product?: AnyRecord | null;
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
  updated_at?: string | null;
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
  addresses: AnyRecord[];
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
  products: AnyRecord[];
  metrics: {
    product_count: number;
    order_item_count: number;
    units_sold: number;
    sales_value: number;
    distinct_orders: number;
  };
};

type RpcResult = {
  data: unknown;
  error: { message: string } | null;
};

type DbClient = typeof supabase & {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<RpcResult>;
};

const db = supabase as unknown as DbClient;

function record(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : {};
}

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function text(value: unknown, fallback = "غير متوفر"): string {
  const v = String(value ?? "").trim();
  return v || fallback;
}

function money(value: unknown, currency = "YER"): string {
  return `${new Intl.NumberFormat("ar-YE").format(num(value))} ${currency}`;
}

function dateText(value?: string | null): string {
  if (!value) return "غير متوفر";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-YE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusText(status?: string | null): string {
  const map: Record<string, string> = {
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
  return map[status ?? ""] ?? text(status, "غير محدد");
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
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
        <h3 className="font-bold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-3 last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[70%] break-words text-left text-sm font-medium">
        {value === undefined || value === null || value === "" ? "غير متوفر" : value}
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
        <span className="text-xs text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div className="text-lg font-black">{value}</div>
    </div>
  );
}

function normalizeUser(value: unknown): UserRow {
  const v = record(value);
  const vendorValue = v.vendor;
  return {
    id: text(v.id, ""),
    full_name: text(v.full_name, "بدون اسم"),
    first_name: text(v.first_name, ""),
    second_name: text(v.second_name, ""),
    last_name: text(v.last_name, ""),
    phone: v.phone ? String(v.phone) : null,
    contact_email: v.contact_email ? String(v.contact_email) : null,
    province: text(v.province, ""),
    wallet_balance: num(v.wallet_balance),
    is_disabled: Boolean(v.is_disabled),
    accepted_terms: Boolean(v.accepted_terms),
    created_at: text(v.created_at, ""),
    roles: arrayOf<unknown>(v.roles).map((r) => String(r)),
    vendor: Object.keys(record(vendorValue)).length
      ? normalizeVendor(vendorValue)
      : null,
  };
}

function normalizeVendor(value: unknown): VendorRow {
  const v = record(value);
  const owner = record(v.owner);
  return {
    id: text(v.id, ""),
    user_id: v.user_id ? String(v.user_id) : null,
    name: text(v.name, "بدون اسم"),
    city: text(v.city, ""),
    phone: text(v.phone, ""),
    logo_url: v.logo_url ? String(v.logo_url) : null,
    description: text(v.description, ""),
    is_active: Boolean(v.is_active),
    account_enabled: Boolean(v.account_enabled),
    created_at: text(v.created_at, ""),
    product_count: num(v.product_count),
    owner: Object.keys(owner).length
      ? {
          id: text(owner.id, ""),
          full_name: text(owner.full_name, "بدون اسم"),
          phone: owner.phone ? String(owner.phone) : null,
          contact_email: owner.contact_email ? String(owner.contact_email) : null,
          province: text(owner.province, ""),
          is_disabled: Boolean(owner.is_disabled),
          created_at: text(owner.created_at, ""),
        }
      : null,
  };
}

function normalizeUserDetails(value: unknown): UserDetails {
  const root = record(value);
  const profile = normalizeUser(root.profile);
  const metrics = record(root.metrics);
  return {
    profile,
    roles: arrayOf<unknown>(root.roles).map(String),
    vendor: root.vendor ? normalizeVendor(root.vendor) : null,
    wallets: arrayOf<unknown>(root.wallets).map((item) => {
      const w = record(item);
      return {
        id: text(w.id, ""),
        user_id: text(w.user_id, profile.id),
        currency: text(w.currency, "YER"),
        balance: num(w.balance),
        created_at: w.created_at ? String(w.created_at) : undefined,
        updated_at: w.updated_at ? String(w.updated_at) : undefined,
      };
    }),
    transactions: arrayOf<unknown>(root.transactions).map((item) => {
      const t = record(item);
      return {
        id: text(t.id, ""),
        wallet_id: t.wallet_id ? String(t.wallet_id) : null,
        user_id: t.user_id ? String(t.user_id) : undefined,
        currency: t.currency ? String(t.currency) : undefined,
        transaction_type: t.transaction_type ? String(t.transaction_type) : undefined,
        kind: t.kind ? String(t.kind) : null,
        amount: num(t.amount),
        balance_before: num(t.balance_before),
        balance_after: num(t.balance_after),
        description: t.description ? String(t.description) : null,
        reason: t.reason ? String(t.reason) : null,
        created_at: text(t.created_at, ""),
      };
    }),
    addresses: arrayOf<AnyRecord>(root.addresses),
    activity: record(root.activity) as ActivityData,
    wishlist: arrayOf<unknown>(root.wishlist).map((item) => {
      const w = record(item);
      return {
        id: text(w.id, ""),
        product_id: text(w.product_id, ""),
        created_at: text(w.created_at, ""),
        product: record(w.product),
      };
    }),
    orders: arrayOf<unknown>(root.orders).map((item) => {
      const o = record(item);
      return {
        id: text(o.id, ""),
        order_number: text(o.order_number, "غير محدد"),
        invoice_number: o.invoice_number ? String(o.invoice_number) : null,
        status: text(o.status, "غير محدد"),
        payment_status: o.payment_status ? String(o.payment_status) : null,
        payment_method_code: o.payment_method_code ? String(o.payment_method_code) : null,
        subtotal: num(o.subtotal),
        delivery_fee: num(o.delivery_fee),
        total: num(o.total),
        currency: text(o.currency, "YER"),
        shipping_city: o.shipping_city ? String(o.shipping_city) : null,
        shipping_district: o.shipping_district ? String(o.shipping_district) : null,
        shipping_details: o.shipping_details ? String(o.shipping_details) : null,
        created_at: text(o.created_at, ""),
        updated_at: o.updated_at ? String(o.updated_at) : null,
        latitude: o.latitude == null ? null : num(o.latitude),
        longitude: o.longitude == null ? null : num(o.longitude),
        items: arrayOf<unknown>(o.items).map((item) => {
          const i = record(item);
          return {
            id: text(i.id, ""),
            product_id: i.product_id ? String(i.product_id) : null,
            product_name: i.product_name ? String(i.product_name) : null,
            product_image: i.product_image ? String(i.product_image) : null,
            unit_price: num(i.unit_price),
            quantity: num(i.quantity),
            size: i.size ? String(i.size) : null,
            color: i.color ? String(i.color) : null,
            vendor_id: i.vendor_id ? String(i.vendor_id) : null,
            vendor_name: i.vendor_name ? String(i.vendor_name) : null,
            vendor_phone: i.vendor_phone ? String(i.vendor_phone) : null,
            vendor_city: i.vendor_city ? String(i.vendor_city) : null,
          };
        }),
      };
    }),
    metrics: {
      order_count: num(metrics.order_count),
      total_spent: num(metrics.total_spent),
      average_order_value: num(metrics.average_order_value),
      delivered_count: num(metrics.delivered_count),
      cancelled_count: num(metrics.cancelled_count),
    },
  };
}

function normalizeVendorDetails(value: unknown): VendorDetails {
  const root = record(value);
  const metrics = record(root.metrics);
  return {
    vendor: normalizeVendor(root.vendor),
    profile: root.profile ? normalizeUser(root.profile) : null,
    wallets: arrayOf<unknown>(root.wallets).map((item) => {
      const w = record(item);
      return {
        id: text(w.id, ""),
        user_id: text(w.user_id, ""),
        currency: text(w.currency, "YER"),
        balance: num(w.balance),
      };
    }),
    transactions: arrayOf<unknown>(root.transactions).map((item) => {
      const t = record(item);
      return {
        id: text(t.id, ""),
        wallet_id: t.wallet_id ? String(t.wallet_id) : null,
        user_id: t.user_id ? String(t.user_id) : undefined,
        currency: t.currency ? String(t.currency) : undefined,
        transaction_type: t.transaction_type ? String(t.transaction_type) : undefined,
        kind: t.kind ? String(t.kind) : null,
        amount: num(t.amount),
        balance_before: num(t.balance_before),
        balance_after: num(t.balance_after),
        description: t.description ? String(t.description) : null,
        reason: t.reason ? String(t.reason) : null,
        created_at: text(t.created_at, ""),
      };
    }),
    activity: record(root.activity) as ActivityData,
    products: arrayOf<AnyRecord>(root.products),
    metrics: {
      product_count: num(metrics.product_count ?? metrics.order_item_count),
      order_item_count: num(metrics.order_item_count),
      units_sold: num(metrics.units_sold),
      sales_value: num(metrics.sales_value),
      distinct_orders: num(metrics.distinct_orders),
    },
  };
}

export function AccountManagement({
  initialSection,
}: {
  initialSection: Section;
}) {
  const [section, setSection] = useState<Section>(initialSection);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorDetails | null>(null);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [walletCurrency, setWalletCurrency] = useState("YER");
  const [walletMode, setWalletMode] = useState<"delta" | "set">("delta");

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResult, vendorsResult] = await Promise.all([
        db.rpc("admin_list_user_accounts"),
        db.rpc("admin_list_vendor_accounts"),
      ]);
      if (usersResult.error) throw new Error(usersResult.error.message);
      if (vendorsResult.error) throw new Error(vendorsResult.error.message);
      setUsers(arrayOf<unknown>(usersResult.data).map(normalizeUser).filter((u) => !u.roles.some((r) => ["admin", "super_admin"].includes(r))));
      setVendors(arrayOf<unknown>(vendorsResult.data).map(normalizeVendor));
    } catch (error) {
      console.error("[AccountManagement] loadAccounts", error);
      toast.error(errorMessage(error, "تعذر تحميل حسابات المستخدمين والتجار."));
      setUsers([]);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => [u.full_name, u.phone, u.contact_email, u.province, ...u.roles].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [users, search]);

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) => [v.name, v.phone, v.city, v.description, v.owner?.full_name, v.owner?.phone, v.owner?.contact_email].some((x) => String(x ?? "").toLowerCase().includes(q)));
  }, [vendors, search]);

  const openUser = async (user: UserRow) => {
    setDetailsLoading(true);
    setSelectedVendor(null);
    try {
      const result = await db.rpc("admin_get_user_account_details", { p_user_id: user.id });
      if (result.error) throw new Error(result.error.message);
      if (!result.data) throw new Error("قاعدة البيانات لم تُرجع تفاصيل الحساب.");
      setSelectedUser(normalizeUserDetails(result.data));
    } catch (error) {
      console.error("[AccountManagement] openUser", error);
      toast.error(errorMessage(error, "تعذر تحميل تفاصيل الحساب."));
    } finally {
      setDetailsLoading(false);
    }
  };

  const openVendor = async (vendor: VendorRow) => {
    setDetailsLoading(true);
    setSelectedUser(null);
    try {
      const result = await db.rpc("admin_get_vendor_account_details", { p_vendor_id: vendor.id });
      if (result.error) throw new Error(result.error.message);
      if (!result.data) throw new Error("قاعدة البيانات لم تُرجع تفاصيل المتجر.");
      setSelectedVendor(normalizeVendorDetails(result.data));
    } catch (error) {
      console.error("[AccountManagement] openVendor", error);
      toast.error(errorMessage(error, "تعذر تحميل تفاصيل المتجر."));
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    if (detailsLoading || actionLoading) return;
    setSelectedUser(null);
    setSelectedVendor(null);
    setWalletAmount("");
    setWalletReason("");
  };

  const refreshUserDetails = async (userId: string) => {
    const result = await db.rpc("admin_get_user_account_details", { p_user_id: userId });
    if (result.error) throw new Error(result.error.message);
    if (result.data) setSelectedUser(normalizeUserDetails(result.data));
  };

  const adjustWallet = async () => {
    if (!selectedUser) return;
    const amount = Number(walletAmount);
    if (!Number.isFinite(amount)) {
      toast.error("أدخل قيمة رقمية صحيحة.");
      return;
    }
    if (walletMode === "delta" && amount === 0) {
      toast.error("قيمة الإضافة أو الخصم لا يمكن أن تكون صفراً.");
      return;
    }
    if (walletMode === "set" && amount < 0) {
      toast.error("الرصيد النهائي لا يمكن أن يكون سالباً.");
      return;
    }

    setActionLoading(true);
    try {
      const result = await db.rpc("admin_update_wallet_balance", {
        p_user_id: selectedUser.profile.id,
        p_currency: walletCurrency,
        p_amount: amount,
        p_mode: walletMode,
        p_reason: walletReason.trim(),
      });
      if (result.error) throw new Error(result.error.message);
      await loadAccounts();
      await refreshUserDetails(selectedUser.profile.id);
      setWalletAmount("");
      setWalletReason("");
      toast.success("تم تعديل الرصيد وتسجيل العملية في سجل المحفظة.");
    } catch (error) {
      console.error("[AccountManagement] adjustWallet", error);
      toast.error(errorMessage(error, "تعذر تعديل الرصيد."));
    } finally {
      setActionLoading(false);
    }
  };

  const toggleUser = async (user: UserRow) => {
    setActionLoading(true);
    try {
      const result = await db.rpc("admin_set_user_disabled", {
        p_user_id: user.id,
        p_disabled: !user.is_disabled,
      });
      if (result.error) throw new Error(result.error.message);
      await loadAccounts();
      if (selectedUser?.profile.id === user.id) await refreshUserDetails(user.id);
      toast.success(user.is_disabled ? "تم تفعيل الحساب فعلياً." : "تم تعطيل الحساب فعلياً.");
    } catch (error) {
      console.error("[AccountManagement] toggleUser", error);
      toast.error(errorMessage(error, "تعذر تحديث حالة الحساب."));
    } finally {
      setActionLoading(false);
    }
  };

  const toggleVendor = async (vendor: VendorRow) => {
    setActionLoading(true);
    try {
      const result = await db.rpc("admin_set_vendor_enabled", {
        p_vendor_id: vendor.id,
        p_enabled: !(vendor.account_enabled && vendor.is_active),
      });
      if (result.error) throw new Error(result.error.message);
      await loadAccounts();
      if (selectedVendor?.vendor.id === vendor.id) await openVendor(vendor);
      toast.success(vendor.account_enabled && vendor.is_active ? "تم تعطيل المتجر فعلياً." : "تم تفعيل المتجر فعلياً.");
    } catch (error) {
      console.error("[AccountManagement] toggleVendor", error);
      toast.error(errorMessage(error, "تعذر تحديث حالة المتجر."));
    } finally {
      setActionLoading(false);
    }
  };

  const userStats = useMemo(() => ({
    total: users.length,
    disabled: users.filter((u) => u.is_disabled).length,
    vendors: users.filter((u) => Boolean(u.vendor)).length,
  }), [users]);

  const vendorStats = useMemo(() => ({
    total: vendors.length,
    active: vendors.filter((v) => v.account_enabled && v.is_active).length,
    disabled: vendors.filter((v) => !v.account_enabled || !v.is_active).length,
    products: vendors.reduce((n, v) => n + num(v.product_count), 0),
  }), [vendors]);

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-black">إدارة المستخدمين والتجار</h1>
            <p className="mt-1 text-sm text-muted-foreground">البيانات والحالات والأرصدة والتفاصيل مأخوذة مباشرة من قاعدة البيانات.</p>
          </div>
          <button type="button" onClick={() => void loadAccounts()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 font-bold hover:bg-muted disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setSection("users"); setSearch(""); }} className={`rounded-xl px-4 py-3 font-bold ${section === "users" ? "bg-primary text-primary-foreground" : "border bg-background"}`}>
            <User className="ml-2 inline h-4 w-4" /> حسابات المستخدمين ({users.length})
          </button>
          <button type="button" onClick={() => { setSection("vendors"); setSearch(""); }} className={`rounded-xl px-4 py-3 font-bold ${section === "vendors" ? "bg-primary text-primary-foreground" : "border bg-background"}`}>
            <Store className="ml-2 inline h-4 w-4" /> حسابات التجار ({vendors.length})
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={section === "users" ? "بحث بالاسم أو الهاتف أو البريد أو المحافظة..." : "بحث باسم المتجر أو الهاتف أو المدينة أو المالك..."} className="w-full rounded-xl border bg-background py-3 pl-4 pr-10 outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      {section === "users" ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Metric title="المستخدمون" value={userStats.total} icon={<User className="h-5 w-5" />} />
            <Metric title="المعطلون" value={userStats.disabled} icon={<Ban className="h-5 w-5" />} />
            <Metric title="حسابات مرتبطة بتاجر" value={userStats.vendors} icon={<Store className="h-5 w-5" />} />
          </div>
          {loading ? <LoadingBox /> : <div className="grid gap-3">{filteredUsers.map((user) => <UserCard key={user.id} user={user} actionLoading={actionLoading} onDetails={openUser} onToggle={toggleUser} />)}{filteredUsers.length === 0 && <Empty text="لا توجد حسابات مستخدمين مطابقة." />}</div>}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric title="التجار" value={vendorStats.total} icon={<Store className="h-5 w-5" />} />
            <Metric title="النشطة" value={vendorStats.active} icon={<CheckCircle2 className="h-5 w-5" />} />
            <Metric title="المعطلة" value={vendorStats.disabled} icon={<Ban className="h-5 w-5" />} />
            <Metric title="المنتجات" value={vendorStats.products} icon={<Package className="h-5 w-5" />} />
          </div>
          {loading ? <LoadingBox /> : <div className="grid gap-3">{filteredVendors.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} actionLoading={actionLoading} onDetails={openVendor} onToggle={toggleVendor} />)}{filteredVendors.length === 0 && <Empty text="لا توجد حسابات تجار مطابقة." />}</div>}
        </>
      )}

      {detailsLoading && !selectedUser && !selectedVendor && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"><div className="rounded-2xl bg-background p-6 font-bold"><RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />جاري تحميل التفاصيل...</div></div>}

      {selectedUser && <UserModal user={selectedUser} detailsLoading={detailsLoading} actionLoading={actionLoading} walletAmount={walletAmount} walletReason={walletReason} walletCurrency={walletCurrency} walletMode={walletMode} onClose={closeDetails} onWalletAmount={setWalletAmount} onWalletReason={setWalletReason} onWalletCurrency={setWalletCurrency} onWalletMode={setWalletMode} onWallet={adjustWallet} onToggle={() => void toggleUser(selectedUser.profile)} />}

      {selectedVendor && <VendorModal vendor={selectedVendor} detailsLoading={detailsLoading} actionLoading={actionLoading} onClose={closeDetails} onToggle={() => void toggleVendor(selectedVendor.vendor)} />}
    </div>
  );
}

function LoadingBox() {
  return <div className="rounded-2xl border bg-card p-10 text-center"><RefreshCw className="mx-auto mb-3 h-7 w-7 animate-spin" /><p className="font-bold">جاري تحميل البيانات الحقيقية...</p></div>;
}

function Empty({ text: message }: { text: string }) {
  return <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">{message}</div>;
}

function UserCard({ user, actionLoading, onDetails, onToggle }: { user: UserRow; actionLoading: boolean; onDetails: (u: UserRow) => Promise<void>; onToggle: (u: UserRow) => Promise<void> }) {
  return <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10"><User className="h-6 w-6 text-primary" /></div><div className="min-w-0"><h3 className="truncate font-black">{user.full_name}</h3><p className="text-sm text-muted-foreground">{user.phone || "بدون هاتف"}</p><p className="text-xs text-muted-foreground">{user.contact_email || "بدون بريد"}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${user.is_disabled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{user.is_disabled ? "معطل" : "نشط"}</span><span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">رصيد YER: {money(user.wallet_balance)}</span>{user.vendor && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold"><Store className="ml-1 inline h-3 w-3" /> تاجر</span>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void onDetails(user)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold hover:bg-muted"><Eye className="h-4 w-4" /> عرض التفاصيل</button><button type="button" disabled={actionLoading} onClick={() => void onToggle(user)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold hover:bg-muted disabled:opacity-50">{user.is_disabled ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}{user.is_disabled ? "تفعيل" : "تعطيل"}</button></div></div></div>;
}

function VendorCard({ vendor, actionLoading, onDetails, onToggle }: { vendor: VendorRow; actionLoading: boolean; onDetails: (v: VendorRow) => Promise<void>; onToggle: (v: VendorRow) => Promise<void> }) {
  const active = vendor.account_enabled && vendor.is_active;
  return <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">{vendor.logo_url ? <img src={vendor.logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-6 w-6 text-primary" />}</div><div className="min-w-0"><h3 className="truncate font-black">{vendor.name}</h3><p className="text-sm text-muted-foreground">{vendor.city} · {vendor.phone || "بدون هاتف"}</p><p className="text-xs text-muted-foreground">المالك: {vendor.owner?.full_name || "غير مرتبط"}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{active ? "نشط" : "معطل"}</span><span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">المنتجات: {num(vendor.product_count)}</span></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void onDetails(vendor)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold hover:bg-muted"><Eye className="h-4 w-4" /> تفاصيل المتجر</button><button type="button" disabled={actionLoading} onClick={() => void onToggle(vendor)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-bold hover:bg-muted disabled:opacity-50">{active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{active ? "تعطيل" : "تفعيل"}</button></div></div></div>;
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"><div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-background shadow-2xl"><div className="flex shrink-0 items-center justify-between border-b bg-card p-4"><div><h2 className="text-xl font-black">{title}</h2>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}</div><button type="button" onClick={onClose} className="rounded-full bg-muted p-3 hover:bg-muted/70"><X className="h-5 w-5" /></button></div><div className="overflow-y-auto p-4">{children}</div><div className="shrink-0 border-t bg-card p-3 text-left"><button type="button" onClick={onClose} className="rounded-xl bg-muted px-5 py-3 font-bold">إغلاق</button></div></div></div>;
}

function UserModal({ user, detailsLoading, actionLoading, walletAmount, walletReason, walletCurrency, walletMode, onClose, onWalletAmount, onWalletReason, onWalletCurrency, onWalletMode, onWallet, onToggle }: { user: UserDetails; detailsLoading: boolean; actionLoading: boolean; walletAmount: string; walletReason: string; walletCurrency: string; walletMode: "delta" | "set"; onClose: () => void; onWalletAmount: (v: string) => void; onWalletReason: (v: string) => void; onWalletCurrency: (v: string) => void; onWalletMode: (v: "delta" | "set") => void; onWallet: () => void; onToggle: () => void }) {
  const activity = user.activity || {};
  return <ModalShell title="تفاصيل الحساب" subtitle={user.profile.full_name} onClose={onClose}>
    {detailsLoading && <div className="mb-4 rounded-xl bg-muted p-3 text-center"><RefreshCw className="mx-auto mb-1 h-5 w-5 animate-spin" />جاري تحديث البيانات...</div>}
    <div className="grid gap-4">
      <SectionBox title="البيانات الشخصية" icon={<User className="h-5 w-5" />}><div className="grid gap-2 md:grid-cols-2"><DetailRow label="الاسم الكامل" value={user.profile.full_name} /><DetailRow label="الاسم الأول" value={user.profile.first_name} /><DetailRow label="اسم الأب" value={user.profile.second_name} /><DetailRow label="اسم العائلة" value={user.profile.last_name} /><DetailRow label="الهاتف" value={user.profile.phone} /><DetailRow label="البريد" value={user.profile.contact_email} /><DetailRow label="المحافظة" value={user.profile.province} /><DetailRow label="تاريخ التسجيل" value={dateText(user.profile.created_at)} /><DetailRow label="الأدوار" value={user.roles.join("، ") || "عميل"} /><DetailRow label="الشروط" value={user.profile.accepted_terms ? "تم القبول" : "غير مؤكد"} /></div></SectionBox>

      <SectionBox title="البيانات التقنية والموقع" icon={<Laptop className="h-5 w-5" />}><div className="grid gap-2 md:grid-cols-2"><DetailRow label="نوع الجهاز" value={activity.device_type} /><DetailRow label="نظام التشغيل" value={activity.os_name} /><DetailRow label="المتصفح" value={activity.browser_name} /><DetailRow label="عنوان IP" value={activity.last_ip} /><DetailRow label="الدولة" value={activity.ip_country} /><DetailRow label="المنطقة" value={activity.ip_region} /><DetailRow label="المدينة" value={activity.ip_city} /><DetailRow label="آخر صفحة" value={activity.last_path} /><DetailRow label="خط العرض" value={activity.latitude} /><DetailRow label="خط الطول" value={activity.longitude} /><DetailRow label="دقة الموقع" value={activity.location_accuracy != null ? `${activity.location_accuracy} متر` : undefined} /><DetailRow label="موقع آخر طلب" value={activity.order_location_latitude != null && activity.order_location_longitude != null ? `${activity.order_location_latitude}, ${activity.order_location_longitude}` : undefined} /></div></SectionBox>

      <SectionBox title="الزيارات والجلسات" icon={<Activity className="h-5 w-5" />}><div className="grid gap-2 md:grid-cols-2"><DetailRow label="أول زيارة" value={dateText(activity.first_visit_at)} /><DetailRow label="آخر نشاط" value={dateText(activity.last_active_at)} /><DetailRow label="User Agent" value={activity.user_agent} /></div></SectionBox>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><Metric title="الطلبات" value={user.metrics.order_count} icon={<Package className="h-5 w-5" />} /><Metric title="إجمالي الإنفاق" value={money(user.metrics.total_spent)} icon={<Wallet className="h-5 w-5" />} /><Metric title="متوسط الطلب" value={money(user.metrics.average_order_value)} icon={<Activity className="h-5 w-5" />} /><Metric title="تم التوصيل" value={user.metrics.delivered_count} icon={<CheckCircle2 className="h-5 w-5" />} /><Metric title="ملغاة" value={user.metrics.cancelled_count} icon={<Ban className="h-5 w-5" />} /></div>

      <SectionBox title="المحفظة الحقيقية" icon={<Wallet className="h-5 w-5" />}>
        <div className="grid gap-3 md:grid-cols-2">{user.wallets.map((w) => <div key={w.id} className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">{w.currency}</div><div className="mt-1 text-2xl font-black">{money(w.balance, w.currency)}</div></div>)}{user.wallets.length === 0 && <Empty text="لا توجد محافظ مسجلة." />}</div>
        <div className="mt-4 rounded-2xl border bg-muted/30 p-4"><h4 className="mb-3 font-bold">إضافة / خصم / تعيين الرصيد</h4><div className="grid gap-3 md:grid-cols-4"><select value={walletMode} onChange={(e) => onWalletMode(e.target.value as "delta" | "set")} className="rounded-xl border bg-background px-4 py-3"><option value="delta">إضافة / خصم</option><option value="set">تعيين الرصيد</option></select><select value={walletCurrency} onChange={(e) => onWalletCurrency(e.target.value)} className="rounded-xl border bg-background px-4 py-3"><option value="YER">ريال يمني</option><option value="SAR">ريال سعودي</option></select><input type="number" inputMode="decimal" value={walletAmount} onChange={(e) => onWalletAmount(e.target.value)} placeholder="القيمة" className="rounded-xl border bg-background px-4 py-3" /><input value={walletReason} onChange={(e) => onWalletReason(e.target.value)} placeholder="سبب العملية" className="rounded-xl border bg-background px-4 py-3" /></div><button type="button" disabled={actionLoading} onClick={onWallet} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50"><Wallet className="h-4 w-4" />{actionLoading ? "جاري التنفيذ..." : "تنفيذ العملية"}</button></div>
        <div className="mt-4"><h4 className="mb-3 flex items-center gap-2 font-bold"><History className="h-5 w-5" />سجل معاملات المحفظة</h4>{user.transactions.length === 0 ? <Empty text="لا توجد معاملات مسجلة." /> : <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[800px] text-sm"><thead className="bg-muted"><tr><th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">العملة</th><th className="p-3 text-right">العملية</th><th className="p-3 text-right">القيمة</th><th className="p-3 text-right">قبل</th><th className="p-3 text-right">بعد</th><th className="p-3 text-right">السبب</th></tr></thead><tbody>{user.transactions.map((t) => <tr key={t.id} className="border-t"><td className="p-3">{dateText(t.created_at)}</td><td className="p-3">{t.currency || "YER"}</td><td className="p-3 font-bold">{text(t.transaction_type || t.kind, "غير محدد")}</td><td className="p-3 font-bold">{money(t.amount, t.currency || "YER")}</td><td className="p-3">{money(t.balance_before, t.currency || "YER")}</td><td className="p-3">{money(t.balance_after, t.currency || "YER")}</td><td className="p-3">{t.reason || t.description || "—"}</td></tr>)}</tbody></table></div>}</div>
      </SectionBox>

      <SectionBox title="المتجر المرتبط بالحساب" icon={<Store className="h-5 w-5" />}>{user.vendor ? <div className="grid gap-2 md:grid-cols-2"><DetailRow label="اسم المتجر" value={user.vendor.name} /><DetailRow label="الهاتف" value={user.vendor.phone} /><DetailRow label="المدينة" value={user.vendor.city} /><DetailRow label="الحالة" value={user.vendor.account_enabled && user.vendor.is_active ? "مفعل" : "معطل"} /><DetailRow label="تاريخ الإنشاء" value={dateText(user.vendor.created_at)} /><DetailRow label="الوصف" value={user.vendor.description} /></div> : <Empty text="لا يوجد متجر مرتبط بهذا الحساب." />}</SectionBox>

      <SectionBox title="عناوين العميل" icon={<MapPin className="h-5 w-5" />}>{user.addresses.length === 0 ? <Empty text="لا توجد عناوين مسجلة." /> : <div className="grid gap-3 md:grid-cols-2">{user.addresses.map((address, index) => <div key={String(address.id ?? index)} className="rounded-xl border p-4">{Object.entries(address).filter(([, v]) => v !== null && v !== undefined && v !== "").map(([key, value]) => <DetailRow key={key} label={key} value={String(value)} />)}</div>)}</div>}</SectionBox>

      <SectionBox title="المفضلة" icon={<Clock3 className="h-5 w-5" />}>{user.wishlist.length === 0 ? <Empty text="لا توجد منتجات في المفضلة." /> : <div className="grid gap-3 md:grid-cols-2">{user.wishlist.map((item) => <div key={item.id} className="rounded-xl border p-4"><div className="font-bold">{text(item.product?.name, item.product_id)}</div><div className="mt-1 text-sm text-muted-foreground">السعر: {money(item.product?.price)}</div><div className="mt-1 text-xs text-muted-foreground">أضيفت: {dateText(item.created_at)}</div></div>)}</div>}</SectionBox>

      <SectionBox title="الطلبات وسجل CRM" icon={<Package className="h-5 w-5" />}>{user.orders.length === 0 ? <Empty text="لا توجد طلبات مسجلة." /> : <div className="space-y-3">{user.orders.map((order) => <div key={order.id} className="rounded-2xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">#{order.order_number}</div><span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{statusText(order.status)}</span></div><div className="mt-2 grid gap-2 md:grid-cols-4"><DetailRow label="التاريخ" value={dateText(order.created_at)} /><DetailRow label="الإجمالي" value={money(order.total, order.currency)} /><DetailRow label="الدفع" value={order.payment_method_code} /><DetailRow label="حالة الدفع" value={order.payment_status} /></div><div className="mt-3 rounded-xl bg-muted/40 p-3"><div className="mb-2 font-bold">المنتجات ({order.items.length})</div>{order.items.map((item) => <div key={item.id} className="border-b py-2 last:border-0"><div className="font-bold">{item.product_name || "منتج"}</div><div className="text-sm text-muted-foreground">الكمية: {item.quantity} · السعر: {money(item.unit_price, order.currency)} · المورد: {item.vendor_name || "غير محدد"}{item.vendor_city ? ` · ${item.vendor_city}` : ""}</div></div>)}</div></div>)}</div>}</SectionBox>

      <SectionBox title="إجراءات الحساب" icon={<Shield className="h-5 w-5" />}><div className="flex flex-wrap items-center justify-between gap-3"><DetailRow label="الحالة الحالية" value={user.profile.is_disabled ? "معطل" : "نشط"} /><button type="button" disabled={actionLoading} onClick={onToggle} className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 font-bold disabled:opacity-50">{user.profile.is_disabled ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}{user.profile.is_disabled ? "تفعيل الحساب" : "تعطيل الحساب"}</button></div></SectionBox>
    </div>
  </ModalShell>;
}

function VendorModal({ vendor, detailsLoading, actionLoading, onClose, onToggle }: { vendor: VendorDetails; detailsLoading: boolean; actionLoading: boolean; onClose: () => void; onToggle: () => void }) {
  const activity = vendor.activity || {};
  return <ModalShell title="تفاصيل المتجر" subtitle={vendor.vendor.name} onClose={onClose}>
    {detailsLoading && <div className="mb-4 rounded-xl bg-muted p-3 text-center"><RefreshCw className="mx-auto mb-1 h-5 w-5 animate-spin" />جاري تحديث البيانات...</div>}
    <div className="grid gap-4">
      <SectionBox title="بيانات المتجر" icon={<Store className="h-5 w-5" />}><div className="grid gap-2 md:grid-cols-2"><DetailRow label="اسم المتجر" value={vendor.vendor.name} /><DetailRow label="المعرف" value={vendor.vendor.id} /><DetailRow label="المالك" value={vendor.profile?.full_name || vendor.vendor.owner?.full_name} /><DetailRow label="حساب المالك" value={vendor.vendor.user_id} /><DetailRow label="الهاتف" value={vendor.vendor.phone} /><DetailRow label="المدينة" value={vendor.vendor.city} /><DetailRow label="تاريخ التسجيل" value={dateText(vendor.vendor.created_at)} /><DetailRow label="الحالة" value={vendor.vendor.account_enabled && vendor.vendor.is_active ? "نشط" : "معطل"} /><DetailRow label="الوصف" value={vendor.vendor.description} /></div></SectionBox>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Metric title="المنتجات" value={vendor.metrics.product_count} icon={<Package className="h-5 w-5" />} /><Metric title="الوحدات المباعة" value={vendor.metrics.units_sold} icon={<Package className="h-5 w-5" />} /><Metric title="قيمة المبيعات" value={money(vendor.metrics.sales_value)} icon={<Wallet className="h-5 w-5" />} /><Metric title="الطلبات" value={vendor.metrics.distinct_orders} icon={<Activity className="h-5 w-5" />} /></div>
      <SectionBox title="البيانات التقنية للمالك" icon={<Laptop className="h-5 w-5" />}><div className="grid gap-2 md:grid-cols-2"><DetailRow label="نوع الجهاز" value={activity.device_type} /><DetailRow label="نظام التشغيل" value={activity.os_name} /><DetailRow label="المتصفح" value={activity.browser_name} /><DetailRow label="IP" value={activity.last_ip} /><DetailRow label="المدينة حسب IP" value={activity.ip_city} /><DetailRow label="خط العرض" value={activity.latitude} /><DetailRow label="خط الطول" value={activity.longitude} /><DetailRow label="آخر نشاط" value={dateText(activity.last_active_at)} /></div></SectionBox>
      <SectionBox title="محافظ الحساب" icon={<Wallet className="h-5 w-5" />}><div className="grid gap-3 md:grid-cols-2">{vendor.wallets.map((w) => <div key={w.id} className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">{w.currency}</div><div className="text-2xl font-black">{money(w.balance, w.currency)}</div></div>)}{vendor.wallets.length === 0 && <Empty text="لا توجد محافظ." />}</div></SectionBox>
      <SectionBox title="منتجات المتجر" icon={<Package className="h-5 w-5" />}>{vendor.products.length === 0 ? <Empty text="لا توجد منتجات مرتبطة بهذا المتجر." /> : <div className="grid gap-3 md:grid-cols-2">{vendor.products.map((product, index) => <div key={String(product.id ?? index)} className="rounded-xl border p-4"><div className="font-bold">{text(product.name, `منتج ${index + 1}`)}</div><div className="mt-1 text-sm">السعر: {money(product.price)}</div><div className="mt-1 text-sm text-muted-foreground">المخزون: {text(product.stock, "غير محدد")} · الحالة: {product.is_active ? "نشط" : "معطل"}</div></div>)}</div>}</SectionBox>
      <SectionBox title="سجل محفظة التاجر" icon={<History className="h-5 w-5" />}>{vendor.transactions.length === 0 ? <Empty text="لا توجد معاملات." /> : <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[700px] text-sm"><thead className="bg-muted"><tr><th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">العملة</th><th className="p-3 text-right">العملية</th><th className="p-3 text-right">القيمة</th><th className="p-3 text-right">السبب</th></tr></thead><tbody>{vendor.transactions.map((t) => <tr key={t.id} className="border-t"><td className="p-3">{dateText(t.created_at)}</td><td className="p-3">{t.currency || "YER"}</td><td className="p-3">{text(t.transaction_type || t.kind)}</td><td className="p-3 font-bold">{money(t.amount, t.currency || "YER")}</td><td className="p-3">{t.reason || t.description || "—"}</td></tr>)}</tbody></table></div>}</SectionBox>
      <SectionBox title="إجراءات المتجر" icon={<Shield className="h-5 w-5" />}><div className="flex flex-wrap items-center justify-between gap-3"><DetailRow label="الحالة الحالية" value={vendor.vendor.account_enabled && vendor.vendor.is_active ? "نشط" : "معطل"} /><button type="button" disabled={actionLoading} onClick={onToggle} className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 font-bold disabled:opacity-50">{vendor.vendor.account_enabled && vendor.vendor.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{vendor.vendor.account_enabled && vendor.vendor.is_active ? "تعطيل المتجر" : "تفعيل المتجر"}</button></div></SectionBox>
    </div>
  </ModalShell>;
}
