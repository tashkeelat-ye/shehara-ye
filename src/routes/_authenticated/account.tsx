
import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronLeft,
  CircleHelp,
  Edit3,
  FileText,
  Headset,
  Heart,
  Home,
  LogOut,
  MapPin,
  Package,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/lib/auth-context";
import { NotificationPrefsPanel } from "@/components/notification-prefs";
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

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "غير مدفوع",
  pending: "قيد المراجعة",
  paid: "مدفوع",
  rejected: "مرفوض",
};

const emptyAddress = {
  label: "المنزل",
  recipient_name: "",
  phone: "",
  city: "",
  district: "",
  details: "",
};

const cardClass =
  "rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#0D3B4D]";

const mutedTextClass =
  "text-sm text-slate-600 dark:text-slate-300/75";

const inputClass =
  "min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0E4D64] focus:ring-2 focus:ring-[#0E4D64]/10 dark:border-white/10 dark:bg-[#071B24] dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus:border-[#D65A31] dark:focus:ring-[#D65A31]/15";

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#0E4D64] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0B4053] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4D64]/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#D65A31] dark:hover:bg-[#C34C27] dark:focus-visible:ring-[#D65A31]/40";

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4D64]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10";

export const Route = createFileRoute(
  "/_authenticated/account",
)({
  head: () => ({
    meta: [
      { title: "حسابي | شهارة" },
      {
        name: "description",
        content:
          "إدارة الملف الشخصي والطلبات وعناوين التوصيل والإشعارات في متجر شهارة.",
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

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [form, setForm] = useState({ ...emptyAddress });
  const [busy, setBusy] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const loadAddresses = useCallback(async () => {
    if (!user?.id) {
      setAddresses([]);
      setLoadingAddresses(false);
      return;
    }

    setLoadingAddresses(true);

    try {
      const { data, error } = await supabase
        .from("addresses")
        .select(
          "id,label,recipient_name,phone,city,district,details,is_default",
        )
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<Address[]>();

      if (error) {
        throw error;
      }

      setAddresses(data ?? []);
    } catch (error) {
      console.error("[Account] Failed to load addresses:", error);
      toast.error("تعذر تحميل عناوين التوصيل");
    } finally {
      setLoadingAddresses(false);
    }
  }, [user?.id]);

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setLoadingOrders(true);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,order_number,status,payment_status,total,created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3)
        .returns<RecentOrder[]>();

      if (error) {
        throw error;
      }

      setOrders(data ?? []);
    } catch (error) {
      console.error("[Account] Failed to load orders:", error);
      toast.error("تعذر تحميل الطلبات");
    } finally {
      setLoadingOrders(false);
    }
  }, [user?.id]);

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
        return "مندوب توصيل";
      default:
        return "عميل";
    }
  }, [role]);

  const initials = useMemo(() => {
    const value = profile?.full_name?.trim() || "ش";
    const parts = value.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`;
    }

    return value.charAt(0);
  }, [profile?.full_name]);

  const defaultAddress =
    addresses.find((address) => address.is_default) ??
    addresses[0] ??
    null;

  const latestOrder = orders[0] ?? null;

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.id) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

    if (fullName.trim().length < 3) {
      toast.error("أدخل اسماً صحيحاً");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      await refreshProfile();

      toast.success("تم تحديث بيانات الحساب بنجاح");
      setEditingProfile(false);
    } catch (error) {
      console.error("[Account] Failed to save profile:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حفظ البيانات",
      );
    } finally {
      setBusy(false);
    }
  }

  async function addAddress(event: FormEvent<HTMLFormElement>) {
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
      toast.error("أكمل اسم المستلم والمدينة وتفاصيل العنوان");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase
        .from("addresses")
        .insert({
          user_id: user.id,
          label: form.label.trim() || "العنوان",
          recipient_name: form.recipient_name.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          district: form.district.trim(),
          details: form.details.trim(),
          is_default: addresses.length === 0,
        });

      if (error) {
        throw error;
      }

      toast.success("تمت إضافة العنوان بنجاح");
      setForm({ ...emptyAddress });
      setShowAddressForm(false);
      await loadAddresses();
    } catch (error) {
      console.error("[Account] Failed to add address:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر إضافة العنوان",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeAddress(id: string) {
    if (!user?.id || busy) {
      return;
    }

    const confirmed = window.confirm(
      "هل تريد حذف عنوان التوصيل هذا؟ لا يمكن التراجع عن هذا الإجراء.",
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      toast.success("تم حذف العنوان");
      await loadAddresses();
    } catch (error) {
      console.error("[Account] Failed to delete address:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حذف العنوان",
      );
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id: string) {
    if (!user?.id || busy) {
      return;
    }

    setBusy(true);

    try {
      const first = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      if (first.error) {
        throw first.error;
      }

      const second = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (second.error) {
        throw second.error;
      }

      toast.success("تم تعيين العنوان الافتراضي");
      await loadAddresses();
    } catch (error) {
      console.error("[Account] Failed to set default address:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تحديث العنوان",
      );

      await loadAddresses();
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    const confirmed = window.confirm(
      "هل تريد تسجيل الخروج من حسابك؟",
    );

    if (!confirmed) {
      return;
    }

    try {
      await signOut();
    } catch (error) {
      console.error("[Account] Failed to sign out:", error);
      toast.error("تعذر تسجيل الخروج حالياً");
    }
  }

  function getOrderStatusClass(status: string) {
    switch (status) {
      case "delivered":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-300";
      case "shipped":
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-400/15 dark:text-blue-300";
      default:
        return "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300";
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FAF9F6] pb-28 text-slate-900 transition-colors dark:bg-[#071B24] dark:text-slate-50 md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
        {/* Page heading */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-[#0E4D64] dark:text-[#D65A31]">
              SHEHARA ACCOUNT
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              حسابي
            </h1>

            <p className={`mt-2 ${mutedTextClass}`}>
              بياناتك وطلباتك وعناوين التوصيل في مكان واحد.
            </p>
          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0E4D64] text-xl font-black text-white ring-4 ring-[#0E4D64]/10 dark:bg-[#D65A31] dark:ring-[#D65A31]/15 sm:h-16 sm:w-16 sm:text-2xl">
            {initials}
          </div>
        </header>

        {/* Profile hero */}
        <section className={`${cardClass} overflow-hidden`}>
          <div className="h-1.5 bg-gradient-to-l from-[#0E4D64] via-[#34798B] to-[#D65A31]" />

          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0E4D64]/10 text-2xl font-black text-[#0E4D64] ring-2 ring-[#D65A31]/35 ring-offset-2 ring-offset-white dark:bg-[#D65A31]/10 dark:text-[#F3A184] dark:ring-offset-[#0D3B4D]">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-lg font-black sm:text-xl">
                    {profile?.full_name || "مرحباً بك"}
                  </h2>

                  <span className="inline-flex items-center rounded-full bg-[#D65A31]/10 px-3 py-1 text-xs font-bold text-[#B84725] dark:text-[#F3A184]">
                    {roleLabel}
                  </span>
                </div>

                <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-300/75" dir="ltr">
                  {profile?.phone || user?.email || "—"}
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  أهلاً بك في شهارة للتسوق.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingProfile((value) => !value);
                setShowAddressForm(false);
              }}
              aria-expanded={editingProfile}
              className={secondaryButtonClass}
            >
              {editingProfile ? (
                <X className="h-4 w-4" />
              ) : (
                <Edit3 className="h-4 w-4" />
              )}

              {editingProfile ? "إغلاق التعديل" : "تعديل البيانات"}
            </button>
          </div>
        </section>

        {/* Quick access */}
        <section aria-labelledby="quick-access-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 id="quick-access-title" className="text-lg font-black">
                الوصول السريع
              </h2>
              <p className={`mt-1 ${mutedTextClass}`}>
                أهم خدمات حسابك في مكان واحد.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Link
              to="/orders"
              className={`${cardClass} group p-4 transition hover:-translate-y-0.5 hover:border-[#0E4D64]/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4D64]/40 dark:hover:border-[#D65A31]/40 sm:p-5`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-white/5 dark:text-[#8DC7D5]">
                  <Package className="h-5 w-5" />
                </span>
                <ChevronLeft className="h-4 w-4 text-slate-400 transition group-hover:-translate-x-1 group-hover:text-[#0E4D64] dark:group-hover:text-[#D65A31]" />
              </div>

              <h3 className="mt-4 text-base font-black">طلباتي</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300/75">
                متابعة الطلبات والفواتير
              </p>
            </Link>

            <Link
              to="/wallet"
              className={`${cardClass} group p-4 transition hover:-translate-y-0.5 hover:border-[#D65A31]/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31]/30 sm:p-5`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D65A31]/10 text-[#C34C27] dark:text-[#F3A184]">
                  <Wallet className="h-5 w-5" />
                </span>
                <ChevronLeft className="h-4 w-4 text-slate-400 transition group-hover:-translate-x-1 group-hover:text-[#D65A31]" />
              </div>

              <h3 className="mt-4 text-base font-black">محفظتي</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300/75">
                الرصيد والعمليات المالية
              </p>
            </Link>

            <Link
              to="/favorites"
              className={`${cardClass} group p-4 transition hover:-translate-y-0.5 hover:border-[#D65A31]/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D65A31]/30 sm:p-5`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300">
                  <Heart className="h-5 w-5" />
                </span>
                <ChevronLeft className="h-4 w-4 text-slate-400 transition group-hover:-translate-x-1 group-hover:text-[#D65A31]" />
              </div>

              <h3 className="mt-4 text-base font-black">المفضلة</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300/75">
                المنتجات المحفوظة
              </p>
            </Link>

            <button
              type="button"
              onClick={() => scrollToSection("delivery-addresses")}
              className={`${cardClass} group p-4 text-start transition hover:-translate-y-0.5 hover:border-[#0E4D64]/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E4D64]/40 sm:p-5`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                  <MapPin className="h-5 w-5" />
                </span>
                <ChevronLeft className="h-4 w-4 text-slate-400 transition group-hover:-translate-x-1 group-hover:text-[#0E4D64] dark:group-hover:text-[#D65A31]" />
              </div>

              <h3 className="mt-4 text-base font-black">عناوين التوصيل</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300/75">
                إدارة عناوين الاستلام
              </p>
            </button>
          </div>
        </section>

        {/* Profile editor */}
        {editingProfile ? (
          <section className={`${cardClass} p-4 sm:p-6`}>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-[#D65A31]/10 dark:text-[#F3A184]">
                <UserRound className="h-5 w-5" />
              </span>

              <div>
                <h2 className="text-lg font-black">البيانات الشخصية</h2>
                <p className={`mt-1 ${mutedTextClass}`}>
                  حدّث الاسم ورقم الهاتف المرتبطين بحسابك.
                </p>
              </div>
            </div>

            <form onSubmit={saveProfile} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  الاسم الكامل
                </span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  maxLength={100}
                  autoComplete="name"
                  required
                  minLength={3}
                  className={inputClass}
                  placeholder="أدخل اسمك الكامل"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  رقم الهاتف
                </span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  dir="ltr"
                  maxLength={20}
                  autoComplete="tel"
                  className={inputClass}
                  placeholder="رقم الهاتف"
                />
              </label>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFullName(profile?.full_name ?? "");
                    setPhone(profile?.phone ?? "");
                    setEditingProfile(false);
                  }}
                  className={secondaryButtonClass}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  className={primaryButtonClass}
                >
                  <Check className="h-4 w-4" />
                  {busy ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {/* Recent order */}
        <section className={`${cardClass} p-4 sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-white/5 dark:text-[#8DC7D5]">
                <Package className="h-5 w-5" />
              </span>

              <div>
                <h2 className="text-lg font-black">آخر طلب</h2>
                <p className={`mt-1 ${mutedTextClass}`}>
                  نظرة سريعة على أحدث طلباتك.
                </p>
              </div>
            </div>

            <Link
              to="/orders"
              className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-bold text-[#0E4D64] hover:bg-[#0E4D64]/5 dark:text-[#F3A184] dark:hover:bg-white/5"
            >
              كل الطلبات
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          {loadingOrders ? (
            <div
              className="mt-5 space-y-3"
              aria-label="جارٍ تحميل الطلبات"
              aria-busy="true"
            >
              <div className="h-5 w-2/5 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
            </div>
          ) : latestOrder ? (
            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#071B24]/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    رقم الطلب
                  </p>

                  <p
                    dir="ltr"
                    className="mt-1 break-all text-start font-mono text-base font-bold"
                  >
                    {latestOrder.order_number || latestOrder.id}
                  </p>

                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/75">
                    {formatDate(latestOrder.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getOrderStatusClass(latestOrder.status)}`}
                  >
                    {STATUS_LABELS[latestOrder.status] ??
                      latestOrder.status}
                  </span>

                  <span className="inline-flex rounded-full bg-slate-200/70 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                    {PAYMENT_LABELS[latestOrder.payment_status] ??
                      latestOrder.payment_status}
                  </span>
                </div>
              </div>

              <Link
                to="/orders"
                className={`${primaryButtonClass} mt-4 w-full sm:w-auto`}
              >
                متابعة الطلب
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-white/15">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-white/5 dark:text-[#8DC7D5]">
                <Package className="h-6 w-6" />
              </span>

              <h3 className="mt-3 text-base font-bold">
                لا توجد طلبات حتى الآن
              </h3>

              <p className={`mt-2 ${mutedTextClass}`}>
                عندما تطلب منتجاتك، ستظهر تفاصيل أحدث طلب هنا.
              </p>

              <Link
                to="/products"
                className={`${primaryButtonClass} mt-4`}
              >
                تصفح المنتجات
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        {/* Delivery addresses */}
        <section
          id="delivery-addresses"
          className={`${cardClass} scroll-mt-24 p-4 sm:p-6`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                <MapPin className="h-5 w-5" />
              </span>

              <div>
                <h2 className="text-lg font-black">عناوين التوصيل</h2>
                <p className={`mt-1 ${mutedTextClass}`}>
                  احفظ عناوينك لتسهيل الطلبات القادمة.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddressForm((value) => !value);
                setEditingProfile(false);

                if (!showAddressForm) {
                  window.setTimeout(
                    () => scrollToSection("address-form"),
                    50,
                  );
                }
              }}
              aria-expanded={showAddressForm}
              className={primaryButtonClass}
            >
              {showAddressForm ? (
                <X className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {showAddressForm ? "إغلاق النموذج" : "إضافة عنوان توصيل"}
            </button>
          </div>

          {showAddressForm ? (
            <form
              id="address-form"
              onSubmit={addAddress}
              className="mt-5 scroll-mt-24 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#071B24]/50 sm:p-5"
            >
              <div className="mb-4">
                <h3 className="text-base font-bold">
                  عنوان توصيل جديد
                </h3>
                <p className={`mt-1 ${mutedTextClass}`}>
                  الحقول التي تحمل علامة * مطلوبة.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    اسم العنوان
                  </span>
                  <input
                    value={form.label}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                    maxLength={80}
                    className={inputClass}
                    placeholder="المنزل، العمل..."
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    اسم المستلم *
                  </span>
                  <input
                    value={form.recipient_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        recipient_name: event.target.value,
                      }))
                    }
                    maxLength={100}
                    autoComplete="name"
                    required
                    className={inputClass}
                    placeholder="اسم الشخص الذي سيستلم الطلب"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    رقم هاتف المستلم
                  </span>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    dir="ltr"
                    maxLength={20}
                    autoComplete="tel"
                    className={inputClass}
                    placeholder="رقم الهاتف"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    المدينة *
                  </span>
                  <input
                    value={form.city}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    maxLength={100}
                    required
                    autoComplete="address-level2"
                    className={inputClass}
                    placeholder="المدينة"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold">
                    الحي أو المنطقة
                  </span>
                  <input
                    value={form.district}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        district: event.target.value,
                      }))
                    }
                    maxLength={150}
                    autoComplete="address-level3"
                    className={inputClass}
                    placeholder="اسم الحي أو المنطقة"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold">
                    تفاصيل العنوان *
                  </span>
                  <textarea
                    value={form.details}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        details: event.target.value,
                      }))
                    }
                    maxLength={1000}
                    required
                    rows={3}
                    autoComplete="street-address"
                    className={`${inputClass} resize-y`}
                    placeholder="اسم الشارع، أقرب معلم، رقم المنزل..."
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setForm({ ...emptyAddress });
                    setShowAddressForm(false);
                  }}
                  className={secondaryButtonClass}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  className={primaryButtonClass}
                >
                  <Check className="h-4 w-4" />
                  {busy ? "جارٍ حفظ العنوان..." : "حفظ العنوان"}
                </button>
              </div>
            </form>
          ) : null}

          {loadingAddresses ? (
            <div
              className="mt-5 space-y-3"
              aria-label="جارٍ تحميل عناوين التوصيل"
              aria-busy="true"
            >
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5"
                />
              ))}
            </div>
          ) : addresses.length > 0 ? (
            <div className="mt-5 space-y-3">
              {addresses.map((address) => (
                <article
                  key={address.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-[#071B24]/45 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-white/5 dark:text-[#8DC7D5]">
                          <Home className="h-4 w-4" />
                        </span>

                        <h3 className="text-base font-bold">
                          {address.label || "عنوان التوصيل"}
                        </h3>

                        {address.is_default ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
                            <Check className="h-3.5 w-3.5" />
                            افتراضي
                          </span>
                        ) : null}
                      </div>

                      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            اسم المستلم
                          </dt>
                          <dd className="mt-1 break-words text-sm font-semibold">
                            {address.recipient_name || "—"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            رقم الهاتف
                          </dt>
                          <dd className="mt-1 break-all text-sm font-semibold" dir="ltr">
                            {address.phone || "—"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            المدينة
                          </dt>
                          <dd className="mt-1 break-words text-sm font-semibold">
                            {address.city || "—"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            الحي أو المنطقة
                          </dt>
                          <dd className="mt-1 break-words text-sm font-semibold">
                            {address.district || "—"}
                          </dd>
                        </div>

                        <div className="sm:col-span-2">
                          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            تفاصيل العنوان
                          </dt>
                          <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                            {address.details || "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:max-w-44 sm:justify-end">
                      {!address.is_default ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void makeDefault(address.id)}
                          className={secondaryButtonClass}
                        >
                          <Check className="h-4 w-4" />
                          تعيين كافتراضي
                        </button>
                      ) : null}

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeAddress(address.id)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/15"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-white/15">
              <MapPin className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />

              <h3 className="mt-3 text-base font-bold">
                لم تضف عنوان توصيل بعد
              </h3>

              <p className={`mt-2 ${mutedTextClass}`}>
                أضف عنوانك لتسهيل إتمام طلباتك القادمة.
              </p>

              <button
                type="button"
                onClick={() => setShowAddressForm(true)}
                className={`${primaryButtonClass} mt-4`}
              >
                <Plus className="h-4 w-4" />
                إضافة أول عنوان
              </button>
            </div>
          )}
        </section>

        {/* Settings and notification preferences */}
        <section
          id="account-settings"
          className={`${cardClass} scroll-mt-24 overflow-hidden`}
        >
          <div className="flex items-center gap-3 border-b border-slate-200/80 p-4 dark:border-white/10 sm:p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D65A31]/10 text-[#C34C27] dark:text-[#F3A184]">
              <Settings2 className="h-5 w-5" />
            </span>

            <div>
              <h2 className="text-lg font-black">
                الإعدادات والتفضيلات
              </h2>
              <p className={`mt-1 ${mutedTextClass}`}>
                تحكم في إشعارات حسابك وتفضيلاتك.
              </p>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#0E4D64] dark:text-[#F3A184]" />
                <h3 className="text-base font-bold">
                  تفضيلات الإشعارات
                </h3>
              </div>

              <NotificationPrefsPanel />
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#071B24]/50">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </span>

                <div>
                  <h3 className="text-base font-bold">أمان الحساب</h3>
                  <p className={`mt-1 ${mutedTextClass}`}>
                    حافظ على سرية بيانات الدخول ولا تشارك كلمة المرور مع الآخرين.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Help and policies */}
        <section className={`${cardClass} p-4 sm:p-6`}>
          <div className="mb-4">
            <h2 className="text-lg font-black">المساعدة والدعم</h2>
            <p className={`mt-1 ${mutedTextClass}`}>
              روابط مفيدة للوصول إلى معلومات المتجر.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <a
              href="/support"
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200/80 p-3 transition hover:border-[#0E4D64]/30 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <Headset className="h-5 w-5 shrink-0 text-[#0E4D64] dark:text-[#F3A184]" />
              <span className="text-sm font-semibold">الدعم الفني</span>
            </a>

            <a
              href="/policies"
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200/80 p-3 transition hover:border-[#0E4D64]/30 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <FileText className="h-5 w-5 shrink-0 text-[#0E4D64] dark:text-[#F3A184]" />
              <span className="text-sm font-semibold">الشروط والسياسات</span>
            </a>

            <a
              href="/faq"
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200/80 p-3 transition hover:border-[#0E4D64]/30 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <CircleHelp className="h-5 w-5 shrink-0 text-[#0E4D64] dark:text-[#F3A184]" />
              <span className="text-sm font-semibold">الأسئلة الشائعة</span>
            </a>
          </div>
        </section>

        {/* Sign out */}
        <section className="rounded-3xl border border-red-200 bg-red-50/80 p-4 dark:border-red-400/15 dark:bg-red-400/[0.06] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-red-800 dark:text-red-300">
                تسجيل الخروج
              </h2>
              <p className="mt-1 text-sm leading-6 text-red-700/80 dark:text-red-200/70">
                أنهِ جلستك الحالية على هذا الجهاز.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/15"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </button>
          </div>
        </section>

        <footer className="pb-2 pt-1 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            شهارة للتجارة والتسويق الإلكتروني
          </p>
        </footer>
      </main>

      <BottomNav />
    </div>
  );
}

export default AccountPage;
