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
  type ReactNode,
} from "react";

import { useQuery } from "@tanstack/react-query";

import { toast } from "sonner";

import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Edit3,
  Heart,
  LogOut,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { NotificationPrefsPanel } from "@/components/notification-prefs";
import { WalletCard } from "@/components/account/wallet-card";

import { useAuth } from "@/lib/auth-context";
import { useFormatPrice } from "@/lib/currency-context";

import {
  PAYMENT_STATUS_LABELS,
  fetchPaymentMethods,
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

type PaymentMethod = {
  id: string;
  code: string;
  display_name: string;
  account_name: string;
  account_number: string;
  instructions: string;
  kind: string;
  requires_receipt: boolean;
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

  const [copiedPayment, setCopiedPayment] =
    useState<string | null>(null);

  const {
    data: paymentMethods = [],
    isLoading: loadingPaymentMethods,
  } = useQuery({
    queryKey: [
      "payment-methods",
      "active",
      "account",
    ],

    queryFn: async () => {
      const methods =
        await fetchPaymentMethods(true);

      return methods as PaymentMethod[];
    },

    staleTime: 1000 * 60 * 5,
  });

  const loadAddresses =
    useCallback(async () => {
      if (!user?.id) {
        setLoadingAddresses(false);
        return;
      }

      setLoadingAddresses(true);

      const {
        data,
        error,
      } = await supabase
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

      const {
        data,
        error,
      } = await supabase
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
      profile?.full_name?.trim() ||
      "ش";

    const parts =
      value
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`;
    }

    return value.charAt(0);
  }, [profile?.full_name]);

  const customerCode = useMemo(() => {
    const id = user?.id ?? "";

    if (!id) {
      return "SH-••••••••";
    }

    return `SH-${id.slice(0, 4).toUpperCase()}••••${id
      .slice(-4)
      .toUpperCase()}`;
  }, [user?.id]);

  const defaultAddress =
    addresses.find(
      (address) => address.is_default,
    ) ?? addresses[0] ?? null;

  const latestOrder =
    orders[0] ?? null;

  const activePaymentMethods =
    paymentMethods.filter(
      (method) => method.display_name,
    );

  async function copyPaymentAccount(
    method: PaymentMethod,
  ) {
    if (!method.account_number) {
      toast.error(
        "لا يوجد رقم حساب لهذه الطريقة",
      );

      return;
    }

    try {
      if (!navigator.clipboard) {
        throw new Error(
          "Clipboard unavailable",
        );
      }

      await navigator.clipboard.writeText(
        method.account_number,
      );

      setCopiedPayment(method.id);

      window.setTimeout(() => {
        setCopiedPayment(null);
      }, 1800);

      toast.success(
        "تم نسخ رقم الحساب",
      );
    } catch {
      toast.error(
        "تعذر نسخ رقم الحساب",
      );
    }
  }

  async function saveProfile(
    event: FormEvent<HTMLFormElement>,
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
      const {
        error,
      } = await supabase
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
        "تم تحديث بيانات الحساب",
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
    event: FormEvent<HTMLFormElement>,
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
      const {
        error,
      } = await supabase
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
        "تمت إضافة العنوان",
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

    setBusy(true);

    try {
      const {
        error,
      } = await supabase
        .from("addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      toast.success(
        "تم حذف العنوان",
      );

      await loadAddresses();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حذف العنوان",
      );
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(
    id: string,
  ) {
    if (!user?.id) {
      return;
    }

    setBusy(true);

    try {
      const {
        error: clearError,
      } = await supabase
        .from("addresses")
        .update({
          is_default: false,
        })
        .eq("user_id", user.id);

      if (clearError) {
        throw clearError;
      }

      const {
        error: setError,
      } = await supabase
        .from("addresses")
        .update({
          is_default: true,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (setError) {
        throw setError;
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
      className="min-h-screen overflow-x-hidden bg-transparent pb-28 text-foreground md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">

        {/* رأس الصفحة */}
        <section className="flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[9px] font-bold text-[#D65A31]">
              SHEHARA
            </p>

            <h1 className="mt-0.5 text-xl font-black tracking-tight">
              حسابي
            </h1>

            <p className="mt-1 text-[9px] text-muted-foreground">
              كل ما يخص حسابك في مكان واحد
            </p>
          </div>

          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#0E4D64]/10 bg-white/80 shadow-sm backdrop-blur">
            <User className="h-5 w-5 text-[#0E4D64]" />
          </div>
        </section>

        {/* الملف الشخصي */}
        <section className="rounded-[24px] border border-[#0E4D64]/10 bg-white/90 p-4 shadow-[0_18px_45px_-35px_rgba(14,77,100,.75)] backdrop-blur-xl dark:bg-card/90">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#0E4D64] text-base font-black text-white shadow-sm">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-sm font-black">
                  {profile?.full_name ||
                    "مرحباً بك في شهارة"}
                </h2>

                <span className="rounded-full bg-[#D65A31]/10 px-2 py-1 text-[8px] font-black text-[#D65A31]">
                  {roleLabel}
                </span>
              </div>

              <p
                dir="ltr"
                className="mt-1 truncate text-start text-[9px] text-muted-foreground"
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
              aria-label={
                editingProfile
                  ? "إغلاق التعديل"
                  : "تعديل الحساب"
              }
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#0E4D64]/10 bg-[#FAF9F6] text-[#0E4D64] transition active:scale-90"
            >
              {editingProfile ? (
                <X className="h-4 w-4" />
              ) : (
                <Edit3 className="h-4 w-4" />
              )}
            </button>
          </div>

          {editingProfile ? (
            <form
              onSubmit={saveProfile}
              className="mt-4 border-t border-border/60 pt-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <AccountField
                  label="الاسم الكامل"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="الاسم الكامل"
                />

                <AccountField
                  label="رقم الهاتف"
                  value={phone}
                  onChange={setPhone}
                  placeholder="رقم الهاتف"
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#0E4D64] text-xs font-black text-white transition active:scale-[.99] disabled:opacity-50"
              >
                {busy
                  ? "جارٍ الحفظ..."
                  : "حفظ بيانات الحساب"}
              </button>
            </form>
          ) : null}
        </section>

        {/* المحفظة الرقمية */}
        <WalletCard
          balance={Number(
            profile?.wallet_balance ?? 0,
          )}
          formattedBalance={formatPrice(
            profile?.wallet_balance ?? 0,
          )}
          customerName={
            profile?.full_name ||
            "عميل شهارة"
          }
          phone={
            profile?.phone ||
            user?.email ||
            ""
          }
          customerCode={customerCode}
        />

        {/* إجراءات سريعة */}
        <section className="grid grid-cols-2 gap-3">
          <QuickAction
            to="/orders"
            icon={<Package />}
            title="طلباتي"
            subtitle="متابعة الطلبات"
            accent="teal"
          />

          <QuickAction
            to="/wallet"
            icon={<Wallet />}
            title="معاملات المحفظة"
            subtitle="الرصيد والشحن"
            accent="orange"
          />

          <QuickAction
            to="/products"
            icon={<ShoppingBag />}
            title="تسوق الآن"
            subtitle="اكتشف المنتجات"
            accent="teal"
          />

          <Link
            to="/products"
            className="group rounded-2xl border border-[#0E4D64]/10 bg-white/90 p-3 shadow-sm transition active:scale-[.98] dark:bg-card/90"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#D65A31]/10 text-[#D65A31]">
              <Heart className="h-4 w-4" />
            </span>

            <span className="mt-2 block text-[10px] font-black">
              المفضلة
            </span>

            <span className="mt-0.5 block text-[8px] text-muted-foreground">
              منتجاتك المفضلة
            </span>
          </Link>
        </section>

        {/* آخر طلب */}
        <section className="rounded-[24px] border border-[#0E4D64]/10 bg-white/90 p-4 shadow-sm backdrop-blur-xl dark:bg-card/90">
          <SectionHeader
            icon={<Package />}
            title="آخر طلب"
            subtitle="أحدث عملية شراء"
            action={
              <Link
                to="/orders"
                className="text-[9px] font-black text-[#D65A31]"
              >
                عرض الكل
              </Link>
            }
          />

          {loadingOrders ? (
            <LoadingBox />
          ) : latestOrder ? (
            <Link
              to="/orders"
              className="mt-4 block rounded-2xl border border-[#0E4D64]/10 bg-[#FAF9F6] p-3 transition active:scale-[.99] dark:bg-[#0B2936]"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                  <Package className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    dir="ltr"
                    className="truncate text-start font-mono text-[10px] font-black"
                  >
                    {latestOrder.order_number}
                  </p>

                  <p className="mt-1 text-[8px] text-muted-foreground">
                    {formatDate(
                      latestOrder.created_at,
                    )}
                  </p>
                </div>

                <div className="text-start">
                  <p className="text-[11px] font-black text-[#0E4D64]">
                    {formatPrice(
                      latestOrder.total,
                    )}
                  </p>

                  <span className="mt-1 inline-flex rounded-full bg-[#D65A31]/10 px-2 py-1 text-[8px] font-black text-[#D65A31]">
                    {STATUS_LABELS[
                      latestOrder.status
                    ] ??
                      latestOrder.status}
                  </span>
                </div>

                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                <span className="rounded-full bg-[#0E4D64]/10 px-2 py-1 text-[8px] font-bold text-[#0E4D64]">
                  {STATUS_LABELS[
                    latestOrder.status
                  ] ??
                    latestOrder.status}
                </span>

                <span className="rounded-full bg-white px-2 py-1 text-[8px] font-bold text-muted-foreground dark:bg-card">
                  {PAYMENT_STATUS_LABELS[
                    latestOrder
                      .payment_status as keyof typeof PAYMENT_STATUS_LABELS
                  ] ??
                    latestOrder.payment_status}
                </span>
              </div>
            </Link>
          ) : (
            <EmptyState
              icon={<Package />}
              title="لا توجد طلبات بعد"
              action="ابدأ التسوق"
              to="/products"
            />
          )}
        </section>

        {/* العنوان الافتراضي */}
        <section className="rounded-[24px] border border-[#0E4D64]/10 bg-white/90 p-4 shadow-sm backdrop-blur-xl dark:bg-card/90">
          <SectionHeader
            icon={<MapPin />}
            title="عنوان التوصيل"
            subtitle="العنوان المستخدم لاستلام الطلبات"
            action={
              <button
                type="button"
                onClick={() =>
                  setShowAddressForm(
                    (value) => !value,
                  )
                }
                className="inline-flex items-center gap-1 rounded-xl bg-[#0E4D64] px-3 py-2 text-[9px] font-black text-white active:scale-95"
              >
                {showAddressForm ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}

                {showAddressForm
                  ? "إغلاق"
                  : "إضافة"}
              </button>
            }
          />

          {defaultAddress ? (
            <div className="mt-4 rounded-2xl border border-[#0E4D64]/10 bg-[#FAF9F6] p-3 dark:bg-[#0B2936]">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                  <MapPin className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-black">
                      {defaultAddress.label}
                    </h3>

                    {defaultAddress.is_default ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[7px] font-black text-emerald-700">
                        الافتراضي
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-[10px] font-bold">
                    {defaultAddress.recipient_name}
                  </p>

                  <p className="mt-1 text-[9px] text-muted-foreground">
                    {defaultAddress.city}

                    {defaultAddress.district
                      ? ` — ${defaultAddress.district}`
                      : ""}
                  </p>

                  <p className="mt-1 text-[9px] leading-5 text-muted-foreground">
                    {defaultAddress.details}
                  </p>

                  {defaultAddress.phone ? (
                    <p
                      dir="ltr"
                      className="mt-1 text-start text-[9px] text-muted-foreground"
                    >
                      {defaultAddress.phone}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
                {!defaultAddress.is_default ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void makeDefault(
                        defaultAddress.id,
                      )
                    }
                    className="flex-1 rounded-xl border border-border bg-white py-2 text-[8px] font-bold dark:bg-card"
                  >
                    تعيين كافتراضي
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void removeAddress(
                      defaultAddress.id,
                    )
                  }
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-red-500/10 px-3 py-2 text-[8px] font-bold text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<MapPin />}
              title="لم تتم إضافة عنوان بعد"
            />
          )}

          {showAddressForm ? (
            <form
              onSubmit={addAddress}
              className="mt-4 rounded-2xl border border-[#0E4D64]/10 bg-[#FAF9F6] p-3 dark:bg-[#0B2936]"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <AccountField
                  label="اسم العنوان"
                  value={form.label}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      label: value,
                    }))
                  }
                  placeholder="المنزل"
                />

                <AccountField
                  label="اسم المستلم *"
                  value={
                    form.recipient_name
                  }
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      recipient_name:
                        value,
                    }))
                  }
                  placeholder="الاسم الكامل"
                />

                <AccountField
                  label="رقم الهاتف"
                  value={form.phone}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      phone: value,
                    }))
                  }
                  placeholder="رقم الهاتف"
                  dir="ltr"
                />

                <AccountField
                  label="المدينة *"
                  value={form.city}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      city: value,
                    }))
                  }
                  placeholder="المدينة"
                />

                <AccountField
                  label="الحي / المنطقة"
                  value={form.district}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      district: value,
                    }))
                  }
                  placeholder="الحي"
                />

                <label className="text-[9px] font-bold text-muted-foreground sm:col-span-2">
                  تفاصيل العنوان *

                  <textarea
                    value={form.details}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          details:
                            event.target
                              .value,
                        }),
                      )
                    }
                    rows={3}
                    placeholder="الشارع، رقم المنزل، معلم قريب..."
                    className="mt-1.5 w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-[#0E4D64] dark:bg-card"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#D65A31] text-xs font-black text-white disabled:opacity-50"
              >
                {busy
                  ? "جارٍ الحفظ..."
                  : "حفظ العنوان"}
              </button>
            </form>
          ) : null}

          {/* بقية العناوين */}
          {addresses.length > 1 ? (
            <div className="mt-3 space-y-2">
              <p className="px-1 text-[9px] font-black text-muted-foreground">
                العناوين الأخرى
              </p>

              {addresses
                .filter(
                  (address) =>
                    address.id !==
                    defaultAddress?.id,
                )
                .map((address) => (
                  <div
                    key={address.id}
                    className="rounded-2xl border border-border/70 bg-white p-3 dark:bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
                        <MapPin className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black">
                          {address.label}
                        </p>

                        <p className="mt-0.5 truncate text-[8px] text-muted-foreground">
                          {address.city}

                          {address.district
                            ? ` — ${address.district}`
                            : ""}
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
                        className="rounded-xl bg-[#0E4D64]/10 px-2.5 py-2 text-[8px] font-black text-[#0E4D64]"
                      >
                        افتراضي
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void removeAddress(
                            address.id,
                          )
                        }
                        aria-label="حذف العنوان"
                        className="grid h-8 w-8 place-items-center rounded-xl bg-red-500/10 text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : null}

          {loadingAddresses ? (
            <div className="mt-3 h-20 animate-pulse rounded-2xl bg-muted" />
          ) : null}
        </section>

        {/* الإشعارات */}
        <NotificationPrefsPanel />

        {/* طرق الدفع */}
        <section className="rounded-[24px] border border-[#0E4D64]/10 bg-white/90 p-4 shadow-sm backdrop-blur-xl dark:bg-card/90">
          <SectionHeader
            icon={<Wallet />}
            title="طرق الدفع"
            subtitle="طرق الدفع والتحويل المتاحة حالياً"
            action={
              <Link
                to="/wallet"
                className="text-[9px] font-black text-[#D65A31]"
              >
                المحفظة
              </Link>
            }
          />

          {loadingPaymentMethods ? (
            <div className="mt-4 space-y-2">
              <LoadingBox />
              <LoadingBox />
            </div>
          ) : activePaymentMethods.length ? (
            <div className="mt-4 space-y-2">
              {activePaymentMethods
                .slice(0, 4)
                .map((method) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    copied={
                      copiedPayment ===
                      method.id
                    }
                    onCopy={() =>
                      void copyPaymentAccount(
                        method,
                      )
                    }
                  />
                ))}
            </div>
          ) : (
            <EmptyState
              icon={<Wallet />}
              title="لا توجد طرق دفع متاحة حالياً"
            />
          )}
        </section>

        {/* الأمان والحساب */}
        <section className="overflow-hidden rounded-[24px] border border-[#0E4D64]/10 bg-white/90 shadow-sm backdrop-blur-xl dark:bg-card/90">
          <div className="flex items-center gap-3 border-b border-border/60 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-black">
                أمان الحساب
              </h2>

              <p className="mt-1 text-[8px] text-muted-foreground">
                بياناتك مرتبطة بحسابك المصادق عليه في شهارة
              </p>
            </div>

            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>

          <div className="divide-y divide-border/60">
            <div className="flex items-center gap-3 p-4">
              <User className="h-4 w-4 text-[#0E4D64]" />

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black">
                  بيانات الحساب
                </p>

                <p className="mt-0.5 text-[8px] text-muted-foreground">
                  الاسم ورقم الهاتف
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingProfile(true)
                }
                className="rounded-xl bg-[#0E4D64]/10 px-3 py-2 text-[8px] font-black text-[#0E4D64]"
              >
                تعديل
              </button>
            </div>

            <div className="flex items-center gap-3 p-4">
              <ShieldCheck className="h-4 w-4 text-[#0E4D64]" />

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black">
                  معرّف العميل
                </p>

                <p
                  dir="ltr"
                  className="mt-0.5 truncate text-start font-mono text-[8px] text-muted-foreground"
                >
                  {customerCode}
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      customerCode,
                    );

                    toast.success(
                      "تم نسخ معرّف العميل",
                    );
                  } catch {
                    toast.error(
                      "تعذر نسخ المعرّف",
                    );
                  }
                }}
                className="grid h-8 w-8 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]"
                aria-label="نسخ معرّف العميل"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* روابط إضافية */}
        <section className="rounded-[24px] border border-[#0E4D64]/10 bg-white/90 p-2 shadow-sm dark:bg-card/90">
          <AccountLink
            to="/orders"
            icon={<Package />}
            title="جميع طلباتي"
            subtitle="متابعة جميع الطلبات السابقة والحالية"
          />

          <AccountLink
            to="/wallet"
            icon={<Wallet />}
            title="المحفظة"
            subtitle="الرصيد وطلبات الشحن وسجل العمليات"
          />

          <AccountLink
            to="/products"
            icon={<ShoppingBag />}
            title="مواصلة التسوق"
            subtitle="العودة إلى المنتجات"
          />

          <div className="flex items-center gap-3 rounded-2xl p-3">
            <Bell className="h-4 w-4 text-[#D65A31]" />

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black">
                إشعارات شهارة
              </p>

              <p className="mt-0.5 text-[8px] text-muted-foreground">
                إدارة تفضيلات الإشعارات من القسم أعلاه
              </p>
            </div>
          </div>
        </section>

        {/* تسجيل الخروج */}
        <button
          type="button"
          onClick={() =>
            void handleSignOut()
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 text-xs font-black text-red-600 transition active:scale-[.99]"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>

        <div className="pb-2 pt-1 text-center">
          <p className="text-[8px] font-bold text-muted-foreground/60">
            شهارة — تسوق بلا حدود
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function AccountField({
  label,
  value,
  onChange,
  placeholder,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="text-[9px] font-bold text-muted-foreground">
      {label}

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        dir={dir}
        className="mt-1.5 h-10 w-full rounded-xl border border-border bg-white px-3 text-xs text-foreground outline-none transition focus:border-[#0E4D64] dark:bg-card"
      />
    </label>
  );
}

function QuickAction({
  to,
  icon,
  title,
  subtitle,
  accent,
}: {
  to: "/orders" | "/wallet" | "/products";
  icon: ReactNode;
  title: string;
  subtitle: string;
  accent: "teal" | "orange";
}) {
  const accentClass =
    accent === "orange"
      ? "bg-[#D65A31]/10 text-[#D65A31]"
      : "bg-[#0E4D64]/10 text-[#0E4D64]";

  return (
    <Link
      to={to}
      className="group rounded-2xl border border-[#0E4D64]/10 bg-white/90 p-3 shadow-sm transition active:scale-[.98] dark:bg-card/90"
    >
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl ${accentClass}`}
      >
        {icon}
      </span>

      <span className="mt-2 block text-[10px] font-black">
        {title}
      </span>

      <span className="mt-0.5 block text-[8px] text-muted-foreground">
        {subtitle}
      </span>
    </Link>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-black">
          {title}
        </h2>

        <p className="mt-0.5 text-[8px] text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {action}
    </div>
  );
}

function AccountLink({
  to,
  icon,
  title,
  subtitle,
}: {
  to: "/orders" | "/wallet" | "/products";
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl p-3 transition active:bg-[#0E4D64]/5"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0E4D64]/10 text-[#0E4D64]">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black">
          {title}
        </span>

        <span className="mt-0.5 block truncate text-[8px] text-muted-foreground">
          {subtitle}
        </span>
      </span>

      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function PaymentMethodCard({
  method,
  copied,
  onCopy,
}: {
  method: PaymentMethod;
  copied: boolean;
  onCopy: () => void;
}) {
  const masked =
    method.account_number
      ? maskAccountNumber(
          method.account_number,
        )
      : "لا يوجد رقم حساب";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#0E4D64]/10 bg-[#0E4D64] p-3 text-white">
      <div className="absolute -end-10 -top-10 h-28 w-28 rounded-full border border-white/10" />

      <div className="relative flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
          <Wallet className="h-4 w-4 text-[#F3A17E]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black">
            {method.display_name}
          </p>

          <p className="mt-0.5 text-[8px] text-white/55">
            {method.account_name ||
              "طريقة دفع متاحة"}
          </p>

          <p
            dir="ltr"
            className="mt-2 truncate text-start font-mono text-[10px] font-bold tracking-wide text-white/85"
          >
            {masked}
          </p>
        </div>

        {method.account_number ? (
          <button
            type="button"
            onClick={onCopy}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition active:scale-90"
            aria-label="نسخ رقم الحساب"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-[#F3A17E]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>

      {method.requires_receipt ? (
        <p className="relative mt-2 border-t border-white/10 pt-2 text-[8px] text-white/50">
          هذه الطريقة تتطلب رفع إيصال التحويل عند الدفع.
        </p>
      ) : null}
    </div>
  );
}

function maskAccountNumber(
  value: string,
) {
  const clean =
    value.trim();

  if (clean.length <= 8) {
    return clean;
  }

  return `${clean.slice(0, 4)} •••• ${clean.slice(-4)}`;
}

function LoadingBox() {
  return (
    <div className="h-16 animate-pulse rounded-2xl bg-muted" />
  );
}

function EmptyState({
  icon,
  title,
  action,
  to,
}: {
  icon: ReactNode;
  title: string;
  action?: string;
  to?: "/products";
}) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center">
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#0E4D64]/5 text-muted-foreground">
        {icon}
      </span>

      <p className="mt-2 text-xs font-bold">
        {title}
      </p>

      {action && to ? (
        <Link
          to={to}
          className="mt-2 inline-block text-[9px] font-black text-[#D65A31]"
        >
          {action}
        </Link>
      ) : null}
    </div>
  );
}
