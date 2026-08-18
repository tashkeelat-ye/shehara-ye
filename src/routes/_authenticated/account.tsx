import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  ChevronLeft,
  CreditCard,
  Edit3,
  Home,
  LogOut,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  User,
  Wallet,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/lib/auth-context";
import { WalletPanel } from "@/components/wallet-panel";
import { NotificationPrefsPanel } from "@/components/notification-prefs";
import { useFormatPrice } from "@/lib/currency-context";
import { PAYMENT_STATUS_LABELS, formatDate } from "@/lib/store";

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

type RecentOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار التأكيد",
  awaiting_payment: "بانتظار الدفع",
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const emptyAddress = {
  label: "المنزل",
  recipient_name: "",
  phone: "",
  city: "",
  district: "",
  details: "",
};

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "حسابي | تشكيلات" },
      {
        name: "description",
        content: "إدارة حسابك وطلباتك ومحفظتك وعناوين التوصيل في تشكيلات.",
      },
      {
        property: "og:title",
        content: "حسابي | تشكيلات",
      },
      {
        property: "og:description",
        content: "إدارة الحساب والطلبات والمحفظة في متجر تشكيلات.",
      },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const {
    user,
    profile,
    role,
    refreshProfile,
    signOut,
  } = useAuth();

  const formatPrice = useFormatPrice();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [addresses, setAddresses] =
    useState<Address[]>([]);

  const [orders, setOrders] =
    useState<RecentOrder[]>([]);

  const [form, setForm] =
    useState(emptyAddress);

  const [busy, setBusy] =
    useState(false);

  const [loadingAddresses, setLoadingAddresses] =
    useState(true);

  const [loadingOrders, setLoadingOrders] =
    useState(true);

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [showAddressForm, setShowAddressForm] =
    useState(false);

  const loadAddresses = useCallback(async () => {
    if (!user?.id) return;

    setLoadingAddresses(true);

    const { data, error } = await supabase
      .from("addresses")
      .select(
        "id,label,recipient_name,phone,city,district,details,is_default",
      )
      .eq("user_id", user.id)
      .order("is_default", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .returns<Address[]>();

    if (error) {
      console.error(
        "[Account] Failed to load addresses:",
        error,
      );
    }

    setAddresses(data ?? []);
    setLoadingAddresses(false);
  }, [user?.id]);

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;

    setLoadingOrders(true);

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,order_number,status,payment_status,total,created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(3)
      .returns<RecentOrder[]>();

    if (error) {
      console.error(
        "[Account] Failed to load orders:",
        error,
      );
    }

    setOrders(data ?? []);
    setLoadingOrders(false);
  }, [user?.id]);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  useEffect(() => {
    void loadAddresses();
    void loadOrders();
  }, [loadAddresses, loadOrders]);

  const roleLabel = useMemo(() => {
    switch (role) {
      case "admin":
        return "مدير";
      case "vendor":
        return "تاجر";
      case "courier":
        return "عامل توصيل";
      default:
        return "عميل";
    }
  }, [role]);

  const initials = useMemo(() => {
    const value =
      profile?.full_name?.trim() || "ت";

    const parts =
      value.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`;
    }

    return value.charAt(0);
  }, [profile?.full_name]);

  async function saveProfile(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (fullName.trim().length < 3) {
      toast.error("أدخل اسمًا صحيحًا");
      return;
    }

    setBusy(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
      })
      .eq("id", user!.id);

    setBusy(false);

    if (error) {
      toast.error(
        error.message || "تعذّر حفظ البيانات",
      );
      return;
    }

    toast.success("تم تحديث بياناتك");
    await refreshProfile();
    setEditingProfile(false);
  }

  async function addAddress(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (
      !form.recipient_name.trim() ||
      !form.city.trim() ||
      !form.details.trim()
    ) {
      toast.error("أكمل بيانات العنوان");
      return;
    }

    setBusy(true);

    const { error } = await supabase
      .from("addresses")
      .insert({
        user_id: user!.id,
        label: form.label.trim() || "العنوان",
        recipient_name:
          form.recipient_name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        details: form.details.trim(),
        is_default:
          addresses.length === 0,
      });

    setBusy(false);

    if (error) {
      toast.error(
        error.message || "تعذّر إضافة العنوان",
      );
      return;
    }

    toast.success("تمت إضافة العنوان");

    setForm(emptyAddress);
    setShowAddressForm(false);

    await loadAddresses();
  }

  async function removeAddress(id: string) {
    const confirmed = window.confirm(
      "هل تريد حذف هذا العنوان؟",
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);

    if (error) {
      toast.error("تعذّر حذف العنوان");
      return;
    }

    toast.success("تم حذف العنوان");
    await loadAddresses();
  }

  async function makeDefault(id: string) {
    if (!user?.id) return;

    setBusy(true);

    const first = await supabase
      .from("addresses")
      .update({
        is_default: false,
      })
      .eq("user_id", user.id);

    if (first.error) {
      setBusy(false);
      toast.error(
        first.error.message ||
          "تعذّر تحديث العنوان",
      );
      return;
    }

    const second = await supabase
      .from("addresses")
      .update({
        is_default: true,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    setBusy(false);

    if (second.error) {
      toast.error(
        second.error.message ||
          "تعذّر تعيين العنوان الافتراضي",
      );
      return;
    }

    toast.success(
      "تم تعيين العنوان الافتراضي",
    );

    await loadAddresses();
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      toast.error(
        "تعذّر تسجيل الخروج حالياً",
      );
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background pb-28 text-foreground md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 sm:py-6">
        {/* =====================================================
            بطاقة الحساب الرئيسية
            ===================================================== */}

        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-l from-primary/15 via-primary/5 to-transparent" />

          <div className="relative p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-sm">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-base font-bold text-foreground">
                    {profile?.full_name ||
                      "مرحباً بك"}
                  </h1>

                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                    {roleLabel}
                  </span>
                </div>

                <p
                  dir="ltr"
                  className="mt-1 truncate text-start text-[11px] text-muted-foreground"
                >
                  {profile?.phone ||
                    user?.email ||
                    "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingProfile(
                    (value) => !value,
                  )
                }
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label={
                  editingProfile
                    ? "إغلاق تعديل الحساب"
                    : "تعديل الحساب"
                }
              >
                {editingProfile ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Edit3 className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                to="/orders"
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 transition-colors hover:bg-secondary"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Package className="h-4 w-4" />
                </span>

                <span className="min-w-0">
                  <span className="block text-xs font-bold text-foreground">
                    طلباتي
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    متابعة الطلبات
                  </span>
                </span>

                <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>

              <Link
                to="/wallet"
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 transition-colors hover:bg-secondary"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Wallet className="h-4 w-4" />
                </span>

                <span className="min-w-0">
                  <span className="block text-xs font-bold text-foreground">
                    محفظتي
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                    {formatPrice(
                      profile?.wallet_balance ??
                        0,
                    )}
                  </span>
                </span>

                <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </section>

        {/* =====================================================
            تعديل البيانات الشخصية
            ===================================================== */}

        {editingProfile ? (
          <form
            onSubmit={saveProfile}
            className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-sm font-bold">
                  البيانات الشخصية
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  حدّث بيانات حسابك
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
                  الاسم
                </span>

                <input
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value,
                    )
                  }
                  placeholder="الاسم الكامل"
                  maxLength={100}
                  className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
                  رقم الهاتف
                </span>

                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value,
                    )
                  }
                  placeholder="رقم الهاتف"
                  dir="ltr"
                  maxLength={20}
                  className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="h-11 flex-1 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground transition-opacity disabled:opacity-60 hover:opacity-90"
              >
                {busy
                  ? "جارٍ الحفظ..."
                  : "حفظ التعديلات"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setEditingProfile(false)
                }
                className="h-11 rounded-xl border border-border bg-background px-4 text-xs font-bold text-foreground"
              >
                إلغاء
              </button>
            </div>
          </form>
        ) : null}

        {/* =====================================================
            رصيد المحفظة
            ===================================================== */}

        <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-sm font-bold">
                  رصيد المحفظة
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  استخدم رصيدك للدفع بسهولة
                </p>
              </div>
            </div>

            <Link
              to="/wallet"
              className="text-[10px] font-bold text-primary"
            >
              عرض المحفظة
            </Link>
          </div>

          <div className="mt-3 rounded-2xl bg-primary/5 px-4 py-4">
            <p className="text-[10px] text-muted-foreground">
              الرصيد الحالي
            </p>

            <p className="mt-1 text-xl font-black text-primary">
              {formatPrice(
                profile?.wallet_balance ??
                  0,
              )}
            </p>
          </div>
        </section>

        {/* =====================================================
            الطلبات الأخيرة
            ===================================================== */}

        <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">
                طلباتك الأخيرة
              </h2>

              <p className="mt-0.5 text-[10px] text-muted-foreground">
                آخر مشترياتك من تشكيلات
              </p>
            </div>

            <Link
              to="/orders"
              className="text-[10px] font-bold text-primary"
            >
              عرض الكل
            </Link>
          </div>

          {loadingOrders ? (
            <div className="mt-3 space-y-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-2xl bg-muted"
                />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-border p-5 text-center">
              <Package className="mx-auto h-6 w-6 text-muted-foreground" />

              <p className="mt-2 text-xs font-semibold text-foreground">
                لا توجد طلبات بعد
              </p>

              <Link
                to="/products"
                className="mt-2 inline-block text-[10px] font-bold text-primary"
              >
                ابدأ التسوق
              </Link>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  to="/orders"
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background p-3 transition-colors hover:bg-secondary"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
                    <Package className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      dir="ltr"
                      className="block truncate font-mono text-[11px] font-bold text-foreground"
                    >
                      {order.order_number}
                    </span>

                    <span className="mt-0.5 block text-[9px] text-muted-foreground">
                      {formatDate(
                        order.created_at,
                      )}
                    </span>
                  </span>

                  <span className="text-start">
                    <span className="block text-[10px] font-bold text-primary">
                      {formatPrice(
                        order.total,
                      )}
                    </span>

                    <span className="mt-0.5 block rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-bold text-primary">
               
