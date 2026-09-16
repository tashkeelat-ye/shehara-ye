import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock3,
  CreditCard,
  LayoutGrid,
  Package,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/db";
import {
  formatDate,
  formatDateTime,
  PAYMENT_REQUEST_PURPOSE_LABELS,
  PAYMENT_REQUEST_STATUS_LABELS,
  type PaymentRequest,
} from "@/lib/store";
import { AdminCard } from "@/components/admin-ui";

type DashboardOrder = {
  id: string;
  order_number: string;
  total: number;
  status: string;
  payment_status: string;
  shipping_name: string;
  created_at: string;
};

type DashboardStats = {
  products: number;
  activeProducts: number;
  orders: number;
  pendingOrders: number;
  users: number;
  vendors: number;
  pendingPayments: number;
  revenue: number;
};

const emptyStats: DashboardStats = {
  products: 0,
  activeProducts: 0,
  orders: 0,
  pendingOrders: 0,
  users: 0,
  vendors: 0,
  pendingPayments: 0,
  revenue: 0,
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار التأكيد",
  awaiting_payment: "بانتظار الدفع",
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "غير مدفوع",
  pending: "قيد المراجعة",
  paid: "مدفوع",
  rejected: "مرفوض",
};

function statusClass(status: string) {
  if (
    status === "delivered" ||
    status === "paid" ||
    status === "confirmed"
  ) {
    return "bg-primary/10 text-primary";
  }

  if (
    status === "cancelled" ||
    status === "rejected"
  ) {
    return "bg-destructive/10 text-destructive";
  }

  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function StatCard({
  label,
  value,
  icon: Icon,
  to,
  description,
}: {
  label: string;
  value: number;
  icon: typeof Package;
  to?: string;
  description?: string;
}) {
  const content = (
    <div className="flex min-h-[126px] flex-col justify-between rounded-2xl border border-border/70 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>

        {to ? (
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        ) : null}
      </div>

      <div>
        <p className="text-[11px] text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 text-2xl font-black tracking-tight text-foreground">
          {value.toLocaleString("ar-EG")}
        </p>

        {description ? (
          <p className="mt-1 text-[10px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );

  return to ? (
    <Link to={to}>{content}</Link>
  ) : (
    content
  );
}

export function AdminOverview() {
  const [stats, setStats] =
    useState<DashboardStats>(emptyStats);

  const [orders, setOrders] =
    useState<DashboardOrder[]>([]);

  const [payments, setPayments] =
    useState<PaymentRequest[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [
          productsResult,
          activeProductsResult,
          ordersResult,
          pendingOrdersResult,
          usersResult,
          vendorsResult,
          pendingPaymentsResult,
          revenueResult,
          recentOrdersResult,
          recentPaymentsResult,
        ] = await Promise.all([
          supabase
            .from("products")
            .select("id", {
              count: "exact",
              head: true,
            }),

          supabase
            .from("products")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("is_active", true),

          supabase
            .from("orders")
            .select("id", {
              count: "exact",
              head: true,
            }),

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

          supabase
            .from("profiles")
            .select("id", {
              count: "exact",
              head: true,
            }),

          supabase
            .from("vendors")
            .select("id", {
              count: "exact",
              head: true,
            }),

          supabase
            .from("payment_requests")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("status", "pending"),

          supabase
            .from("orders")
            .select("total")
            .not("status", "eq", "cancelled"),

          supabase
            .from("orders")
            .select(
              "id,order_number,total,status,payment_status,shipping_name,created_at",
            )
            .order("created_at", {
              ascending: false,
            })
            .limit(6)
            .returns<DashboardOrder[]>(),

          supabase
            .from("payment_requests")
            .select(
              "id,user_id,purpose,order_id,method_code,amount,currency,sender_name,sender_phone,reference,receipt_path,status,admin_note,reviewed_at,created_at,updated_at",
            )
            .eq("status", "pending")
            .order("created_at", {
              ascending: false,
            })
            .limit(5)
            .returns<PaymentRequest[]>(),
        ]);

        const revenue =
          (revenueResult.data ?? []).reduce(
            (sum, row) =>
              sum + Number(row.total ?? 0),
            0,
          );

        setStats({
          products:
            productsResult.count ?? 0,
          activeProducts:
            activeProductsResult.count ?? 0,
          orders:
            ordersResult.count ?? 0,
          pendingOrders:
            pendingOrdersResult.count ?? 0,
          users:
            usersResult.count ?? 0,
          vendors:
            vendorsResult.count ?? 0,
          pendingPayments:
            pendingPaymentsResult.count ?? 0,
          revenue,
        });

        setOrders(
          recentOrdersResult.data ?? [],
        );

        setPayments(
          recentPaymentsResult.data ?? [],
        );
      } catch (error) {
        console.error(
          "[AdminOverview] load failed:",
          error,
        );
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

  const cards = useMemo(
    () => [
      {
        label: "المنتجات",
        value: stats.products,
        icon: Package,
        to: "/admin/products",
        description: `${stats.activeProducts.toLocaleString(
          "ar-EG",
        )} منتج نشط`,
      },
      {
        label: "الطلبات",
        value: stats.orders,
        icon: ShoppingBag,
        to: "/admin/orders",
        description: `${stats.pendingOrders.toLocaleString(
          "ar-EG",
        )} بانتظار المعالجة`,
      },
      {
        label: "المستخدمون",
        value: stats.users,
        icon: Users,
        to: "/admin/users",
      },
      {
        label: "التجار",
        value: stats.vendors,
        icon: Store,
        to: "/admin/vendors",
      },
      {
        label: "طلبات الدفع",
        value: stats.pendingPayments,
        icon: CreditCard,
        to: "/admin/payment-requests",
        description:
          "عمليات تحتاج مراجعة",
      },
    ],
    [stats],
  );

  if (loading) {
    return (
      <div
        dir="rtl"
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({
            length: 5,
          }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>

        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            مركز إدارة شهارة
          </p>

          <h1 className="mt-1 text-xl font-black text-foreground">
            نظرة عامة
          </h1>

          <p className="mt-1 text-[11px] text-muted-foreground">
            متابعة المنتجات والطلبات والعملاء والتجار والعمليات المالية.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />
          تحديث البيانات
        </button>
      </div>

      {stats.pendingPayments > 0 ? (
        <Link
          to="/admin/payment-requests"
          className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <CreditCard className="h-5 w-5" />
            </span>

            <div>
              <p className="text-xs font-black text-foreground">
                توجد طلبات دفع بانتظار المراجعة
              </p>

              <p className="mt-1 text-[11px] text-muted-foreground">
                لديك{" "}
                {stats.pendingPayments.toLocaleString(
                  "ar-EG",
                )}{" "}
                عملية تحتاج إلى مراجعة.
              </p>
            </div>
          </div>

          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            to={card.to}
            description={
              card.description
            }
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <AdminCard title="أحدث الطلبات">
          {orders.length === 0 ? (
            <div className="rounded-xl border border-border/70 p-6 text-center text-xs text-muted-foreground">
              لا توجد طلبات حتى الآن.
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  to="/admin/orders"
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3 transition-colors hover:border-primary/40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ShoppingBag className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold text-foreground">
                        {order.order_number}
                      </p>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${statusClass(
                          order.status,
                        )}`}
                      >
                        {ORDER_STATUS_LABELS[
                          order.status
                        ] ??
                          order.status}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-[10px] text-muted-foreground">
                      {order.shipping_name ||
                        "عميل"}
                    </p>
                  </div>

                  <div className="text-left">
                    <p className="text-xs font-black text-primary">
                      {formatPrice(
                        Number(
                          order.total,
                        ),
                      )}
                    </p>

                    <p className="mt-1 text-[9px] text-muted-foreground">
                      {formatDateTime(
                        order.created_at,
                      )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard
          title="الطلبات المالية الأخيرة"
          action={
            <Link
              to="/admin/payment-requests"
              className="text-[10px] font-bold text-primary"
            >
              عرض الكل
            </Link>
          }
        >
          {payments.length === 0 ? (
            <div className="rounded-xl border border-border/70 p-6 text-center text-xs text-muted-foreground">
              لا توجد طلبات دفع معلقة.
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map(
                (request) => (
                  <Link
                    key={request.id}
                    to="/admin/payment-requests"
                    className="block rounded-xl border border-border/60 bg-secondary/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">
                          {PAYMENT_REQUEST_PURPOSE_LABELS[
                            request.purpose
                          ] ??
                            request.purpose}
                        </p>

                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {request.method_code}
                        </p>
                      </div>

                      <p className="shrink-0 text-xs font-black text-primary">
                        {Number(
                          request.amount,
                        ).toLocaleString(
                          "ar-YE",
                        )}{" "}
                        {request.currency}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
                      <span>
                        {formatDate(
                          request.created_at,
                        )}
                      </span>

                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                        {
                          PAYMENT_REQUEST_STATUS_LABELS[
                            request.status
                          ] ??
                            request.status
                        }
                      </span>
                    </div>
                  </Link>
                ),
              )}
            </div>
          )}
        </AdminCard>
      </div>

      <AdminCard title="ملخص النشاط">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-secondary/40 p-4">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-4 w-4" />
              <span className="text-[10px] font-bold">
                قيمة الطلبات
              </span>
            </div>

            <p className="mt-2 text-lg font-black text-foreground">
              {formatPrice(
                stats.revenue,
              )}
            </p>
          </div>

          <div className="rounded-xl bg-secondary/40 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Package className="h-4 w-4" />
              <span className="text-[10px] font-bold">
                نشاط المنتجات
              </span>
            </div>

            <p className="mt-2 text-lg font-black text-foreground">
              {stats.activeProducts.toLocaleString(
                "ar-EG",
              )}
            </p>

            <p className="mt-1 text-[9px] text-muted-foreground">
              من أصل{" "}
              {stats.products.toLocaleString(
                "ar-EG",
              )}{" "}
              منتج
            </p>
          </div>

          <div className="rounded-xl bg-secondary/40 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Clock3 className="h-4 w-4" />
              <span className="text-[10px] font-bold">
                الطلبات المنتظرة
              </span>
            </div>

            <p className="mt-2 text-lg font-black text-foreground">
              {stats.pendingOrders.toLocaleString(
                "ar-EG",
              )}
            </p>

            <p className="mt-1 text-[9px] text-muted-foreground">
              تحتاج متابعة الإدارة
            </p>
          </div>
        </div>
      </AdminCard>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          to="/admin/products"
          className="rounded-2xl border border-border/70 bg-card p-4 text-center"
        >
          <Package className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-2 text-[11px] font-bold">
            إدارة المنتجات
          </p>
        </Link>

        <Link
          to="/admin/offers"
          className="rounded-2xl border border-border/70 bg-card p-4 text-center"
        >
          <LayoutGrid className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-2 text-[11px] font-bold">
            العروض
          </p>
        </Link>

        <Link
          to="/admin/content"
          className="rounded-2xl border border-border/70 bg-card p-4 text-center"
        >
          <ReceiptText className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-2 text-[11px] font-bold">
            المحتوى
          </p>
        </Link>

        <Link
          to="/admin/settings"
          className="rounded-2xl border border-border/70 bg-card p-4 text-center"
        >
          <Store className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-2 text-[11px] font-bold">
            الإعدادات
          </p>
        </Link>
      </div>
    </div>
  );
}
