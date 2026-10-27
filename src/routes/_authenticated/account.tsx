import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BellRing,
  Check,
  ChevronLeft,
  CircleHelp,
  Clock3,
  Edit3,
  Heart,
  LogOut,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/bottom-nav";
import { NotificationPrefsPanel } from "@/components/notification-prefs";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
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

type AddressForm = {
  label: string;
  recipient_name: string;
  phone: string;
  city: string;
  district: string;
  details: string;
};

const EMPTY_ADDRESS: AddressForm = {
  label: "المنزل",
  recipient_name: "",
  phone: "",
  city: "",
  district: "",
  details: "",
};

const ORDER_STATUS: Record<string, string> = {
  pending: "بانتظار التأكيد",
  awaiting_payment: "بانتظار الدفع",
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const PAYMENT_STATUS: Record<string, string> = {
  unpaid: "غير مدفوع",
  pending: "قيد المراجعة",
  paid: "مدفوع",
  rejected: "مرفوض",
};

const fieldClass =
  "min-h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[#0E4D64] focus:ring-2 focus:ring-[#0E4D64]/20 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "mb-1 block text-xs font-bold text-foreground";
const panelClass =
  "min-w-0 rounded-2xl border border-border/80 bg-card shadow-sm";
const sectionTitleClass = "text-sm font-extrabold tracking-tight text-foreground sm:text-base";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "حسابي | شهارة" },
      {
        name: "description",
        content:
          "إدارة الملف الشخصي والطلبات وعناوين التوصيل وتفضيلات حسابك في متجر شهارة.",
      },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, profile, role, refreshProfile, signOut } = useAuth();
  const formatPrice = useFormatPrice();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [addressForm, setAddressForm] = useState<AddressForm>({ ...EMPTY_ADDRESS });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [saving, setSaving] = useState(false);

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
        .select("id,label,recipient_name,phone,city,district,details,is_default")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<Address[]>();

      if (error) throw error;
      setAddresses(data ?? []);
    } catch (error) {
      console.error("[Account] Failed to load addresses:", error);
      toast.error("تعذر تحميل عناوين التوصيل.");
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
        .select("id,order_number,status,payment_status,total,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3)
        .returns<RecentOrder[]>();

      if (error) throw error;
      setOrders(data ?? []);
    } catch (error) {
      console.error("[Account] Failed to load orders:", error);
      toast.error("تعذر تحميل ملخص الطلبات.");
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
        return "مدير النظام";
      case "vendor":
        return "تاجر معتمد";
      case "courier":
        return "مندوب توصيل";
      default:
        return "عميل شهارة";
    }
  }, [role]);

  const initials = useMemo(() => {
    const name = profile?.full_name?.trim();
    if (!name) return "ش";
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.length > 1
      ? `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`
      : name.charAt(0);
  }, [profile?.full_name]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "بك";
  const defaultAddress = addresses.find((address) => address.is_default) ?? null;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.id) {
      toast.error("يرجى تسجيل الدخول أولاً.");
      return;
    }
    if (fullName.trim().length < 3) {
      toast.error("يرجى إدخال الاسم الكامل بشكل صحيح.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() })
        .eq("id", user.id);

      if (error) throw error;
      await refreshProfile();
      setEditingProfile(false);
      toast.success("تم تحديث بيانات الحساب بنجاح.");
    } catch (error) {
      console.error("[Account] Failed to save profile:", error);
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ بيانات الحساب."
      );
    } finally {
      setSaving(false);
    }
  }

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.id) {
      toast.error("يرجى تسجيل الدخول أولاً.");
      return;
    }
    if (
      !addressForm.recipient_name.trim() ||
      !addressForm.city.trim() ||
      !addressForm.details.trim()
    ) {
      toast.error("أكمل اسم المستلم والمدينة وتفاصيل العنوان.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("addresses").insert({
        user_id: user.id,
        label: addressForm.label.trim() || "العنوان",
        recipient_name: addressForm.recipient_name.trim(),
        phone: addressForm.phone.trim(),
        city: addressForm.city.trim(),
        district: addressForm.district.trim(),
        details: addressForm.details.trim(),
        is_default: addresses.length === 0,
      });

      if (error) throw error;
      setAddressForm({ ...EMPTY_ADDRESS });
      setShowAddressForm(false);
      await loadAddresses();
      toast.success("تمت إضافة عنوان التوصيل.");
    } catch (error) {
      console.error("[Account] Failed to add address:", error);
      toast.error(
        error instanceof Error ? error.message : "تعذرت إضافة العنوان."
      );
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(addressId: string) {
    if (!user?.id || saving) return;

    setSaving(true);
    try {
      const { error: clearError } = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);
      if (clearError) throw clearError;

      const { error: setError } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addressId)
        .eq("user_id", user.id);
      if (setError) throw setError;

      await loadAddresses();
      toast.success("تم تعيين العنوان الافتراضي.");
    } catch (error) {
      console.error("[Account] Failed to set default address:", error);
      await loadAddresses();
      toast.error("تعذر تحديث العنوان الافتراضي.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAddress(address: Address) {
    if (!user?.id || saving) return;
    if (!window.confirm(`هل تريد حذف عنوان «${address.label || address.city}»؟`)) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", address.id)
        .eq("user_id", user.id);
      if (error) throw error;

      const remaining = addresses.filter((item) => item.id !== address.id);
      if (address.is_default && remaining.length > 0) {
        await supabase
          .from("addresses")
          .update({ is_default: true })
          .eq("id", remaining[0].id)
          .eq("user_id", user.id);
      }

      await loadAddresses();
      toast.success("تم حذف عنوان التوصيل.");
    } catch (error) {
      console.error("[Account] Failed to delete address:", error);
      toast.error("تعذر حذف العنوان.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    if (!window.confirm("هل تريد بالتأكيد تسجيل الخروج؟")) return;
    try {
      await signOut();
    } catch (error) {
      console.error("[Account] Sign out failed:", error);
      toast.error("تعذر تسجيل الخروج حالياً.");
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen min-w-0 overflow-x-clip bg-background pb-28 text-foreground transition-colors"
    >
      <SiteHeader />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-3 pb-8 pt-3 sm:px-5 sm:pt-5 lg:px-8">
        {/* الترويسة العليا */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-[#0E4D64] dark:text-[#197494]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D65A31]" />
              مساحة حسابك في شهارة
            </p>
            <h1 className="mt-1.5 text-xl font-black tracking-tight sm:text-2xl">
              أهلاً {firstName}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              إدارة طلباتك، بياناتك الشخصية، وعناوين التوصيل في مكان واحد.
            </p>
          </div>

          <Link
            to="/products"
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0E4D64] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#0E4D64]/90 sm:w-auto"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            متابعة التسوق
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* بطاقة الملف الشخصي */}
        <section className={`${panelClass} mb-5 overflow-hidden`}>
          <div className="h-1.5 bg-gradient-to-l from-[#0E4D64] via-[#0E4D64] to-[#D65A31]" />
          <div className="p-4 sm:p-5">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0E4D64] text-lg font-black text-white shadow-sm sm:h-14 sm:w-14 sm:text-xl">
                  {initials}
                  <span
                    className="absolute -bottom-1 -left-1 grid h-4 w-4 place-items-center rounded-full border-2 border-card bg-[#D65A31] text-white"
                    aria-hidden="true"
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-black sm:text-base">
                      {profile?.full_name || "المستخدم"}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#0E4D64]/10 px-2 py-0.5 text-[11px] font-extrabold text-[#0E4D64] dark:bg-white/10 dark:text-white/90">
                      <ShieldCheck className="h-3 w-3" />
                      {roleLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {profile?.phone || user?.email || "أضف بيانات التواصل"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingProfile((cur) => !cur)}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold transition hover:bg-muted"
              >
                {editingProfile ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Edit3 className="h-3.5 w-3.5" />
                )}
                {editingProfile ? "إلغاء التعديل" : "تعديل البيانات"}
              </button>
            </div>

            {editingProfile ? (
              <form
                onSubmit={saveProfile}
                className="mt-4 border-t border-border/80 pt-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="account-full-name" className={labelClass}>
                      الاسم الكامل
                    </label>
                    <input
                      id="account-full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      minLength={3}
                      maxLength={120}
                      className={fieldClass}
                      placeholder="اسمك الكامل"
                    />
                  </div>
                  <div>
                    <label htmlFor="account-phone" className={labelClass}>
                      رقم الهاتف
                    </label>
                    <input
                      id="account-phone"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={30}
                      className={`${fieldClass} text-left`}
                      placeholder="770000000"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="min-h-10 rounded-xl border border-border px-4 py-2 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-10 rounded-xl bg-[#0E4D64] px-5 py-2 text-xs font-extrabold text-white transition hover:bg-[#0E4D64]/90 disabled:opacity-50"
                  >
                    {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </section>

        {/* شبكة الاختصارات السريعة */}
        <section aria-label="اختصارات الحساب" className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <QuickLink
            to="/orders"
            icon={<Package className="h-4 w-4" />}
            title="طلباتي"
            description="متابعة حالة الشحن"
          />
          <QuickLink
            to="/wallet"
            icon={<Wallet className="h-4 w-4" />}
            title="محفظتي"
            description="الرصيد والحركات"
          />
          <QuickLink
            to="/favorites"
            icon={<Heart className="h-4 w-4" />}
            title="المفضلة"
            description="المنتجات المحفوظة"
          />
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("delivery-addresses")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="group min-w-0 rounded-2xl border border-border/80 bg-card p-3 text-start shadow-sm transition hover:border-[#0E4D64]/40 hover:shadow-md"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#D65A31]/15 text-[#D65A31] transition group-hover:bg-[#D65A31] group-hover:text-white">
              <MapPin className="h-4 w-4" />
            </span>
            <span className="mt-2.5 flex items-center justify-between gap-1">
              <span className="truncate text-xs font-extrabold">العناوين</span>
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#0E4D64]" />
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {addresses.length > 0
                ? `${addresses.length.toLocaleString("ar-YE")} عنوان محفوظ`
                : "إدارة المواقع"}
            </span>
          </button>
        </section>

        {/* الطلبات الأخيرة والعناوين */}
        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          {/* قسم الطلبات الأخيرة */}
          <section className={`${panelClass} p-4 sm:p-5`}>
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <IconTile>
                  <Package className="h-4 w-4" />
                </IconTile>
                <div>
                  <h2 className={sectionTitleClass}>أحدث الطلبات</h2>
                  <p className="text-[11px] text-muted-foreground">
                    نظرة على آخر مشترياتك
                  </p>
                </div>
              </div>
              <Link
                to="/orders"
                className="inline-flex items-center gap-1 text-xs font-extrabold text-[#0E4D64] hover:underline dark:text-[#2890b3]"
              >
                عرض الكل
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loadingOrders ? (
              <div className="space-y-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-5 w-5" />}
                title="لا توجد طلبات حتى الآن"
                description="عندما تشتري من شهارة، ستجد تفاصيل طلباتك هنا."
                action={
                  <Link
                    to="/products"
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[#0E4D64] px-3.5 py-2 text-xs font-extrabold text-white"
                  >
                    ابدأ التسوق
                    <ArrowLeft className="h-3 w-3" />
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-2.5">
                {orders.map((order) => (
                  <li
                    key={order.id}
                    className="rounded-xl border border-border/80 bg-background/60 p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                        <Package className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <p className="text-xs font-extrabold">
                            طلب #{order.order_number}
                          </p>
                          <StatusPill
                            label={ORDER_STATUS[order.status] ?? order.status}
                            tone={
                              order.status === "delivered"
                                ? "success"
                                : order.status === "cancelled"
                                ? "danger"
                                : "brand"
                            }
                          />
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          {formatDate(order.created_at)}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="font-black text-[#D65A31]">
                            {formatPrice(order.total)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            الدفع: {PAYMENT_STATUS[order.payment_status] ?? order.payment_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* قسم عناوين التوصيل */}
          <section
            id="delivery-addresses"
            className={`${panelClass} scroll-mt-28 p-4 sm:p-5`}
          >
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <IconTile tone="accent">
                  <MapPin className="h-4 w-4" />
                </IconTile>
                <div>
                  <h2 className={sectionTitleClass}>عناوين التوصيل</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {defaultAddress
                      ? `الافتراضي: ${defaultAddress.city}`
                      : "احفظ عنوانك لتسهيل الشحن"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddressForm((cur) => !cur)}
                className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-[#0E4D64] px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-[#0E4D64]/90"
              >
                {showAddressForm ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {showAddressForm ? "إلغاء" : "إضافة"}
              </button>
            </div>

            {showAddressForm ? (
              <form
                onSubmit={addAddress}
                className="mb-3.5 space-y-3 rounded-xl border border-border bg-muted/40 p-3"
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="address-label" className={labelClass}>
                      التسمية
                    </label>
                    <select
                      id="address-label"
                      value={addressForm.label}
                      onChange={(e) =>
                        setAddressForm((cur) => ({ ...cur, label: e.target.value }))
                      }
                      className={fieldClass}
                    >
                      <option value="المنزل">المنزل</option>
                      <option value="العمل">العمل</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="address-recipient" className={labelClass}>
                      اسم المستلم
                    </label>
                    <input
                      id="address-recipient"
                      value={addressForm.recipient_name}
                      onChange={(e) =>
                        setAddressForm((cur) => ({
                          ...cur,
                          recipient_name: e.target.value,
                        }))
                      }
                      required
                      className={fieldClass}
                      placeholder="اسم المستلم"
                    />
                  </div>
                  <div>
                    <label htmlFor="address-phone" className={labelClass}>
                      رقم الهاتف
                    </label>
                    <input
                      id="address-phone"
                      dir="ltr"
                      value={addressForm.phone}
                      onChange={(e) =>
                        setAddressForm((cur) => ({ ...cur, phone: e.target.value }))
                      }
                      className={`${fieldClass} text-left`}
                      placeholder="رقم التواصل"
                    />
                  </div>
                  <div>
                    <label htmlFor="address-city" className={labelClass}>
                      المدينة / المحافظة
                    </label>
                    <input
                      id="address-city"
                      value={addressForm.city}
                      onChange={(e) =>
                        setAddressForm((cur) => ({ ...cur, city: e.target.value }))
                      }
                      required
                      className={fieldClass}
                      placeholder="مثال: صنعاء، عدن..."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="address-details" className={labelClass}>
                      تفاصيل العنوان
                    </label>
                    <input
                      id="address-details"
                      value={addressForm.details}
                      onChange={(e) =>
                        setAddressForm((cur) => ({ ...cur, details: e.target.value }))
                      }
                      required
                      className={fieldClass}
                      placeholder="الشارع، رقم المبنى، أقرب معلم..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="min-h-9 rounded-xl border border-border px-3 py-1.5 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-9 rounded-xl bg-[#0E4D64] px-4 py-1.5 text-xs font-extrabold text-white disabled:opacity-50"
                  >
                    {saving ? "جارٍ الحفظ..." : "حفظ العنوان"}
                  </button>
                </div>
              </form>
            ) : null}

            {loadingAddresses ? (
              <div className="space-y-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <EmptyState
                icon={<MapPin className="h-5 w-5" />}
                title="لا توجد عناوين محفوظة"
                description="احفظ عنوان التوصيل لتسهيل استلام طلباتك."
              />
            ) : (
              <ul className="space-y-2.5">
                {addresses.map((address) => (
                  <li
                    key={address.id}
                    className="rounded-xl border border-border/80 bg-background/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-black">
                            {address.label || "العنوان"}
                          </h3>
                          {address.is_default ? (
                            <span className="rounded-full bg-[#0E4D64]/10 px-2 py-0.5 text-[10px] font-bold text-[#0E4D64]">
                              الافتراضي
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {address.recipient_name} - {address.city}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {address.details}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {!address.is_default ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void makeDefault(address.id)}
                            className="rounded-lg border border-border px-2 py-1 text-[11px] font-bold transition hover:bg-muted"
                          >
                            تعيين كافتراضي
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void removeAddress(address)}
                          className="rounded-lg p-1.5 text-destructive transition hover:bg-destructive/10"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* تفضيلات الإشعارات */}
        <section className={`${panelClass} mt-5 p-4 sm:p-5`}>
          <div className="mb-3.5 flex items-center gap-2.5">
            <IconTile tone="accent">
              <BellRing className="h-4 w-4" />
            </IconTile>
            <div>
              <h2 className={sectionTitleClass}>تفضيلات الإشعارات</h2>
              <p className="text-[11px] text-muted-foreground">
                تحكم في التنبيهات التي تصلك على هاتفك.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background p-2 sm:p-3">
            <NotificationPrefsPanel />
          </div>
        </section>

        {/* المساعدة وتسجيل الخروج */}
        <section className="mt-5 space-y-3">
          <Link
            to="/faq"
            className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-border/80 bg-card p-3.5 transition hover:border-[#0E4D64]/50 hover:bg-muted/30"
          >
            <IconTile>
              <CircleHelp className="h-4 w-4" />
            </IconTile>
            <span className="flex-1">
              <span className="block text-xs font-black sm:text-sm">مركز المساعدة والأسئلة الشائعة</span>
              <span className="block text-[11px] text-muted-foreground">
                إجابات استفسارات الشحن والدفع والضمان
              </span>
            </span>
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </Link>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-2.5 text-xs font-extrabold text-destructive transition hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج من الحساب
          </button>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

function IconTile({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "accent";
}) {
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
        tone === "accent"
          ? "bg-[#D65A31]/15 text-[#D65A31]"
          : "bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-white/10 dark:text-white"
      }`}
    >
      {children}
    </span>
  );
}

function QuickLink({
  to,
  icon,
  title,
  description,
}: {
  to: "/orders" | "/wallet" | "/favorites";
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group min-w-0 rounded-2xl border border-border/80 bg-card p-3 text-start shadow-sm transition hover:border-[#0E4D64]/40 hover:shadow-md"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64] transition group-hover:bg-[#0E4D64] group-hover:text-white sm:h-10 sm:w-10">
        {icon}
      </span>
      <span className="mt-2.5 flex items-center justify-between gap-1">
        <span className="truncate text-xs font-extrabold">{title}</span>
        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#0E4D64]" />
      </span>
      <span className="mt-0.5 block text-[11px] text-muted-foreground">
        {description}
      </span>
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-muted text-[#0E4D64]">
        {icon}
      </span>
      <p className="mt-2 text-xs font-extrabold">{title}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "brand" | "success" | "danger";
}) {
  const classes =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "danger"
      ? "bg-destructive/10 text-destructive"
      : "bg-[#0E4D64]/10 text-[#0E4D64] dark:bg-white/10 dark:text-white";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${classes}`}
    >
      {label}
    </span>
  );
}

export default AccountPage;
