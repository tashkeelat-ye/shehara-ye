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
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Edit3,
  Home,
  LogOut,
  Mail,
  MapPin,
  MapPinned,
  Package,
  Phone,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  User,
  Wallet,
  X,
  CreditCard,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { BrandLogo } from "@/components/brand-logo";
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

  const walletBalance =
    Number(profile?.wallet_balance ?? 0);

  const maskedCardNumber = useMemo(() => {
    const fallback = "4567";

    if (!user?.id) {
      return `**** 4567 8912 ****`;
    }

    const clean = user.id.replace(
      /[^a-zA-Z0-9]/g,
      "",
    );

    const lastFour =
      clean.slice(-4) || fallback;

    return `**** 4567 8912 ${lastFour} ****`;
  }, [user?.id]);

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
        return ArrowLeft;

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
        return "bg-red-500/10 text-red-600";

      case "shipped":
        return "bg-[#0E4D64]/10 text-[#0E4D64]";

      case "processing":
      case "confirmed":
        return "bg-[#D65A31]/10 text-[#D65A31]";

      default:
        return "bg-slate-100 text-slate-500";
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
      className="min-h-screen bg-[#FAF9F6] pb-28 text-[#0E4D64] md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-7">

        {/* =====================================
            PAGE INTRO
        ====================================== */}

        <div className="mb-4 flex items-center justify-between">

          <div>
            <p className="text-[9px] font-bold tracking-wide text-[#D65A31]">
              SHEHARA
            </p>

            <h1 className="mt-1 text-xl font-black tracking-tight text-[#0E4D64]">
              حسابي
            </h1>

            <p className="mt-1 text-[9px] text-slate-500">
              كل ما يخص حسابك في مكان واحد
            </p>
          </div>

          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#0E4D64]/10 bg-white shadow-sm">
            <User className="h-5 w-5 text-[#0E4D64]" />
          </div>

        </div>

        {/* =====================================
            PROFILE CARD
        ====================================== */}

        <section className="relative overflow-hidden rounded-[2rem] bg-white p-4 shadow-[0_15px_45px_-30px_rgba(14,77,100,0.45)]">

          <div className="pointer-events-none absolute -end-16 -top-20 h-48 w-48 rounded-full border border-[#D4AF37]/20" />

          <div className="pointer-events-none absolute -start-16 -bottom-20 h-44 w-44 rounded-full border border-[#0E4D64]/10" />

          <div className="relative flex items-center gap-3">

            <div className="relative">

              <div className="grid h-[68px] w-[68px] place-items-center rounded-[1.5rem] bg-[#0E4D64] text-xl font-black text-white shadow-lg shadow-[#0E4D64]/15">
                {initials}
              </div>

              <span className="absolute -bottom-1 -start-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[#D4AF37] text-white">
                <Check className="h-3 w-3" />
              </span>

            </div>

            <div className="min-w-0 flex-1">

              <div className="flex items-center gap-2">

                <h2 className="truncate text-sm font-black text-[#0E4D64]">
                  {profile?.full_name ||
                    "مرحباً بك"}
                </h2>

                <span className="shrink-0 rounded-full bg-[#D65A31]/10 px-2 py-1 text-[8px] font-black text-[#D65A31]">
                  {roleLabel}
                </span>

              </div>

              <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-500">

                <Phone className="h-3 w-3" />

                <span
                  dir="ltr"
                  className="truncate"
                >
                  {profile?.phone ||
                    "رقم الهاتف غير مضاف"}
                </span>

              </div>

              <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400">

                <Mail className="h-3 w-3" />

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
              aria-label="تعديل بيانات الحساب"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#0E4D64]/10 bg-[#0E4D64]/5 text-[#0E4D64] transition hover:bg-[#0E4D64]/10 active:scale-90"
            >
              {editingProfile ? (
                <X className="h-4 w-4" />
              ) : (
                <Edit3 className="h-4 w-4" />
              )}
            </button>

          </div>

        </section>

        {/* =====================================
            DIGITAL WALLET CARD
        ====================================== */}

        <section className="mt-4">

          <div className="mb-3 flex items-end justify-between">

            <div>

              <div className="flex items-center gap-2">

                <Sparkles className="h-4 w-4 text-[#D4AF37]" />

                <h2 className="text-sm font-black text-[#0E4D64]">
                  محفظتك الرقمية
                </h2>

              </div>

              <p className="mt-1 text-[9px] text-slate-500">
                رصيدك متاح للدفع بسهولة وأمان
              </p>

            </div>

            <Link
              to="/wallet"
              className="text-[9px] font-black text-[#D65A31]"
            >
              إدارة المحفظة
            </Link>

          </div>

          <div className="relative min-h-[220px] overflow-hidden rounded-[1.8rem] bg-[#D4AF37] p-5 text-[#0E4D64] shadow-[0_20px_45px_-25px_rgba(212,175,55,0.65)]">

            {/* Yemen-inspired geometric pattern */}

            <div className="pointer-events-none absolute inset-0 opacity-10">

              <div className="absolute -end-16 -top-16 h-44 w-44 rotate-45 border-[18px] border-[#0E4D64]" />

              <div className="absolute -start-14 -bottom-20 h-48 w-48 rotate-45 border-[18px] border-[#0E4D64]" />

              <div className="absolute end-1/3 top-1/3 h-20 w-20 rotate-45 border-8 border-[#0E4D64]" />

              <div className="absolute bottom-5 start-1/3 h-10 w-10 rotate-45 border-4 border-[#0E4D64]" />

            </div>

            <div className="relative z-10 flex h-full min-h-[180px] flex-col">

              {/* Card top */}

              <div className="flex items-start justify-between">

                <div className="flex items-center gap-2">

                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0E4D64] p-1.5 shadow-lg">

                    <BrandLogo
                      size={28}
                      className="h-7 w-7"
                      priority
                    />

                  </div>

                  <div>

                    <p className="text-xs font-black">
                      شهارة
                    </p>

                    <p className="text-[7px] font-bold opacity-60">
                      تسوق بلا حدود
                    </p>

                  </div>

                </div>

                <CreditCard className="h-6 w-6 opacity-60" />

              </div>

              {/* Chip */}

              <div className="mt-7">

                <div className="grid h-8 w-11 place-items-center rounded-md border border-[#0E4D64]/20 bg-[#D4AF37] shadow-inner">

                  <div className="grid grid-cols-2 gap-0.5 opacity-50">

                    <span className="h-2.5 w-3 rounded-sm border border-[#0E4D64]" />
                    <span className="h-2.5 w-3 rounded-sm border border-[#0E4D64]" />
                    <span className="h-2.5 w-3 rounded-sm border border-[#0E4D64]" />
                    <span className="h-2.5 w-3 rounded-sm border border-[#0E4D64]" />

                  </div>

                </div>

              </div>

              {/* Card number */}

              <div className="mt-4">

                <p
                  dir="ltr"
                  className="text-center text-sm font-black tracking-[0.18em] sm:text-base"
                >
                  {maskedCardNumber}
                </p>

              </div>

              {/* Bottom */}

              <div className="mt-auto flex items-end justify-between gap-4 pt-5">

                <div className="min-w-0">

                  <p className="text-[7px] font-bold uppercase opacity-55">
                    Card Holder
                  </p>

                  <p className="mt-1 truncate text-[10px] font-black">
                    {profile?.full_name ||
                      "اسم صاحب البطاقة"}
                  </p>

                </div>

                <div className="text-start">

                  <p className="text-[7px] font-bold uppercase opacity-55">
                    Available Balance
                  </p>

                  <p className="mt-1 whitespace-nowrap text-lg font-black">
                    {formatPrice(
                      walletBalance,
                    )}
                  </p>

                </div>

              </div>

            </div>

          </div>

          <div className="mt-2 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">

            <div className="flex items-center gap-2">

              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0E4D64]/5">
                <ShieldCheck className="h-4 w-4 text-[#0E4D64]" />
              </span>

              <div>

                <p className="text-[9px] font-black text-[#0E4D64]">
                  استخدم رصيدك للدفع بسهولة
                </p>

                <p className="mt-0.5 text-[7px] text-slate-400">
                  معاملاتك محمية وتحت المراجعة
                </p>

              </div>

            </div>

            <Link
              to="/wallet"
              className="grid h-8 w-8 place-items-center rounded-lg bg-[#D65A31] text-white transition active:scale-90"
              aria-label="فتح المحفظة"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>

          </div>

        </section>

        {/* =====================================
            EDIT PROFILE
        ====================================== */}

        {editingProfile ? (
          <section className="mt-4 rounded-[1.6rem] border border-[#0E4D64]/10 bg-white p-4 shadow-sm">

            <div className="mb-4 flex items-center gap-2">

              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0E4D64]/5 text-[#0E4D64]">
                <User className="h-4 w-4" />
              </span>

              <div>

                <h2 className="text-sm font-black">
                  تعديل البيانات
                </h2>

                <p className="text-[9px] text-slate-400">
                  حدّث بيانات حسابك
                </p>

              </div>

            </div>

            <form
              onSubmit={saveProfile}
              className="space-y-3"
            >

              <label className="block">

                <span className="mb-1.5 block text-[9px] font-bold text-slate-500">
                  الاسم الكامل
                </span>

                <div className="relative">

                  <User className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E4D64]/50" />

                  <input
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value,
                      )
                    }
                    required
                    minLength={3}
                    className="h-11 w-full rounded-xl border border-[#0E4D64]/10 bg-[#FAF9F6] pe-10 ps-3 text-xs text-[#0E4D64] outline-none transition focus:border-[#0E4D64] focus:ring-4 focus:ring-[#0E4D64]/5"
                    placeholder="الاسم الكامل"
                  />

                </div>

              </label>

              <label className="block">

                <span className="mb-1.5 block text-[9px] font-bold text-slate-500">
                  رقم الهاتف
                </span>

                <div className="relative">

                  <Phone className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0E4D64]/50" />

                  <input
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value,
                      )
                    }
                    dir="ltr"
                    className="h-11 w-full rounded-xl border border-[#0E4D64]/10 bg-[#FAF9F6] pe-10 ps-3 text-start text-xs text-[#0E4D64] outline-none transition focus:border-[#0E4D64] focus:ring-4 focus:ring-[#0E4D64]/5"
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

        {/* =====================================
            QUICK ACTIONS
        ====================================== */}

        <section className="mt-5">

          <div className="mb-3">

            <h2 className="text-sm font-black text-[#0E4D64]">
              الوصول السريع
            </h2>

            <p className="mt-1 text-[9px] text-slate-500">
              أهم الخدمات التي تحتاجها
            </p>

          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

            <Link
              to="/orders"
              className="group flex min-h-[88px] items-center gap-3 rounded-2xl border border-[#0E4D64]/10 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            >

              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/5 text-[#0E4D64]">
                <Package className="h-5 w-5" />
              </span>

              <span className="min-w-0">

                <span className="block text-[10px] font-black">
                  طلباتي
                </span>

                <span className="mt-1 block text-[8px] text-slate-400">
                  متابعة الطلبات
                </span>

              </span>

              <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:-translate-x-0.5" />

            </Link>

            <Link
              to="/wallet"
              className="group flex min-h-[88px] items-center gap-3 rounded-2xl border border-[#D4AF37]/20 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            >

              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                <Wallet className="h-5 w-5" />
              </span>

              <span className="min-w-0">

                <span className="block text-[10px] font-black">
                  المحفظة
                </span>

                <span className="mt-1 block text-[8px] font-bold text-[#D65A31]">
                  {formatPrice(
                    walletBalance,
                  )}
                </span>

              </span>

              <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:-translate-x-0.5" />

            </Link>

            <a
              href="#addresses"
              className="group flex min-h-[88px] items-center gap-3 rounded-2xl border border-[#0E4D64]/10 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            >

              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/5 text-[#0E4D64]">
                <MapPin className="h-5 w-5" />
              </span>

              <span className="min-w-0">

                <span className="block text-[10px] font-black">
                  العناوين
                </span>

                <span className="mt-1 block text-[8px] text-slate-400">
                  عناوين التوصيل
                </span>

              </span>

              <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-slate-300" />

            </a>

            <a
              href="#notifications"
              className="group flex min-h-[88px] items-center gap-3 rounded-2xl border border-[#D65A31]/10 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            >

              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
                <Bell className="h-5 w-5" />
              </span>

              <span className="min-w-0">

                <span className="block text-[10px] font-black">
                  الإشعارات
                </span>

                <span className="mt-1 block text-[8px] text-slate-400">
                  تفضيلات التنبيه
                </span>

              </span>

              <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-slate-300" />

            </a>

          </div>

        </section>

        {/* =====================================
            RECENT ORDERS
        ====================================== */}

        <section className="mt-5">

          <div className="mb-3 flex items-end justify-between">

            <div>

              <h2 className="text-sm font-black text-[#0E4D64]">
                آخر الطلبات
              </h2>

              <p className="mt-1 text-[9px] text-slate-500">
                نظرة سريعة على مشترياتك
              </p>

            </div>

            <Link
              to="/orders"
              className="flex items-center gap-0.5 text-[9px] font-black text-[#D65A31]"
            >
              عرض الكل
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>

          </div>

          <div className="space-y-2">

            {loadingOrders ? (
              Array.from({
                length: 3,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-[78px] animate-pulse rounded-2xl bg-slate-100"
                />
              ))
            ) : orders.length > 0 ? (
              orders.map((order) => {
                const StatusIcon =
                  getOrderStatusIcon(
                    order.status,
                  );

                return (
                  <Link
                    key={order.id}
                    to="/orders"
                    className="group flex items-center gap-3 rounded-2xl border border-[#0E4D64]/8 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
                  >

                    <span
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${getOrderStatusClass(order.status)}`}
                    >
                      <StatusIcon className="h-5 w-5" />
                    </span>

                    <span className="min-w-0 flex-1">

                      <span className="flex items-center gap-2">

                        <span className="truncate text-[10px] font-black text-[#0E4D64]">
                          طلب #
                          {order.order_number}
                        </span>

                        <span
                          className={`hidden rounded-full px-2 py-1 text-[7px] font-black sm:inline-flex ${getOrderStatusClass(order.status)}`}
                        >
                          {getOrderStatusLabel(
                            order.status,
                          )}
                        </span>

                      </span>

                      <span className="mt-1 block text-[8px] text-slate-400">
                        {formatDate(
                          order.created_at,
                        )}
                      </span>

                    </span>

                    <span className="shrink-0 text-start">

                      <span className="block text-xs font-black text-[#D65A31]">
                        {formatPrice(
                          order.total,
                        )}
                      </span>

                      <span className="mt-1 block text-[7px] text-slate-400">
                        {getPaymentStatusLabel(
                          order.payment_status,
                        )}
                      </span>

                    </span>

                    <ChevronLeft className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:-translate-x-0.5" />

                  </Link>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[#0E4D64]/10 bg-white px-5 py-10 text-center">

                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#0E4D64]/5">
                  <Package className="h-6 w-6 text-[#0E4D64]/40" />
                </div>

                <p className="mt-3 text-xs font-black text-[#0E4D64]">
                  لا توجد طلبات حتى الآن
                </p>

                <p className="mt-1 text-[9px] text-slate-400">
                  ابدأ التسوق من شهارة
                </p>

                <Link
                  to="/products"
                  className="mt-4 inline-flex rounded-xl bg-[#D65A31] px-4 py-2.5 text-[9px] font-black text-white"
                >
                  اكتشف المنتجات
                </Link>

              </div>
            )}

          </div>

        </section>

        {/* =====================================
            ADDRESSES
        ====================================== */}

        <section
          id="addresses"
          className="mt-5 scroll-mt-24"
        >

          <div className="mb-3 flex items-end justify-between">

            <div>

              <h2 className="text-sm font-black text-[#0E4D64]">
                عناوين التوصيل
              </h2>

              <p className="mt-1 text-[9px] text-slate-500">
                اختر المكان المناسب لاستلام طلباتك
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowAddressForm(
                  (value) => !value,
                )
              }
              className="flex h-9 items-center gap-1.5 rounded-xl bg-[#D65A31] px-3 text-[9px] font-black text-white transition active:scale-95"
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
              className="mb-3 rounded-[1.6rem] border border-[#D65A31]/10 bg-white p-4 shadow-sm"
            >

              <div className="mb-4 flex items-center gap-2">

                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
                  <Plus className="h-4 w-4" />
                </span>

                <div>

                  <h3 className="text-xs font-black">
                    إضافة عنوان جديد
                  </h3>

                  <p className="text-[8px] text-slate-400">
                    أدخل بيانات التوصيل بدقة
                  </p>

                </div>

              </div>

              <div className="grid grid-cols-2 gap-2">

                <label className="col-span-2">

                  <span className="mb-1 block text-[8px] font-bold text-slate-500">
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
                    className="h-10 w-full rounded-xl border border-[#0E4D64]/10 bg-[#FAF9F6] px-3 text-xs outline-none focus:border-[#0E4D64]"
                    placeholder="المنزل"
                  />

                </label>

                <label>

                  <span className="mb-1 block text-[8px] font-bold text-slate-500">
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
                    className="h-10 w-full rounded-xl border border-[#0E4D64]/10 bg-[#FAF9F6] px-3 text-xs outline-none focus:border-[#0E4D64]"
                    placeholder="الاسم الكامل"
                    required
                  />

                </label>

                <label>

                  <span className="mb-1 block text-[8px] font-bold text-slate-500">
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
                    className="h-10 w-full rounded-xl border border-[#0E4D64]/10 bg-[#FAF9F6] px-3 text-start text-xs outline-none focus:border-[#0E4D64]"
                    placeholder="7xxxxxxxx"
                  />

                </label>

                <label>

                  <span className="mb-1 block text-[8px] font-bold text-slate-500">
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
                    className="h-10 w-full rounded-xl border border-[#0E4D64]/10 bg-[#FAF9F6] px-3 text-xs outline-none focus:border-[#0E4D64]"
                    placeholder="إب"
                    required
                  />

                </label>

                <label>

                  <span className="mb-1 block text-[8px] font-bold text-slate-500">
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
                    className="h-10 w-full rounded-xl border border-[#0E4D64]/10 bg-[#FAF9F6] px-3 text-xs outline-none focus:border-[#0E4D64]"
                    placeholder="الحي / المنطقة"
                  />

                </label>

                <label className="col-span-2">

                  <span className="mb-1 block text-[8px] font-bold text-slate-500">
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
                    className="w-full resize-none rounded-xl border border-[#0E4D64]/10 bg-[#FAF9F6] px-3 py-2 text-xs outline-none focus:border-[#0E4D64]"
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

            {loadingAddresses ? (
              Array.from({
                length: 2,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-2xl bg-slate-100"
                />
              ))
            ) : addresses.length > 0 ? (
              addresses.map((address) => (
                <article
                  key={address.id}
                  className={`relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm ${
                    address.is_default
                      ? "border-[#D65A31]/25"
                      : "border-[#0E4D64]/8"
                  }`}
                >

                  {address.is_default ? (
                    <div className="absolute inset-x-0 top-0 h-1 bg-[#D65A31]" />
                  ) : null}

                  <div className="flex items-start gap-3">

                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/5 text-[#0E4D64]">

                      {address.label
                        .toLowerCase()
                        .includes("عمل") ? (
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
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#D65A31]/10 px-2 py-0.5 text-[7px] font-black text-[#D65A31]">
                            <CheckCircle2 className="h-3 w-3" />
                            افتراضي
                          </span>
                        ) : null}

                      </div>

                      <p className="mt-1 text-[10px] font-bold">
                        {address.recipient_name}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[8px] text-slate-400">

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

                      <p className="mt-1.5 line-clamp-2 text-[8px] leading-5 text-slate-400">
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
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 active:scale-90"
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
                      className="mt-3 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#0E4D64]/10 bg-[#0E4D64]/5 text-[8px] font-bold text-[#0E4D64] transition active:scale-[0.99] disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      تعيين كعنوان افتراضي
                    </button>
                  ) : null}

                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#0E4D64]/10 bg-white px-5 py-10 text-center">

                <MapPinned className="mx-auto h-8 w-8 text-[#0E4D64]/25" />

                <p className="mt-3 text-xs font-black">
                  لا توجد عناوين محفوظة
                </p>

                <p className="mt-1 text-[9px] text-slate-400">
                  أضف عنوانك لتسهيل إتمام الطلبات
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowAddressForm(
                      true,
                    )
                  }
                  className="mt-4 rounded-xl bg-[#D65A31] px-4 py-2.5 text-[9px] font-black text-white"
                >
                  إضافة عنوان
                </button>

              </div>
            )}

          </div>

        </section>

        {/* =====================================
            NOTIFICATIONS
        ====================================== */}

        <section
          id="notifications"
          className="mt-5 scroll-mt-24"
        >
          <NotificationPrefsPanel />
        </section>

        {/* =====================================
            ACCOUNT SECURITY
        ====================================== */}

        <section className="mt-5 overflow-hidden rounded-[1.6rem] border border-[#0E4D64]/8 bg-white shadow-sm">

          <div className="flex items-center gap-3 border-b border-slate-100 p-4">

            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0E4D64]/5 text-[#0E4D64]">
              <ShieldCheck className="h-5 w-5" />
            </span>

            <div>

              <h2 className="text-sm font-black">
                الحساب والأمان
              </h2>

              <p className="mt-1 text-[9px] text-slate-400">
                معلومات حسابك الأساسية
              </p>

            </div>

          </div>

          <div className="divide-y divide-slate-100">

            <div className="flex items-center gap-3 p-4">

              <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50">
                <Mail className="h-4 w-4 text-slate-500" />
              </span>

              <div className="min-w-0 flex-1">

                <p className="text-[8px] text-slate-400">
                  البريد الإلكتروني
                </p>

                <p
                  dir="ltr"
                  className="mt-1 truncate text-start text-[10px] font-bold"
                >
                  {user?.email || "—"}
                </p>

              </div>

            </div>

            <div className="flex items-center gap-3 p-4">

              <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50">
                <Phone className="h-4 w-4 text-slate-500" />
              </span>

              <div className="min-w-0 flex-1">

                <p className="text-[8px] text-slate-400">
                  رقم الهاتف
                </p>

                <p
                  dir="ltr"
                  className="mt-1 text-start text-[10px] font-bold"
                >
                  {profile?.phone ||
                    "غير مضاف"}
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* =====================================
            LOGOUT
        ====================================== */}

        <button
          type="button"
          onClick={() =>
            void handleSignOut()
          }
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white text-xs font-black text-red-500 shadow-sm transition hover:bg-red-50 active:scale-[0.99]"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>

        {/* =====================================
            BRAND FOOTER
        ====================================== */}

        <div className="flex flex-col items-center pb-3 pt-6">

          <BrandLogo
            size={38}
            className="h-9 w-9"
          />

          <p className="mt-2 text-[9px] font-black text-[#0E4D64]">
            شهارة
          </p>

          <p className="mt-0.5 text-[7px] text-slate-400">
            تسوق بلا حدود
          </p>

        </div>

      </main>

      <BottomNav />
    </div>
  );
}
