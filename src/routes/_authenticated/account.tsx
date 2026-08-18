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
import { useFormatPrice } from "@/lib/currency-context";
import { formatDate } from "@/lib/store";

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

const STATUS_CLASSES: Record<string, string> = {
  pending:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  awaiting_payment:
    "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  confirmed:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  processing:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  shipped:
    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  delivered:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled:
    "bg-red-500/10 text-red-600 dark:text-red-400",
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
        content:
          "إدارة حسابك وطلباتك ومحفظتك وعناوين التوصيل في تشكيلات.",
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

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<RecentOrder[]>([]);

  const [form, setForm] = useState(emptyAddress);

  const [busy, setBusy] = useState(false);
  const [loadingAddresses, setLoadingAddresses] =
    useState(true);
  const [loadingOrders, setLoadingOrders] =
    useState(true);

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [showAddressForm, setShowAddressForm] =
    useState(false);

  const loadAddresses = useCallback(async () => {
    if (!user?.id) {
      setLoadingAddresses(false);
      return;
    }

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
    if (!user?.id) {
      setLoadingOrders(false);
      return;
    }

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
      profile?.full_name?.trim() || "تشكيلات";

    const parts = value
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`;
    }

    return value.charAt(0);
  }, [profile?.full_name]);

  async function saveProfile(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!user?.id) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

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
      .eq("id", user.id);

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

    if (!user?.id) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

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
        user_id: user.id,
        label:
          form.label.trim() || "العنوان",
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
    if (!user?.id) return;

    const confirmed = window.confirm(
      "هل تريد حذف هذا العنوان؟",
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast.error(
        error.message || "تعذّر حذف العنوان",
      );
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

  const defaultAddress =
    addresses.find(
      (address) => address.is_default,
    ) ?? addresses[0];

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

        <section className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-l from-primary/15 via-primary/5 to-transparent" />

          <div className="relative p-4 sm:p-5">

            <div className="flex items-center gap-3">

              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-primary text-lg font-black text-primary-foreground shadow-sm">
                {initials}
              </div>

              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <h1 className="truncate text-base font-bold">
                    {profile?.full_name ||
                      "مرحباً بك"}
                  </h1>

                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-bold text-primary">
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

            {/* الاختصارات الرئيسية */}

            <div className="mt-5 grid grid-cols-2 gap-2">

              <Link
                to="/orders"
                className="group flex min-h-[68px] items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 transition-colors hover:bg-secondary"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Package className="h-4 w-4" />
                </span>

                <span className="min-w-0">
                  <span className="block text-xs font-bold">
                    طلباتي
                  </span>

                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    متابعة الطلبات
                  </span>
                </span>

                <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
              </Link>

              <Link
                to="/wallet"
                className="group flex min-h-[68px] items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 transition-colors hover:bg-secondary"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Wallet className="h-4 w-4" />
                </span>

                <span className="min-w-0">
                  <span className="block text-xs font-bold">
                    محفظتي
                  </span>

                  <span className="mt-1 block truncate text-[10px] text-muted-foreground">
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
            تعديل البيانات
            ===================================================== */}

        {editingProfile ? (
          <form
            onSubmit={saveProfile}
            className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-3">

              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-sm font-bold">
                  البيانات الشخصية
                </h2>

                <p className="mt-0.5 text-[10px] text-muted-foreground">
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
                  className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                  className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </label>

            </div>

            <div className="mt-3 flex gap-2">

              <button
                type="submit"
                disabled={busy}
                className="h-11 flex-1 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
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
                className="h-11 rounded-xl border border-border bg-background px-4 text-xs font-bold"
              >
                إلغاء
              </button>

            </div>
          </form>
        ) : null}

        {/* =====================================================
            المحفظة
            ===================================================== */}

        <section className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm">

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-3">

              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-sm font-bold">
                  محفظتي
                </h2>

                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  رصيدك المتاح للدفع
                </p>
              </div>

            </div>

            <Link
              to="/wallet"
              className="flex items-center gap-1 text-[10px] font-bold text-primary"
            >
              التفاصيل
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>

          </div>

          <div className="mt-3 rounded-2xl bg-primary/5 px-4 py-4">

            <p className="text-[10px] text-muted-foreground">
              الرصيد الحالي
            </p>

            <p className="mt-1 text-2xl font-black text-primary">
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

        <section className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm">

          <div className="flex items-center justify-between gap-3">

            <div>
              <h2 className="text-sm font-bold">
                طلباتي
              </h2>

              <p className="mt-0.5 text-[10px] text-muted-foreground">
                آخر مشترياتك من تشكيلات
              </p>
            </div>

            <Link
              to="/orders"
              className="flex items-center gap-1 text-[10px] font-bold text-primary"
            >
              عرض الكل
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>

          </div>

          {loadingOrders ? (
            <div className="mt-3 space-y-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[68px] animate-pulse rounded-2xl bg-muted"
                />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center">

              <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-secondary text-muted-foreground">
                <Package className="h-5 w-5" />
              </span>

              <p className="mt-3 text-xs font-bold">
                لا توجد طلبات بعد
              </p>

              <p className="mt-1 text-[10px] text-muted-foreground">
                ابدأ أول تجربة شراء من تشكيلات
              </p>

              <Link
                to="/products"
                className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-[10px] font-bold text-primary-foreground"
              >
                ابدأ التسوق
              </Link>

            </div>
          ) : (
            <div className="mt-3 space-y-2">

              {orders.map((order) => {

                const statusText =
                  STATUS_LABELS[
                    order.status
                  ] ?? order.status;

                const statusClass =
                  STATUS_CLASSES[
                    order.status
                  ] ??
                  "bg-secondary text-muted-foreground";

                return (
                  <Link
                    key={order.id}
                    to="/orders"
                    className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-background p-3 transition-colors hover:bg-secondary"
                  >

                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
                      <Package className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">

                      <span
                        dir="ltr"
                        className="block truncate font-mono text-[11px] font-bold"
                      >
                        {order.order_number}
                      </span>

                      <span className="mt-1 block text-[9px] text-muted-foreground">
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

                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[8px] font-bold ${statusClass}`}
                      >
                        {statusText}
                      </span>

                    </span>

                    <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />

                  </Link>
                );
              })}

            </div>
          )}

        </section>

        {/* =====================================================
            العنوان الافتراضي
            ===================================================== */}

        <section className="rounded-[28px] border border-border/70 bg-card p-4 shadow-sm">

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-3">

              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-sm font-bold">
                  عنوان التوصيل
                </h2>

                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  عنوانك المستخدم للتوصيل
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowAddressForm(
                  (value) => !value,
                )
              }
              className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"
              aria-label="إضافة عنوان"
            >
              {showAddressForm ? (
                <X className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>

          </div>

          {loadingAddresses ? (
            <div className="mt-3 h-24 animate-pulse rounded-2xl bg-muted" />
          ) : defaultAddress ? (
            <div className="mt-3 rounded-2xl border border-border/70 bg-background p-3">

              <div className="flex items-start gap-3">

                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
                  <Home className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">

                  <div className="flex flex-wrap items-center gap-2">

                    <p className="text-xs font-bold">
                      {defaultAddress.label ||
                        "العنوان"}
                    </p>

                    {defaultAddress.is_default ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold text-emerald-600 dark:text-emerald-400">
                        افتراضي
                      </span>
                    ) : null}

                  </div>

                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {defaultAddress.recipient_name}
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                    {defaultAddress.city}
                    {defaultAddress.district
                      ? ` - ${defaultAddress.district}`
                      : ""}
                    {" - "}
                    {defaultAddress.details}
                  </p>

                </div>

              </div>

              <div className="mt-3 flex gap-2">

                {!defaultAddress.is_default ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void makeDefault(
                        defaultAddress.id,
                      )
                    }
                    className="flex-1 rounded-xl border border-border px-3 py-2 text-[9px] font-bold"
                  >
                    تعيين كافتراضي
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    void removeAddress(
                      defaultAddress.id,
                    )
                  }
                  className="rounded-xl border border-red-500/20 px-3 py-2 text-[9px] font-bold text-red-600 dark:text-red-400"
                >
                  حذف
                </button>

              </div>

            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-border p-5 text-center">

              <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />

              <p className="mt-2 text-xs font-bold">
                لم تضف عنواناً بعد
              </p>

              <p className="mt-1 text-[10px] text-muted-foreground">
                أضف عنواناً لتسهيل عملية الشراء
              </p>

            </div>
          )}

          {/* نموذج إضافة العنوان */}

          {showAddressForm ? (
            <form
              onSubmit={addAddress}
              className="mt-3 rounded-2xl border border-border/70 bg-background p-3"
            >

              <div className="mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold">
                  إضافة عنوان جديد
                </h3>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">

                <input
                  value={form.label}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      label:
                        event.target.value,
                    }))
                  }
                  placeholder="اسم العنوان: المنزل"
                  className="h-10 rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
                />

                <input
                  value={form.recipient_name}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      recipient_name:
                        event.target.value,
                    }))
                  }
                  placeholder="اسم المستلم"
                  className="h-10 rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
                />

                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      phone:
                        event.target.value,
                    }))
                  }
                  placeholder="رقم الهاتف"
                  dir="ltr"
                  className="h-10 rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
                />

                <input
                  value={form.city}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      city:
                        event.target.value,
                    }))
                  }
                  placeholder="المحافظة / المدينة"
                  className="h-10 rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
                />

                <input
                  value={form.district}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      district:
                        event.target.value,
                    }))
                  }
                  placeholder="المديرية / الحي"
                  className="h-10 rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
                />

                <input
                  value={form.details}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      details:
                        event.target.value,
                    }))
                  }
                  placeholder="تفاصيل العنوان"
                  className="h-10 rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary sm:col-span-2"
                />

              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-3 h-10 w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                {busy
                  ? "جارٍ الحفظ..."
                  : "حفظ العنوان"}
              </button>

            </form>
          ) : null}

          {/* باقي العناوين */}

          {addresses.length > 1 ? (
            <div className="mt-3 border-t border-border pt-3">

              <p className="mb-2 text-[10px] font-bold text-muted-foreground">
                عناوينك الأخرى
              </p>

              <div className="space-y-2">

                {addresses
                  .filter(
                    (address) =>
                      address.id !==
                      defaultAddress?.id,
                  )
                  .map((address) => (
                    <div
                      key={address.id}
                      className="flex items-center gap-2 rounded-xl border border-border/70 bg-background p-2.5"
                    >

                      <Home className="h-4 w-4 shrink-0 text-muted-foreground" />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-bold">
                          {address.label}
                        </p>

                        <p className="truncate text-[9px] text-muted-foreground">
                          {address.city} -{" "}
                          {address.details}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void makeDefault(
                            address.id,
                          )
                        }
                        className="shrink-0 text-[8px] font-bold text-primary"
                      >
                        استخدام
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void removeAddress(
                            address.id,
                          )
                        }
                        className="shrink-0 text-[8px] font-bold text-red-500"
                      >
                        حذف
                      </button>

                    </div>
                  ))}

              </div>

            </div>
          ) : null}

        </section>

        {/* =====================================================
            إعدادات الحساب
            ===================================================== */}

        <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-sm">

          <div className="border-b border-border/70 px-4 py-3">
            <h2 className="text-sm font-bold">
              الحساب والإعدادات
            </h2>
          </div>

          <div className="divide-y divide-border/70">

            <Link
              to="/wallet"
              className="flex min-h-14 items-center gap-3 px-4 transition-colors hover:bg-secondary"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <CreditCard className="h-4 w-4" />
              </span>

              <span className="flex-1">
                <span className="block text-xs font-bold">
                  المحفظة والدفع
                </span>

                <span className="mt-0.5 block text-[9px] text-muted-foreground">
                  إدارة الرصيد والمعاملات
                </span>
              </span>

              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </Link>

            <div className="flex min-h-14 items-center gap-3 px-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Bell className="h-4 w-4" />
              </span>

              <span className="flex-1">
                <span className="block text-xs font-bold">
                  الإشعارات
                </span>

                <span className="mt-0.5 block text-[9px] text-muted-foreground">
                  إعدادات إشعارات الحساب
                </span>
              </span>

              <NotificationPrefsPanel />
            </div>

            <div className="flex min-h-14 items-center gap-3 px-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </span>

              <span className="flex-1">
                <span className="block text-xs font-bold">
                  أمان الحساب
                </span>

                <span className="mt-0.5 block text-[9px] text-muted-foreground">
                  حسابك محمي وبياناتك خاصة
                </span>
              </span>

              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>

          </div>
        </section>

        {/* =====================================================
            تسجيل الخروج
            ===================================================== */}

        <button
          type="button"
          onClick={() =>
            void handleSignOut()
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-500/15 bg-red-500/5 text-xs font-bold text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>

        <div className="pb-2 text-center">
          <p className="text-[9px] text-muted-foreground">
            تشكيلات للتسوق
          </p>
        </div>

      </main>

      <BottomNav />
    </div>
  );
}
