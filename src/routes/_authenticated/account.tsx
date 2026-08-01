import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/lib/auth-context";

type Address = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  city: string;
  district: string;
  details: string;
  is_default: boolean;
};

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "حسابي | تشكيلات" },
      { name: "description", content: "إدارة بياناتك الشخصية وعناوين التوصيل في تشكيلات." },
      { property: "og:title", content: "حسابي | تشكيلات" },
      { property: "og:description", content: "إدارة الحساب والعناوين في متجر تشكيلات." },
    ],
  }),
  component: AccountPage,
});

const emptyAddress = {
  label: "المنزل",
  recipient_name: "",
  phone: "",
  city: "",
  district: "",
  details: "",
};

function AccountPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(emptyAddress);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const loadAddresses = async () => {
    const { data } = await supabase
      .from("addresses")
      .select("id,label,recipient_name,phone,city,district,details,is_default")
      .order("created_at")
      .returns<Address[]>();
    setAddresses(data ?? []);
  };

  useEffect(() => {
    void loadAddresses();
  }, [user?.id]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (fullName.trim().length < 3) {
      toast.error("أدخل اسمًا صحيحًا");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone })
      .eq("id", user!.id);
    setBusy(false);
    if (error) toast.error("تعذّر حفظ البيانات");
    else {
      toast.success("تم تحديث بياناتك");
      await refreshProfile();
    }
  }

  async function addAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!form.recipient_name || !form.city || !form.details) {
      toast.error("أكمل بيانات العنوان");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("addresses").insert({
      user_id: user!.id,
      ...form,
      is_default: addresses.length === 0,
    });
    setBusy(false);
    if (error) toast.error("تعذّر إضافة العنوان");
    else {
      toast.success("تمت إضافة العنوان");
      setForm(emptyAddress);
      await loadAddresses();
    }
  }

  async function removeAddress(id: string) {
    await supabase.from("addresses").delete().eq("id", id);
    await loadAddresses();
  }

  async function makeDefault(id: string) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user!.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    await loadAddresses();
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg text-foreground">حسابي</h1>
          <div className="flex gap-2">
            <Link to="/orders" className="rounded-xl border border-border px-3 py-2 text-xs">
              طلباتي
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-xl border border-destructive px-3 py-2 text-xs text-destructive"
            >
              خروج
            </button>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="text-sm text-foreground">البيانات الشخصية</h2>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-label="الاسم الثلاثي"
            placeholder="الاسم الثلاثي"
            maxLength={100}
            className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label="رقم الهاتف"
            placeholder="رقم الهاتف"
            dir="ltr"
            maxLength={20}
            className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl bg-primary px-5 text-sm text-primary-foreground disabled:opacity-60"
          >
            حفظ التعديلات
          </button>
        </form>

        <section className="rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="text-sm text-foreground">عناوين التوصيل</h2>
          <ul className="mt-3 space-y-2">
            {addresses.map((a) => (
              <li key={a.id} className="rounded-xl border border-border/70 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-foreground">
                    {a.label} — {a.recipient_name}
                    {a.is_default ? (
                      <span className="ms-2 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] text-primary">
                        افتراضي
                      </span>
                    ) : null}
                  </p>
                  <div className="flex gap-2">
                    {!a.is_default ? (
                      <button type="button" onClick={() => void makeDefault(a.id)} className="text-primary">
                        تعيين افتراضي
                      </button>
                    ) : null}
                    <button type="button" onClick={() => void removeAddress(a.id)} className="text-destructive">
                      حذف
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {a.city} • {a.district} • {a.details} • {a.phone}
                </p>
              </li>
            ))}
            {addresses.length === 0 ? (
              <li className="text-xs text-muted-foreground">لا توجد عناوين محفوظة</li>
            ) : null}
          </ul>

          <form onSubmit={addAddress} className="mt-4 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["label", "الوسم (المنزل/العمل)"],
                ["recipient_name", "اسم المستلم"],
                ["phone", "رقم الهاتف"],
                ["city", "المدينة"],
                ["district", "المديرية/الحي"],
                ["details", "تفاصيل العنوان"],
              ] as const
            ).map(([key, label]) => (
              <input
                key={key}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                aria-label={label}
                placeholder={label}
                maxLength={200}
                className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary"
              />
            ))}
            <button
              type="submit"
              disabled={busy}
              className="h-11 rounded-xl bg-accent-solid px-5 text-sm text-accent-solid-foreground disabled:opacity-60 sm:col-span-2"
            >
              إضافة عنوان
            </button>
          </form>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
