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

const STATUS_LABELS: Record<
  string,
  string
> = {
  pending:
    "بانتظار التأكيد",

  awaiting_payment:
    "بانتظار الدفع",

  confirmed:
    "تم التأكيد",

  processing:
    "قيد التجهيز",

  shipped:
    "تم الشحن",

  delivered:
    "تم التسليم",

  cancelled:
    "ملغي",
};

const emptyAddress = {
  label: "المنزل",
  recipient_name: "",
  phone: "",
  city: "",
  district: "",
  details: "",
};

function AccountPage() {
  const {
    user,
    profile,
    role,
    refreshProfile,
    signOut,
  } = useAuth();

  const formatPrice =
    useFormatPrice();

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    addresses,
    setAddresses,
  ] = useState<Address[]>(
    [],
  );

  const [
    orders,
    setOrders,
  ] = useState<RecentOrder[]>(
    [],
  );

  const [
    form,
    setForm,
  ] = useState(
    emptyAddress,
  );

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    loadingAddresses,
    setLoadingAddresses,
  ] = useState(true);

  const [
    loadingOrders,
    setLoadingOrders,
  ] = useState(true);

  const [
    editingProfile,
    setEditingProfile,
  ] = useState(false);

  const [
    showAddressForm,
    setShowAddressForm,
  ] = useState(false);

  const [
    copiedPayment,
    setCopiedPayment,
  ] = useState<
    string | null
  >(null);

  const {
    data: paymentMethods = [],
    isLoading:
      loadingPaymentMethods,
  } = useQuery({
    queryKey: [
      "payment-methods",
      "active",
      "account",
    ],

    queryFn: async () =>
      (await fetchPaymentMethods(
        true,
      )) as PaymentMethod[],

    staleTime:
      1000 * 60 * 5,
  });

  const loadAddresses =
    useCallback(
      async () => {
        if (!user?.id) {
          setLoadingAddresses(
            false,
          );
          return;
        }

        setLoadingAddresses(
          true,
        );

        const {
          data,
          error,
        } = await supabase
          .from(
            "addresses",
          )
          .select(
            "id,label,recipient_name,phone,city,district,details,is_default",
          )
          .eq(
            "user_id",
            user.id,
          )
          .order(
            "is_default",
            {
              ascending:
                false,
            },
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          )
          .returns<Address[]>();

        if (error) {
          toast.error(
            "تعذر تحميل عناوين التوصيل",
          );
        }

        setAddresses(
          data ?? [],
        );

        setLoadingAddresses(
          false,
        );
      },
      [user?.id],
    );

  const loadOrders =
    useCallback(
      async () => {
        if (!user?.id) {
          setLoadingOrders(
            false,
          );
          return;
        }

        setLoadingOrders(
          true,
        );

        const {
          data,
          error,
        } = await supabase
          .from("orders")
          .select(
            "id,order_number,status,payment_status,total,created_at",
          )
          .eq(
            "user_id",
            user.id,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          )
          .limit(3)
          .returns<RecentOrder[]>();

        if (error) {
          toast.error(
            "تعذر تحميل الطلبات",
          );
        }

        setOrders(
          data ?? [],
        );

        setLoadingOrders(
          false,
        );
      },
      [user?.id],
    );

  useEffect(() => {
    setFullName(
      profile?.full_name ??
        "",
    );

    setPhone(
      profile?.phone ??
        "",
    );
  }, [profile]);

  useEffect(() => {
    void loadAddresses();
    void loadOrders();
  }, [
    loadAddresses,
    loadOrders,
  ]);

  const roleLabel =
    useMemo(() => {
      if (
        role ===
        "admin"
      ) {
        return "مدير";
      }

      if (
        role ===
        "vendor"
      ) {
        return "تاجر";
      }

      if (
        role ===
        "courier"
      ) {
        return "عامل توصيل";
      }

      return "عميل";
    }, [role]);

  const initials =
    useMemo(() => {
      const value =
        profile?.full_name?.trim() ||
        "ش";

      const parts =
        value
          .split(/\s+/)
          .filter(
            Boolean,
          );

      if (
        parts.length >=
        2
      ) {
        return `${parts[0]?.charAt(
          0,
        ) ?? ""}${parts[1]?.charAt(
          0,
        ) ?? ""}`;
      }

      return value.charAt(
        0,
      );
    }, [
      profile?.full_name,
    ]);

  const walletId =
    profile?.phone?.trim() ||
    user?.phone?.trim() ||
    "";

  const defaultAddress =
    addresses.find(
      (address) =>
        address.is_default,
    ) ??
    addresses[0] ??
    null;

  const latestOrder =
    orders[0] ??
    null;

  const activePaymentMethods =
    paymentMethods.filter(
      (method) =>
        method.display_name,
    );

  async function copyPaymentAccount(
    method: PaymentMethod,
  ) {
    if (
      !method.account_number
    ) {
      toast.error(
        "لا يوجد رقم حساب لهذه الطريقة",
      );

      return;
    }

    try {
      if (
        !navigator.clipboard
      ) {
        throw new Error(
          "Clipboard unavailable",
        );
      }

      await navigator.clipboard.writeText(
        method.account_number,
      );

      setCopiedPayment(
        method.id,
      );

      window.setTimeout(
        () =>
          setCopiedPayment(
            null,
          ),
        1800,
      );

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
      fullName.trim()
        .length < 3
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
        .eq(
          "id",
          user.id,
        );

      if (error) {
        throw error;
      }

      await refreshProfile();

      setEditingProfile(
        false,
      );

      toast.success(
        "تم تحديث بيانات الحساب",
      );
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
        .from(
          "addresses",
        )
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
            addresses.length ===
            0,
        });

      if (error) {
        throw error;
      }

      setForm({
        ...emptyAddress,
      });

      setShowAddressForm(
        false,
      );

      await loadAddresses();

      toast.success(
        "تمت إضافة العنوان",
      );
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
    if (
      !user?.id ||
      !window.confirm(
        "هل تريد حذف هذا العنوان؟",
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const {
        error,
      } = await supabase
        .from(
          "addresses",
        )
        .delete()
        .eq(
          "id",
          id,
        )
        .eq(
          "user_id",
          user.id,
        );

      if (error) {
        throw error;
      }

      await loadAddresses();

      toast.success(
        "تم حذف العنوان",
      );
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
        error:
          clearError,
      } = await supabase
        .from(
          "addresses",
        )
        .update({
          is_default:
            false,
        })
        .eq(
          "user_id",
          user.id,
        );

      if (clearError) {
        throw clearError;
      }

      const {
        error:
          setError,
      } = await supabase
        .from(
          "addresses",
        )
        .update({
          is_default:
            true,
        })
        .eq(
          "id",
          id,
        )
        .eq(
          "user_id",
          user.id,
        );

      if (setError) {
        throw setError;
      }

      await loadAddresses();

      toast.success(
        "تم تعيين العنوان الافتراضي",
      );
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
        <section className="px-1">
          <p className="text-[9px] font-black text-[#D65A31]">
            SHEHARA
          </p>

          <div className="mt-1 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black">
                حسابي
              </h1>

              <p className="mt-1 text-[9px] text-muted-foreground">
                إدارة حسابك ومحفظتك وطلباتك وعناوينك.
              </p>
            </div>

            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#0E4D64]/10 bg-white/80 text-[#0E4D64] shadow-sm">
              <User className="h-5 w-5" />
            </span>
          </div>
        </section>

        {/* البطاقة الرقمية أول عنصر */}
        <WalletCard
          balance={Number(
            profile?.wallet_balance ??
              0,
          )}
          formattedBalance={formatPrice(
            profile?.wallet_balance ??
              0,
          )}
          customerName={
            profile?.full_name ||
            "عميل شهارة"
          }
          phone={
            profile?.phone ||
            user?.phone ||
            ""
          }
          walletId={walletId}
        />

        {/* بيانات الحساب أسفل البطاقة */}
        <section className="rounded-[24px] border border-[#0E4D64]/10 bg-white/90 p-4 shadow-sm backdrop-blur-xl dark:bg-card/90">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#0E4D64] text-base font-black text-white">
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
                  (value) =>
                    !value,
                )
              }
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#0E4D64]/10 bg-[#FAF9F6] text-[#0E4D64]"
              aria-label="تعديل الحساب"
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
              onSubmit={
                saveProfile
              }
              className="mt-4 border-t border-border/60 pt-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <AccountField
                  label="الاسم الكامل"
                  value={fullName}
                  onChange={
                    setFullName
                  }
                  placeholder="الاسم الكامل"
                />

                <AccountField
                  label="رقم الهاتف"
                  value={phone}
                  onChange={
                    setPhone
                  }
                  placeholder="رقم الهاتف"
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-3 h-11 w-full rounded-xl bg-[#0E4D64] text-xs font-black text-white disabled:opacity-50"
              >
                {busy
                  ? "جارٍ الحفظ..."
                  : "حفظ بيانات الحساب"}
              </button>
            </form>
          ) : null}
        </section>

        {/* المحفظة والمعاملات */}
        <section className="rounded-[24px] border border-[#0E4D64]/10 bg-white/90 p-4 shadow-sm dark:bg-card/90">
          <SectionHeader
            icon={<Wallet />}
            title="المحفظة والمعاملات"
            subtitle="الرصيد والشحن وسجل الحركات وكشف الحساب"
            action={
              <Link
                to="/wallet"
                className="text-[9px] font-black text-[#D65A31]"
              >
                فتح المحفظة
              </Link>
            }
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              to="/wallet"
              className="rounded-2xl bg-[#0E4D64]/5 p-3"
            >
              <p className="text-[8px] text-muted-foreground">
                الرصيد الحالي
              </p>

              <p className="mt-1 text-sm font-black text-[#0E4D64]">
                {formatPrice(
                  profile?.wallet_balance ??
                    0,
                )}
              </p>
            </Link>

            <Link
              to="/wallet"
              className="rounded-2xl bg-[#D65A31]/5 p-3"
            >
              <p className="text-[8px] text-muted-foreground">
                معرّف المحفظة
              </p>

              <p
                dir="ltr"
                className="mt-1 truncate text-start font-mono text-[10px] font-black text-[#D65A31]"
              >
                {walletId ||
                  "غير مضاف"}
              </p>
            </Link>
          </div>
        </section>

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
            subtitle="الشحن وكشف الحساب"
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
            className="rounded-2xl border border-[#0E4D64]/10 bg-white/90 p-3 shadow-sm dark:bg-card/90"
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

        <section className="rounded-[24px] border border-[#0E4D64]/10 bg-white/90 p-4 shadow-sm dark:bg-card/90">
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
              className="mt-4 block rounded-2xl border border-[#0E4D64]/10 bg-[#FAF9F6] p-3 dark:bg-[#0B2936]"
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
                    {
                      latestOrder.order_number
                    }
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
                    {
                      STATUS_LABELS[
                        latestOrder
                          .status
                      ] ??
                        latestOrder.status
                    }
                  </span>
                </div>

                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                <span className="rounded-full bg-[#0E4D64]/10 px-2 py-1 text-[8px] font-bold text-[#0E4D64]">
                  {
                    STATUS_LABELS[
                      latestOrder
                        .status
                    ] ??
                      latestOrder.status
                  }
                </span>

                <span className="rounded-full bg-white px-2 py-1 text-[8px] font-bold text-muted-foreground dark:bg-card">
                  {
                    PAYMENT_STATUS_LABELS[
                      latestOrder
                        .payment_status
                    ] ??
                      latestOrder.payment_status
                  }
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

        <section className="rounded-[24px] border border-[#0E4D64]/10 bg-white/90 p-4 shadow-sm dark:bg-card/90">
          <SectionHeader
            icon={<MapPin />}
            title="عنوان التوصيل"
            subtitle="العنوان المستخدم لاستلام الطلبات"
            action={
              <button
                type="button"
                onClick={() =>
                  setShowAddressForm(
                    (value) =>
                      !value,
                  )
                }
                className="inline-flex items-center gap-1 rounded-xl bg-[#0E4D64] px-3 py-2 text-[9px] font-black text-white"
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
                      {
                        defaultAddress.label
                      }
                    </h3>

                    {defaultAddress.is_default ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[7px] font-black text-emerald-700">
                        الافتراضي
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-[10px] font-bold">
                    {
                      defaultAddress.recipient_name
                    }
                  </p>

                  <p className="mt-1 text-[9px] text-muted-foreground">
                    {
                      defaultAddress.city
                    }

                    {defaultAddress.district
                      ? ` — ${defaultAddress.district}`
                      : ""}
                  </p>

                  <p className="mt-1 text-[9px] leading-5 text-muted-foreground">
                    {
                      defaultAddress.details
                    }
                  </p>

                  {defaultAddress.phone ? (
                    <p
                      dir="ltr"
                      className="mt-1 text-start text-[9px] text-muted-foreground"
                    >
                      {
                        defaultAddress.phone
                      }
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
                {!defaultAddress.is_default ? (
                  <button
