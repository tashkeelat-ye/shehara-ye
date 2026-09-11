import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  FileText,
  Share2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { useFormatPrice } from "@/lib/currency-context";
import { PAYMENT_STATUS_LABELS } from "@/lib/store";
import { InvoiceView } from "@/components/InvoiceView";

type OrderItem = {
  id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  size: string | null;
  color: string | null;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method_code: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_city: string;
  shipping_district: string;
  shipping_details: string;
  shipping_landmark: string | null;
  notes: string | null;
  created_at: string;

  order_items: OrderItem[] | null;

  couriers: {
    name: string;
    phone: string;
  } | null;

  invoices: {
    invoice_number: string;
  }[] | null;
};

const statusLabels: Record<string, string> = {
  awaiting_payment: "بانتظار الدفع",
  pending: "بانتظار التأكيد",
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "طلباتي | شهارة" },
      {
        name: "description",
        content:
          "تابع حالة طلباتك ومشترياتك من متجر شهارة.",
      },
    ],
  }),

  component: OrdersPage,
});

function OrdersPage() {
  const formatPrice = useFormatPrice();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceOrder, setInvoiceOrder] =
    useState<Order | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          [
            "id",
            "order_number",
            "status",
            "payment_status",
            "payment_method_code",
            "subtotal",
            "delivery_fee",
            "total",
            "shipping_name",
            "shipping_phone",
            "shipping_city",
            "shipping_district",
            "shipping_details",
            "shipping_landmark",
            "notes",
            "created_at",
            "order_items(id,product_name,product_image,quantity,unit_price,size,color)",
            "couriers(name,phone)",
            "invoices(invoice_number)",
          ].join(","),
        )
        .order("created_at", {
          ascending: false,
        })
        .returns<Order[]>();

      if (!active) return;

      if (error) {
        console.error("orders:", error);
        toast.error("تعذر تحميل الطلبات");
        setOrders([]);
      } else {
        setOrders(data ?? []);
      }

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const shareInvoice = async (order: Order) => {
    const invoiceNumber =
      order.invoices?.[0]?.invoice_number;

    if (!invoiceNumber) {
      toast.error(
        "لا توجد فاتورة إلكترونية صادرة لهذا الطلب حتى الآن.",
      );
      return;
    }

    const url =
      `${window.location.origin}/invoice/${order.id}`;

    const shareData = {
      title: `فاتورة شهارة — ${invoiceNumber}`,
      text:
        `فاتورة طلب ${order.order_number} من شهارة للتسوق`,
      url,
    };

    try {
      if (
        typeof navigator.share === "function"
      ) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(url);

      toast.success(
        "تم نسخ رابط الفاتورة، ويمكنك مشاركته الآن.",
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(url);

        toast.success(
          "تم نسخ رابط الفاتورة.",
        );
      } catch {
        toast.error(
          "تعذر مشاركة الفاتورة من هذا الجهاز.",
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5">
          <h1 className="text-lg font-black text-foreground">
            طلباتي
          </h1>

          <p className="mt-1 text-xs text-muted-foreground">
            جميع طلباتك وفواتيرك محفوظة في حسابك.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />

            <p className="mt-3 text-sm font-bold">
              لا توجد طلبات بعد
            </p>

            <Link
              to="/products"
              className="mt-4 inline-flex rounded-xl bg-[#0D3B4D] px-4 py-2.5 text-xs font-bold text-white"
            >
              ابدأ التسوق
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => {
              const items =
                order.order_items ?? [];

              const invoiceNumber =
                order.invoices?.[0]?.invoice_number;

              return (
                <li
                  key={order.id}
                  className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        dir="ltr"
                        className="font-mono text-sm font-black text-foreground"
                      >
                        {order.order_number}
                      </span>

                      <span className="rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold text-primary">
                        {statusLabels[order.status] ??
                          order.status}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span>
                        {new Date(
                          order.created_at,
                        ).toLocaleDateString("ar-YE")}
                      </span>

                      {invoiceNumber && (
                        <span dir="ltr">
                          {invoiceNumber}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl bg-muted/40 p-2"
                        >
                          {item.product_image ? (
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="h-12 w-12 rounded-xl object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold">
                              {item.product_name}
                            </p>

                            <p className="mt-1 text-[10px] text-muted-foreground">
                              الكمية:{" "}
                              {item.quantity.toLocaleString(
                                "ar-YE",
                              )}
                            </p>

                            {(item.size ||
                              item.color) && (
                              <p className="text-[10px] text-muted-foreground">
                                {item.size
                                  ? `المقاس: ${item.size}`
                                  : ""}
                                {item.size &&
                                item.color
                                  ? " · "
                                  : ""}
                                {item.color
                                  ? `اللون: ${item.color}`
                                  : ""}
                              </p>
                            )}
                          </div>

                          <span className="shrink-0 text-xs font-black text-primary">
                            {formatPrice(
                              item.unit_price *
                                item.quantity,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          الإجمالي
                        </p>

                        <p className="mt-1 text-base font-black text-[#0D3B4D]">
                          {formatPrice(order.total)}
                        </p>
                      </div>

                      <p className="text-[10px] text-muted-foreground">
                        الدفع:{" "}
                        {PAYMENT_STATUS_LABELS[
                          order.payment_status
                        ] ??
                          order.payment_status}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-border bg-muted/20 p-3">
                    {invoiceNumber ? (
                      <>
                        <Link
                          to="/invoice/$id"
                          params={{ id: order.id }}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0D3B4D] px-4 text-[11px] font-bold text-white"
                        >
                          <FileText className="h-4 w-4 text-[#E2723A]" />
                          عرض الفاتورة الإلكترونية
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            void shareInvoice(order)
                          }
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#0D3B4D]/15 bg-background px-4 text-[11px] font-bold text-[#0D3B4D]"
                        >
                          <Share2 className="h-4 w-4 text-[#E2723A]" />
                          مشاركة الفاتورة
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[10px] text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        لم تصدر فاتورة إلكترونية لهذا الطلب بعد
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <BottomNav />

      {invoiceOrder && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-2 md:p-6">
          <div className="mx-auto max-w-4xl py-4">
            <InvoiceView
              order={{
                invoiceNumber:
                  invoiceOrder.invoices?.[0]
                    ?.invoice_number ?? "",
                invoiceDate: new Date(
                  invoiceOrder.created_at,
                ).toLocaleDateString("ar-YE"),

                orderNumber:
                  invoiceOrder.order_number,

                customerDetails: {
                  name:
                    invoiceOrder.shipping_name,
                  phone:
                    invoiceOrder.shipping_phone,
                  address: [
                    invoiceOrder.shipping_city,
                    invoiceOrder.shipping_district,
                    invoiceOrder.shipping_details,
                    invoiceOrder.shipping_landmark,
                  ]
                    .filter(Boolean)
                    .join(" - "),
                  paymentMethod:
                    invoiceOrder.payment_method_code,
                  paymentStatus:
                    PAYMENT_STATUS_LABELS[
                      invoiceOrder.payment_status
                    ] ??
                    invoiceOrder.payment_status,
                  currency: "ريال يمني (YER)",
                },

                items: (
                  invoiceOrder.order_items ?? []
                ).map((item) => ({
                  id: item.id,
                  title: item.product_name,
                  quantity: item.quantity,
                  price: item.unit_price,
                  image:
                    item.product_image || undefined,
                  description: [
                    item.size
                      ? `المقاس: ${item.size}`
                      : "",
                    item.color
                      ? `اللون: ${item.color}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · "),
                })),

                subtotal:
                  invoiceOrder.subtotal,

                shippingFee:
                  invoiceOrder.delivery_fee,

                total:
                  invoiceOrder.total,

                notes:
                  invoiceOrder.notes ?? "",
              }}
            />

            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setInvoiceOrder(null)
                }
                className="rounded-xl bg-white px-6 py-3 text-xs font-bold text-[#0D3B4D]"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
