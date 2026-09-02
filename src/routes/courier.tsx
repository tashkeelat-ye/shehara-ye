import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Bike,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  LogOut,
  MapPin,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  ORDER_STATUS_LABELS,
  formatDate,
} from "@/lib/store";
import { formatPrice } from "@/lib/db";
import {
  AdminCard,
  btnCls,
  btnGhostCls,
} from "@/components/admin-ui";

export const Route = createFileRoute("/courier")({
  ssr: false,

  beforeLoad: async ({ location }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.href,
        },
      });
    }
  },

  head: () => ({
    meta: [
      {
        title: "لوحة عامل التوصيل | شهارة",
      },
      {
        name: "description",
        content:
          "لوحة عامل التوصيل في متجر شهارة.",
      },
      {
        name: "robots",
        content: "noindex, nofollow",
      },
    ],
  }),

  component: CourierDashboard,
});

type CourierProfile = {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  city: string;
  is_active: boolean;
  account_enabled: boolean;
};

type CourierOrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

type CourierOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method_code: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_city: string;
  shipping_district: string;
  shipping_details: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  courier_id: string | null;
  order_items: CourierOrderItem[];
};

const ACTIVE_STATUSES = [
  "confirmed",
  "processing",
  "shipped",
];

function statusLabel(status: string) {
  return (
    ORDER_STATUS_LABELS[status] ??
    status
  );
}

function statusClass(status: string) {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-green-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    case "shipped":
      return "bg-blue-100 text-blue-700";

    case "processing":
      return "bg-amber-100 text-amber-700";

    case "confirmed":
      return "bg-brand-soft text-primary";

    default:
      return "bg-secondary text-muted-foreground";
  }
}

