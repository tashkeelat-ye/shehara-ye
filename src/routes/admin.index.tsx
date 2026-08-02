import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/db";
import { AdminCard } from "@/components/admin-ui";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

type Stats = {
  products: number;
  orders: number;
  users: number;
  pending: number;
  revenue: number;
};

function AdminHome() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void (async () => {
      const [products, orders, users, pending, totals] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("payment_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase.from("orders").select("total").returns<{ total: number }[]>(),
      ]);
      setStats({
        products: products.count ?? 0,
        orders: orders.count ?? 0,
        users: users.count ?? 0,
        pending: pending.count ?? 0,
        revenue: (totals.data ?? []).reduce((s, o) => s + Number(o.total), 0),
      });
    })();
  }, []);

  const cards = [
    { label: "المنتجات", value: stats?.products, to: "/admin/products" },
    { label: "الطلبات", value: stats?.orders, to: "/admin/orders" },
    { label: "المستخدمون", value: stats?.users, to: "/admin/users" },
    { label: "طلبات دفع معلّقة", value: stats?.pending, to: "/admin/payment-requests" },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-primary"
          >
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl text-primary">
              {(c.value ?? 0).toLocaleString("ar-EG")}
            </p>
          </Link>
        ))}
      </div>

      <AdminCard title="إجمالي قيمة الطلبات">
        <p className="text-xl text-primary">{formatPrice(stats?.revenue ?? 0)}</p>
      </AdminCard>
    </div>
  );
}
