import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  Bell,
  ChevronLeft,
  Edit3,
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
import { NotificationPrefsPanel } from "@/components/notification-prefs";
import { useFormatPrice } from "@/lib/currency-context";
import {
  PAYMENT_STATUS_LABELS,
  formatDate,
} from "@/lib/store";

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

export const Route = createFileRoute(
  "/_authenticated/account",
)({
  head: () => ({
    meta: [
      {
        title: "حسابي | شهارة",
      },
      {
        name: "description",
        content:
          "إدارة حسابك وطلباتك ومحفظتك وعناوين التوصيل في شهارة.",
      },
      {
        property: "og:title",
        content: "حسابي | شهارة",
      },
      {
        property: "og:description",
        content:
          "إدارة الحساب والطلبات والمحفظة في متجر شهارة.",
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

  const [busy, setBusy] = useState(false);

  const [loadingAddresses, setLoadingAddresses] =
    useState(true);

  const [loadingOrders, setLoadingOrders] =
    useState(true);

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [showAddressForm, setShowAddressForm] =
    useState(false);

  const loadAddresses =
    useCallback(async () => {
      if (!user?.id) {
        setLoadingAddresses(false);
        return;
      }

      setLoadingAddresses(true);

      const { data, error } =
        await supabase
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

        toast.error(
          "تعذر تحميل عناوين التوصيل",
        );
      }

      setAddresses(data ?? []);
      setLoadingAddresses(false);
    }, [user?.id]);

  const loadOrders =
    useCallback(async () => {
      if (!user?.id) {
        setLoadingOrders(false);
        return;
      }

      setLoadingOrders(true);

      const { data, error } =
        await supabase
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

        toast.error(
          "تعذر تحميل الطلبات",
        );
      }

      setOrders(data ?? []);
      setLoadingOrders(false);
    }, [user?.id]);

  useEffect(() => {
    setFullName(
      profile?.full_name ?? "",
    );

    setPhone(
      profile?.phone ?? "",
    );
  }, [profile]);

  useEffect(() => {
    void loadAddresses();
    void loadOrders();
  }, [
    loadAddresses,
    loadOrders,
  ]);

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
      value
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`;
    }

    return value.charAt(0);
  }, [profile?.full_name]);

  const getOrderStatusLabel =
    useCallback(
      (status: string) =>
        STATUS_LABELS[status] ??
        status ??
        "غير معروف",
      [],
    );

  const getPaymentStatusLabel =
    useCallback(
      (status: string) =>
        PAYMENT_STATUS_LABELS[
          status as keyof typeof PAYMENT_STATUS_LABELS
        ] ??
        status ??
        "غير معروف",
      [],
    );

  async function saveProfile(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!user?.id) {
      toast.error(
        "يجب تسجيل الدخول أولاً",
      );
      return;
    }

    if (
      fullName.trim().length < 3
    ) {
      toast.error(
        "أدخل اسماً صحيحاً",
      );
      return;
    }

    setBusy(true);

    try {
      const { error } =
        await supabase
          .from("profiles")
          .update({
            full_name:
              fullName.trim(),
            phone:
              phone.trim(),
          })
          .eq("id", user.id);

      if (error) {
        throw error;
      }

      await refreshProfile();

      toast.success(
        "تم تحديث بياناتك بنجاح",
      );

      setEditingProfile(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حفظ البيانات",
      );
    } finally {
      setBusy(false);
    }
  }

  async function addAddress(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!user?.id) {
      toast.error(
        "يجب تسجيل الدخول أولاً",
      );
      return;
    }

    if (
      !form.recipient_name.trim() ||
      !form.city.trim() ||
      !form.details.trim()
    ) {
      toast.error(
        "أكمل بيانات العنوان المطلوبة",
      );
      return;
    }

    setBusy(true);

    try {
      const { error } =
        await supabase
          .from("addresses")
          .insert({
            user_id: user.id,
            label:
              form.label.trim() ||
              "العنوان",
            recipient_name:
              form.recipient_name.trim(),
            phone:
              form.phone.trim(),
            city:
              form.city.trim(),
            district:
              form.district.trim(),
            details:
              form.details.trim(),
            is_default:
              addresses.length === 0,
          });

      if (error) {
        throw error;
      }

      toast.success(
        "تمت إضافة العنوان بنجاح",
      );

      setForm({
        ...emptyAddress,
      });

      setShowAddressForm(false);

      await loadAddresses();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر إضافة العنوان",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeAddress(
    id: string,
  ) {
    if (!user?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        "هل تريد حذف هذا العنوان؟",
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await supabase
        .from("addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

    if (error) {
      toast.error(
        error.message ||
          "تعذر حذف العنوان",
      );
      return;
    }

    toast.success(
      "تم حذف العنوان",
    );

    await loadAddresses();
  }

  async function makeDefault(
    id: string,
  ) {
    if (!user?.id) {
      return;
    }

    setBusy(true);

    try {
      const first =
        await supabase
          .from("addresses")
          .update({
            is_default: false,
          })
          .eq("user_id", user.id);

      if (first.error) {
        throw first.error;
      }

      const second =
        await supabase
          .from("addresses")
          .update({
            is_default: true,
          })
          .eq("id", id)
          .eq("user_id", user.id);

      if (second.error) {
        throw second.error;
      }

      toast.success(
        "تم تعيين العنوان الافتراضي",
      );

      await loadAddresses();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تحديث العنوان",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      toast.error(
        "تعذر تسجيل الخروج حالياً",
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

        {/* بطاقة الحساب */}

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

        {/* تعديل الحساب */}

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

        {/* المحفظة */}

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

        {/* الطلبات */}

        <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm">

          <div className="flex items-center justify-between gap-3">

            <div>
              <h2 className="text-sm font-bold">
                طلباتك الأخيرة
              </h2>

              <p className="mt-0.5 text-[10px] text-muted-foreground">
                آخر مشترياتك من شهارة
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
                  className="block rounded-2xl border border-border/70 bg-background p-3 transition-colors hover:bg-secondary"
                >

                  <div className="flex items-center gap-3">

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

                      <span className="mt-1 block text-[8px] font-bold text-muted-foreground">
                        {getOrderStatusLabel(
                          order.status,
                        )}
                      </span>

                    </span>

                    <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />

                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">

                    <span className="rounded-full bg-primary/10 px-2 py-1 text-[8px] font-bold text-primary">
                      {getOrderStatusLabel(
                        order.status,
                      )}
                    </span>

                    <span className="rounded-full bg-secondary px-2 py-1 text-[8px] font-bold text-muted-foreground">
                      {getPaymentStatusLabel(
                        order.payment_status,
                      )}
                    </span>

                  </div>

                </Link>
              ))}

            </div>
          )}

        </section>

        {/* العناوين */}

        <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm">

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-sm font-bold">
                  عناوين التوصيل
                </h2>

                <p className="text-[10px] text-muted-foreground">
                  إدارة عناوين استلام طلباتك
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
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-[10px] font-bold text-primary-foreground"
            >
              {showAddressForm ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}

              {showAddressForm
                ? "إغلاق"
                : "إضافة عنوان"}
            </button>

          </div>

          {showAddressForm ? (
            <form
              onSubmit={addAddress}
              className="mt-4 grid gap-3 rounded-2xl border border-border/70 bg-background p-3 sm:grid-cols-2"
            >

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-muted-foreground">
                  اسم العنوان
                </span>

                <input
                  value={form.label}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      label:
                        event.target.value,
                    }))
                  }
                  placeholder="المنزل"
                  maxLength={50}
                  className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-muted-foreground">
                  اسم المستلم *
                </span>

                <input
                  value={
                    form.recipient_name
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recipient_name:
                        event.target.value,
                    }))
                  }
                  placeholder="الاسم الكامل"
                  maxLength={100}
                  className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-muted-foreground">
                  رقم الهاتف
                </span>

                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone:
                        event.target.value,
                    }))
                  }
                  placeholder="رقم الهاتف"
                  dir="ltr"
                  maxLength={20}
                  className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-muted-foreground">
                  المدينة *
                </span>

                <input
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city:
                        event.target.value,
                    }))
                  }
                  placeholder="المدينة"
                  maxLength={100}
                  className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-muted-foreground">
                  الحي
                </span>

                <input
                  value={form.district}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      district:
                        event.target.value,
                    }))
                  }
                  placeholder="الحي / المنطقة"
                  maxLength={100}
                  className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[10px] font-semibold text-muted-foreground">
                  تفاصيل العنوان *
                </span>

                <textarea
                  value={form.details}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      details:
                        event.target.value,
                    }))
                  }
                  placeholder="الشارع، رقم المنزل، معلم قريب..."
                  rows={3}
                  maxLength={500}
                  className="w-full resize-none rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </label>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground disabled:opacity-60"
                >
                  {busy
                    ? "جارٍ الحفظ..."
                    : "حفظ العنوان"}
                </button>
              </div>

            </form>
          ) : null}

          {loadingAddresses ? (
            <div className="mt-3 space-y-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-2xl bg-muted"
                />
              ))}
            </div>
          ) : addresses.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-border p-5 text-center">

              <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />

              <p className="mt-2 text-xs font-semibold">
                لا توجد عناوين محفوظة
              </p>

              <p className="mt-1 text-[10px] text-muted-foreground">
                أضف عنوانك لتسهيل عملية الطلب
              </p>

            </div>
          ) : (
            <div className="mt-3 space-y-2">

              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="rounded-2xl border border-border/70 bg-background p-3"
                >

                  <div className="flex items-start gap-3">

                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <MapPin className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="text-xs font-bold">
                          {address.label}
                        </h3>

                        {address.is_default ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-bold text-primary">
                            الافتراضي
                          </span>
                        ) : null}

                      </div>

                      <p className="mt-1 text-[10px] font-semibold">
                        {address.recipient_name}
                      </p>

                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {address.city}
                        {address.district
                          ? ` — ${address.district}`
                          : ""}
                      </p>

                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {address.details}
                      </p>

                      {address.phone ? (
                        <p
                          dir="ltr"
                          className="mt-0.5 text-start text-[10px] text-muted-foreground"
                        >
                          {address.phone}
                        </p>
                      ) : null}

                    </div>

                  </div>

                  <div className="mt-3 flex gap-2 border-t border-border/60 pt-2">

                    {!address.is_default ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void makeDefault(
                            address.id,
                          )
                        }
                        className="flex-1 rounded-xl border border-border bg-background py-2 text-[9px] font-bold text-foreground disabled:opacity-50"
                      >
                        تعيين كافتراضي
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() =>
                        void removeAddress(
                          address.id,
                        )
                      }
                      className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-[9px] font-bold text-destructive"
                    >
                      حذف
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* الإشعارات */}

        <NotificationPrefsPanel />

        {/* روابط الحساب */}

        <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm">

          <div className="space-y-2">

            <Link
              to="/orders"
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 transition-colors hover:bg-secondary"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
              </span>

              <span className="flex-1">
                <span className="block text-xs font-bold">
                  جميع طلباتي
                </span>
                <span className="mt-0.5 block text-[9px] text-muted-foreground">
                  متابعة جميع الطلبات السابقة والحالية
                </span>
              </span>

              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              to="/wallet"
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 transition-colors hover:bg-secondary"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </span>

              <span className="flex-1">
                <span className="block text-xs font-bold">
                  المحفظة
                </span>
                <span className="mt-0.5 block text-[9px] text-muted-foreground">
                  شحن الرصيد وطلبات الاسترداد وكشف الحساب
                </span>
              </span>

              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </Link>

            <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3">

              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </span>

              <span className="flex-1">
                <span className="block text-xs font-bold">
                  حسابك محمي
                </span>

                <span className="mt-0.5 block text-[9px] text-muted-foreground">
                  بيانات الحساب محمية بواسطة نظام المصادقة
                </span>
              </span>

            </div>

          </div>
        </section>

        {/* تسجيل الخروج */}

        <button
          type="button"
          onClick={() =>
            void handleSignOut()
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>

      </main>

      <BottomNav />
    </div>
  );
}
