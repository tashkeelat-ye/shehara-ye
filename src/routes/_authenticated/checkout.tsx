import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "إتمام الطلب | تشكيلات" },
      { name: "description", content: "أكمل بيانات التوصيل وأتمم طلبك من متجر تشكيلات." },
      { property: "og:title", content: "إتمام الطلب | تشكيلات" },
      { property: "og:description", content: "إتمام الطلب في متجر تشكيلات." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user, profile } = useAuth();
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("سلتك فارغة");
      return;
    }
    if (!name || !phone || !city || !details) {
      toast.error("أكمل بيانات التوصيل");
      return;
    }
    setBusy(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user!.id,
        total,
        shipping_name: name,
        shipping_phone: phone,
        shipping_city: city,
        shipping_details: details,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error || !order) {
      setBusy(false);
      toast.error("تعذّر إنشاء الطلب، حاول مرة أخرى");
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        product_name: i.product.name,
        product_image: i.product.images[0] ?? "",
        unit_price: i.product.price,
        quantity: i.quantity,
        size: i.size,
        color: i.color,
      })),
    );
    setBusy(false);
    if (itemsError) {
      toast.error("تعذّر حفظ منتجات الطلب");
      return;
    }
    await clearCart();
    toast.success("تم إنشاء طلبك بنجاح");
    void navigate({ to: "/orders" });
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-lg text-foreground">إتمام الطلب</h1>

        <ul className="mt-4 space-y-2 rounded-2xl border border-border/70 bg-card p-4 text-xs">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span className="line-clamp-1 text-foreground">
                {i.product.name} × {i.quantity.toLocaleString("ar-EG")}
              </span>
              <span className="shrink-0 text-primary">
                {formatPrice(i.product.price * i.quantity)}
              </span>
            </li>
          ))}
          <li className="flex justify-between border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">الإجمالي</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </li>
        </ul>

        <form onSubmit={submit} className="mt-4 grid gap-2 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="اسم المستلم"
            placeholder="اسم المستلم"
            maxLength={100}
            className="h-11 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label="رقم الهاتف"
            placeholder="رقم الهاتف"
            dir="ltr"
            maxLength={20}
            className="h-11 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="المدينة"
            placeholder="المدينة"
            maxLength={60}
            className="h-11 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary"
          />
          <input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            aria-label="تفاصيل العنوان"
            placeholder="تفاصيل العنوان"
            maxLength={300}
            className="h-11 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-2xl bg-primary text-sm text-primary-foreground disabled:opacity-60 sm:col-span-2"
          >
            {busy ? "جارٍ الإرسال..." : "تأكيد الطلب (الدفع عند الاستلام)"}
          </button>
        </form>
      </main>
      <BottomNav />
    </div>
  );
}