function CourierDashboard() {
  const navigate = useNavigate();

  const {
    user,
    role,
    accountEnabled,
    loading: authLoading,
    signOut,
  } = useAuth();

  const [courier, setCourier] =
    useState<CourierProfile | null>(null);

  const [orders, setOrders] =
    useState<CourierOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const load = useCallback(
    async (showRefresh = false) => {
      if (!user?.id) return;

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        /**
         * =====================================================
         * 1. تحميل سجل عامل التوصيل المرتبط بالمستخدم
         * =====================================================
         */
        const {
          data: courierData,
          error: courierError,
        } = await supabase
          .from("couriers")
          .select(
            "id,user_id,name,phone,city,is_active,account_enabled",
          )
          .eq("user_id", user.id)
          .maybeSingle<CourierProfile>();

        if (courierError) {
          console.error(
            "[Courier] Failed to load courier:",
            courierError,
          );

          toast.error(
            "تعذر تحميل بيانات عامل التوصيل.",
          );

          return;
        }

        if (!courierData) {
          setCourier(null);
          setOrders([]);

          toast.error(
            "لم يتم العثور على حساب عامل التوصيل المرتبط بهذا المستخدم.",
          );

          return;
        }

        setCourier(courierData);

        /**
         * =====================================================
         * 2. حماية إضافية من الواجهة
         * =====================================================
         *
         * الحماية الحقيقية ستكون في RLS،
         * لكن الواجهة أيضاً لا تستمر إذا كان الحساب معطلاً.
         */
        if (
          courierData.account_enabled === false ||
          courierData.is_active === false
        ) {
          setOrders([]);
          return;
        }

        /**
         * =====================================================
         * 3. تحميل الطلبات المسندة للعامل
         * =====================================================
         *
         * لا نطلب courier_id من المستخدم.
         *
         * نستخدم courier.id الذي تم التحقق منه
         * من user_id.
         */
        const {
          data: orderData,
          error: orderError,
        } = await supabase
          .from("orders")
          .select(
            "id,order_number,status,payment_status,payment_method_code,total,subtotal,delivery_fee,shipping_name,shipping_phone,shipping_city,shipping_district,shipping_details,latitude,longitude,created_at,courier_id,order_items(id,product_name,quantity,unit_price)",
          )
          .eq("courier_id", courierData.id)
          .order("created_at", {
            ascending: false,
          })
          .returns<CourierOrder[]>();

        if (orderError) {
          console.error(
            "[Courier] Failed to load orders:",
            orderError,
          );

          toast.error(
            "تعذر تحميل طلبات التوصيل.",
          );

          setOrders([]);
          return;
        }

        setOrders(orderData ?? []);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      void navigate({
        to: "/auth",
        replace: true,
      });
      return;
    }

    /**
     * بعد تثبيت Auth Context،
     * يجب ألا يسمح هذا المسار لأي دور آخر.
     */
    if (role && role !== "courier") {
      if (role === "admin") {
        void navigate({
          to: "/admin",
          replace: true,
        });
      } else if (role === "vendor") {
        void navigate({
          to: "/account",
          replace: true,
        });
      } else {
        void navigate({
          to: "/account",
          replace: true,
        });
      }

      return;
    }

    if (!accountEnabled) {
      void signOut();
      return;
    }

    void load();
  }, [
    authLoading,
    user,
    role,
    accountEnabled,
    navigate,
    signOut,
    load,
  ]);

  const stats = useMemo(() => {
    const active = orders.filter((order) =>
      ACTIVE_STATUSES.includes(order.status),
    ).length;

    const delivered = orders.filter(
      (order) =>
        order.status === "delivered",
    ).length;

    const cancelled = orders.filter(
      (order) =>
        order.status === "cancelled",
    ).length;

    const totalValue = orders
      .filter(
        (order) =>
          order.status !== "cancelled",
      )
      .reduce(
        (sum, order) =>
          sum + Number(order.total || 0),
        0,
      );

    return {
      active,
      delivered,
      cancelled,
      totalValue,
    };
  }, [orders]);

  async function logout() {
    await signOut();

    toast.success(
      "تم تسجيل الخروج بنجاح",
    );

    await navigate({
      to: "/auth",
      replace: true,
    });
  }

  function openMap(order: CourierOrder) {
    if (
      order.latitude == null ||
      order.longitude == null
    ) {
      toast.error(
        "لا يوجد موقع جغرافي لهذا الطلب.",
      );

      return;
    }

    window.open(
      `https://www.google.com/maps?q=${order.latitude},${order.longitude}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function callCustomer(
    phone: string,
  ) {
    if (!phone) {
      toast.error(
        "لا يوجد رقم هاتف للعميل.",
      );

      return;
    }

    window.location.href = `tel:${phone}`;
  }

  function whatsappCustomer(
    phone: string,
  ) {
    if (!phone) {
      toast.error(
        "لا يوجد رقم هاتف للعميل.",
      );

      return;
    }

    const normalized = phone.replace(
      /\D/g,
      "",
    );

    const message = encodeURIComponent(
      "مرحباً، معك عامل التوصيل من متجر شهارة بخصوص طلبك.",
    );

    window.open(
      `https://wa.me/${normalized}?text=${message}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  if (authLoading || loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-background px-4 py-8"
      >
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-24 animate-pulse rounded-3xl bg-secondary" />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl bg-secondary"
              />
            ))}
          </div>

          <div className="h-80 animate-pulse rounded-3xl bg-secondary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (role && role !== "courier") {
    return null;
  }

  if (
    courier &&
    (courier.account_enabled === false ||
      courier.is_active === false)
  ) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-background px-4"
      >
        <AdminCard
          title="الحساب غير متاح"
        >
          <div className="space-y-4 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
              <Bike className="h-8 w-8 text-destructive" />
            </div>

            <p className="text-sm text-muted-foreground">
              حساب عامل التوصيل الخاص بك
              معطل حالياً. يرجى التواصل مع
              الإدارة.
            </p>

            <button
              type="button"
              className={btnCls}
              onClick={() => void logout()}
            >
              تسجيل الخروج
            </button>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background"
    >
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Bike className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">
                لوحة عامل التوصيل
              </p>

              <h1 className="truncate text-sm font-bold text-foreground">
                {courier?.name ??
                  "عامل التوصيل"}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs text-foreground transition hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">
              تسجيل الخروج
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        {/* ===================================================
            معلومات العامل
        =================================================== */}
        <section className="overflow-hidden rounded-3xl bg-brand-gradient p-5 text-primary-foreground shadow-brand">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs opacity-80">
                مرحباً بك
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                {courier?.name ??
                  "عامل التوصيل"}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {courier?.phone ? (
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {courier.phone}
                  </span>
                ) : null}

                {courier?.city ? (
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {courier.city}
                  </span>
                ) : null}

                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-green-300" />
                  الحساب فعال
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-3">
              <Truck className="h-8 w-8" />
            </div>
          </div>
        </section>

        {/* ===================================================
            زر التحديث
        =================================================== */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">
              نظرة عامة
            </h2>

            <p className="text-xs text-muted-foreground">
              متابعة الطلبات المسندة إليك.
            </p>
          </div>

          <button
            type="button"
            className={`${btnGhostCls} inline-flex items-center gap-2`}
            disabled={refreshing}
            onClick={() =>
              void load(true)
            }
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            تحديث
          </button>
        </div>

        {/* ===================================================
            الإحصائيات
        =================================================== */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={
              <Package className="h-5 w-5" />
            }
            label="إجمالي الطلبات"
            value={orders.length}
          />

          <StatCard
            icon={
              <Truck className="h-5 w-5" />
            }
            label="طلبات نشطة"
            value={stats.active}
          />

          <StatCard
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            label="تم التسليم"
            value={stats.delivered}
          />

          <StatCard
            icon={
              <WalletCards className="h-5 w-5" />
            }
            label="قيمة الطلبات"
            value={formatPrice(
              stats.totalValue,
            )}
          />
        </section>

        {/* ===================================================
            الطلبات
        =================================================== */}
        <AdminCard
          title={`الطلبات المسندة إليك (${orders.length.toLocaleString(
            "ar-EG",
          )})`}
        >
          {orders.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-soft">
                <Package className="h-7 w-7 text-primary" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-foreground">
                لا توجد طلبات حالياً
              </h3>

              <p className="mt-1 max-w-sm text-xs leading-6 text-muted-foreground">
                عندما تقوم الإدارة بإسناد
                طلب إليك سيظهر هنا مباشرة.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <CourierOrderCard
                  key={order.id}
                  order={order}
                  onMap={() =>
                    openMap(order)
                  }
                  onCall={() =>
                    callCustomer(
                      order.shipping_phone,
                    )
                  }
                  onWhatsApp={() =>
                    whatsappCustomer(
                      order.shipping_phone,
                    )
                  }
                />
              ))}
            </div>
          )}
        </AdminCard>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-primary">
          {icon}
        </div>

        <span className="text-[11px] text-muted-foreground">
          {label}
        </span>
      </div>

      <p className="mt-4 text-xl font-bold text-foreground">
        {typeof value === "number"
          ? value.toLocaleString("ar-EG")
          : value}
      </p>
    </div>
  );
}

