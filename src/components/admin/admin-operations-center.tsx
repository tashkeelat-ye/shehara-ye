import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Bike,
  CheckCircle2,
  Clock3,
  CreditCard,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
  Users,
  WalletCards,
  ArrowLeft,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminCard } from "@/components/admin-ui";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/db";
import { formatDateTime } from "@/lib/store";

const STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار التأكيد",
  awaiting_payment: "بانتظار الدفع",
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const STATUS_CLASS: Record<string, string> = {
  delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive",
  shipped: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  processing: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

type Stats = {
  products: number;
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  orders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  users: number;
  vendors: number;
  activeVendors: number;
  couriers: number;
  activeCouriers: number;
  pendingPayments: number;
  revenue: number;
  todayRevenue: number;
  todayOrders: number;
};

type RecentOrder = {
  id: string;
  order_number: string;
  total: number;
  status: string;
  payment_status: string;
  shipping_name: string | null;
  created_at: string;
};

type LowStockProduct = {
  id: string;
  name: string;
  stock_left: number;
  low_stock_threshold: number;
  is_active: boolean;
};

type CourierRow = {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
  account_enabled: boolean;
};

const emptyStats: Stats = {
  products: 0,
  activeProducts: 0,
  lowStock: 0,
  outOfStock: 0,
  orders: 0,
  pendingOrders: 0,
  processingOrders: 0,
  shippedOrders: 0,
  deliveredOrders: 0,
  users: 0,
  vendors: 0,
  activeVendors: 0,
  couriers: 0,
  activeCouriers: 0,
  pendingPayments: 0,
  revenue: 0,
  todayRevenue: 0,
  todayOrders: 0,
};

function Stat({
  label,
  value,
  icon: Icon,
  href,
  hint,
}: {
  label: string;
  value: string | number;
  icon: typeof Package;
  href?: string;
  hint?: string;
}) {
  const body = (
    <div className="flex min-h-[118px] flex-col justify-between rounded-2xl border border-border/70 bg-card p-4 transition hover:border-primary/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        {href ? <ArrowLeft className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-black">{value}</p>
        {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );

  return href ? <Link to={href}>{body}</Link> : body;
}

export function AdminOperationsCenter() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [couriers, setCouriers] = useState<CourierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const [
        products,
        activeProducts,
        lowStockResult,
        outOfStock,
        ordersCount,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        users,
        vendors,
        activeVendors,
        couriersCount,
        activeCouriers,
        pendingPayments,
        revenue,
        todayRevenue,
        todayOrders,
        recentOrders,
        courierRows,
      ] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("products").select("id,name,stock_left,low_stock_threshold,is_active").eq("is_active", true).gt("stock_left", 0).filter("stock_left", "lte", "low_stock_threshold").order("stock_left", { ascending: true }).limit(8).returns<LowStockProduct[]>(),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("stock_left", 0),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "awaiting_payment"]),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "processing"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "shipped"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("couriers").select("id", { count: "exact", head: true }),
        supabase.from("couriers").select("id", { count: "exact", head: true }).eq("is_active", true).eq("account_enabled", true),
        supabase.from("payment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("total").neq("status", "cancelled"),
        supabase.from("orders").select("total").neq("status", "cancelled").gte("created_at", todayIso),
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
        supabase.from("orders").select("id,order_number,total,status,payment_status,shipping_name,created_at").order("created_at", { ascending: false }).limit(8).returns<RecentOrder[]>(),
        supabase.from("couriers").select("id,name,city,is_active,account_enabled").order("name").limit(8).returns<CourierRow[]>(),
      ]);

      const failures = [
        products, activeProducts, lowStockResult, outOfStock, ordersCount,
        pendingOrders, processingOrders, shippedOrders, deliveredOrders, users,
        vendors, activeVendors, couriersCount, activeCouriers, pendingPayments,
        revenue, todayRevenue, todayOrders, recentOrders, courierRows,
      ].filter((r) => r.error);

      if (failures.length) throw failures[0].error;

      const sum = (rows: Array<{ total?: number | null }> | null | undefined) =>
        (rows ?? []).reduce((n, row) => n + Number(row.total ?? 0), 0);

      setStats({
        products: products.count ?? 0,
        activeProducts: activeProducts.count ?? 0,
        lowStock: lowStockResult.data?.length ?? 0,
        outOfStock: outOfStock.count ?? 0,
        orders: ordersCount.count ?? 0,
        pendingOrders: pendingOrders.count ?? 0,
        processingOrders: processingOrders.count ?? 0,
        shippedOrders: shippedOrders.count ?? 0,
        deliveredOrders: deliveredOrders.count ?? 0,
        users: users.count ?? 0,
        vendors: vendors.count ?? 0,
        activeVendors: activeVendors.count ?? 0,
        couriers: couriersCount.count ?? 0,
        activeCouriers: activeCouriers.count ?? 0,
        pendingPayments: pendingPayments.count ?? 0,
        revenue: sum(revenue.data),
        todayRevenue: sum(todayRevenue.data),
        todayOrders: todayOrders.count ?? 0,
      });
      setOrders(recentOrders.data ?? []);
      setLowStock(lowStockResult.data ?? []);
      setCouriers(courierRows.data ?? []);
    } catch (e) {
      console.error("[AdminOperationsCenter]", e);
      const message = e instanceof Error ? e.message : "تعذر تحميل بيانات الإدارة.";
      setError(message);
      if (refresh) toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pipeline = useMemo(() => [
    ["بانتظار المعالجة", stats.pendingOrders],
    ["قيد التجهيز", stats.processingOrders],
    ["تم الشحن", stats.shippedOrders],
    ["تم التسليم", stats.deliveredOrders],
  ] as const, [stats]);

  if (loading) {
    return <div dir="rtl" className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div><div className="h-72 animate-pulse rounded-2xl bg-muted" /></div>;
  }

  return (
    <div dir="rtl" className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">مركز التحكم التشغيلي</p>
          <h1 className="mt-1 text-2xl font-black">إدارة متجر شهارة</h1>
          <p className="mt-1 text-xs text-muted-foreground">مؤشرات حقيقية من قاعدة البيانات مع روابط مباشرة لكل عملية.</p>
        </div>
        <button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold disabled:opacity-60">
          <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> تحديث البيانات
        </button>
      </header>

      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">تعذر تحميل بعض بيانات لوحة الإدارة. تحقق من صلاحيات الحساب ثم أعد المحاولة.</div> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <Stat label="المنتجات" value={stats.products.toLocaleString("ar-EG")} icon={Package} href="/admin/products" hint={`${stats.activeProducts} نشط`} />
        <Stat label="طلبات اليوم" value={stats.todayOrders.toLocaleString("ar-EG")} icon={ShoppingBag} href="/admin/orders" />
        <Stat label="بانتظار المعالجة" value={stats.pendingOrders.toLocaleString("ar-EG")} icon={Clock3} href="/admin/orders" />
        <Stat label="مخزون منخفض" value={stats.lowStock.toLocaleString("ar-EG")} icon={AlertTriangle} href="/admin/inventory" hint={`${stats.outOfStock} نافد`} />
        <Stat label="التجار" value={stats.vendors.toLocaleString("ar-EG")} icon={Store} href="/admin/vendors" hint={`${stats.activeVendors} نشط`} />
        <Stat label="عمال التوصيل" value={stats.couriers.toLocaleString("ar-EG")} icon={Bike} href="/admin/couriers" hint={`${stats.activeCouriers} متاح`} />
        <Stat label="طلبات الدفع" value={stats.pendingPayments.toLocaleString("ar-EG")} icon={CreditCard} href="/admin/payment-requests" />
        <Stat label="العملاء" value={stats.users.toLocaleString("ar-EG")} icon={Users} href="/admin/users" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <AdminCard title="مسار الطلبات">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {pipeline.map(([label, value]) => <div key={label} className="rounded-2xl bg-secondary/40 p-4"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black">{value.toLocaleString("ar-EG")}</p></div>)}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 p-4"><div className="flex items-center gap-2 text-primary"><WalletCards className="h-4 w-4" /><span className="text-xs font-bold">إجمالي قيمة الطلبات</span></div><p className="mt-2 text-xl font-black">{formatPrice(stats.revenue)}</p></div>
            <div className="rounded-2xl border border-border/70 p-4"><div className="flex items-center gap-2 text-primary"><Activity className="h-4 w-4" /><span className="text-xs font-bold">قيمة الطلبات اليوم</span></div><p className="mt-2 text-xl font-black">{formatPrice(stats.todayRevenue)}</p></div>
          </div>
        </AdminCard>

        <AdminCard title="إجراءات سريعة">
          <div className="grid grid-cols-2 gap-2">
            {[['/admin/products','المنتجات'],['/admin/orders','الطلبات'],['/admin/inventory','المخزون'],['/admin/vendors','التجار'],['/admin/couriers','التوصيل'],['/admin/payment-requests','المدفوعات'],['/admin/support','الدعم'],['/admin/team','الفريق'],['/admin/settings','الإعدادات']].map(([href,label]) => <Link key={href} to={href} className="rounded-xl border border-border/70 bg-secondary/20 p-3 text-center text-xs font-bold transition hover:border-primary/40 hover:bg-primary/5">{label}</Link>)}
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard title="أحدث الطلبات" action={<Link to="/admin/orders" className="text-[10px] font-bold text-primary">عرض الكل</Link>}>
          <div className="space-y-2">
            {orders.length ? orders.map((order) => <Link key={order.id} to="/admin/orders" className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/20 p-3 hover:border-primary/40"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ShoppingBag className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className="text-xs font-black">{order.order_number}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_CLASS[order.status] ?? "bg-amber-500/10 text-amber-700"}`}>{STATUS_LABELS[order.status] ?? order.status}</span></div><p className="mt-1 truncate text-[10px] text-muted-foreground">{order.shipping_name || "عميل"} • {formatDateTime(order.created_at)}</p></div><span className="text-xs font-black text-primary">{formatPrice(Number(order.total))}</span></Link>) : <p className="py-8 text-center text-xs text-muted-foreground">لا توجد طلبات.</p>}
          </div>
        </AdminCard>

        <AdminCard title="تنبيهات المخزون" action={<Link to="/admin/inventory" className="text-[10px] font-bold text-primary">إدارة المخزون</Link>}>
          <div className="space-y-2">
            {stats.outOfStock > 0 ? <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3"><AlertTriangle className="h-5 w-5 text-destructive" /><div><p className="text-xs font-bold">يوجد {stats.outOfStock.toLocaleString("ar-EG")} منتج نافد</p><p className="text-[10px] text-muted-foreground">راجع الكميات قبل استقبال طلبات جديدة.</p></div></div> : null}
            {lowStock.length ? lowStock.map((product) => <Link key={product.id} to="/admin/inventory" className="flex items-center justify-between rounded-xl border border-border/60 p-3 hover:border-primary/40"><div className="min-w-0"><p className="truncate text-xs font-bold">{product.name}</p><p className="mt-1 text-[10px] text-muted-foreground">حد التنبيه: {product.low_stock_threshold}</p></div><span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-700 dark:text-amber-300">متبقي {product.stock_left}</span></Link>) : <div className="rounded-xl bg-secondary/30 p-6 text-center text-xs text-muted-foreground"><CheckCircle2 className="mx-auto h-5 w-5 text-primary" /><p className="mt-2">لا توجد تنبيهات مخزون حالياً.</p></div>}
          </div>
        </AdminCard>
      </div>

      <AdminCard title="حالة عمال التوصيل" action={<Link to="/admin/couriers" className="text-[10px] font-bold text-primary">إدارة العمال</Link>}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {couriers.map((courier) => <Link key={courier.id} to="/admin/couriers" className="flex items-center gap-3 rounded-xl border border-border/60 p-3 hover:border-primary/40"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Bike className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{courier.name}</p><p className="text-[10px] text-muted-foreground">{courier.city || "بدون محافظة"}</p></div><span className={`h-2.5 w-2.5 rounded-full ${courier.is_active && courier.account_enabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`} title={courier.is_active && courier.account_enabled ? "متاح" : "غير متاح"} /></Link>)}
          {!couriers.length ? <p className="py-6 text-center text-xs text-muted-foreground">لا يوجد عمال توصيل مسجلون.</p> : null}
        </div>
      </AdminCard>
    </div>
  );
}
