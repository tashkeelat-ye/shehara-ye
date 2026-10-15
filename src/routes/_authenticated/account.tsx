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

const inputClass =
  "h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "mb-1.5 block text-sm font-semibold text-foreground";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "حسابي | شهارة" },
      {
        name: "description",
        content:
          "إدارة ملفك الشخصي وطلباتك وعناوين التوصيل وتفضيلاتك في متجر شهارة.",
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
      toast.error("تعذر تحميل عناوين التوصيل. حاول تحديث الصفحة.");
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
      case "admin": return "مدير";
      case "vendor": return "تاجر";
      case "courier": return "عامل توصيل";
      default: return "عميل";
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
      toast.success("تم تحديث بيانات حسابك.");
    } catch (error) {
      console.error("[Account] Failed to save profile:", error);
      toast.error(error instanceof Error ? error.message : "تعذر حفظ بيانات الحساب.");
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
      toast.error(error instanceof Error ? error.message : "تعذرت إضافة العنوان.");
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
        const { error: defaultError } = await supabase
          .from("addresses")
          .update({ is_default: true })
          .eq("id", remaining[0].id)
          .eq("user_id", user.id);
        if (defaultError) {
          console.error("[Account] Failed to choose replacement default:", defaultError);
        }
      }

      await loadAddresses();
      toast.success("تم حذف عنوان التوصيل.");
    } catch (error) {
      console.error("[Account] Failed to delete address:", error);
      toast.error("تعذر حذف العنوان. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    if (!window.confirm("هل تريد تسجيل الخروج من حسابك؟")) return;
    try {
      await signOut();
    } catch (error) {
      console.error("[Account] Sign out failed:", error);
      toast.error("تعذر تسجيل الخروج حالياً. حاول مرة أخرى.");
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-28 text-foreground transition-colors md:pb-10">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-8 pt-28 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              SHEHARA · حسابك
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              أهلاً بك، {profile?.full_name?.trim().split(/\s+/)[0] || "بك"}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              كل ما تحتاجه لإدارة طلباتك وبياناتك وتجربة التسوق في مكان واحد.
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShoppingBag className="h-4 w-4" />
            متابعة التسوق
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </header>

        <section className="mb-5 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="h-2 bg-gradient-to-l from-primary via-primary to-accent" />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-black text-primary-foreground shadow-sm sm:h-[72px] sm:w-[72px]">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-lg font-extrabold sm:text-xl">
                    {profile?.full_name || "ملفك الشخصي"}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/40 px-2.5 py-1 text-xs font-bold text-accent-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {roleLabel}
                  </span>
                </div>
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {profile?.phone || user?.email || "أضف بيانات التواصل الخاصة بك"}
                </p>
                {user?.email && profile?.phone ? (
                  <p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingProfile((current) => !current)}
              aria-expanded={editingProfile}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-bold transition hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {editingProfile ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {editingProfile ? "إلغاء التعديل" : "تعديل البيانات"}
            </button>
          </div>

          {editingProfile ? (
            <form onSubmit={saveProfile} className="border-t border-border bg-muted/30 p-5 sm:p-6">
              <div className="mb-4">
                <h3 className="text-base font-bold">بياناتك الشخصية</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  حدّث اسمك ورقم التواصل المستخدم في طلباتك.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="account-full-name" className={labelClass}>الاسم الكامل</label>
                  <input
                    id="account-full-name"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    minLength={3}
                    maxLength={120}
                    className={inputClass}
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>
                <div>
                  <label htmlFor="account-phone" className={labelClass}>رقم الهاتف</label>
                  <input
                    id="account-phone"
                    autoComplete="tel"
                    inputMode="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    maxLength={30}
                    className={`${inputClass} text-left`}
                    placeholder="رقم التواصل"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFullName(profile?.full_name ?? "");
                    setPhone(profile?.phone ?? "");
                    setEditingProfile(false);
                  }}
                  className="h-11 rounded-xl border border-border px-5 text-sm font-bold transition hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <section aria-label="روابط الحساب" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickLink to="/orders" icon={<Package className="h-5 w-5" />} title="طلباتي" description="تتبع الطلبات وحالتها" accent="primary" />
          <QuickLink to="/wallet" icon={<Wallet className="h-5 w-5" />} title="محفظتي" description="الرصيد والحركات المالية" accent="accent" />
          <QuickLink to="/favorites" icon={<Heart className="h-5 w-5" />} title="المفضلة" description="المنتجات المحفوظة" accent="primary" />
          <button
            type="button"
            onClick={() => document.getElementById("delivery-addresses")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="group rounded-2xl border border-border bg-card p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="mt-3 flex items-center justify-between gap-2">
              <span className="text-sm font-extrabold">عناوين التوصيل</span>
              <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">إدارة مواقع استلام طلباتك</span>
          </button>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="min-w-0 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Package className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold">أحدث الطلبات</h2>
                  <p className="mt-1 text-sm text-muted-foreground">نظرة سريعة على آخر مشترياتك</p>
                </div>
              </div>
              <Link to="/orders" className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-primary hover:underline">
                عرض الكل <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>

            {loadingOrders ? (
              <div className="space-y-3" aria-label="جارٍ تحميل الطلبات">
                {[1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-bold">لم تطلب شيئاً بعد</h3>
                <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-muted-foreground">
                  ستظهر طلباتك هنا بمجرد إتمام أول عملية شراء.
                </p>
                <Link to="/products" className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">
                  ابدأ التسوق <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {orders.map((order) => (
                  <li key={order.id}>
                    <Link to="/orders" className="flex flex-col gap-3 rounded-2xl border border-border/80 p-4 transition hover:border-primary/40 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-extrabold">طلب #{order.order_number}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" /> {formatDate(order.created_at)}
                        </p>
                        <p className="mt-2 text-sm font-bold">{formatPrice(Number(order.total) || 0)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <StatusPill
                          label={ORDER_STATUS[order.status] ?? order.status}
                          tone={order.status === "cancelled" ? "danger" : order.status === "delivered" ? "success" : "brand"}
                        />
                        <span className="text-xs text-muted-foreground">
                          {PAYMENT_STATUS[order.payment_status] ?? order.payment_status}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="delivery-addresses" className="min-w-0 scroll-mt-28 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/40 text-accent-foreground">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold">عناوين التوصيل</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {addresses.length === 0 ? "أضف عنوانك لتسهيل إتمام الطلب" : `${addresses.length} عنوان محفوظ`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddressForm((current) => !current)}
                aria-expanded={showAddressForm}
                aria-label={showAddressForm ? "إغلاق نموذج العنوان" : "إضافة عنوان"}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showAddressForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>

            {showAddressForm ? (
              <form onSubmit={addAddress} className="mb-4 space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-extrabold">إضافة عنوان جديد</h3>
                <div>
                  <label htmlFor="address-label" className={labelClass}>اسم العنوان</label>
                  <select
                    id="address-label"
                    value={addressForm.label}
                    onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))}
                    className={inputClass}
                  >
                    <option value="المنزل">المنزل</option>
                    <option value="العمل">العمل</option>
                    <option value="عنوان آخر">عنوان آخر</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="address-recipient" className={labelClass}>اسم المستلم <span className="text-destructive">*</span></label>
                  <input
                    id="address-recipient"
                    autoComplete="name"
                    value={addressForm.recipient_name}
                    onChange={(event) => setAddressForm((current) => ({ ...current, recipient_name: event.target.value }))}
                    required maxLength={120} className={inputClass} placeholder="اسم الشخص الذي سيستلم الطلب"
                  />
                </div>
                <div>
                  <label htmlFor="address-phone" className={labelClass}>رقم الهاتف</label>
                  <input
                    id="address-phone" autoComplete="tel" inputMode="tel" dir="ltr"
                    value={addressForm.phone}
                    onChange={(event) => setAddressForm((current) => ({ ...current, phone: event.target.value }))}
                    maxLength={30} className={`${inputClass} text-left`} placeholder="رقم التواصل للمستلم"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="address-city" className={labelClass}>المدينة <span className="text-destructive">*</span></label>
                    <input
                      id="address-city" autoComplete="address-level2" value={addressForm.city}
                      onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))}
                      required maxLength={100} className={inputClass} placeholder="المدينة"
                    />
                  </div>
                  <div>
                    <label htmlFor="address-district" className={labelClass}>الحي / المنطقة</label>
                    <input
                      id="address-district" autoComplete="address-level3" value={addressForm.district}
                      onChange={(event) => setAddressForm((current) => ({ ...current, district: event.target.value }))}
                      maxLength={120} className={inputClass} placeholder="الحي أو المنطقة"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="address-details" className={labelClass}>تفاصيل العنوان <span className="text-destructive">*</span></label>
                  <textarea
                    id="address-details" autoComplete="street-address" value={addressForm.details}
                    onChange={(event) => setAddressForm((current) => ({ ...current, details: event.target.value }))}
                    required maxLength={500} rows={3}
                    className={`${inputClass} h-auto min-h-24 resize-y py-3`}
                    placeholder="اسم الشارع، رقم المبنى، أقرب معلم..."
                  />
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => { setAddressForm({ ...EMPTY_ADDRESS }); setShowAddressForm(false); }}
                    className="h-11 rounded-xl border border-border px-4 text-sm font-bold hover:bg-muted"
                  >
                    إلغاء
                  </button>
                  <button type="submit" disabled={saving} className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                    {saving ? "جارٍ الحفظ..." : "حفظ العنوان"}
                  </button>
                </div>
              </form>
            ) : null}

            {loadingAddresses ? (
              <div className="space-y-3" aria-label="جارٍ تحميل العناوين">
                {[1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            ) : addresses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-7 text-center">
                <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-bold">لا توجد عناوين محفوظة</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">أضف عنوان التوصيل لتسهيل طلباتك القادمة.</p>
                {!showAddressForm ? (
                  <button type="button" onClick={() => setShowAddressForm(true)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
                    <Plus className="h-4 w-4" /> إضافة أول عنوان
                  </button>
                ) : null}
              </div>
            ) : (
              <ul className="space-y-3">
                {addresses.map((address) => (
                  <li key={address.id} className="rounded-2xl border border-border/80 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-primary">
                        <MapPin className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-extrabold">{address.label || "عنوان التوصيل"}</h3>
                          {address.is_default ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                              <Check className="h-3 w-3" /> الافتراضي
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm font-semibold">{address.recipient_name}</p>
                        {address.phone ? <p dir="ltr" className="mt-1 text-start text-sm text-muted-foreground">{address.phone}</p> : null}
                        <p className="mt-2 text-sm text-muted-foreground">{[address.city, address.district].filter(Boolean).join("، ")}</p>
                        <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{address.details}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!address.is_default ? (
                            <button
                              type="button" disabled={saving} onClick={() => void makeDefault(address.id)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold hover:border-primary/40 hover:text-primary disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" /> تعيين كافتراضي
                            </button>
                          ) : null}
                          <button
                            type="button" disabled={saving} onClick={() => void removeAddress(address)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/20 px-3 text-xs font-bold text-destructive hover:bg-destructive/5 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> حذف العنوان
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <BellRing className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold">الإشعارات والتفضيلات</h2>
              <p className="mt-1 text-sm text-muted-foreground">اختر أنواع التنبيهات التي ترغب في استقبالها.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background p-3 sm:p-4">
            <NotificationPrefsPanel />
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-extrabold">المساعدة والحساب</h2>
          <p className="mt-1 text-sm text-muted-foreground">تحتاج إلى مساعدة أو تريد إنهاء جلستك؟</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link to="/faq" className="flex min-h-16 items-center gap-3 rounded-2xl border border-border p-4 transition hover:border-primary/40 hover:bg-muted/30">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-primary"><CircleHelp className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">مركز المساعدة</span>
                <span className="mt-1 block text-xs text-muted-foreground">الأسئلة الشائعة عن الطلبات والتوصيل</span>
              </span>
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </Link>
            <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-border p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-primary"><ShieldCheck className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">حافظ على أمان حسابك</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">لا تشارك كلمة المرور أو رموز التحقق مع أي شخص.</span>
              </span>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm font-extrabold text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">شهارة · تسوّق بلا حدود</p>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function QuickLink({
  to,
  icon,
  title,
  description,
  accent,
}: {
  to: "/orders" | "/wallet" | "/favorites";
  icon: ReactNode;
  title: string;
  description: string;
  accent: "primary" | "accent";
}) {
  const iconClass =
    accent === "accent"
      ? "bg-accent/40 text-accent-foreground group-hover:bg-accent"
      : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground";

  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${iconClass}`}>{icon}</span>
      <span className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm font-extrabold">{title}</span>
        <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
      </span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
    </Link>
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
        : "bg-primary/10 text-primary";

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>{label}</span>;
}

export default AccountPage;