function CourierOrderCard({
  order,
  onMap,
  onCall,
  onWhatsApp,
}: {
  order: CourierOrder;
  onMap: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
}) {
  const hasLocation =
    order.latitude != null &&
    order.longitude != null;

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              dir="ltr"
              className="font-mono text-sm font-bold text-foreground"
            >
              {order.order_number}
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-[11px] ${statusClass(
                order.status,
              )}`}
            >
              {statusLabel(
                order.status,
              )}
            </span>
          </div>

          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatDate(
              order.created_at,
            )}
          </p>
        </div>

        <div className="text-start">
          <p className="text-base font-bold text-primary">
            {formatPrice(order.total)}
          </p>

          <p className="text-[10px] text-muted-foreground">
            إجمالي الطلب
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-secondary/70 p-3">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />

            <span className="text-xs font-bold text-foreground">
              العميل
            </span>
          </div>

          <p className="mt-2 text-sm text-foreground">
            {order.shipping_name}
          </p>

          <p
            dir="ltr"
            className="mt-1 text-xs text-muted-foreground"
          >
            {order.shipping_phone ||
              "لا يوجد رقم"}
          </p>
        </div>

        <div className="rounded-xl bg-secondary/70 p-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />

            <span className="text-xs font-bold text-foreground">
              عنوان التسليم
            </span>
          </div>

          <p className="mt-2 text-xs leading-5 text-foreground">
            {order.shipping_city ||
              "—"}{" "}
            {order.shipping_district ||
              ""}
          </p>

          {order.shipping_details ? (
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              {order.shipping_details}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border/70 p-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />

          <span className="text-xs font-bold text-foreground">
            محتويات الطلب
          </span>
        </div>

        <ul className="mt-2 space-y-1.5">
          {order.order_items.map(
            (item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {item.product_name} ×{" "}
                  {item.quantity.toLocaleString(
                    "ar-EG",
                  )}
                </span>

                <span className="shrink-0 text-primary">
                  {formatPrice(
                    Number(
                      item.unit_price,
                    ) *
                      item.quantity,
                  )}
                </span>
              </li>
            ),
          )}
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={`${btnCls} inline-flex items-center gap-2`}
          onClick={onCall}
        >
          <Phone className="h-4 w-4" />
          اتصال
        </button>

        <button
          type="button"
          className={`${btnGhostCls} inline-flex items-center gap-2`}
          onClick={onWhatsApp}
        >
          واتساب
        </button>

        {hasLocation ? (
          <button
            type="button"
            className={`${btnGhostCls} inline-flex items-center gap-2`}
            onClick={onMap}
          >
            <Navigation className="h-4 w-4" />
            فتح الموقع
          </button>
        ) : null}

        <div className="ms-auto inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-[11px] text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />

          {order.payment_method_code ||
            "الدفع عند التسليم"}
        </div>
      </div>
    </article>
  );
}
