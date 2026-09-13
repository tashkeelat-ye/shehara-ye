import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  Truck,
  XCircle,
  ChevronDown,
  Phone,
  MapPin,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/db";

export const Route = createFileRoute(
  "/_authenticated/merchant/orders",
)({
  component: MerchantOrdersPage,
});

type Vendor = {
  id: string;
  name: string;
  city: string;
  phone: string;
  is_active: boolean;
  account_enabled: boolean;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_city: string;
  shipping_details: string;
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
  size: string | null;
  color: string | null;
  vendor_id: string | null;
  vendor_name: string;
  vendor_phone: string;
  vendor_city: string;
  vendor_status:
    | "new"
    | "accepted"
    | "processing"
    | "ready"
    | "shipped"
    | "delivered"
    | "cancelled";
  vendor_note: string;
  vendor_updated_at: string;
};

type VendorOrder = {
  order: Order;
  items: OrderItem[];
};

const statusLabels: Record<
  OrderItem["vendor_status"],
  string
> = {
  new: "طلب جديد",
  accepted: "تم القبول",
  processing: "قيد التجهيز",
  ready: "جاهز للشحن",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

function MerchantOrdersPage() {
  const { user } = useAuth();

  const [vendor, setVendor] =
    useState<Vendor | null>(null);

  const [orders, setOrders] =
    useState<VendorOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] =
    useState<string | null>(null);

  const load = useCallback(
    async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const vendorResult =
          await supabase
            .from("vendors")
            .select(
              "id,name,city,phone,is_active,account_enabled",
            )
            .eq("user_id", user.id)
            .maybeSingle<Vendor>();

        if (vendorResult.error) {
          throw vendorResult.error;
        }

        if (!vendorResult.data) {
          setVendor(null);
          setOrders([]);
          return;
        }

        setVendor(vendorResult.data);

        const itemsResult =
          await supabase
            .from("order_items")
            .select(
              "id,order_id,product_id,product_name,product_image,unit_price,quantity,size,color,vendor_id,vendor_name,vendor_phone,vendor_city,vendor_status,vendor_note,vendor_updated_at",
            )
            .eq(
              "vendor_id",
              vendorResult.data.id,
            )
            .order(
              "vendor_updated_at",
              {
                ascending: false,
              },
            )
            .returns<OrderItem[]>();

        if (itemsResult.error) {
          throw itemsResult.error;
        }

        const items =
          itemsResult.data ?? [];

        if (items.length === 0) {
          setOrders([]);
          return;
        }

        const orderIds = [
          ...new Set(
            items.map(
              (item) =>
                item.order_id,
            ),
          ),
        ];

        const ordersResult =
          await supabase
            .from("orders")
            .select(
              "id,order_number,status,total,shipping_name,shipping_phone,shipping_city,shipping_details,created_at",
            )
            .in("id", orderIds)
            .order("created_at", {
              ascending: false,
            })
            .returns<Order[]>();

        if (ordersResult.error) {
          throw ordersResult.error;
        }

        const orderMap =
          new Map(
            (
              ordersResult.data ??
              []
            ).map((order) => [
              order.id,
              order,
            ]),
          );

        const grouped =
          new Map<
            string,
            VendorOrder
          >();

        for (const item of items) {
          const order =
            orderMap.get(
              item.order_id,
            );

          if (!order) {
            continue;
          }

          const current =
            grouped.get(
              item.order_id,
            );

          if (current) {
            current.items.push(item);
          } else {
            grouped.set(
              item.order_id,
              {
                order,
                items: [item],
              },
            );
          }
        }

        setOrders(
          [...grouped.values()],
        );
      } catch (error) {
        console.error(
          "[MerchantOrders] load failed:",
          error,
        );

        toast.error(
          "تعذّر تحميل طلبات المتجر.",
        );
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const items =
      orders.flatMap(
        (entry) => entry.items,
      );

    return {
      orders: orders.length,
      new: items.filter(
        (item) =>
          item.vendor_status ===
          "new",
      ).length,
      processing: items.filter(
        (item) =>
          item.vendor_status ===
            "accepted" ||
          item.vendor_status ===
            "processing",
      ).length,
      shipped: items.filter(
        (item) =>
          item.vendor_status ===
            "ready" ||
          item.vendor_status ===
            "shipped",
      ).length,
    };
  }, [orders]);

  async function updateStatus(
    itemId: string,
    status: OrderItem["vendor_status"],
  ) {
    setBusyId(itemId);

    try {
      const { error } =
        await supabase.rpc(
          "update_vendor_order_item_status",
          {
            p_order_item_id:
              itemId,
            p_status: status,
            p_note: "",
          },
        );

      if (error) {
        throw error;
      }

      toast.success(
        "تم تحديث حالة الطلب.",
      );

      await load();
    } catch (error) {
      console.error(
        "[MerchantOrders] status update failed:",
        error,
      );

      toast.error(
        "تعذّر تحديث حالة الطلب.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        className="grid min-h-[60vh] place-items-center"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          جارٍ تحميل الطلبات...
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-3xl p-4"
      >
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />

          <h1 className="mt-4 text-lg font-bold">
            لا يوجد متجر مرتبط بهذا الحساب
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            سجّل حساب التاجر أو اطلب تفعيل المتجر من الإدارة.
          </p>
        </div>
      </div>
    );
  }

  const active =
    vendor.is_active &&
    vendor.account_enabled;

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-6xl space-y-4 p-4"
    >
      <header className="rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              لوحة التاجر
            </p>

            <h1 className="mt-1 text-2xl font-black text-foreground">
              طلبات متجر {vendor.name}
            </h1>

            <p className="mt-1 text-xs text-muted-foreground">
              الطلبات التي تحتوي منتجات مورّدة من متجرك فقط.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-secondary px-4 text-xs font-semibold"
            disabled={loading}
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

        {!active ? (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            المتجر غير مفعّل حالياً، لذلك لن تستقبل طلبات جديدة.
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          icon={Package}
          label="إجمالي الطلبات"
          value={stats.orders}
        />

        <Stat
          icon={Clock3}
          label="طلبات جديدة"
          value={stats.new}
        />

        <Stat
          icon={RefreshCw}
          label="قيد التجهيز"
          value={stats.processing}
        />

        <Stat
          icon={Truck}
          label="جاهزة/مشحونة"
          value={stats.shipped}
        />
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/60" />

          <h2 className="mt-4 font-bold">
            لا توجد طلبات لمنتجات متجرك
          </h2>

          <p className="mt-2 text-xs text-muted-foreground">
            ستظهر هنا الطلبات تلقائياً عند شراء أحد منتجاتك.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(
            ({
              order,
              items,
            }) => (
              <OrderCard
                key={order.id}
                order={order}
                items={items}
                busyId={busyId}
                onStatusChange={
                  updateStatus
                }
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  items,
  busyId,
  onStatusChange,
}: {
  order: Order;
  items: OrderItem[];
  busyId: string | null;
  onStatusChange: (
    itemId: string,
    status: OrderItem["vendor_status"],
  ) => Promise<void>;
}) {
  const itemsTotal =
    items.reduce(
      (sum, item) =>
        sum +
        Number(item.unit_price) *
          item.quantity,
      0,
    );

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="border-b border-border bg-secondary/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              رقم الطلب
            </p>

            <p
              dir="ltr"
              className="mt-1 font-bold"
            >
              {order.order_number}
            </p>
          </div>

          <div className="text-left">
            <p className="text-xs text-muted-foreground">
              قيمة منتجات متجرك
            </p>

            <p className="mt-1 font-bold text-primary">
              {formatPrice(
                itemsTotal,
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {items.map(
            (item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border p-3"
              >
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {item.product_image ? (
                      <img
                        src={
                          item.product_image
                        }
                        alt={
                          item.product_name
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="m-auto mt-6 h-7 w-7 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">
                      {item.product_name}
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      الكمية:{" "}
                      {item.quantity}
                    </p>

                    {item.size ? (
                      <p className="text-xs text-muted-foreground">
                        المقاس:{" "}
                        {item.size}
                      </p>
                    ) : null}

                    {item.color ? (
                      <p className="text-xs text-muted-foreground">
                        اللون:{" "}
                        {item.color}
                      </p>
                    ) : null}

                    <p className="mt-1 font-bold text-primary">
                      {formatPrice(
                        Number(
                          item.unit_price,
                        ) *
                          item.quantity,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <StatusBadge
                    status={
                      item.vendor_status
                    }
                  />

                  <StatusSelector
                    item={item}
                    busy={
                      busyId ===
                      item.id
                    }
                    onChange={
                      onStatusChange
                    }
                  />
                </div>
              </div>
            ),
          )}
        </div>

        <div className="h-fit rounded-2xl border border-border p-4">
          <h3 className="font-bold">
            بيانات العميل والتوصيل
          </h3>

          <div className="mt-4 space-y-3 text-xs">
            <Info
              icon={User}
              label="المستلم"
              value={
                order.shipping_name ||
                "غير محدد"
              }
            />

            <Info
              icon={Phone}
              label="الهاتف"
              value={
                order.shipping_phone ||
                "غير محدد"
              }
              dir="ltr"
            />

            <Info
              icon={MapPin}
              label="المدينة"
              value={
                order.shipping_city ||
                "غير محددة"
              }
            />

            <div>
              <p className="text-muted-foreground">
                تفاصيل العنوان
              </p>

              <p className="mt-1 leading-6">
                {order.shipping_details ||
                  "لا توجد تفاصيل إضافية"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">
                تاريخ الطلب
              </p>

              <p className="mt-1">
                {new Date(
                  order.created_at,
                ).toLocaleString(
                  "ar-YE",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusSelector({
  item,
  busy,
  onChange,
}: {
  item: OrderItem;
  busy: boolean;
  onChange: (
    itemId: string,
    status: OrderItem["vendor_status"],
  ) => Promise<void>;
}) {
  return (
    <div className="relative">
      <select
        value={item.vendor_status}
        disabled={busy}
        onChange={(event) =>
          void onChange(
            item.id,
            event.target
              .value as OrderItem["vendor_status"],
          )
        }
        className="h-9 appearance-none rounded-xl border border-border bg-secondary pl-8 pr-3 text-[11px] outline-none"
      >
        {Object.entries(
          statusLabels,
        ).map(
          ([
            value,
            label,
          ]) => (
            <option
              key={value}
              value={value}
            >
              {label}
            </option>
          ),
        )}
      </select>

      <ChevronDown className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: OrderItem["vendor_status"];
}) {
  const Icon =
    status === "delivered"
      ? CheckCircle2
      : status === "cancelled"
        ? XCircle
        : status === "shipped"
          ? Truck
          : status === "processing" ||
              status === "accepted"
            ? RefreshCw
            : Clock3;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-semibold text-primary">
      <Icon className="h-3.5 w-3.5" />
      {statusLabels[status]}
    </span>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: typeof User;
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

      <div className="min-w-0">
        <p className="text-muted-foreground">
          {label}
        </p>

        <p
          dir={dir}
          className="mt-0.5 break-words font-medium"
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon className="h-5 w-5 text-primary" />

      <p className="mt-3 text-xl font-black">
        {value.toLocaleString(
          "ar-EG",
        )}
      </p>

      <p className="mt-1 text-[10px] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
