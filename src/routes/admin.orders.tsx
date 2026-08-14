import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, btnGhostCls, inputCls } from "@/components/admin-ui";
import { formatPrice } from "@/lib/db";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, formatDate } from "@/lib/store";
import { LocationPicker } from "@/components/location-picker";
import { fetchCouriers, type Courier } from "@/lib/store";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceView } from "@/components/InvoiceView";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type Item = { id: string; product_name: string; quantity: number; unit_price: number };
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

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select(
        "id,order_number,status,payment_status,payment_method_code,total,subtotal,delivery_fee,shipping_name,shipping_phone,shipping_city,shipping_district,shipping_details,latitude,longitude,created_at,courier_id,order_items(id,product_name,quantity,unit_price)",
      )
      .order("created_at", { ascending: false })
      .returns<Order[]>();
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
    void (async () => setCouriers(await fetchCouriers(false)))();
  }, [load]);

  async function setCourier(id: string, courierId: string) {
    const { error } = await supabase
      .from("orders")
      .update({ courier_id: courierId || null })
      .eq("id", id);
    if (error) toast.error("تعذّر التعيين: " + error.message);
    else toast.success("تم تعيين الطلب لعامل التوصيل");
    await load();
  }

  function shareWhatsApp(o: Order) {
    const lines = [
      `طلب: ${o.order_number}`,
      `العميل: ${o.shipping_name} - ${o.shipping_phone}`,
      `العنوان: ${o.shipping_city} ${o.shipping_district} - ${o.shipping_details}`,
      `الحالة: ${ORDER_STATUS_LABELS[o.status] ?? o.status}`,
      `الدفع: ${PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status} (${o.payment_method_code})`,
      `الإجمالي: ${formatPrice(o.total)}`,
      ...o.order_items.map((i) => `- ${i.product_name} × ${i.quantity}`),
      o.latitude && o.longitude
        ? `الموقع: https://www.google.com/maps?q=${o.latitude},${o.longitude}`
        : "",
    ].filter(Boolean);
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status: status as never })
      .eq("id", id);
    if (error) toast.error("تعذّر التحديث: " + error.message);
    else toast.success("تم تحديث حالة الطلب");
    await load();
  }

  return (
    <AdminCard title={`الطلبات (${rows.length.toLocaleString("ar-EG")})`}>
      <ul className="space-y-2">
        {rows.map((o) => (
          <li key={o.id} className="rounded-xl border border-border/70 p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span dir="ltr" className="text-foreground font-mono font-bold">
                {o.order_number}
              </span>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-primary">
                {PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status}
              </span>
              <span className="text-muted-foreground">{formatDate(o.created_at)}</span>
              <span className="text-primary font-bold">{formatPrice(o.total)}</span>

              {/* زر عرض الفاتورة للآدمن */}
              <Dialog>
                <DialogTrigger asChild>
                  <button type="button" className={`${btnGhostCls} flex items-center gap-1`}>
                    <FileText className="w-3.5 h-3.5 text-[#3e0b1b]" />
                    <span>الفاتورة</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-2 sm:p-6 bg-white rounded-3xl border-none shadow-2xl">
                  <InvoiceView
                    order={{
                      invoiceNumber: `INV-2026-${o.order_number.replace(/\D/g, "")}`,
                      invoiceDate: new Date(o.created_at).toLocaleDateString("ar-YE"),
                      orderNumber: o.order_number,
                      customerDetails: {
                        name: o.shipping_name,
                        phone: o.shipping_phone,
                        address: `${o.shipping_city} - ${o.shipping_district} (${o.shipping_details})`,
                        paymentMethod: PAYMENT_STATUS_LABELS[o.payment_status] || o.payment_method_code,
                        currency: "ريال يمني (YER)",
                      },
                      items: o.order_items.map((it) => ({
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

              <select
                aria-label="حالة الطلب"
                value={o.status}
                onChange={(e) => setStatus(o.id, e.target.value)}
                className={`${inputCls} ms-auto w-auto`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={btnGhostCls}
                onClick={() => setOpen(open === o.id ? null : o.id)}
              >
                {open === o.id ? "إخفاء" : "التفاصيل"}
              </button>
            </div>

            {open === o.id ? (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                <div className="text-muted-foreground">
                  <p className="text-foreground">{o.shipping_name} — {o.shipping_phone}</p>
                  <p>
                    {o.shipping_city} {o.shipping_district} — {o.shipping_details}
                  </p>
                  <p>طريقة الدفع: {o.payment_method_code}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="عامل التوصيل"
                    value={o.courier_id ?? ""}
                    onChange={(e) => setCourier(o.id, e.target.value)}
                    className={`${inputCls} w-auto`}
                  >
                    <option value="">بدون عامل توصيل</option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.is_active ? "" : "(غير متاح)"}
                      </option>
                    ))}
                  </select>
                  <button type="button" className={btnGhostCls} onClick={() => shareWhatsApp(o)}>
                    مشاركة عبر واتساب
                  </button>
                  {o.latitude && o.longitude ? (
                    <a
                      className={btnGhostCls}
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`}
                    >
                      فتح الموقع في الخرائط
                    </a>
                  ) : null}
                </div>
                <ul className="space-y-1">
                  {o.order_items.map((i) => (
                    <li key={i.id} className="flex justify-between">
                      <span className="text-foreground">
                        {i.product_name} × {i.quantity.toLocaleString("ar-EG")}
                      </span>
                      <span className="text-primary">{formatPrice(i.unit_price * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                {o.latitude && o.longitude ? (
                  <LocationPicker
                    readOnly
                    height={180}
                    value={{ lat: Number(o.latitude), lng: Number(o.longitude) }}
                  />
                ) : (
                  <p className="text-muted-foreground">لم يحدّد العميل موقعه على الخريطة.</p>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </AdminCard>
  );
}
