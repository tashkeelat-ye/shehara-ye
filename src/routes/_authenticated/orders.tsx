import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { formatPrice } from "@/lib/db";
import { PAYMENT_STATUS_LABELS } from "@/lib/store";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceView } from "@/components/InvoiceView";
import { FileText } from "lucide-react";

type OrderItem = {
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
  subtotal: number;
  delivery_fee: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_city: string;
  shipping_district: string;
  shipping_details: string;
  created_at: string;
  order_items: OrderItem[] | null;
  couriers: { name: string; phone: string } | null;
  invoices: { invoice_number: string }[] | null;
};

const statusLabels: Record<string, string> = {
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
      { title: "طلباتي | تشكيلات" },
      { name: "description", content: "تابع حالة طلباتك ومشترياتك من متجر تشكيلات." },
      { property: "og:title", content: "طلباتي | تشكيلات" },
      { property: "og:description", content: "متابعة الطلبات في متجر تشكيلات." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id,order_number,status,payment_status,payment_method_code,subtotal,delivery_fee,total,shipping_name,shipping_phone,shipping_city,shipping_district,shipping_details,created_at,order_items(id,product_name,quantity,unit_price),couriers(name,phone),invoices(invoice_number)",
        )
        .order("created_at", { ascending: false })
        .returns<Order[]>();
      setOrders(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-lg text-foreground font-bold">طلباتي</h1>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            لا توجد طلبات بعد.{" "}
            <Link to="/products" className="text-primary font-bold">
              ابدأ التسوق
            </Link>
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {orders.map((o) => {
              const items = o.order_items || [];
              const invoiceNum = o.invoices?.[0]?.invoice_number || `INV-2026-${o.order_number?.replace(/\D/g, "") || "000"}`;

              return (
                <li key={o.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span dir="ltr" className="text-foreground font-mono font-bold">
                      {o.order_number}
                    </span>
                    <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-primary">
                      {statusLabels[o.status] ?? o.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("ar-YE")}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {items.map((it) => (
                      <li key={it.id}>
                        {it.product_name} × {it.quantity.toLocaleString("ar-YE")} —{" "}
                        {formatPrice(it.unit_price * it.quantity)}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm text-primary font-bold">الإجمالي: {formatPrice(o.total)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    الدفع: {PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status}
                    {o.couriers ? ` · المندوب: ${o.couriers.name} (${o.couriers.phone})` : ""}
                  </p>

                  {/* فتح الفاتورة داخل المودال */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-[11px] font-bold text-foreground hover:bg-accent transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#c49a37]" />
                        <span>عرض الفاتورة الإلكترونية</span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-2 sm:p-6 bg-white rounded-3xl border-none shadow-2xl">
                      <InvoiceView
                        order={{
                          invoiceNumber: invoiceNum,
                          invoiceDate: new Date(o.created_at).toLocaleDateString("ar-YE"),
                          orderNumber: o.order_number,
                          customerDetails: {
                            name: o.shipping_name,
                            phone: o.shipping_phone,
                            address: `${o.shipping_city || ''} - ${o.shipping_district || ''} (${o.shipping_details || ''})`,
                            paymentMethod: PAYMENT_STATUS_LABELS[o.payment_status] || o.payment_method_code,
                            currency: "ريال يمني (YER)",
                          },
                          items: items.map((it) => ({
                            id: it.id,
                            title: it.product_name,
                            quantity: it.quantity,
                            price: it.unit_price,
                            image: "/logo.png",
                          })),
                          subtotal: o.subtotal,
                          shippingFee: o.delivery_fee,
                          total: o.total,
                        }}
                      />
                    </DialogContent>
                  </Dialog>

                </li>
              );
            })}
          </ul>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
