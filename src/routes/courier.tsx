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
  MessageCircle,
  CircleAlert,
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

export const Route = createFileRoute(
  "/courier",
)({
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
        title:
          "لوحة عامل التوصيل | شهارة",
      },
      {
        name: "description",
        content:
          "لوحة تشغيل وإدارة طلبات عامل التوصيل في شهارة.",
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

function getErrorMessage(
  error: unknown,
) {
  if (
    error &&
    typeof error === "object"
  ) {
    const value =
      error as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
      };

    const parts = [
      typeof value.message ===
      "string"
        ? value.message
        : "",
      typeof value.details ===
      "string"
        ? value.details
        : "",
      typeof value.hint ===
      "string"
        ? value.hint
        : "",
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(" — ");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "حدث خطأ غير معروف.";
}

function statusLabel(
  status: string,
) {
  return (
    ORDER_STATUS_LABELS[status] ??
    status
  );
}

function statusClass(
  status: string,
) {
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
    useState<CourierProfile | null>(
      null,
    );

  const [orders, setOrders] =
    useState<CourierOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [processingOrderId, setProcessingOrderId] =
    useState<string | null>(null);

  const load = useCallback(
    async (
      showRefresh = false,
    ) => {
      if (!user?.id) {
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
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
          throw courierError;
        }

        if (!courierData) {
          setCourier(null);
          setOrders([]);

          toast.error(
            "لم يتم العثور على حساب عامل التوصيل.",
          );

          return;
        }

        setCourier(courierData);

        if (
          courierData.is_active ===
            false ||
          courierData.account_enabled ===
            false
        ) {
          setOrders([]);
          return;
        }

        const {
          data: orderData,
          error: orderError,
        } = await supabase
          .from("orders")
          .select(
            [
              "id",
              "order_number",
              "status",
              "payment_status",
              "payment_method_code",
              "total",
              "subtotal",
              "delivery_fee",
              "shipping_name",
              "shipping_phone",
              "shipping_city",
              "shipping_district",
              "shipping_details",
              "latitude",
              "longitude",
              "created_at",
              "courier_id",
              "order_items(id,product_name,quantity,unit_price)",
            ].join(","),
          )
          .eq(
            "courier_id",
            courierData.id,
          )
          .order("created_at", {
            ascending: false,
          })
          .returns<CourierOrder[]>();

        if (orderError) {
          throw orderError;
        }

        setOrders(orderData ?? []);
      } catch (error) {
        console.error(
          "[Courier] load failed:",
          error,
        );

        toast.error(
          `تعذر تحميل لوحة عامل التوصيل: ${getErrorMessage(
            error,
          )}`,
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      void navigate({
        to: "/auth",
        replace: true,
      });

      return;
    }

    if (
      role &&
      role !== "courier"
    ) {
      if (role === "admin") {
        void navigate({
          to: "/admin",
          replace: true,
        });
      } else if (
        role === "vendor"
      ) {
        void navigate({
          to: "/merchant/dashboard",
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

  useEffect(() => {
    if (!courier?.id) {
      return;
    }

    const channel =
      supabase
        .channel(
          `courier-orders-${courier.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `courier_id=eq.${courier.id}`,
          },
          () => {
            void load(true);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "order_items",
          },
          () => {
            void load(true);
          },
        )
        .subscribe((status) => {
          if (
            status ===
            "SUBSCRIBED"
          ) {
            console.info(
              "[Courier Realtime] Connected",
            );
          }
        });

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [courier?.id, load]);

  const stats = useMemo(() => {
    const active =
      orders.filter((order) =>
        ACTIVE_STATUSES.includes(
          order.status,
        ),
      ).length;

    const delivered =
      orders.filter(
        (order) =>
          order.status ===
          "delivered",
      ).length;

    const cancelled =
      orders.filter(
        (order) =>
          order.status ===
          "cancelled",
      ).length;

    const totalValue =
      orders
        .filter(
          (order) =>
            order.status !==
            "cancelled",
        )
        .reduce(
          (sum, order) =>
            sum +
            Number(
              order.total || 0,
            ),
          0,
        );

    return {
      active,
      delivered,
      cancelled,
      totalValue,
    };
  }, [orders]);

  async function updateStatus(
    order: CourierOrder,
    status: string,
  ) {
    if (
      processingOrderId
    ) {
      return;
    }

    if (
      status === order.status
    ) {
      return;
    }

    setProcessingOrderId(
      order.id,
    );

    try {
      const { error } =
        await (
          supabase as any
        ).rpc(
          "update_courier_order_status_secure",
          {
            _order_id:
              order.id,
            _new_status:
              status,
          },
        );

      if (error) {
        throw error;
      }

      toast.success(
        `تم تحديث حالة الطلب إلى «${statusLabel(
          status,
        )}».`,
      );

      await load(true);
    } catch (error) {
      console.error(
        "[Courier] status update failed:",
        error,
      );

      toast.error(
        `تعذر تحديث حالة الطلب: ${getErrorMessage(
          error,
        )}`,
      );
    } finally {
      setProcessingOrderId(
        null,
      );
    }
  }

  async function logout() {
    await signOut();

    toast.success(
      "تم تسجيل الخروج بنجاح.",
    );

    await navigate({
      to: "/auth",
      replace: true,
    });
  }

  function openMap(
    order: CourierOrder,
  ) {
    if (
      order.latitude === null ||
      order.longitude === null
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

    window.location.href =
      `tel:${phone}`;
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

    const normalized =
      phone.replace(
        /\D/g,
        "",
      );

    const message =
      encodeURIComponent(
        "مرحباً، معك عامل التوصيل من متجر شهارة بخصوص طلبك.",
      );

    window.open(
      `https://wa.me/${normalized}?text=${message}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  if (
    authLoading ||
    loading
  ) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-background px-4 py-8"
      >
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="h-28 animate-pulse rounded-3xl bg-secondary" />

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

          <div className="h-96 animate-pulse rounded-3xl bg-secondary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (
    role &&
    role !== "courier"
  ) {
    return null;
  }

  if (
    !courier ||
    courier.is_active ===
      false ||
    courier.account_enabled ===
      false
  ) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-background px-4"
      >
        <AdminCard
          title="حساب عامل التوصيل"
        >
          <div className="space-y-5 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
              <CircleAlert className="h-8 w-8 text-destructive" />
            </div>

            <p className="text-sm leading-7 text-muted-foreground">
              حساب عامل التوصيل غير
              متاح حالياً. يرجى
              التواصل مع الإدارة.
            </p>

            <button
              type="button"
              className={btnCls}
              onClick={() =>
                void logout()
              }
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
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Bike className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">
                لوحة عامل التوصيل
              </p>

              <h1 className="truncate text-sm font-bold">
                {courier.name}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void logout()
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold transition hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />

            <span className="hidden sm:inline">
              تسجيل الخروج
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        <section className="overflow-hidden rounded-[2rem] bg-brand-gradient p-6 text-primary-foreground shadow-brand">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs opacity-80">
                مرحباً بك
              </p>

              <h2 className="mt-1 text-2xl font-extrabold">
                {courier.name}
              </h2>

              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2">
                  <Phone className="h-3.5 w-3.5" />
                  {courier.phone}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {courier.city}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
              <Truck className="mx-auto h-7 w-7" />

              <p className="mt-1 text-[10px] opacity-80">
                حالة الحساب
              </p>

              <p className="text-sm font-bold">
                نشط
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={
              <Truck className="h-5 w-5" />
            }
            label="الطلبات النشطة"
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
              <Clock3 className="h-5 w-5" />
            }
            label="ملغاة"
            value={stats.cancelled}
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

        <AdminCard
          title="طلبات التوصيل"
          actions={
            <button
              type="button"
              className={btnGhostCls}
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

              <span className="hidden sm:inline">
                تحديث
              </span>
            </button>
          }
        >
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
              <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />

              <p className="mt-3 text-sm font-semibold">
                لا توجد طلبات مسندة إليك حالياً
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                ستظهر الطلبات الجديدة هنا
                تلقائياً عند تعيينها لك من
                الإدارة.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const busy =
                  processingOrderId ===
                  order.id;

                return (
                  <article
                    key={order.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/30 p-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            dir="ltr"
                            className="font-mono text-sm font-bold"
                          >
                            {order.order_number}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(
                              order.status,
                            )}`}
                          >
                            {statusLabel(
                              order.status,
                            )}
                          </span>
                        </div>

                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatDate(
                            order.created_at,
                          )}
                        </p>
                      </div>

                      <div className="text-left">
                        <p className="text-lg font-extrabold text-primary">
                          {formatPrice(
                            order.total,
                          )}
                        </p>

                        <p className="text-[10px] text-muted-foreground">
                          الإجمالي
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
                      <div className="space-y-4">
                        <div className="rounded-2xl bg-secondary/40 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                              <UserRound className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="font-bold">
                                {order.shipping_name}
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                {order.shipping_phone}
                              </p>

                              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                                {order.shipping_city}
                                {" — "}
                                {order.shipping_district}
                                {" — "}
                                {order.shipping_details}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-bold">
                            محتويات الطلب
                          </p>

                          <div className="space-y-2">
                            {order.order_items.map(
                              (item) => (
                                <div
                                  key={
                                    item.id
                                  }
                                  className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-xs"
                                >
                                  <span className="font-medium">
                                    {item.product_name}
                                  </span>

                                  <span className="text-muted-foreground">
                                    ×{" "}
                                    {
                                      item.quantity
                                    }
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex min-w-[210px] flex-col gap-2">
                        <button
                          type="button"
                          className={btnCls}
                          onClick={() =>
                            openMap(
                              order,
                            )
                          }
                        >
                          <Navigation className="h-4 w-4" />
                          فتح الموقع
                        </button>

                        <button
                          type="button"
                          className={btnGhostCls}
                          onClick={() =>
                            callCustomer(
                              order.shipping_phone,
                            )
                          }
                        >
                          <Phone className="h-4 w-4" />
                          اتصال بالعميل
                        </button>

                        <button
                          type="button"
                          className={btnGhostCls}
                          onClick={() =>
                            whatsappCustomer(
                              order.shipping_phone,
                            )
                          }
                        >
                          <MessageCircle className="h-4 w-4" />
                          واتساب
                        </button>

                        {order.status ===
                          "confirmed" && (
                          <button
                            type="button"
                            className={btnCls}
                            disabled={busy}
                            onClick={() =>
                              void updateStatus(
                                order,
                                "processing",
                              )
                            }
                          >
                            <Package className="h-4 w-4" />
                            بدء تجهيز التوصيل
                          </button>
                        )}

                        {order.status ===
                          "processing" && (
                          <button
                            type="button"
                            className={btnCls}
                            disabled={busy}
                            onClick={() =>
                              void updateStatus(
                                order,
                                "shipped",
                              )
                            }
                          >
                            <Truck className="h-4 w-4" />
                            خرج للتوصيل
                          </button>
                        )}

                        {order.status ===
                          "shipped" && (
                          <button
                            type="button"
                            className={btnCls}
                            disabled={busy}
                            onClick={() =>
                              void updateStatus(
                                order,
                                "delivered",
                              )
                            }
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            تأكيد التسليم
                          </button>
                        )}

                        {busy && (
                          <p className="text-center text-[10px] text-muted-foreground">
                            جارٍ تحديث الطلب...
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </AdminCard>

        <div className="pb-8 text-center text-[10px] text-muted-foreground">
          شهارة للتسوق — لوحة تشغيل عامل التوصيل
        </div>
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
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>

        <span className="text-[10px] text-muted-foreground">
          شهارة
        </span>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-xl font-extrabold">
        {typeof value === "number"
          ? value.toLocaleString(
              "ar-EG",
            )
          : value}
      </p>
    </div>
  );
}
