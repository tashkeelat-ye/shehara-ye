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
  Heart,
  Home,
  LogOut,
  MapPin,
  Package,
  Plus,
  Settings2,
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

export const Route = createFileRoute(
  "/_authenticated/account",
)({
  head: () => ({
    meta: [
      { title: "حسابي | شهارة" },
      {
        name: "description",
        content:
          "إدارة الملف الشخصي والطلبات والعناوين والإشعارات وإعدادات حسابك في شهارة.",
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
  const [form, setForm] = useState(emptyAddress);
  const [busy, setBusy] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

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
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<Address[]>();

    if (error) {
      console.error("[Account] Failed to load addresses:", error);
      toast.error("تعذر تحميل عناوين التوصيل");
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
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<RecentOrder[]>();

    if (error) {
      console.error("[Account] Failed to load orders:", error);
      toast.error("تعذر تحميل الطلبات");
    }

    setOrders(data ?? []);
    setLoadingOrders(false);
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
        return "عامل توصيل";
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

  async function saveProfile(event: React.FormEvent) {
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

      if (error) throw error;

      await refreshProfile();
      toast.success("تم تحديث بيانات الحساب بنجاح");
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

  async function addAddress(event: React.FormEvent) {
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
      toast.error("أكمل بيانات العنوان المطلوبة");
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

      if (error) throw error;

      toast.success("تمت إضافة العنوان بنجاح");
      setForm({ ...emptyAddress });
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

  async function removeAddress(id: string) {
    if (!user?.id) return;

    if (!window.confirm("هل تريد حذف هذا العنوان؟")) {
      return;
    }

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast.error(error.message || "تعذر حذف العنوان");
      return;
    }

    toast.success("تم حذف العنوان");
    await loadAddresses();
  }

  async function makeDefault(id: string) {
    if (!user?.id) return;

    setBusy(true);

    try {
      const first = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      if (first.error) throw first.error;

      const second = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (second.error) throw second.error;

      toast.success("تم تعيين العنوان الافتراضي");
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
      toast.error("تعذر تسجيل الخروج حالياً");
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#0A2A38] pb-28 text-[#F6F2EE] md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-5 sm:py-6">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium tracking-[0.15em] text-white/35">
              SHEHARA ACCOUNT
            </p>
            <h1 className="mt-1 text-xl font-black tracking-tight">
              حسابي
            </h1>
            <p className="mt-1 text-[9px] text-white/35">
              إدارة بياناتك وتفضيلاتك وخدماتك الشخصية
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#0D3B4D] text-[#E2723A]">
            <span className="text-lg font-black">{initials}</span>
          </div>
        </header>

        {/* Profile */}
        <section className="mb-4 rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E2723A]/10 text-[#E2723A]">
              <User className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-sm font-black">
                  {profile?.full_name || "مرحباً بك"}
                </h2>
                <span className="rounded-full bg-[#E2723A]/10 px-2 py-0.5 text-[8px] font-bold text-[#E2723A]">
                  {roleLabel}
                </span>
              </div>
              <p
                dir="ltr"
                className="mt-1 truncate text-start text-[10px] text-white/40"
              >
                {profile?.phone || user?.email || "—"}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setEditingProfile((value) => !value)
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/55 transition hover:border-[#E2723A]/30 hover:text-[#E2723A]"
              aria-label="تعديل الحساب"
            >
              {editingProfile ? (
                <X className="h-4 w-4" />
              ) : (
                <Edit3 className="h-4 w-4" />
              )}
            </button>
          </div>
        </section>

        {/* Main account navigation */}
        <section className="mb-4 grid grid-cols-2 gap-3">
          <Link
            to="/orders"
            className="group rounded-[18px] border border-white/[0.07] bg-[#0D3B4D] p-4 transition hover:-translate-y-0.5 hover:border-[#E2723A]/25"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E2723A]/10 text-[#E2723A]">
                <Package className="h-5 w-5" />
              </span>
              <ChevronLeft className="h-4 w-4 text-white/25 group-hover:text-[#E2723A]" />
            </div>
            <p className="mt-3 text-xs font-black">طلباتي</p>
            <p className="mt-1 text-[9px] text-white/35">
              متابعة الطلبات والفواتير
            </p>
          </Link>

          <Link
            to="/wallet"
            className="group rounded-[18px] border border-[#E2723A]/15 bg-[#E2723A]/[0.06] p-4 transition hover:-translate-y-0.5 hover:border-[#E2723A]/30"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E2723A]/10 text-[#E2723A]">
                <Wallet className="h-5 w-5" />
              </span>
              <ChevronLeft className="h-4 w-4 text-[#E2723A]/50 group-hover:text-[#E2723A]" />
            </div>
            <p className="mt-3 text-xs font-black">محفظتي</p>
            <p className="mt-1 text-[9px] text-white/40">
              البطاقة والرصيد والعمليات المالية
            </p>
          </Link>

          <Link
            to="/favorites"
            className="group rounded-[18px] border border-white/[0.07] bg-[#0D3B4D] p-4 transition hover:-translate-y-0.5 hover:border-[#E2723A]/25"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-[#E2723A]">
                <Heart className="h-5 w-5" />
              </span>
              <ChevronLeft className="h-4 w-4 text-white/25 group-hover:text-[#E2723A]" />
            </div>
            <p className="mt-3 text-xs font-black">المفضلة</p>
            <p className="mt-1 text-[9px] text-white/35">
              المنتجات التي حفظتها
            </p>
          </Link>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("account-settings")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
            }
            className="group rounded-[18px] border border-white/[0.07] bg-[#0D3B4D] p-4 text-start transition hover:-translate-y-0.5 hover:border-[#E2723A]/25"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-[#E2723A]">
                <Settings2 className="h-5 w-5" />
              </span>
              <ChevronLeft className="h-4 w-4 text-white/25 group-hover:text-[#E2723A]" />
            </div>
            <p className="mt-3 text-xs font-black">الإعدادات</p>
            <p className="mt-1 text-[9px] text-white/35">
              الإشعارات والأمان والتفضيلات
            </p>
          </button>
        </section>

        {/* Latest order + default address */}
        <section className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-white/[0.07] bg-[#0D3B4D] p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05] text-white/60">
                <Package className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-xs font-black">آخر طلب</h2>
                <p className="text-[8px] text-white/35">
                  ملخص سريع
                </p>
              </div>
            </div>

            {loadingOrders ? (
              <div className="mt-4 h-16 animate-pulse rounded-xl bg-white/[0.04]" />
            ) : latestOrder ? (
              <Link
                to="/orders"
                className="mt-3 block rounded-xl bg-white/[0.035] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p
                      dir="ltr"
                      className="font-mono text-[10px] font-bold text-white/75"
                    >
                      {latestOrder.order_number}
                    </p>
                    <p className="mt-1 text-[8px] text-white/35">
                      {formatDate(latestOrder.created_at)}
                    </p>
                  </div>

                  <div className="text-start">
                    <span className="inline-block rounded-full bg-[#E2723A]/10 px-2 py-0.5 text-[8px] font-bold text-[#E2723A]">
                      {STATUS_LABELS[latestOrder.status] ??
                        latestOrder.status}
                    </span>
                    <p className="mt-1 text-[8px] text-white/35">
                      {PAYMENT_LABELS[
                        latestOrder.payment_status
                      ] ?? latestOrder.payment_status}
                    </p>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-center">
                <p className="text-[9px] text-white/40">
                  لا توجد طلبات حتى الآن
                </p>
                <Link
                  to="/products"
                  className="mt-2 inline-block text-[9px] font-bold text-[#E2723A]"
                >
                  ابدأ التسوق
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-[18px] border border-white/[0.07] bg-[#0D3B4D] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05] text-white/60">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-xs font-black">
                    عنوان التوصيل
                  </h2>
                  <p className="text-[8px] text-white/35">
                    العنوان الافتراضي
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddressForm((value) => !value)
                }
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E2723A]/10 text-[#E2723A]"
                aria-label="إضافة عنوان"
              >
                {showAddressForm ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {loadingAddresses ? (
              <div className="mt-3 h-16 animate-pulse rounded-xl bg-white/[0.04]" />
            ) : defaultAddress ? (
              <div className="mt-3 rounded-xl bg-white/[0.035] p-3">
                <p className="text-[10px] font-bold">
                  {defaultAddress.label}
                </p>
                <p className="mt-1 text-[9px] text-white/50">
                  {defaultAddress.city}
                  {defaultAddress.district
                    ? ` — ${defaultAddress.district}`
                    : ""}
                </p>
                <p className="mt-1 line-clamp-2 text-[8px] text-white/30">
                  {defaultAddress.details}
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-center">
                <Home className="mx-auto h-5 w-5 text-white/20" />
                <p className="mt-2 text-[9px] text-white/40">
                  لم تضف عنواناً بعد
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Edit profile */}
        {editingProfile ? (
          <form
            onSubmit={saveProfile}
            className="mb-4 rounded-[18px] border border-white/[0.07] bg-[#0D3B4D] p-4"
          >
            <div className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-[#E2723A]" />
              <div>
                <h2 className="text-xs font-black">
                  البيانات الشخصية
                </h2>
                <p className="text-[8px] text-white/35">
                  تحديث الاسم ورقم الهاتف
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-[9px] font-semibold text-white/45">
                  الاسم الكامل
                </span>
                <input
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  maxLength={100}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0A2A38] px-3 text-xs text-[#F6F2EE] outline-none focus:border-[#E2723A]/60"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-[9px] font-semibold text-white/45">
                  رقم الهاتف
                </span>
                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  dir="ltr"
                  maxLength={20}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0A2A38] px-3 text-xs text-[#F6F2EE] outline-none focus:border-[#E2723A]/60"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-3 h-11 w-full rounded-xl bg-[#E2723A] text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </button>
          </form>
        ) : null}

        {/* Address form */}
        {showAddressForm ? (
          <form
            onSubmit={addAddress}
            className="mb-4 rounded-[18px] border border-white/[0.07] bg-[#0D3B4D] p-4"
          >
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#E2723A]" />
              <div>
                <h2 className="text-xs font-black">
                  إضافة عنوان
                </h2>
                <p className="text-[8px] text-white/35">
                  عنوان جديد للتوصيل
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={form.label}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="اسم العنوان"
                className="h-10 rounded-xl border border-white/10 bg-[#0A2A38] px-3 text-xs text-white outline-none focus:border-[#E2723A]/60"
              />
              <input
                value={form.recipient_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    recipient_name: event.target.value,
                  }))
                }
                placeholder="اسم المستلم *"
                className="h-10 rounded-xl border border-white/10 bg-[#0A2A38] px-3 text-xs text-white outline-none focus:border-[#E2723A]/60"
              />
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="رقم الهاتف"
                dir="ltr"
                className="h-10 rounded-xl border border-white/10 bg-[#0A2A38] px-3 text-xs text-white outline-none focus:border-[#E2723A]/60"
              />
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                placeholder="المدينة *"
                className="h-10 rounded-xl border border-white/10 bg-[#0A2A38] px-3 text-xs text-white outline-none focus:border-[#E2723A]/60"
              />
              <input
                value={form.district}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    district: event.target.value,
                  }))
                }
                placeholder="الحي / المنطقة"
                className="h-10 rounded-xl border border-white/10 bg-[#0A2A38] px-3 text-xs text-white outline-none focus:border-[#E2723A]/60"
              />
              <textarea
                value={form.details}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    details: event.target.value,
                  }))
                }
                placeholder="تفاصيل العنوان *"
                rows={2}
                className="resize-none rounded-xl border border-white/10 bg-[#0A2A38] px-3 py-2 text-xs text-white outline-none focus:border-[#E2723A]/60 sm:col-span-2"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-3 h-11 w-full rounded-xl bg-[#E2723A] text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? "جارٍ الحفظ..." : "حفظ العنوان"}
            </button>
          </form>
        ) : null}

        {/* Addresses */}
        {addresses.length > 0 ? (
          <section className="mb-4 rounded-[18px] border border-white/[0.07] bg-[#0D3B4D] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black">عناوينك</h2>
                <p className="mt-1 text-[8px] text-white/35">
                  إدارة عناوين التوصيل
                </p>
              </div>
              <MapPin className="h-4 w-4 text-[#E2723A]" />
            </div>

            <div className="space-y-2">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="rounded-xl bg-white/[0.035] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold">
                          {address.label}
                        </p>
                        {address.is_default ? (
                          <span className="rounded-full bg-[#E2723A]/10 px-2 py-0.5 text-[7px] font-bold text-[#E2723A]">
                            الافتراضي
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[9px] text-white/45">
                        {address.city}
                        {address.district
                          ? ` — ${address.district}`
                          : ""}
                      </p>
                      <p className="mt-1 text-[8px] text-white/30">
                        {address.details}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      {!address.is_default ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void makeDefault(address.id)
                          }
                          className="rounded-lg bg-white/[0.05] px-2 py-1 text-[7px] font-bold text-white/50"
                        >
                          افتراضي
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          void removeAddress(address.id)
                        }
                        className="rounded-lg bg-red-500/10 px-2 py-1 text-[7px] font-bold text-red-300"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Settings */}
        <section
          id="account-settings"
          className="mb-4 overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0D3B4D]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E2723A]/10 text-[#E2723A]">
              <Settings2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xs font-black">الإعدادات والتفضيلات</h2>
              <p className="mt-1 text-[8px] text-white/35">
                كل ما يخص الحساب بعيداً عن المحفظة
              </p>
            </div>
          </div>

          <div className="p-3">
            <div className="mb-3 rounded-xl bg-white/[0.025] p-3">
              <div className="mb-2 flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#E2723A]" />
                <p className="text-[10px] font-bold">
                  تفضيلات الإشعارات
                </p>
              </div>
              <div className="[&>*]:!border-white/[0.06] [&>*]:!bg-transparent">
                <NotificationPrefsPanel />
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.025] p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#E2723A]" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold">
                    أمان الحساب
                  </p>
                  <p className="mt-1 text-[8px] text-white/35">
                    المصادقة وحماية بيانات الحساب
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[7px] font-bold text-emerald-300">
                  محمي
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Logout */}
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-400/10 bg-red-400/[0.05] text-xs font-bold text-red-300 transition hover:bg-red-400/10"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>

        <p className="pb-2 text-center text-[8px] text-white/20">
          شهارة للتجارة والتسويق الإلكتروني
        </p>
      </main>

      <BottomNav />
    </div>
  );
}

export default AccountPage;
