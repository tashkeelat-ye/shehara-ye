import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  AdminCard,
  btnGhostCls,
  inputCls,
} from "@/components/admin-ui";
import { formatPrice } from "@/lib/db";
import {
  fetchCouriers,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDate,
  type Courier,
} from "@/lib/store";
import { LocationPicker } from "@/components/location-picker";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InvoiceView } from "@/components/InvoiceView";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type Item = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

type Order = {
  id: string;
  order_number: string;
  invoice_number: string | null;
  currency: string | null;
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
  order_items: Item[];
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  awaiting_payment: ["pending", "cancelled"],

  pending: ["confirmed", "cancelled"],

  confirmed: ["processing", "cancelled"],

  processing: ["shipped", "cancelled"],

  shipped: ["delivered"],

  delivered: [],

  cancelled: [],
};

function getAllowedStatuses(currentStatus: string) {
  const transitions =
    STATUS_TRANSITIONS[currentStatus] ?? [];

  return [
    currentStatus,
    ...transitions.filter(
      (status) => status !== currentStatus,
    ),
  ];
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object"
  ) {
    const candidate =
      error as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
        code?: unknown;
      };

    const parts = [
      typeof candidate.message === "string"
        ? candidate.message
        : "",
      typeof candidate.details === "string"
        ? candidate.details
        : "",
      typeof candidate.hint === "string"
        ? candidate.hint
        : "",
    ].filter(Boolean);

    if (parts.length > 0) {
      const code =
        typeof candidate.code === "string"
          ? ` [${candidate.code}]`
          : "";

      return `${parts.join(" — ")}${code}`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "حدث خطأ غير معروف.";
}

