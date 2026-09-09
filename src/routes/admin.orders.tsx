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

const STATUSES = Object.keys(ORDER_STATUS_LABELS);


function AdminOrders() {
  const [rows, setRows] = useState<Order[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null,
  );


  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,order_number,status,payment_status,payment_method_code,total,subtotal,delivery_fee,shipping_name,shipping_phone,shipping_city,shipping_district,shipping_details,latitude,longitude,created_at,courier_id,order_items(id,product_name,quantity,unit_price)",
        )
        .order("created_at", { ascending: false })
        .returns<Order[]>();

      if (error) {
        throw error;
      }

      setRows(data ?? []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تحميل الطلبات.";

      toast.error(`تعذر تحميل الطلبات: ${message}`);
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
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تحميل عمال التوصيل.";

      toast.error(`تعذر تحميل عمال التوصيل: ${message}`);
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
      const { error } = await supabase.rpc(
        "assign_order_courier_secure",
        {
          _order_id: orderId,
          _courier_id: courierId || null,
        },
      );

      if (error) {
        throw error;
      }

      toast.success(
        courierId
          ? "تم تعيين الطلب لعامل التوصيل بنجاح."
          : "تم إلغاء تعيين عامل التوصيل.",
      );

      await load();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تعيين عامل التوصيل.";

      toast.error(`تعذر التعيين: ${message}`);
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

    setProcessingOrderId(orderId);

    try {
      const { error } = await supabase.rpc(
        "update_order_status_secure",
        {
          _order_id: orderId,
          _new_status: status,
        },
      );

      if (error) {
        throw error;
      }

      toast.success("تم تحديث حالة الطلب بنجاح.");

      await load();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر تحديث حالة الطلب.";

      toast.error(`تعذر التحديث: ${message}`);
    } finally {
      setProcessingOrderId(null);
    }
  }


  function shareWhatsApp(order: Order) {
    const lines = [
      `طلب: ${order.order_number}`,
      `العميل: ${order.shipping_name} - ${order.shipping_phone}`,
      `العنوان: ${order.shipping_city} ${order.shipping_district} - ${order.shipping_details}`,
      `الحالة: ${
        ORDER_STATUS_LABELS[order.status] ?? order.status
      }`,
      `الدفع: ${
        PAYMENT_STATUS_LABELS[order.payment_status] ??
        order.payment_status
      } (${order.payment_method_code})`,
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
      title={`الطلبات (${rows.length.toLocaleString("ar-EG")})`}
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
            const busy = processingOrderId === order.id;

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

                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-primary">
                    {PAYMENT_STATUS_LABELS[
                      order.payment_status
                    ] ?? order.payment_status}
                  </span>

                  <span className="text-muted-foreground">
                    {formatDate(order.created_at)}
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
                          invoiceNumber: `INV-2026-${order.order_number.replace(
                            /\D/g,
                            "",
                          )}`,
                          invoiceDate:
                            new Date(
                              order.created_at,
                            ).toLocaleDateString(
                              "ar-YE",
                            ),
                          orderNumber:
                            order.order_number,
                          customerDetails: {
                            name: order.shipping_name,
                            phone:
                              order.shipping_phone,
                            address: `${order.shipping_city} - ${order.shipping_district} (${order.shipping_details})`,
                            paymentMethod:
                              PAYMENT_STATUS_LABELS[
                                order.payment_status
                              ] ??
                              order.payment_method_code,
                            currency:
                              "ريال يمني (YER)",
                          },
                          items:
                            order.order_items.map(
                              (item) => ({
                                id: item.id,
                                title:
                                  item.product_name,
                                quantity:
                                  item.quantity,
                                price:
                                  item.unit_price,
                                image:
                                  "/logo.png",
                              }),
                            ),
                          subtotal:
                            order.subtotal,
                          shippingFee:
                            order.delivery_fee,
                          total: order.total,
                        }}
                      />
                    </DialogContent>
                  </Dialog>

                  <select
                    aria-label="حالة الطلب"
                    value={order.status}
                    disabled={busy}
                    onChange={(event) =>
                      void setStatus(
                        order.id,
                        event.target.value,
                      )
                    }
                    className={`${inputCls} ms-auto w-auto`}
                  >
                    {STATUSES.map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {ORDER_STATUS_LABELS[status] ??
                          status}
                      </option>
                    ))}
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
                        value={order.courier_id ?? ""}
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

                        {couriers.map((courier) => (
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
                        ))}
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

                      {order.latitude !== null &&
                      order.longitude !== null ? (
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
                              {item.product_name} ×{" "}
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
                          {formatPrice(order.total)}
                        </span>
                      </div>
                    </div>

                    {order.latitude !== null &&
                    order.longitude !== null ? (
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
