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
  "min-h-12 w-full min-w-0 rounded-xl border border-input bg-background px-3 py-3 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3.5 sm:text-sm";
const labelClass = "mb-1.5 block text-sm font-bold text-foreground";
const panelClass =
  "min-w-0 rounded-3xl border border-border/80 bg-card shadow-sm";
const sectionTitleClass = "text-base font-extrabold tracking-tight text-foreground";

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
      toast.success("تم تحديث بيانات حسابك.");
    } catch (error) {
      console.error("[Account] Failed to save profile:", error);
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ بيانات الحساب.",
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
        error instanceof Error ? error.message : "تعذرت إضافة العنوان.",
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
        const { error: defaultError } = await supabase
          .from("addresses")
          .update({ is_default: true })
          .eq("id", remaining[0].id)
          .eq("user_id", user.id);
        if (defaultError) {
          console.error(
            "[Account] Failed to choose replacement default:",
            defaultError,
          );
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
    <div
      dir="rtl"
      className="min-h-screen min-w-0 overflow-x-clip bg-background pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-foreground transition-colors md:pb-10"
    >
      <SiteHeader />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-3 pb-8 pt-4 sm:px-5 sm:pt-5 lg:px-8 lg:pt-6">
        <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-extrabold tracking-wide text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              مساحة حسابك في شهارة
            </p>
            <h1 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">
              أهلاً {firstName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              تابع طلباتك، وحدّث بياناتك، واحفظ عناوين التوصيل في مكان واحد.
            </p>
          </div>

          <Link
            to="/products"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-[var(--shadow-brand)] transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
          >
            <ShoppingBag className="h-4 w-4" />
            متابعة التسوق
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <section className={`${panelClass} mb-5 overflow-hidden`}>
          <div className="h-1.5 bg-gradient-to-l from-primary via-primary to-accent" />
          <div className="p-4 sm:p-6">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4">
                <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-black text-primary-foreground shadow-[var(--shadow-brand)] sm:h-[68px] sm:w-[68px] sm:text-2xl">
                  {initials}
                  <span
                    className="absolute -bottom-1 -left-1 grid h-5 w-5 place-items-center rounded-full border-2 border-card bg-accent text-accent-foreground"
                    aria-hidden="true"
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="max-w-full break-words [overflow-wrap:anywhere] text-base font-black sm:text-lg">
                      {profile?.full_name || "ملفك الشخصي"}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {roleLabel}
                    </span>
                  </div>
                  <p className="mt-1 break-all [overflow-wrap:anywhere] text-sm text-muted-foreground">
                    {profile?.phone || user?.email || "أضف بيانات التواصل الخاصة بك"}
                  </p>
                  {user?.email && profile?.phone ? (
                    <p className="mt-1 break-all [overflow-wrap:anywhere] text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingProfile((current) => !current)}
                aria-expanded={editingProfile}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-extrabold transition hover:border-ring/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
              >
                {editingProfile ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Edit3 className="h-4 w-4" />
                )}
                {editingProfile ? "إلغاء التعديل" : "تعديل البيانات"}
              </button>
            </div>

            {editingProfile ? (
              <form
                onSubmit={saveProfile}
                className="mt-5 border-t border-border/80 pt-5"
              >
                <div className="mb-4">
                  <h3 className={sectionTitleClass}>بياناتك الشخصية</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    استخدم بيانات تواصل صحيحة لتسهيل متابعة طلباتك.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="account-full-name" className={labelClass}>
                      الاسم الكامل
                    </label>
                    <input
                      id="account-full-name"
                      autoComplete="name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      required
                      minLength={3}
                      maxLength={120}
                      className={fieldClass}
                      placeholder="أدخل اسمك الكامل"
                    />
                  </div>
                  <div>
                    <label htmlFor="account-phone" className={labelClass}>
                      رقم الهاتف
                    </label>
                    <input
                      id="account-phone"
                      autoComplete="tel"
                      inputMode="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      maxLength={30}
                      className={`${fieldClass} text-left`}
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
                    className="min-h-11 rounded-xl border border-border px-5 py-2.5 text-sm font-bold transition hover:bg-muted"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </section>

        <section aria-label="اختصارات الحساب" className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3 lg:grid-cols-4">
          <QuickLink
            to="/orders"
            icon={<Package className="h-5 w-5" />}
            title="طلباتي"
            description="تتبع الطلبات وحالتها"
          />
          <QuickLink
            to="/wallet"
            icon={<Wallet className="h-5 w-5" />}
            title="محفظتي"
            description="الرصيد والحركات المالية"
          />
          <QuickLink
            to="/favorites"
            icon={<Heart className="h-5 w-5" />}
            title="المفضلة"
            description="منتجاتك المحفوظة"
          />
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("delivery-addresses")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="group min-w-0 rounded-2xl border border-border/80 bg-card p-3.5 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-ring/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/50 text-accent-foreground transition group-hover:bg-accent sm:h-11 sm:w-11">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="mt-3 flex items-center justify-between gap-1">
              <span className="truncate text-sm font-extrabold">العناوين</span>
              <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {addresses.length > 0
                ? `${addresses.length.toLocaleString("ar")} عنوان محفوظ`
                : "إدارة مواقع الاستلام"}
            </span>
          </button>
        </section>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className={`${panelClass} p-4 sm:p-6`}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <IconTile>
                  <Package className="h-5 w-5" />
                </IconTile>
                <div className="min-w-0">
                  <h2 className={sectionTitleClass}>أحدث الطلبات</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    نظرة سريعة على آخر مشترياتك
                  </p>
                </div>
              </div>
              <Link
                to="/orders"
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-extrabold text-primary transition hover:bg-primary/5"
              >
                عرض الكل
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>

            {loadingOrders ? (
              <div className="space-y-3" aria-label="جارٍ تحميل الطلبات">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-2xl bg-muted"
                  />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-6 w-6" />}
                title="لا توجد طلبات حتى الآن"
                description="عندما تشتري من شهارة، ستجد تفاصيل طلباتك هنا."
                action={
                  <Link
                    to="/products"
                    className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground"
                  >
                    ابدأ التسوق
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {orders.map((order) => (
                  <li
                    key={order.id}
                    className="rounded-2xl border border-border/80 bg-background/60 p-3.5 transition hover:border-ring/40 sm:p-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Package className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-all text-sm font-extrabold">
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
                        <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDate(order.created_at)}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-black tabular-nums">
                            {formatPrice(order.total)}
                          </span>
                          <span className="min-w-0 break-words text-xs text-muted-foreground">
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

          <section
            id="delivery-addresses"
            className={`${panelClass} scroll-mt-28 p-4 sm:p-6`}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <IconTile tone="accent">
                  <MapPin className="h-5 w-5" />
                </IconTile>
                <div className="min-w-0">
                  <h2 className={sectionTitleClass}>عناوين التوصيل</h2>
                  <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                    {defaultAddress
                      ? `العنوان الافتراضي: ${defaultAddress.city}`
                      : "احفظ عنوانك لتسهيل الطلبات القادمة"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddressForm((current) => !current)}
                aria-expanded={showAddressForm}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-extrabold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3.5"
              >
                {showAddressForm ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {showAddressForm ? "إلغاء" : "إضافة عنوان"}
                </span>
                <span className="sm:hidden">
                  {showAddressForm ? "إلغاء" : "إضافة"}
                </span>
              </button>
            </div>

            {showAddressForm ? (
              <form
                onSubmit={addAddress}
                className="mb-4 space-y-4 rounded-2xl border border-border bg-muted/30 p-3.5 sm:p-4"
              >
                <div>
                  <h3 className="text-sm font-extrabold">عنوان توصيل جديد</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    أدخل التفاصيل التي تساعد المندوب على الوصول إليك.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="address-label" className={labelClass}>
                      تسمية العنوان
                    </label>
                    <select
                      id="address-label"
                      value={addressForm.label}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          label: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="المنزل">المنزل</option>
                      <option value="العمل">العمل</option>
                      <option value="عنوان آخر">عنوان آخر</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="address-recipient" className={labelClass}>
                      اسم المستلم <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="address-recipient"
                      autoComplete="name"
                      value={addressForm.recipient_name}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          recipient_name: event.target.value,
                        }))
                      }
                      required
                      maxLength={120}
                      className={fieldClass}
                      placeholder="اسم الشخص الذي سيستلم الطلب"
                    />
                  </div>
                  <div>
                    <label htmlFor="address-phone" className={labelClass}>
                      رقم الهاتف
                    </label>
                    <input
                      id="address-phone"
                      autoComplete="tel"
                      inputMode="tel"
                      dir="ltr"
                      value={addressForm.phone}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      maxLength={30}
                      className={`${fieldClass} text-left`}
                      placeholder="رقم التواصل"
                    />
                  </div>
                  <div>
                    <label htmlFor="address-city" className={labelClass}>
                      المدينة <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="address-city"
                      autoComplete="address-level2"
                      value={addressForm.city}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                      required
                      maxLength={100}
                      className={fieldClass}
                      placeholder="المدينة"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="address-district" className={labelClass}>
                      الحي / المنطقة
                    </label>
                    <input
                      id="address-district"
                      autoComplete="address-level3"
                      value={addressForm.district}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          district: event.target.value,
                        }))
                      }
                      maxLength={120}
                      className={fieldClass}
                      placeholder="الحي أو المنطقة"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="address-details" className={labelClass}>
                      تفاصيل العنوان <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      id="address-details"
                      autoComplete="street-address"
                      value={addressForm.details}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          details: event.target.value,
                        }))
                      }
                      required
                      maxLength={500}
                      rows={3}
                      className={`${fieldClass} min-h-24 resize-y`}
                      placeholder="اسم الشارع، رقم المبنى، أقرب معلم..."
                    />
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setAddressForm({ ...EMPTY_ADDRESS });
                      setShowAddressForm(false);
                    }}
                    className="min-h-11 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:bg-muted"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    {saving ? "جارٍ الحفظ..." : "حفظ العنوان"}
                  </button>
                </div>
              </form>
            ) : null}

            {loadingAddresses ? (
              <div className="space-y-3" aria-label="جارٍ تحميل العناوين">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-2xl bg-muted"
                  />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <EmptyState
                icon={<MapPin className="h-6 w-6" />}
                title="لا توجد عناوين محفوظة"
                description="أضف عنوان التوصيل لتسهيل إتمام مشترياتك القادمة."
                action={
                  !showAddressForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(true)}
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      إضافة أول عنوان
                    </button>
                  ) : null
                }
              />
            ) : (
              <ul className="space-y-3">
                {addresses.map((address) => (
                  <li
                    key={address.id}
                    className="rounded-2xl border border-border/80 bg-background/60 p-3.5 sm:p-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <MapPin className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-sm font-extrabold">
                            {address.label || "عنوان التوصيل"}
                          </h3>
                          {address.is_default ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-extrabold text-primary">
                              <Check className="h-3 w-3" />
                              الافتراضي
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 break-words text-sm font-semibold">
                          {address.recipient_name}
                        </p>
                        {address.phone ? (
                          <p
                            dir="ltr"
                            className="mt-1 break-all text-start text-sm text-muted-foreground"
                          >
                            {address.phone}
                          </p>
                        ) : null}
                        <p className="mt-2 break-words text-sm text-muted-foreground">
                          {[address.city, address.district]
                            .filter(Boolean)
                            .join("، ")}
                        </p>
                        <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                          {address.details}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!address.is_default ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void makeDefault(address.id)}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs font-bold transition hover:border-ring/50 hover:text-primary disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              تعيين كافتراضي
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void removeAddress(address)}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-destructive/20 px-3 py-2.5 text-xs font-bold text-destructive transition hover:bg-destructive/5 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            حذف العنوان
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

        <section className={`${panelClass} mt-5 p-4 sm:p-6`}>
          <div className="mb-4 flex items-center gap-3">
            <IconTile tone="accent">
              <BellRing className="h-5 w-5" />
            </IconTile>
            <div className="min-w-0">
              <h2 className={sectionTitleClass}>الإشعارات والتفضيلات</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                تحكّم في التنبيهات التي تصلك بشأن الطلبات والعروض والحساب.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background p-2.5 sm:p-4">
            <NotificationPrefsPanel />
          </div>
        </section>

        <section className={`${panelClass} mt-5 p-4 sm:p-6`}>
          <div className="mb-4">
            <h2 className={sectionTitleClass}>المساعدة وأمان الحساب</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
              اختصارات مفيدة لإدارة تجربتك في شهارة.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/faq"
              className="group flex min-h-[76px] min-w-0 items-center gap-3 rounded-2xl border border-border/80 p-3.5 transition hover:border-ring/50 hover:bg-muted/30 sm:p-4"
            >
              <IconTile>
                <CircleHelp className="h-5 w-5" />
              </IconTile>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">مركز المساعدة</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  إجابات عن الطلبات والتوصيل
                </span>
              </span>
              <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
            </Link>
            <div className="flex min-h-[76px] min-w-0 items-center gap-3 rounded-2xl border border-border/80 p-3.5 sm:p-4">
              <IconTile tone="accent">
                <ShieldCheck className="h-5 w-5" />
              </IconTile>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">أمان حسابك</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  لا تشارك كلمة المرور أو رموز التحقق.
                </span>
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
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            شهارة · تسوّق بلا حدود
          </p>
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
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
        tone === "accent"
          ? "bg-accent/55 text-accent-foreground"
          : "bg-primary/10 text-primary"
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
      className="group min-w-0 rounded-2xl border border-border/80 bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-ring/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground sm:h-11 sm:w-11">
        {icon}
      </span>
      <span className="mt-3 flex items-center justify-between gap-1">
        <span className="truncate text-sm font-extrabold">{title}</span>
        <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
      </span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
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
    <div className="rounded-2xl border border-dashed border-border px-4 py-7 text-center sm:py-9">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-primary">
        {icon}
      </span>
      <p className="mt-3 text-sm font-extrabold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
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
        : "bg-primary/10 text-primary";

  return (
    <span
      className={`inline-flex max-w-full whitespace-normal break-words rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}
    >
      {label}
    </span>
  );
}

export default AccountPage;
