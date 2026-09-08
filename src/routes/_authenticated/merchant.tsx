import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Store } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { fetchProducts, formatPrice, type Product } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/merchant")({
  head: () => ({
    meta: [
      { title: "حساب التاجر | شهارة" },
      {
        name: "description",
        content: "لوحة التاجر في شهارة: حالة المتجر، بياناته، ومنتجاته المعروضة.",
      },
      { property: "og:title", content: "حساب التاجر | شهارة" },
      { property: "og:description", content: "إدارة متجرك ومنتجاتك في شهارة." },
    ],
  }),
  component: MerchantPage,
});

type Vendor = {
  id: string;
  name: string;
  city: string;
  phone: string;
  description: string;
  is_active: boolean;
  account_enabled: boolean;
};

const inputCls =
  "h-11 w-full rounded-2xl border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary";

function MerchantPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    phone: "",
    description: "",
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("vendors")
      .select("id,name,city,phone,description,is_active,account_enabled")
      .eq("user_id", user.id)
      .maybeSingle<Vendor>();

    setVendor(data ?? null);

    if (data) {
      setForm({
        name: data.name,
        city: data.city,
        phone: data.phone ?? "",
        description: data.description ?? "",
      });
      setProducts(await fetchProducts({ vendorId: data.id, limit: 50 }));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function apply() {
    if (!user) return;
    if (!form.name.trim() || !form.city.trim()) {
      toast.error("أدخل اسم المتجر والمدينة");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.from("vendors").insert({
        user_id: user.id,
        name: form.name.trim(),
        city: form.city.trim(),
        phone: form.phone.trim(),
        description: form.description.trim(),
        is_active: false,
        account_enabled: false,
      });
      if (error) throw error;
      toast.success("تم إرسال طلب فتح المتجر، سيتم مراجعته قريبًا");
      await load();
    } catch {
      toast.error("تعذّر إرسال الطلب");
    } finally {
      setBusy(false);
    }
  }

  async function saveInfo() {
    if (!vendor) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("vendors")
        .update({
          name: form.name.trim(),
          city: form.city.trim(),
          phone: form.phone.trim(),
          description: form.description.trim(),
        })
        .eq("id", vendor.id);
      if (error) throw error;
      toast.success("تم تحديث بيانات المتجر");
      await load();
    } catch {
      toast.error("تعذّر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  const active = Boolean(vendor?.is_active && vendor?.account_enabled);

  return (
    <div dir="rtl" className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-24 pt-4">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Store className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-foreground">حساب التاجر</h1>
          <p className="truncate text-xs text-muted-foreground">
            {loading
              ? "جارٍ التحميل..."
              : vendor
                ? active
                  ? "متجرك مفعّل ويظهر للعملاء"
                  : "طلبك قيد المراجعة من الإدارة"
                : "أنشئ متجرك وابدأ البيع في شهارة"}
          </p>
        </div>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          {vendor ? "بيانات المتجر" : "طلب فتح متجر"}
        </h2>

        <input
          className={inputCls}
          placeholder="اسم المتجر"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <input
          className={inputCls}
          placeholder="المدينة"
          value={form.city}
          onChange={(event) => setForm({ ...form, city: event.target.value })}
        />
        <input
          className={inputCls}
          dir="ltr"
          placeholder="رقم الهاتف"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
        />
        <textarea
          className={`${inputCls} h-24 py-2`}
          placeholder="نبذة عن المتجر"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />

        <button
          type="button"
          disabled={busy || loading}
          onClick={() => (vendor ? void saveInfo() : void apply())}
          className="h-12 w-full rounded-2xl bg-primary text-sm text-primary-foreground disabled:opacity-60"
        >
          {busy ? "جارٍ المعالجة..." : vendor ? "حفظ البيانات" : "إرسال الطلب"}
        </button>
      </section>

      {vendor ? (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">منتجات متجري</h2>
            {active ? (
              <Link
                to="/vendor/$id"
                params={{ id: vendor.id }}
                className="text-xs text-primary"
              >
                صفحة المتجر
              </Link>
            ) : null}
          </div>

          {products.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              لا توجد منتجات في متجرك بعد. تواصل مع الإدارة لإضافة منتجاتك.
            </p>
          ) : (
            <ul className="space-y-2">
              {products.map((product) => (
                <li
                  key={product.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 p-2"
                >
                  <img
                    src={product.images[0] ?? "/icon-192.png"}
                    alt=""
                    loading="lazy"
                    className="h-11 w-11 shrink-0 rounded-lg object-cover"
                  />
                  <p className="min-w-0 truncate text-sm text-foreground">{product.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatPrice(product.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