function AdminOrders() {
  const [rows, setRows] = useState<Order[]>([]);
  const [open, setOpen] = useState<string | null>(
    null,
  );
  const [couriers, setCouriers] = useState<Courier[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          [
            "id",
            "order_number",
            "invoice_number",
            "currency",
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
        .order("created_at", {
          ascending: false,
        })
        .returns<Order[]>();

      if (error) {
        throw error;
      }

      setRows(data ?? []);
    } catch (error) {
      toast.error(
        `تعذر تحميل الطلبات: ${getErrorMessage(
          error,
        )}`,
      );

      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCouriers = useCallback(async () => {
    try {
      const list = await fetchCouriers(false);
      setCouriers(list);
    } catch (error) {
      toast.error(
        `تعذر تحميل عمال التوصيل: ${getErrorMessage(
          error,
        )}`,
      );

      setCouriers([]);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadCouriers();
  }, [load, loadCouriers]);

  async function setCourier(
    orderId: string,
    courierId: string,
  ) {
    if (processingOrderId) {
      return;
    }

    setProcessingOrderId(orderId);

    try {
      const { error } = await (
        supabase as any
      ).rpc(
        "assign_order_courier_secure",
        {
          _order_id: orderId,
          _courier_id:
            courierId.trim() || null,
        },
      );

      if (error) {
        throw error;
      }

      toast.success(
        courierId.trim()
          ? "تم تعيين الطلب لعامل التوصيل بنجاح."
          : "تم إلغاء تعيين عامل التوصيل.",
      );

      await load();
    } catch (error) {
      toast.error(
        `تعذر التعيين: ${getErrorMessage(
          error,
        )}`,
      );
    } finally {
      setProcessingOrderId(null);
    }
  }

  async function setStatus(
    orderId: string,
    status: string,
  ) {
    if (processingOrderId) {
      return;
    }

    const order = rows.find(
      (item) => item.id === orderId,
    );

    if (!order) {
      toast.error("لم يتم العثور على الطلب.");
      return;
    }

    const currentStatus = order.status;

    if (
      !status ||
      !STATUS_TRANSITIONS[currentStatus]
    ) {
      toast.error(
        "حالة الطلب الحالية غير معروفة.",
      );
      return;
    }

    if (status === currentStatus) {
      return;
    }

    const allowed =
      STATUS_TRANSITIONS[currentStatus];

    if (!allowed.includes(status)) {
      toast.error(
        `لا يمكن الانتقال من «${
          ORDER_STATUS_LABELS[currentStatus] ??
          currentStatus
        }» إلى «${
          ORDER_STATUS_LABELS[status] ??
          status
        }».`,
      );
      return;
    }

    setProcessingOrderId(orderId);

    try {
      const { error } = await (
        supabase as any
      ).rpc(
        "update_order_status_secure",
        {
          _order_id: orderId,
          _new_status: status,
        },
      );

      if (error) {
        throw error;
      }

      toast.success(
        `تم تحديث حالة الطلب إلى «${
          ORDER_STATUS_LABELS[status] ??
          status
        }» بنجاح.`,
      );

      await load();
    } catch (error) {
      const message =
        getErrorMessage(error);

      console.error(
        "update_order_status_secure failed:",
        error,
      );

      toast.error(
        `تعذر تحديث حالة الطلب: ${message}`,
        {
          duration: 10000,
        },
      );
    } finally {
      setProcessingOrderId(null);
    }
  }

  function shareWhatsApp(order: Order) {
    const lines = [
      `طلب: ${order.order_number}`,
      order.invoice_number
        ? `الفاتورة: ${order.invoice_number}`
        : "",
      `العميل: ${order.shipping_name} - ${order.shipping_phone}`,
      `العنوان: ${order.shipping_city} ${order.shipping_district} - ${order.shipping_details}`,
      `الحالة: ${
        ORDER_STATUS_LABELS[order.status] ??
        order.status
      }`,
      `حالة الدفع: ${
        PAYMENT_STATUS_LABELS[
          order.payment_status
        ] ?? order.payment_status
      }`,
      `طريقة الدفع: ${order.payment_method_code}`,
      `الإجمالي: ${formatPrice(order.total)}`,
      ...order.order_items.map(
        (item) =>
          `- ${item.product_name} × ${item.quantity}`,
      ),
      order.latitude !== null &&
      order.longitude !== null
        ? `الموقع: https://www.google.com/maps?q=${order.latitude},${order.longitude}`
        : "",
    ].filter(Boolean);

    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        lines.join("\n"),
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <AdminCard
      title={`الطلبات (${rows.length.toLocaleString(
        "ar-EG",
      )})`}
    >
      {loading ? (
        <div className="rounded-xl border border-border/70 p-4 text-center text-xs text-muted-foreground">
          جارٍ تحميل الطلبات...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border/70 p-4 text-center text-xs text-muted-foreground">
          لا توجد طلبات حالياً.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((order) => {
            const busy =
              processingOrderId === order.id;

            const allowedStatuses =
              getAllowedStatuses(order.status);

            return (
              <li
                key={order.id}
                className="rounded-xl border border-border/70 p-3 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    dir="ltr"
                    className="font-mono font-bold text-foreground"
                  >
                    {order.order_number}
                  </span>

                  {order.invoice_number ? (
                    <span
                      dir="ltr"
                      className="rounded-full bg-muted px-2 py-0.5 font-mono text-muted-foreground"
                    >
                      {order.invoice_number}
                    </span>
                  ) : null}

                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-primary">
                    {PAYMENT_STATUS_LABELS[
                      order.payment_status
                    ] ??
                      order.payment_status}
                  </span>

                  <span className="text-muted-foreground">
                    {formatDate(
                      order.created_at,
                    )}
                  </span>

                  <span className="font-bold text-primary">
                    {formatPrice(order.total)}
                  </span>

                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className={`${btnGhostCls} flex items-center gap-1`}
                      >
                        <FileText className="h-3.5 w-3.5 text-[#3e0b1b]" />
                        <span>الفاتورة</span>
                      </button>
                    </DialogTrigger>

                    <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-3xl border-none bg-white p-2 shadow-2xl sm:p-6">
                      <InvoiceView
                        order={{
                          invoice_number:
                            order.invoice_number,
                          order_number:
                            order.order_number,
                          created_at:
                            order.created_at,
                          currency:
                            order.currency,
                          shipping_name:
                            order.shipping_name,
                          shipping_phone:
                            order.shipping_phone,
                          shipping_city:
                            order.shipping_city,
                          shipping_district:
                            order.shipping_district,
                          shipping_details:
                            order.shipping_details,
                          payment_method_code:
                            order.payment_method_code,
                          payment_status:
                            order.payment_status,
                          subtotal:
                            order.subtotal,
                          delivery_fee:
                            order.delivery_fee,
                          total:
                            order.total,
                          order_items:
                            order.order_items.map(
                              (item) => ({
                                id: item.id,
                                product_name:
                                  item.product_name,
                                quantity:
                                  item.quantity,
                                unit_price:
                                  item.unit_price,
                              }),
                            ),
                        }}
                      />
                    </DialogContent>
                  </Dialog>

                  <select
                    aria-label="حالة الطلب"
                    value={order.status}
                    disabled={
                      busy ||
                      allowedStatuses.length <= 1
                    }
                    onChange={(event) =>
                      void setStatus(
                        order.id,
                        event.target.value,
                      )
                    }
                    className={`${inputCls} ms-auto w-auto`}
                  >
                    {allowedStatuses.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {ORDER_STATUS_LABELS[
                            status
                          ] ?? status}
                        </option>
                      ),
                    )}
                  </select>

                  <button
                    type="button"
                    disabled={busy}
                    className={btnGhostCls}
                    onClick={() =>
                      setOpen(
                        open === order.id
                          ? null
                          : order.id,
                      )
                    }
                  >
                    {open === order.id
                      ? "إخفاء"
                      : "التفاصيل"}
                  </button>
                </div>

                {open === order.id ? (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    <div className="text-muted-foreground">
                      <p className="text-foreground">
                        {order.shipping_name} —{" "}
                        {order.shipping_phone}
                      </p>

                      <p>
                        {order.shipping_city}{" "}
                        {order.shipping_district} —{" "}
                        {order.shipping_details}
                      </p>

                      <p>
                        رقم الفاتورة:{" "}
                        <span
                          dir="ltr"
                          className="font-mono"
                        >
                          {order.invoice_number ??
                            "غير متوفر"}
                        </span>
                      </p>

                      <p>
                        العملة:{" "}
                        {order.currency ??
                          "YER"}
                      </p>

                      <p>
                        طريقة الدفع:{" "}
                        {order.payment_method_code}
                      </p>

                      <p>
                        حالة الدفع:{" "}
                        {PAYMENT_STATUS_LABELS[
                          order.payment_status
                        ] ??
                          order.payment_status}
                      </p>

                      <p>
                        حالة الطلب:{" "}
                        {ORDER_STATUS_LABELS[
                          order.status
                        ] ?? order.status}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label="عامل التوصيل"
                        value={
                          order.courier_id ?? ""
                        }
                        disabled={busy}
                        onChange={(event) =>
                          void setCourier(
                            order.id,
                            event.target.value,
                          )
                        }
                        className={`${inputCls} w-auto`}
                      >
                        <option value="">
                          بدون عامل توصيل
                        </option>

                        {couriers.map(
                          (courier) => (
                            <option
                              key={courier.id}
                              value={courier.id}
                              disabled={
                                !courier.is_active &&
                                courier.id !==
                                  order.courier_id
                              }
                            >
                              {courier.name}{" "}
                              {courier.is_active
                                ? ""
                                : "(غير متاح)"}
                            </option>
                          ),
                        )}
                      </select>

                      <button
                        type="button"
                        disabled={busy}
                        className={btnGhostCls}
                        onClick={() =>
                          shareWhatsApp(order)
                        }
                      >
                        مشاركة عبر واتساب
                      </button>

                      {order.latitude !==
                        null &&
                      order.longitude !==
                        null ? (
                        <a
                          className={btnGhostCls}
                          target="_blank"
                          rel="noreferrer"
                          href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                        >
                          فتح الموقع في الخرائط
                        </a>
                      ) : null}
                    </div>

                    <ul className="space-y-1">
                      {order.order_items.map(
                        (item) => (
                          <li
                            key={item.id}
                            className="flex justify-between"
                          >
                            <span className="text-foreground">
                              {
                                item.product_name
                              }{" "}
                              ×{" "}
                              {item.quantity.toLocaleString(
                                "ar-EG",
                              )}
                            </span>

                            <span className="text-primary">
                              {formatPrice(
                                item.unit_price *
                                  item.quantity,
                              )}
                            </span>
                          </li>
                        ),
                      )}
                    </ul>

                    <div className="rounded-lg border border-border/70 p-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          المجموع الفرعي
                        </span>

                        <span className="font-medium">
                          {formatPrice(
                            order.subtotal,
                          )}
                        </span>
                      </div>

                      <div className="mt-1 flex justify-between">
                        <span className="text-muted-foreground">
                          رسوم التوصيل
                        </span>

                        <span className="font-medium">
                          {formatPrice(
                            order.delivery_fee,
                          )}
                        </span>
                      </div>

                      <div className="mt-2 flex justify-between border-t border-border pt-2">
                        <span className="font-semibold text-foreground">
                          الإجمالي
                        </span>

                        <span className="font-bold text-primary">
                          {formatPrice(
                            order.total,
                          )}
                        </span>
                      </div>
                    </div>

                    {order.latitude !==
                        null &&
                    order.longitude !==
                        null ? (
                      <LocationPicker
                        readOnly
                        height={180}
                        value={{
                          lat: Number(
                            order.latitude,
                          ),
                          lng: Number(
                            order.longitude,
                          ),
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground">
                        لم يحدّد العميل موقعه على الخريطة.
                      </p>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </AdminCard>
  );
}
