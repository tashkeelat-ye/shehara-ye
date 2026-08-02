import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, btnGhostCls, inputCls } from "@/components/admin-ui";
import { formatPrice } from "@/lib/db";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, formatDate } from "@/lib/store";
import { LocationPicker } from "@/components/location-picker";

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
  order_items: Item[];
};

const STATUSES = Object.keys(ORDER_STATUS_LABELS);

function AdminOrders() {
  const [rows, setRows] = useState<Order[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select(
        "id,order_number,status,payment_status,payment_method_code,total,subtotal,delivery_fee,shipping_name,shipping_phone,shipping_city,shipping_district,shipping_details,latitude,longitude,created_at,order_items(id,product_name,quantity,unit_price)",
      )
      .order("created_at", { ascending: false })
      .returns<Order[]>();
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
              <span dir="ltr" className="text-foreground">
                {o.order_number}
              </span>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-primary">
                {PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status}
              </span>
              <span className="text-muted-foreground">{formatDate(o.created_at)}</span>
              <span className="text-primary">{formatPrice(o.total)}</span>
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
