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

type MetricValue = number | null;

type Stats = {
  products: MetricValue;
  activeProducts: MetricValue;
  lowStock: MetricValue;
  outOfStock: MetricValue;
  orders: MetricValue;
  pendingOrders: MetricValue;
  processingOrders: MetricValue;
  shippedOrders: MetricValue;
  deliveredOrders: MetricValue;
  users: MetricValue;
  vendors: MetricValue;
  activeVendors: MetricValue;
  couriers: MetricValue;
  activeCouriers: MetricValue;
  pendingPayments: MetricValue;
  revenue: number | null;
  todayRevenue: number | null;
  todayOrders: MetricValue;
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
  delivered:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive",
  shipped:
    "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  processing:
    "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

const emptyStats: Stats = {
  products: null,
  activeProducts: null,
  lowStock: null,
  outOfStock: null,
  orders: null,
  pendingOrders: null,
  processingOrders: null,
  shippedOrders: null,
  deliveredOrders: null,
  users: null,
  vendors: null,
  activeVendors: null,
  couriers: null,
  activeCouriers: null,
  pendingPayments: null,
  revenue: null,
  todayRevenue: null,
  todayOrders: null,
};

type QueryResult = {
  data?: any;
  error?: { message?: string } | null;
  count?: number | null;
};

async function runQuery(
  label: string,
  request: PromiseLike<QueryResult>,
  errors: string[],
): Promise<QueryResult> {
  try {
    const result = await request;

    if (result.error) {
      errors.push(
        `${label}: ${result.error.message ?? "تعذر تنفيذ الاستعلام."}`,
      );
    }

    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير معروف.";

    errors.push(`${label}: ${message}`);

    return {
      data: null,
      count: null,
      error: { message },
    };
  }
}

function metric(value: MetricValue): string {
  return value === null
    ? "—"
    : value.toLocaleString("ar-EG");
}

function money(value: number | null): string {
  return value === null
    ? "—"
    : formatPrice(value);
}

export function AdminOperationsCenter() {
  const [stats, setStats] =
    useState<Stats>(emptyStats);

  const [orders, setOrders] =
    useState<RecentOrder[]>([]);

  const [lowStock, setLowStock] =
    useState<LowStockProduct[]>([]);

  const [couriers, setCouriers] =
    useState<CourierRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errors, setErrors] =
    useState<string[]>([]);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const queryErrors: string[] = [];

      try {
        const today =
          new Date();

        today.setHours(
          0,
          0,
          0,
          0,
        );

        const todayIso =
          today.toISOString();

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
          runQuery(
            "المنتجات",
            supabase
              .from("products")
              .select("id", {
                count: "exact",
                head: true,
              }),
            queryErrors,
          ),

          runQuery(
            "المنتجات النشطة",
            supabase
              .from("products")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq("is_active", true),
            queryErrors,
          ),

          runQuery(
            "المخزون المنخفض",
            supabase
              .from("products")
              .select(
                "id,name,stock_left,low_stock_threshold,is_active",
              )
              .eq("is_active", true)
              .gt("stock_left", 0)
              .filter(
                "stock_left",
                "lte",
                "low_stock_threshold",
              )
              .order("stock_left", {
                ascending: true,
              })
              .limit(8),
            queryErrors,
          ),

          runQuery(
            "المخزون النافد",
            supabase
              .from("products")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq("stock_left", 0),
            queryErrors,
          ),

          runQuery(
            "الطلبات",
            supabase
              .from("orders")
              .select("id", {
                count: "exact",
                head: true,
              }),
            queryErrors,
          ),

          runQuery(
            "الطلبات المعلقة",
            supabase
              .from("orders")
              .select("id", {
                count: "exact",
                head: true,
              })
              .in("status", [
                "pending",
                "awaiting_payment",
              ]),
            queryErrors,
          ),

          runQuery(
            "الطلبات قيد التجهيز",
            supabase
              .from("orders")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq(
                "status",
                "processing",
              ),
            queryErrors,
          ),

          runQuery(
            "الطلبات المشحونة",
            supabase
              .from("orders")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq(
                "status",
                "shipped",
              ),
            queryErrors,
          ),

          runQuery(
            "الطلبات المسلمة",
            supabase
              .from("orders")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq(
                "status",
                "delivered",
              ),
            queryErrors,
          ),

          runQuery(
            "المستخدمون",
            supabase
              .from("profiles")
              .select("id", {
                count: "exact",
                head: true,
              }),
            queryErrors,
          ),

          runQuery(
            "التجار",
            supabase
              .from("vendors")
              .select("id", {
                count: "exact",
                head: true,
              }),
            queryErrors,
          ),

          runQuery(
            "التجار النشطون",
            supabase
              .from("vendors")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq(
                "is_active",
                true,
              ),
            queryErrors,
          ),

          runQuery(
            "عمال التوصيل",
            supabase
              .from("couriers")
              .select("id", {
                count: "exact",
                head: true,
              }),
            queryErrors,
          ),

          runQuery(
            "عمال التوصيل النشطون",
            supabase
              .from("couriers")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq(
                "is_active",
                true,
              )
              .eq(
                "account_enabled",
                true,
              ),
            queryErrors,
          ),

          runQuery(
            "طلبات الدفع",
            supabase
              .from("payment_requests")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq(
                "status",
                "pending",
              ),
            queryErrors,
          ),

          runQuery(
            "إجمالي المبيعات",
            supabase
              .from("orders")
              .select("total")
              .neq(
                "status",
                "cancelled",
              ),
            queryErrors,
          ),

          runQuery(
            "مبيعات اليوم",
            supabase
              .from("orders")
              .select("total")
              .neq(
                "status",
                "cancelled",
              )
              .gte(
                "created_at",
                todayIso,
              ),
            queryErrors,
          ),

          runQuery(
            "طلبات اليوم",
            supabase
              .from("orders")
              .select("id", {
                count: "exact",
                head: true,
              })
              .gte(
                "created_at",
                todayIso,
              ),
            queryErrors,
          ),

          runQuery(
            "أحدث الطلبات",
            supabase
              .from("orders")
              .select(
                "id,order_number,total,status,payment_status,shipping_name,created_at",
              )
              .order(
                "created_at",
                {
                  ascending: false,
                },
              )
              .limit(8),
            queryErrors,
          ),

          runQuery(
            "عمال التوصيل",
            supabase
              .from("couriers")
              .select(
                "id,name,city,is_active,account_enabled",
              )
              .order("name")
              .limit(8),
            queryErrors,
          ),
        ]);

        const sum = (
          rows: any,
        ): number =>
          (Array.isArray(rows)
            ? rows
            : []
          ).reduce(
            (
              total,
              row,
            ) =>
              total +
              Number(
                row?.total ??
                  0,
              ),
            0,
          );

        setStats({
          products:
            products.error
              ? null
              : products.count ?? 0,

          activeProducts:
            activeProducts.error
              ? null
              : activeProducts.count ??
                0,

          lowStock:
            lowStockResult.error
              ? null
              : Array.isArray(
                  lowStockResult.data,
                )
                ? lowStockResult.data.length
                : 0,

          outOfStock:
            outOfStock.error
              ? null
              : outOfStock.count ??
                0,

          orders:
            ordersCount.error
              ? null
              : ordersCount.count ??
                0,

          pendingOrders:
            pendingOrders.error
              ? null
              : pendingOrders.count ??
                0,

          processingOrders:
            processingOrders.error
              ? null
              : processingOrders.count ??
                0,

          shippedOrders:
            shippedOrders.error
              ? null
              : shippedOrders.count ??
                0,

          deliveredOrders:
            deliveredOrders.error
              ? null
              : deliveredOrders.count ??
                0,

          users:
            users.error
              ? null
              : users.count ?? 0,

          vendors:
            vendors.error
              ? null
              : vendors.count ?? 0,

          activeVendors:
            activeVendors.error
              ? null
              : activeVendors.count ??
                0,

          couriers:
            couriersCount.error
              ? null
              : couriersCount.count ??
                0,

          activeCouriers:
            activeCouriers.error
              ? null
              : activeCouriers.count ??
                0,

          pendingPayments:
            pendingPayments.error
              ? null
              : pendingPayments.count ??
                0,

          revenue:
            revenue.error
              ? null
              : sum(revenue.data),

          todayRevenue:
            todayRevenue.error
              ? null
              : sum(
                  todayRevenue.data,
                ),

          todayOrders:
            todayOrders.error
              ? null
              : todayOrders.count ??
                0,
        });

        setOrders(
          recentOrders.error
            ? []
            : Array.isArray(
                recentOrders.data,
              )
              ? recentOrders.data as RecentOrder[]
              : [],
        );

        setLowStock(
          lowStockResult.error
            ? []
            : Array.isArray(
                lowStockResult.data,
              )
              ? lowStockResult.data as LowStockProduct[]
              : [],
        );

        setCouriers(
          courierRows.error
            ? []
            : Array.isArray(
                courierRows.data,
              )
              ? courierRows.data as CourierRow[]
              : [],
        );

        setErrors(queryErrors);

        if (
          refresh &&
          queryErrors.length
        ) {
          toast.error(
            "تم تحديث اللوحة، لكن بعض المؤشرات غير متاحة بسبب صلاحيات قاعدة البيانات.",
          );
        }
      } catch (error) {
        console.error(
          "[AdminOperationsCenter]",
          error,
        );

        const message =
          error instanceof Error
            ? error.message
            : "تعذر تحميل لوحة الإدارة.";

        setErrors([
          message,
        ]);

        if (refresh) {
          toast.error(
            message,
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const pipeline =
    useMemo(
      () =>
        [
          [
            "بانتظار المعالجة",
            stats.pendingOrders,
          ],
          [
            "قيد التجهيز",
            stats.processingOrders,
          ],
          [
            "تم الشحن",
            stats.shippedOrders,
          ],
          [
            "تم التسليم",
            stats.deliveredOrders,
          ],
        ] as const,
      [stats],
    );

  if (loading) {
    return (
      <div
        dir="rtl"
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
          {Array.from({
            length: 8,
          }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>

        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="space-y-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            مركز التحكم التشغيلي
          </p>

          <h1 className="mt-1 text-2xl font-black">
            إدارة متجر شهارة
          </h1>

          <p className="mt-1 text-xs text-muted-foreground">
            مؤشرات حقيقية من قاعدة البيانات مع استمرار عمل اللوحة حتى عند تعذر مؤشر واحد.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void load(true)
          }
          disabled={refreshing}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold disabled:opacity-60"
        >
          <RefreshCw
            className={
              refreshing
                ? "h-4 w-4 animate-spin"
                : "h-4 w-4"
            }
          />
          تحديث البيانات
        </button>
      </header>

      {errors.length ? (
        <details className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs">
          <summary className="cursor-pointer font-bold text-amber-700 dark:text-amber-300">
            بعض بيانات الإدارة غير متاحة ({errors.length})
          </summary>

          <ul className="mt-3 space-y-1 text-muted-foreground">
            {errors.slice(0, 8).map(
              (error, index) => (
                <li key={index}>
                  • {error}
                </li>
              ),
            )}
          </ul>
        </details>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <Stat
          label="المنتجات"
          value={metric(stats.products)}
          icon={Package}
          href="/admin/products"
          hint={
            stats.activeProducts ===
            null
              ? "بيانات النشاط غير متاحة"
              : `${metric(stats.activeProducts)} نشط`
          }
        />

        <Stat
          label="طلبات اليوم"
          value={metric(stats.todayOrders)}
          icon={ShoppingBag}
          href="/admin/orders"
        />

        <Stat
          label="بانتظار المعالجة"
          value={metric(stats.pendingOrders)}
          icon={Clock3}
          href="/admin/orders"
        />

        <Stat
          label="مخزون منخفض"
          value={metric(stats.lowStock)}
          icon={AlertTriangle}
          href="/admin/inventory"
          hint={
            stats.outOfStock === null
              ? "بيانات النفاد غير متاحة"
              : `${metric(stats.outOfStock)} نافد`
          }
        />

        <Stat
          label="التجار"
          value={metric(stats.vendors)}
          icon={Store}
          href="/admin/vendors"
          hint={
            stats.activeVendors === null
              ? "بيانات النشاط غير متاحة"
              : `${metric(stats.activeVendors)} نشط`
          }
        />

        <Stat
          label="عمال التوصيل"
          value={metric(stats.couriers)}
          icon={Bike}
          href="/admin/couriers"
          hint={
            stats.activeCouriers === null
              ? "بيانات التوفر غير متاحة"
              : `${metric(stats.activeCouriers)} متاح`
          }
        />

        <Stat
          label="طلبات الدفع"
          value={metric(stats.pendingPayments)}
          icon={CreditCard}
          href="/admin/payment-requests"
        />

        <Stat
          label="العملاء"
          value={metric(stats.users)}
          icon={Users}
          href="/admin/users"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <AdminCard title="مسار الطلبات">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {pipeline.map(
              ([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-secondary/40 p-4"
                >
                  <p className="text-[10px] text-muted-foreground">
                    {label}
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {metric(value)}
                  </p>
                </div>
              ),
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 p-4">
              <div className="flex items-center gap-2 text-primary">
                <WalletCards className="h-4 w-4" />
                <span className="text-xs font-bold">
                  إجمالي قيمة الطلبات
                </span>
              </div>

              <p className="mt-2 text-xl font-black">
                {money(stats.revenue)}
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 p-4">
              <div className="flex items-center gap-2 text-primary">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-bold">
                  قيمة الطلبات اليوم
                </span>
              </div>

              <p className="mt-2 text-xl font-black">
                {money(
                  stats.todayRevenue,
                )}
              </p>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="إجراءات سريعة">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["/admin/products", "المنتجات"],
              ["/admin/orders", "الطلبات"],
              ["/admin/inventory", "المخزون"],
              ["/admin/vendors", "التجار"],
              ["/admin/couriers", "التوصيل"],
              [
                "/admin/payment-requests",
                "المدفوعات",
              ],
              ["/admin/support", "الدعم"],
              ["/admin/settings", "الإعدادات"],
            ].map(
              ([href, label]) => (
                <Link
                  key={href}
                  to={href}
                  className="rounded-xl border border-border/70 bg-secondary/20 p-3 text-center text-xs font-bold transition hover:border-primary/40 hover:bg-primary/5"
                >
                  {label}
                </Link>
              ),
            )}
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard
          title="أحدث الطلبات"
          action={
            <Link
              to="/admin/orders"
              className="text-[10px] font-bold text-primary"
            >
              عرض الكل
            </Link>
          }
        >
          <div className="space-y-2">
            {orders.length ? (
              orders.map((order) => (
                <Link
                  key={order.id}
                  to="/admin/orders"
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/20 p-3 hover:border-primary/40"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ShoppingBag className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs font-black">
                        {order.order_number}
                      </span>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          STATUS_CLASS[
                            order.status
                          ] ??
                          "bg-amber-500/10 text-amber-700"
                        }`}
                      >
                        {STATUS_LABELS[
                          order.status
                        ] ??
                          order.status}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-[10px] text-muted-foreground">
                      {order.shipping_name ||
                        "عميل"}{" "}
                      •{" "}
                      {formatDateTime(
                        order.created_at,
                      )}
                    </p>
                  </div>

                  <span className="text-xs font-black text-primary">
                    {formatPrice(
                      Number(
                        order.total,
                      ),
                    )}
                  </span>
                </Link>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">
                لا توجد طلبات متاحة للعرض.
              </p>
            )}
          </div>
        </AdminCard>

        <AdminCard
          title="تنبيهات المخزون"
          action={
            <Link
              to="/admin/inventory"
              className="text-[10px] font-bold text-primary"
            >
              إدارة المخزون
            </Link>
          }
        >
          <div className="space-y-2">
            {stats.outOfStock !==
              null &&
            stats.outOfStock > 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />

                <div>
                  <p className="text-xs font-bold">
                    يوجد{" "}
                    {metric(
                      stats.outOfStock,
                    )}{" "}
                    منتج نافد
                  </p>

                  <p className="text-[10px] text-muted-foreground">
                    راجع الكميات قبل استقبال طلبات جديدة.
                  </p>
                </div>
              </div>
            ) : null}

            {lowStock.length ? (
              lowStock.map(
                (product) => (
                  <Link
                    key={product.id}
                    to="/admin/inventory"
                    className="flex items-center justify-between rounded-xl border border-border/60 p-3 hover:border-primary/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">
                        {product.name}
                      </p>

                      <p className="mt-1 text-[10px] text-muted-foreground">
                        حد التنبيه:{" "}
                        {
                          product.low_stock_threshold
                        }
                      </p>
                    </div>

                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-700 dark:text-amber-300">
                      متبقي{" "}
                      {
                        product.stock_left
                      }
                    </span>
                  </Link>
                ),
              )
            ) : (
              <div className="rounded-xl bg-secondary/30 p-6 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2">
                  لا توجد تنبيهات مخزون متاحة حالياً.
                </p>
              </div>
            )}
          </div>
        </AdminCard>
      </div>

      <AdminCard
        title="حالة عمال التوصيل"
        action={
          <Link
            to="/admin/couriers"
            className="text-[10px] font-bold text-primary"
          >
            إدارة العمال
          </Link>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {couriers.map(
            (courier) => (
              <Link
                key={courier.id}
                to="/admin/couriers"
                className="flex items-center gap-3 rounded-xl border border-border/60 p-3 hover:border-primary/40"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Bike className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">
                    {courier.name}
                  </p>

                  <p className="text-[10px] text-muted-foreground">
                    {courier.city ||
                      "بدون محافظة"}
                  </p>
                </div>

                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    courier.is_active &&
                    courier.account_enabled
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/30"
                  }`}
                  title={
                    courier.is_active &&
                    courier.account_enabled
                      ? "متاح"
                      : "غير متاح"
                  }
                />
              </Link>
            ),
          )}

          {!couriers.length ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              لا يوجد عمال توصيل متاحون للعرض.
            </p>
          ) : null}
        </div>
      </AdminCard>

      <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 text-xs text-muted-foreground">
        <div className="flex items-start gap-3">
          <ArrowLeft className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

          <p className="leading-6">
            إذا كان حساب الإدارة يملك صلاحية admin في قاعدة البيانات،
            فالمؤشرات المتاحة ستظهر مباشرة. عند رفض RLS لاستعلام معين
            ستظهر قيمة «—» لذلك المؤشر بدلاً من إيقاف لوحة الإدارة بالكامل.
          </p>
        </div>
      </div>
    </div>
  );
}

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

        {href ? (
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        ) : null}
      </div>

      <div>
        <p className="text-[11px] text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 text-2xl font-black">
          {value}
        </p>

        {hint ? (
          <p className="mt-1 text-[10px] text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );

  return href ? (
    <Link to={href}>
      {body}
    </Link>
  ) : (
    body
  );
}
