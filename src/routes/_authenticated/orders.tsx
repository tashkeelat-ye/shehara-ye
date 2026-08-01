import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { formatPrice } from "@/lib/db";

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
  total: number;
  created_at: string;
  order_items: OrderItem[];
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
          "id,order_number,status,total,created_at,order_items(id,product_name,quantity,unit_price)",
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
        <h1 className="text-lg text-foreground">طلباتي</h1>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            لا توجد طلبات بعد.{" "}
            <Link to="/products" className="text-primary">
              ابدأ التسوق
            </Link>
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="rounded-2xl border border-border/70 bg-card p-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span dir="ltr" className="text-foreground">
                    {o.order_number}
                  </span>
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-primary">
                    {statusLabels[o.status] ?? o.status}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString("ar-EG")}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {o.order_items.map((it) => (
                    <li key={it.id}>
                      {it.product_name} × {it.quantity.toLocaleString("ar-EG")} —{" "}
                      {formatPrice(it.unit_price * it.quantity)}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-primary">الإجمالي: {formatPrice(o.total)}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
