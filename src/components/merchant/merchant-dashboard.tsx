import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Box,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  ExternalLink,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, fetchWalletTransactions } from "@/lib/store";

type Vendor = {
  id: string;
  user_id: string;
  name: string;
  city: string;
  phone: string;
  description: string;
  is_active: boolean;
  account_enabled: boolean;
};

type Product = {
  id: string;
  name: string;
  price: number;
  old_price: number | null;
  stock_left: number;
  total_stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  images: string[];
  sales_count: number;
  created_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string;
  unit_price: number;
  quantity: number;
  vendor_status: string;
  vendor_updated_at: string;
};

type WalletData = {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
};

type WalletTransaction = {
  id: string;
  amount: number;
  kind: string;
  transaction_type: string;
  currency: string;
  description: string;
  balance_before: number | null;
  balance_after: number | null;
  created_at: string;
};

type MerchantDashboardProps = {
  compact?: boolean;
};

const vendorStatusLabels: Record<string, string> = {
  new: "طلب جديد",
  accepted: "تم القبول",
  processing: "قيد التجهيز",
  ready: "جاهز للشحن",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

function getStatusClass(status: string) {
  switch (status) {
    case "new":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";

    case "accepted":
    case "processing":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";

    case "ready":
    case "shipped":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";

    case "delivered":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

    case "cancelled":
      return "bg-destructive/10 text-destructive";

    default:
      return "bg-secondary text-muted-foreground";
  }
}

function formatRelativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("ar-YE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getProductImage(product: Product) {
  return Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]
    : "";
}

