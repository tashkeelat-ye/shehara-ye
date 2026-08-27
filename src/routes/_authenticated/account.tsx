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
  Home,
  LogOut,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  Wallet,
  X,
  CheckCircle2,
  Clock3,
  Truck,
  Save,
  MapPinned,
  Phone,
  Mail,
  Settings2,
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
          "إدارة حسابك وطلباتك وعناوين التوصيل ومحفظتك في شهارة.",
      },
      {
        property: "og:title",
        content: "حسابي | شهارة",
      },
      {
        property: "og:description",
        content:
          "إدارة الحساب والطلبات والمحفظة وعناوين التوصيل في شهارة.",
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

  const loadAddresses = useCallback(
    async () => {
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
    },
    [user?.id],
  );

  const loadOrders = useCallback(
    async () => {
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
    },
    [user?.id],
  );

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
      profile?.full_name?.trim() ||
      "ش";

    const parts = value
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

  const getOrderStatusIcon = (
    status: string,
  ) => {
    switch (status) {
      case "delivered":
        return CheckCircle2;

      case "shipped":
        return Truck;

      case "processing":
      case "confirmed":
        return Package;

      default:
        return Clock3;
    }
  };

  const getOrderStatusClass = (
    status: string,
  ) => {
    switch (status) {
      case "delivered":
        return "bg-emerald-500/10 text-emerald-600";

      case "cancelled":
        return "bg-destructive/10 text-destructive";

      case "shipped":
        return "bg-[#0E4D64]/10 text-[#0E4D64]";

      case "processing":
      case "confirmed":
        return "bg-[#D65A31]/10 text-[#D65A31]";

      default:
        return "bg-muted text-muted-foreground";
    }
  };

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
      className="min-h-screen bg-[#FAF9F6] pb-28 text-foreground dark:bg-[#071B24] md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-6">

        {/* =========================
            PROFILE HERO
        ========================== */}

        <section className="relative overflow-hidden rounded-[2rem] bg-[#0E4D64] p-5 text-white shadow-[0_24px_60px_-35px_rgba(14,77,100,0.8)] sm:p-7">

          <div className="pointer-events-none absolute -end-20 -top-24 h-60 w-60 rounded-full border border-white/10" />

          <div className="pointer-events-none absolute -start-24 -bottom-28 h-72 w-72 rounded-full border border-[#D65A31]/20" />

          <div className="relative z-10">

            <div className="flex items-start gap-3">

              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.4rem] bg-white text-xl font-black text-[#0E4D64] shadow-xl">
                {initials}
              </div>

              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <h1 className="truncate text-lg font-black">
                    {profile?.full_name ||
                      "مرحباً بك"}
                  </h1>

                  <span className="rounded-full bg-[#D65A31] px-2.5 py-1 text-[9px] font-bold text-white">
                    {roleLabel}
                  </span>

                </div>

                <p className="mt-1 text-[10px] text-white/60">
                  أهلاً بك في شهارة
                </p>

                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/75">
                  <Mail className="h-3.5 w-3.5" />

                  <span
                    dir="ltr"
                    className="truncate"
                  >
                    {user?.email || "—"}
                  </span>
                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingProfile(
                    (value) => !value,
                  )
                }
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white backdrop-blur transition active:scale-90"
                aria-label="تعديل الحساب"
              >
                {editingProfile ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Edit3 className="h-4 w-4" />
                )}
              </button>

            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">

              <Link
                to="/orders"
                className="flex min-h-[68px] items-center gap-3 rounded-2xl bg-white/10 px-3 transition active:scale-[0.98]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                  <Package className="h-5 w-5" />
                </span>

                <span>
                  <span className="block text-xs font-black">
                    طلباتي
                  </span>

                  <span className="mt-1 block text-[9px] text-white/55">
                    متابعة الطلبات
                  </span>
                </span>
              </Link>

              <Link
                to="/wallet"
                className="flex min-h-[68px] items-center gap-3 rounded-2xl bg-[#D65A31] px-3 transition active:scale-[0.98]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                  <Wallet className="h-5 w-5" />
                </span>

                <span>
                  <span className="block text-xs font-black">
                    المحفظة
                  </span>

                  <span className="mt-1 block text-[9px] text-white/65">
                    إدارة رصيدك
                  </span>
                </span>
              </Link>

            </div>

          </div>
        </section>

        {/* =========================
            EDIT PROFILE
        ========================== */}

        {editingProfile ? (
          <section className="mt-4 rounded-[1.75rem] border border-[#0E4D64]/10 bg-white p-4 shadow-sm dark:bg-card">

            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                <User className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-sm font-black">
                  البيانات الشخصية
                </h2>

                <p className="text-[10px] text-muted-foreground">
                  حدّث بيانات حسابك
                </p>
              </div>
            </div>

            <form
              onSubmit={saveProfile}
              className="space-y-3"
            >

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">
                  الاسم الكامل
                </span>

                <div className="relative">
                  <User className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <input
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-border bg-background pe-10 ps-3 text-xs outline-none transition focus:border-[#0E4D64] focus:ring-2 focus:ring-[#0E4D64]/10"
                    placeholder="الاسم الكامل"
                    required
                    minLength={3}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">
                  رقم الهاتف
                </span>

                <div className="relative">
                  <Phone className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <input
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value,
                      )
                    }
                    dir="ltr"
                    className="h-11 w-full rounded-xl border border-border bg-background pe-10 ps-3 text-start text-xs outline-none transition focus:border-[#0E4D64] focus:ring-2 focus:ring-[#0E4D64]/10"
                    placeholder="7xxxxxxxx"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={busy}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0E4D64] text-xs font-black text-white transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
              >
                <Save className="h-4 w-4" />

                {busy
                  ? "جارٍ الحفظ..."
                  : "حفظ التغييرات"}
              </button>

            </form>
          </section>
        ) : null}

        {/* =========================
            QUICK ACTIONS
        ========================== */}

        <section className="mt-4">

          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black">
                الوصول السريع
              </h2>

              <p className="mt-0.5 text-[10px] text-muted-foreground">
                كل ما تحتاجه في مكان واحد
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">

            <Link
              to="/orders"
              className="group flex min-h-[88px] flex-col items-center justify-center rounded-2xl border border-border/70 bg-white px-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[#0E4D64]/20 active:scale-95 dark:bg-card"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                <Package className="h-4.5 w-4.5" />
              </span>

              <span className="mt-2 text-[9px] font-bold">
                الطلبات
              </span>
            </Link>

            <Link
              to="/wallet"
              className="group flex min-h-[88px] flex-col items-center justify-center rounded-2xl border border-border/70 bg-white px-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[#D65A31]/20 active:scale-95 dark:bg-card"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
                <Wallet className="h-4.5 w-4.5" />
              </span>

              <span className="mt-2 text-[9px] font-bold">
                المحفظة
              </span>
            </Link>

            <a
              href="#addresses"
              className="group flex min-h-[88px] flex-col items-center justify-center rounded-2xl border border-border/70 bg-white px-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[#0E4D64]/20 active:scale-95 dark:bg-card"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                <MapPin className="h-4.5 w-4.5" />
              </span>

              <span className="mt-2 text-[9px] font-bold">
                العناوين
              </span>
            </a>

            <a
              href="#notifications"
              className="group flex min-h-[88px] flex-col items-center justify-center rounded-2xl border border-border/70 bg-white px-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[#D65A31]/20 active:scale-95 dark:bg-card"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
                <Bell className="h-4.5 w-4.5" />
              </span>

              <span className="mt-2 text-[9px] font-bold">
                الإشعارات
              </span>
            </a>

          </div>
        </section>

        {/* =========================
            RECENT ORDERS
        ========================== */}

        <section className="mt-5">

          <div className="mb-3 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                <Package className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-sm font-black">
                  آخر الطلبات
                </h2>

                <p className="text-[10px] text-muted-foreground">
                  نظرة سريعة على طلباتك
                </p>
              </div>
            </div>

            <Link
              to="/orders"
              className="flex items-center gap-0.5 text-[10px] font-bold text-[#0E4D64]"
            >
              عرض الكل
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2">

            {loadingOrders
              ? Array.from({
                  length: 3,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl bg-muted"
                  />
                ))
              : orders.length > 0
                ? orders.map(
                    (order) => {
                      const StatusIcon =
                        getOrderStatusIcon(
                          order.status,
                        );

                      return (
                        <Link
                          key={order.id}
                          to="/orders"
                          className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] dark:bg-card"
                        >

                          <span
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${getOrderStatusClass(order.status)}`}
                          >
                            <StatusIcon className="h-4 w-4" />
                          </span>

                          <span className="min-w-0 flex-1">

                            <span className="flex items-center gap-2">
                              <span className="truncate text-xs font-black">
                                طلب #
                                {order.order_number}
                              </span>

                              <span
                                className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${getOrderStatusClass(order.status)}`}
                              >
                                {getOrderStatusLabel(
                                  order.status,
                                )}
                              </span>
                            </span>

                            <span className="mt-1 block text-[9px] text-muted-foreground">
                              {formatDate(
                                order.created_at,
                              )}
                            </span>

                          </span>

                          <span className="shrink-0 text-start">
                            <span className="block text-xs font-black text-[#0E4D64]">
                              {formatPrice(
                                order.total,
                              )}
                            </span>

                            <span className="mt-1 block text-[8px] text-muted-foreground">
                              {getPaymentStatusLabel(
                                order.payment_status,
                              )}
                            </span>
                          </span>

                          <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />

                        </Link>
                      );
                    },
                  )
                : (
                  <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-10 text-center dark:bg-card">
                    <Package className="mx-auto h-8 w-8 text-muted-foreground/40" />

                    <p className="mt-3 text-xs font-bold">
                      لا توجد طلبات حتى الآن
                    </p>

                    <p className="mt-1 text-[10px] text-muted-foreground">
                      ابدأ التسوق من شهارة الآن
                    </p>

                    <Link
                      to="/products"
                      className="mt-4 inline-flex rounded-xl bg-[#0E4D64] px-4 py-2.5 text-[10px] font-bold text-white"
                    >
                      اكتشف المنتجات
                    </Link>
                  </div>
                )}

          </div>
        </section>

        {/* =========================
            ADDRESSES
        ========================== */}

        <section
          id="addresses"
          className="mt-5 scroll-mt-20"
        >

          <div className="mb-3 flex items-end justify-between">

            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                <MapPinned className="h-4 w-4" />
              </span>

              <div>
                <h2 className="text-sm font-black">
                  عناوين التوصيل
                </h2>

                <p className="text-[10px] text-muted-foreground">
                  اختر مكان استلام طلباتك
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
              className="flex h-9 items-center gap-1.5 rounded-xl bg-[#D65A31] px-3 text-[10px] font-black text-white transition active:scale-95"
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
              className="mb-3 rounded-3xl border border-[#D65A31]/15 bg-white p-4 shadow-sm dark:bg-card"
            >

              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
                  <Plus className="h-4 w-4" />
                </span>

                <div>
                  <h3 className="text-xs font-black">
                    عنوان جديد
                  </h3>

                  <p className="text-[9px] text-muted-foreground">
                    أدخل بيانات التوصيل بدقة
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">

                <label className="col-span-2">
                  <span className="mb-1 block text-[9px] font-bold text-muted-foreground">
                    اسم العنوان
                  </span>

                  <input
                    value={form.label}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          label:
                            event.target.value,
                        }),
                      )
                    }
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-[#0E4D64]"
                    placeholder="المنزل"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[9px] font-bold text-muted-foreground">
                    اسم المستلم
                  </span>

                  <input
                    value={
                      form.recipient_name
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          recipient_name:
                            event.target.value,
                        }),
                      )
                    }
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-[#0E4D64]"
                    placeholder="الاسم الكامل"
                    required
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[9px] font-bold text-muted-foreground">
                    الهاتف
                  </span>

                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          phone:
                            event.target.value,
                        }),
                      )
                    }
                    dir="ltr"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-start text-xs outline-none focus:border-[#0E4D64]"
                    placeholder="7xxxxxxxx"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[9px] font-bold text-muted-foreground">
                    المحافظة / المدينة
                  </span>

                  <input
                    value={form.city}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          city:
                            event.target.value,
                        }),
                      )
                    }
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-[#0E4D64]"
                    placeholder="إب"
                    required
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[9px] font-bold text-muted-foreground">
                    المنطقة
                  </span>

                  <input
                    value={form.district}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          district:
                            event.target.value,
                        }),
                      )
                    }
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-[#0E4D64]"
                    placeholder="الحي / المنطقة"
                  />
                </label>

                <label className="col-span-2">
                  <span className="mb-1 block text-[9px] font-bold text-muted-foreground">
                    تفاصيل العنوان
                  </span>

                  <textarea
                    value={form.details}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          details:
                            event.target.value,
                        }),
                      )
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-[#0E4D64]"
                    placeholder="اسم الشارع، جوار، معلم قريب..."
                    required
                  />
                </label>

              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0E4D64] text-xs font-black text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                <Save className="h-4 w-4" />

                {busy
                  ? "جارٍ الحفظ..."
                  : "حفظ العنوان"}
              </button>

            </form>
          ) : null}

          <div className="space-y-2">

            {loadingAddresses
              ? Array.from({
                  length: 2,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl bg-muted"
                  />
                ))
              : addresses.length > 0
                ? addresses.map(
                    (address) => (
                      <article
                        key={address.id}
                        className={`relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm dark:bg-card ${
                          address.is_default
                            ? "border-[#0E4D64]/25"
                            : "border-border/70"
                        }`}
                      >

                        {address.is_default ? (
                          <div className="absolute inset-x-0 top-0 h-1 bg-[#D65A31]" />
                        ) : null}

                        <div className="flex items-start gap-3">

                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                            {address.label
                              .toLowerCase()
                              .includes(
                                "عمل",
                              ) ? (
                              <Settings2 className="h-4 w-4" />
                            ) : (
                              <Home className="h-4 w-4" />
                            )}
                          </span>

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="text-xs font-black">
                                {address.label ||
                                  "العنوان"}
                              </h3>

                              {address.is_default ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#D65A31]/10 px-2 py-0.5 text-[8px] font-bold text-[#D65A31]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  افتراضي
                                </span>
                              ) : null}

                            </div>

                            <p className="mt-1 text-[10px] font-semibold">
                              {address.recipient_name}
                            </p>

                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-muted-foreground">

                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {address.city}
                                {address.district
                                  ? ` - ${address.district}`
                                  : ""}
                              </span>

                              {address.phone ? (
                                <span
                                  dir="ltr"
                                  className="flex items-center gap-1"
                                >
                                  <Phone className="h-3 w-3" />
                                  {address.phone}
                                </span>
                              ) : null}

                            </div>

                            <p className="mt-1.5 line-clamp-2 text-[9px] leading-5 text-muted-foreground">
                              {address.details}
                            </p>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void removeAddress(
                                address.id,
                              )
                            }
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-90"
                            aria-label="حذف العنوان"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                        </div>

                        {!address.is_default ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void makeDefault(
                                address.id,
                              )
                            }
                            className="mt-3 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#0E4D64]/15 bg-[#0E4D64]/5 text-[9px] font-bold text-[#0E4D64] transition active:scale-[0.99] disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            تعيين كعنوان افتراضي
                          </button>
                        ) : null}

                      </article>
                    ),
                  )
                : (
                  <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-10 text-center dark:bg-card">
                    <MapPin className="mx-auto h-8 w-8 text-muted-foreground/40" />

                    <p className="mt-3 text-xs font-bold">
                      لا توجد عناوين محفوظة
                    </p>

                    <p className="mt-1 text-[10px] text-muted-foreground">
                      أضف عنوانك لتسهيل إتمام الطلبات
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setShowAddressForm(
                          true,
                        )
                      }
                      className="mt-4 rounded-xl bg-[#D65A31] px-4 py-2.5 text-[10px] font-bold text-white"
                    >
                      إضافة عنوان
                    </button>
                  </div>
                )}

          </div>
        </section>

        {/* =========================
            NOTIFICATIONS
        ========================== */}

        <section
          id="notifications"
          className="mt-5 scroll-mt-20"
        >

          <NotificationPrefsPanel />

        </section>

        {/* =========================
            ACCOUNT SETTINGS
        ========================== */}

        <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-border/70 bg-white shadow-sm dark:bg-card">

          <div className="flex items-center gap-3 border-b border-border/60 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
              <ShieldCheck className="h-5 w-5" />
            </span>

            <div>
              <h2 className="text-sm font-black">
                الحساب والأمان
              </h2>

              <p className="text-[10px] text-muted-foreground">
                معلومات حسابك وإعداداته
              </p>
            </div>
          </div>

          <div className="divide-y divide-border/60">

            <div className="flex items-center gap-3 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground">
                  البريد الإلكتروني
                </p>

                <p
                  dir="ltr"
                  className="mt-1 truncate text-start text-xs font-bold"
                >
                  {user?.email || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground">
                  رقم الهاتف
                </p>

                <p
                  dir="ltr"
                  className="mt-1 text-start text-xs font-bold"
                >
                  {profile?.phone || "غير مضاف"}
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* =========================
            LOGOUT
        ========================== */}

        <button
          type="button"
          onClick={() =>
            void handleSignOut()
          }
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/15 bg-white text-xs font-black text-destructive shadow-sm transition hover:bg-destructive/5 active:scale-[0.99] dark:bg-card"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>

        <div className="pb-3 pt-2 text-center">
          <p className="text-[9px] font-bold text-muted-foreground">
            شهارة
          </p>

          <p className="mt-0.5 text-[8px] text-muted-foreground/70">
            تسوق بلا حدود
          </p>
        </div>

      </main>

      <BottomNav />
    </div>
  );
}