export function MerchantDashboard({
  compact = false,
}: MerchantDashboardProps) {
  const { user } = useAuth();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(
    async (background = false) => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const vendorResult = await supabase
          .from("vendors")
          .select(
            "id,user_id,name,city,phone,description,is_active,account_enabled",
          )
          .eq("user_id", user.id)
          .maybeSingle<Vendor>();

        if (vendorResult.error) {
          throw vendorResult.error;
        }

        if (!vendorResult.data) {
          setVendor(null);
          setProducts([]);
          setOrderItems([]);
          setWallet(null);
          setTransactions([]);
          return;
        }

        const vendorId = vendorResult.data.id;

        setVendor(vendorResult.data);

        const [productsResult, itemsResult, walletResult, txResult] =
          await Promise.all([
            supabase
              .from("products")
              .select(
                "id,name,price,old_price,stock_left,total_stock,low_stock_threshold,is_active,images,sales_count,created_at",
              )
              .eq("vendor_id", vendorId)
              .order("created_at", {
                ascending: false,
              })
              .returns<Product[]>(),

            supabase
              .from("order_items")
              .select(
                "id,order_id,product_id,product_name,product_image,unit_price,quantity,vendor_status,vendor_updated_at",
              )
              .eq("vendor_id", vendorId)
              .order("vendor_updated_at", {
                ascending: false,
              })
              .returns<OrderItem[]>(),

            (supabase as any).rpc("get_wallet", {
              requested_currency: "YER",
            }),

            fetchWalletTransactions(user.id, "YER"),
          ]);

        if (productsResult.error) {
          throw productsResult.error;
        }

        if (itemsResult.error) {
          throw itemsResult.error;
        }

        if (walletResult.error) {
          throw walletResult.error;
        }

        const walletRow = Array.isArray(walletResult.data)
          ? walletResult.data[0]
          : walletResult.data;

        setProducts(productsResult.data ?? []);
        setOrderItems(itemsResult.data ?? []);

        setWallet(
          walletRow
            ? {
                id: String(walletRow.id),
                user_id: String(walletRow.user_id),
                currency: String(walletRow.currency ?? "YER"),
                balance: Number(walletRow.balance ?? 0),
              }
            : null,
        );

        setTransactions(
          (txResult ?? []).slice(0, 8) as WalletTransaction[],
        );
      } catch (error) {
        console.error("[MerchantDashboard] load failed:", error);

        toast.error("تعذّر تحميل لوحة إدارة التاجر.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const statistics = useMemo(() => {
    const validItems = orderItems.filter(
      (item) => item.vendor_status !== "cancelled",
    );

    const totalSales = validItems.reduce(
      (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
      0,
    );

    const soldQuantity = validItems.reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    );

    const deliveredItems = orderItems.filter(
      (item) => item.vendor_status === "delivered",
    );

    const deliveredSales = deliveredItems.reduce(
      (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
      0,
    );

    const pendingItems = orderItems.filter((item) =>
      ["new", "accepted", "processing"].includes(item.vendor_status),
    );

    const shippingItems = orderItems.filter((item) =>
      ["ready", "shipped"].includes(item.vendor_status),
    );

    const activeProducts = products.filter(
      (product) => product.is_active,
    );

    const lowStockProducts = products.filter((product) => {
      const stock = Number(product.stock_left ?? 0);
      const threshold = Number(product.low_stock_threshold ?? 0);

      return product.is_active && stock <= threshold;
    });

    return {
      totalProducts: products.length,
      activeProducts: activeProducts.length,
      lowStockProducts: lowStockProducts.length,
      totalOrders: new Set(orderItems.map((item) => item.order_id)).size,
      totalSales,
      deliveredSales,
      soldQuantity,
      pendingItems: pendingItems.length,
      shippingItems: shippingItems.length,
    };
  }, [orderItems, products]);

  const recentOrders = useMemo(() => {
    const seen = new Set<string>();

    return orderItems.filter((item) => {
      if (seen.has(item.order_id)) {
        return false;
      }

      seen.add(item.order_id);
      return true;
    }).slice(0, 6);
  }, [orderItems]);

  const bestSellingProducts = useMemo(() => {
    return [...products]
      .sort(
        (a, b) =>
          Number(b.sales_count ?? 0) - Number(a.sales_count ?? 0),
      )
      .slice(0, 5);
  }, [products]);

  const active = Boolean(
    vendor?.is_active && vendor?.account_enabled,
  );

  if (loading) {
    return (
      <div dir="rtl" className="grid min-h-[60vh] place-items-center p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          جارٍ تحميل لوحة التاجر...
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl p-4">
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <Store className="mx-auto h-12 w-12 text-muted-foreground/60" />

          <h1 className="mt-4 text-xl font-black">
            لا يوجد متجر مرتبط بهذا الحساب
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">
            لم يتم العثور على حساب تاجر مرتبط بحسابك الحالي. إذا كنت قد سجلت
            كتاجر، فتواصل مع الإدارة لتفعيل المتجر.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-10 sm:p-5"
    >
      <section className="overflow-hidden rounded-[28px] border border-border bg-card">
        <div className="relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">
                  <Store className="h-3.5 w-3.5" />
                  لوحة التاجر
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold ${
                    active
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      active ? "bg-emerald-500" : "bg-destructive"
                    }`}
                  />
                  {active ? "المتجر مفعّل" : "المتجر غير مفعّل"}
                </span>
              </div>

              <h1 className="truncate text-2xl font-black text-foreground sm:text-3xl">
                أهلاً بك في {vendor.name}
              </h1>

              <p className="mt-2 text-xs leading-6 text-muted-foreground sm:text-sm">
                من هنا يمكنك متابعة منتجاتك ومبيعاتك وطلبات العملاء ورصيد
                محفظتك في مكان واحد.
              </p>

              {vendor.city ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {vendor.city}
                  {vendor.phone ? ` • ${vendor.phone}` : ""}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadDashboard(true)}
                disabled={refreshing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 text-xs font-bold transition hover:bg-secondary disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                تحديث البيانات
              </button>

              <Link
                to="/merchant"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:opacity-90"
              >
                إدارة المنتجات
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {!active ? (
            <div className="relative mt-5 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-bold">
                  المتجر غير مفعّل حالياً
                </p>

                <p className="mt-1 leading-6">
                  يمكنك مراجعة بيانات المنتجات، لكن استقبال الطلبات يعتمد
                  على تفعيل الحساب من الإدارة.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={ShoppingBag}
          label="إجمالي المبيعات"
          value={formatPrice(statistics.totalSales)}
          helper={`${statistics.soldQuantity} قطعة مباعة`}
          accent="primary"
        />

        <StatCard
          icon={Package}
          label="المنتجات"
          value={statistics.totalProducts}
          helper={`${statistics.activeProducts} منتج نشط`}
        />

        <StatCard
          icon={BarChart3}
          label="الطلبات"
          value={statistics.totalOrders}
          helper={`${statistics.pendingItems} قيد المعالجة`}
        />

        <StatCard
          icon={Wallet}
          label="رصيد المحفظة"
          value={formatPrice(wallet?.balance ?? 0)}
          helper="بالريال اليمني"
          accent="emerald"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black">مؤشرات المتجر</h2>
              <p className="mt-1 text-[10px] text-muted-foreground">
                ملخص مباشر من بيانات المتجر الحالية
              </p>
            </div>

            <BarChart3 className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricBox
              label="مبيعات مكتملة"
              value={formatPrice(statistics.deliveredSales)}
              icon={CheckCircle2}
            />

            <MetricBox
              label="جاهزة/مشحونة"
              value={statistics.shippingItems}
              icon={Package}
            />

            <MetricBox
              label="مخزون منخفض"
              value={statistics.lowStockProducts}
              icon={AlertTriangle}
              danger={statistics.lowStockProducts > 0}
            />
          </div>
        </div>

        <Link
          to="/wallet"
          className="group rounded-3xl border border-border bg-card p-5 transition hover:border-primary/30 hover:bg-secondary/30"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </span>

            <ChevronLeft className="h-5 w-5 text-muted-foreground transition group-hover:-translate-x-1" />
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            رصيد المحفظة الحالي
          </p>

          <p className="mt-1 text-2xl font-black">
            {formatPrice(wallet?.balance ?? 0)}
          </p>

          <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
            إدارة الرصيد، طلبات الشحن، وسجل العمليات المالية.
          </p>

          <div className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-primary">
            فتح المحفظة
            <ArrowLeft className="h-3.5 w-3.5" />
          </div>
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="آخر الطلبات"
          subtitle="أحدث المنتجات التي دخلت في طلبات العملاء"
          actionLabel="إدارة الطلبات"
          actionTo="/merchant/orders"
          icon={ShoppingBag}
        >
          {recentOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="لا توجد طلبات بعد"
              description="ستظهر هنا طلبات منتجات متجرك عند شراء العملاء منها."
            />
          ) : (
            <div className="space-y-2">
              {recentOrders.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="m-auto mt-3 h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">
                      {item.product_name}
                    </p>

                    <p className="mt-1 text-[10px] text-muted-foreground">
                      الكمية: {item.quantity} •{" "}
                      {formatRelativeDate(item.vendor_updated_at)}
                    </p>
                  </div>

                  <div className="shrink-0 text-left">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${getStatusClass(
                        item.vendor_status,
                      )}`}
                    >
                      {vendorStatusLabels[item.vendor_status] ??
                        item.vendor_status}
                    </span>

                    <p className="mt-1 text-[10px] font-bold">
                      {formatPrice(
                        Number(item.unit_price) * Number(item.quantity),
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="الأكثر مبيعاً"
          subtitle="حسب عداد المبيعات المسجل للمنتجات"
          actionLabel="إدارة المنتجات"
          actionTo="/merchant"
          icon={BarChart3}
        >
          {bestSellingProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="لا توجد منتجات"
              description="أضف منتجاتك لتبدأ بإدارة متجرك."
            />
          ) : (
            <div className="space-y-2">
              {bestSellingProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {getProductImage(product) ? (
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="m-auto mt-3 h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">
                      {product.name}
                    </p>

                    <p className="mt-1 text-[10px] text-muted-foreground">
                      المخزون: {product.stock_left ?? 0}
                    </p>
                  </div>

                  <div className="shrink-0 text-left">
                    <p className="text-xs font-black">
                      {product.sales_count ?? 0}
                    </p>

                    <p className="text-[9px] text-muted-foreground">
                      مبيعات
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="تنبيهات المخزون"
          subtitle="المنتجات التي تحتاج إلى مراجعة المخزون"
          actionLabel="إدارة المنتجات"
          actionTo="/merchant"
          icon={AlertTriangle}
        >
          {statistics.lowStockProducts === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />

              <div>
                <p className="text-xs font-bold">
                  المخزون بحالة جيدة
                </p>

                <p className="mt-1 text-[10px] text-muted-foreground">
                  لا توجد منتجات تحت حد المخزون المنخفض حالياً.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {products
                .filter(
                  (product) =>
                    product.is_active &&
                    Number(product.stock_left ?? 0) <=
                      Number(product.low_stock_threshold ?? 0),
                )
                .slice(0, 6)
                .map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />

                      <p className="truncate text-xs font-bold">
                        {product.name}
                      </p>
                    </div>

                    <span className="shrink-0 text-[10px] font-black text-amber-600">
                      {product.stock_left ?? 0} متبقي
                    </span>
                  </div>
                ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="آخر العمليات المالية"
          subtitle="آخر حركات محفظة التاجر"
          actionLabel="فتح المحفظة"
          actionTo="/wallet"
          icon={Wallet}
        >
          {transactions.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="لا توجد عمليات مالية"
              description="ستظهر عمليات المحفظة هنا بعد إجراء العمليات المالية."
            />
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 6).map((transaction) => {
                const credit =
                  transaction.transaction_type === "credit";

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-3 rounded-2xl border border-border p-3"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        credit
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      <Wallet className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">
                        {transaction.description || transaction.kind}
                      </p>

                      <p className="mt-1 text-[9px] text-muted-foreground">
                        {formatRelativeDate(transaction.created_at)}
                      </p>
                    </div>

                    <p
                      dir="ltr"
                      className={`shrink-0 text-xs font-black ${
                        credit
                          ? "text-emerald-600"
                          : "text-destructive"
                      }`}
                    >
                      {credit ? "+" : "-"}
                      {formatPrice(Math.abs(Number(transaction.amount)))}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction
          to="/merchant"
          icon={Package}
          title="المنتجات"
          description="إضافة وتعديل المنتجات"
        />

        <QuickAction
          to="/merchant/orders"
          icon={ShoppingBag}
          title="الطلبات"
          description="متابعة مبيعات المتجر"
        />

        <QuickAction
          to="/wallet"
          icon={Wallet}
          title="المحفظة"
          description="الرصيد والعمليات"
        />

        <QuickAction
          to="/merchant"
          icon={Store}
          title="بيانات المتجر"
          description="إدارة معلومات المتجر"
        />
      </section>

      {!compact ? (
        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-muted-foreground" />

              <div>
                <p className="text-xs font-bold">
                  آخر تحديث للبيانات
                </p>

                <p className="mt-1 text-[10px] text-muted-foreground">
                  يتم جلب البيانات مباشرة من قاعدة البيانات عند فتح اللوحة أو
                  الضغط على تحديث.
                </p>
              </div>
            </div>

            <Link
              to="/wallet"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-primary"
            >
              عرض السجل المالي
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  accent,
}: {
  icon: typeof Package;
  label: string;
  value: string | number;
  helper: string;
  accent?: "primary" | "emerald";
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
          accent === "emerald"
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-4 text-[10px] text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 truncate text-lg font-black sm:text-xl">
        {value}
      </p>

      <p className="mt-1 truncate text-[9px] text-muted-foreground">
        {helper}
      </p>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  danger = false,
}: {
  icon: typeof Package;
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-secondary/60 p-4">
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${
            danger ? "text-amber-500" : "text-primary"
          }`}
        />

        <span className="text-[10px] text-muted-foreground">
          {label}
        </span>
      </div>

      <p className="mt-2 text-base font-black">{value}</p>
    </div>
  );
}

function DashboardPanel({
  title,
  subtitle,
  actionLabel,
  actionTo,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  actionTo: "/merchant" | "/merchant/orders" | "/wallet";
  icon: typeof Package;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </span>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-black">{title}</h2>

            <p className="mt-1 truncate text-[9px] text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>

        <Link
          to={actionTo}
          className="flex shrink-0 items-center gap-1 text-[9px] font-bold text-primary"
        >
          {actionLabel}
          <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
      </div>

      {children}
    </section>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Package;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-7 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground/50" />

      <p className="mt-3 text-xs font-bold">{title}</p>

      <p className="mx-auto mt-1 max-w-sm text-[10px] leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: "/merchant" | "/merchant/orders" | "/wallet";
  icon: typeof Package;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-3xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-secondary/30"
    >
      <Icon className="h-5 w-5 text-primary transition group-hover:scale-105" />

      <p className="mt-4 text-xs font-black">{title}</p>

      <p className="mt-1 text-[9px] leading-5 text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}
