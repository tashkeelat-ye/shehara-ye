import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useQuery } from "@tanstack/react-query";

import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  MapPin,
  Package,
  Receipt,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";

import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";

import {
  fetchPaymentMethods,
  fetchSettings,
} from "@/lib/store";

import {
  isValidYemeniPhone,
  normalizeYemeniPhone,
} from "@/lib/phone";

import { uploadReceipt } from "@/lib/media";

export const Route = createFileRoute(
  "/_authenticated/checkout",
)({
  head: () => ({
    meta: [
      {
        title: "إتمام الطلب | شهارة",
      },
      {
        name: "description",
        content:
          "أكمل بيانات التوصيل والدفع لإتمام طلبك من شهارة.",
      },
    ],
  }),

  component: CheckoutPage,
});

type CheckoutStep = 1 | 2 | 3;

type CreatedOrder = {
  id: string;
  order_number: string;
  total: number;
  payment_status: string;
  status: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message = (error as { message?: unknown })
      .message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "حدث خطأ غير متوقع.";
}

function CheckoutPage() {
  const navigate = useNavigate();

  const formatPrice = useFormatPrice();

  const {
    user,
    profile,
    refreshProfile,
  } = useAuth();

  const {
    items,
    total: subtotal,
    clearCart,
  } = useCart();

  const {
    data: settings,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const {
    data: paymentMethods = [],
    isLoading: paymentMethodsLoading,
  } = useQuery({
    queryKey: ["payment-methods", "active"],
    queryFn: () => fetchPaymentMethods(true),
  });

  const [
    step,
    setStep,
  ] = useState<CheckoutStep>(1);

  const [
    customerName,
    setCustomerName,
  ] = useState(
    profile?.full_name ?? "",
  );

  const [
    phone,
    setPhone,
  ] = useState(
    profile?.phone ?? "",
  );

  const [
    city,
    setCity,
  ] = useState("");

  const [
    district,
    setDistrict,
  ] = useState("");

  const [
    addressDetails,
    setAddressDetails,
  ] = useState("");

  const [
    landmark,
    setLandmark,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    paymentMethodCode,
    setPaymentMethodCode,
  ] = useState("");

  const [
    receipt,
    setReceipt,
  ] = useState<File | null>(null);

  const [
    receiptUrl,
    setReceiptUrl,
  ] = useState("");

  const [
    isUploadingReceipt,
    setIsUploadingReceipt,
  ] = useState(false);

  const [
    saveAddress,
    setSaveAddress,
  ] = useState(true);

  const [
    agreeToTerms,
    setAgreeToTerms,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    latitude,
    setLatitude,
  ] = useState<number | null>(null);

  const [
    longitude,
    setLongitude,
  ] = useState<number | null>(null);

  const [
    checkoutToken,
  ] = useState(() => {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${Math.random()
      .toString(36)
      .slice(2)}`;
  });

  const deliveryFee = Number(
    settings?.delivery_fee ?? 0,
  );

  const total =
    Number(subtotal) +
    deliveryFee;

  const selectedMethod = useMemo(
    () =>
      paymentMethods.find(
        (method) =>
          method.code ===
          paymentMethodCode,
      ) ?? null,
    [
      paymentMethods,
      paymentMethodCode,
    ],
  );

  const isWalletPayment =
    selectedMethod?.kind ===
      "wallet_balance" ||
    selectedMethod?.code ===
      "wallet_balance";

  const requiresReceipt =
    Boolean(
      selectedMethod?.requires_receipt,
    );

  useEffect(() => {
    if (
      profile?.full_name &&
      !customerName
    ) {
      setCustomerName(
        profile.full_name,
      );
    }

    if (
      profile?.phone &&
      !phone
    ) {
      setPhone(profile.phone);
    }
  }, [
    profile,
    customerName,
    phone,
  ]);

  useEffect(() => {
    if (
      !paymentMethodCode &&
      paymentMethods.length > 0
    ) {
      setPaymentMethodCode(
        paymentMethods[0].code,
      );
    }
  }, [
    paymentMethodCode,
    paymentMethods,
  ]);

  useEffect(() => {
    if (
      items.length === 0 &&
      !isSubmitting
    ) {
      navigate({
        to: "/cart",
      });
    }
  }, [
    items.length,
    isSubmitting,
    navigate,
  ]);

  function validateDelivery(): boolean {
    if (
      !customerName.trim()
    ) {
      toast.error(
        "أدخل اسم المستلم.",
      );
      return false;
    }

    const normalizedPhone =
      normalizeYemeniPhone(
        phone,
      );

    if (
      !isValidYemeniPhone(
        normalizedPhone,
      )
    ) {
      toast.error(
        "رقم الهاتف اليمني غير صحيح.",
      );
      return false;
    }

    if (!city.trim()) {
      toast.error(
        "أدخل المحافظة أو المدينة.",
      );
      return false;
    }

    if (!district.trim()) {
      toast.error(
        "أدخل المنطقة.",
      );
      return false;
    }

    if (
      !addressDetails.trim()
    ) {
      toast.error(
        "أدخل تفاصيل العنوان.",
      );
      return false;
    }

    return true;
  }

  function continueToPayment() {
    if (!validateDelivery()) {
      return;
    }

    setStep(2);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function continueToReview() {
    if (
      !paymentMethodCode
    ) {
      toast.error(
        "اختر طريقة الدفع.",
      );
      return;
    }

    if (
      requiresReceipt &&
      !receipt &&
      !receiptUrl
    ) {
      toast.error(
        "يجب إرفاق إيصال التحويل.",
      );
      return;
    }

    setStep(3);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleReceiptUpload(
    file: File,
  ) {
    if (!user?.id) {
      toast.error(
        "يجب تسجيل الدخول أولاً.",
      );
      return;
    }

    try {
      setIsUploadingReceipt(true);

      const uploadedUrl =
        await uploadReceipt(
          file,
          user.id,
        );

      if (!uploadedUrl) {
        throw new Error(
          "تعذر رفع الإيصال.",
        );
      }

      setReceiptUrl(
        uploadedUrl,
      );

      setReceipt(file);

      toast.success(
        "تم رفع الإيصال بنجاح.",
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error),
      );
    } finally {
      setIsUploadingReceipt(
        false,
      );
    }
  }

  async function saveCustomerAddress() {
    if (
      !user?.id ||
      !saveAddress
    ) {
      return;
    }

    const normalizedPhone =
      normalizeYemeniPhone(
        phone,
      );

    const { error } =
      await supabase
        .from("addresses")
        .insert({
          user_id: user.id,
          label: "المنزل",
          recipient_name:
            customerName.trim(),
          phone:
            normalizedPhone,
          city:
            city.trim(),
          district:
            district.trim(),
          details:
            addressDetails.trim(),
          latitude,
          longitude,
          is_default: false,
        });

    if (error) {
      console.warn(
        "Address save failed:",
        error,
      );
    }
  }

  async function createOrder(): Promise<CreatedOrder> {
    if (!user?.id) {
      throw new Error(
        "يجب تسجيل الدخول قبل إتمام الطلب.",
      );
    }

    const normalizedPhone =
      normalizeYemeniPhone(
        phone,
      );

    const orderItems =
      items.map((item) => {
        const cartItem =
          item as typeof item & {
            size?: string | null;
            color?: string | null;
          };

        return {
          product_id:
            item.product_id,
          quantity:
            Number(item.quantity),
          size:
            cartItem.size ??
            null,
          color:
            cartItem.color ??
            null,
        };
      });

    const { data, error } =
      await supabase.rpc(
        "create_checkout_order",
        {
          p_checkout_token:
            checkoutToken,

          p_payment_method_code:
            paymentMethodCode,

          p_shipping_name:
            customerName.trim(),

          p_shipping_phone:
            normalizedPhone,

          p_shipping_city:
            city.trim(),

          p_shipping_district:
            district.trim(),

          p_shipping_details:
            addressDetails.trim(),

          p_notes:
            notes.trim(),

          p_latitude:
            latitude,

          p_longitude:
            longitude,

          p_items:
            orderItems,
        },
      );

    if (error) {
      throw error;
    }

    const row =
      Array.isArray(data)
        ? data[0]
        : data;

    if (
      !row ||
      !row.id
    ) {
      throw new Error(
        "تم إنشاء الطلب بشكل غير مكتمل.",
      );
    }

    return {
      id: String(row.id),
      order_number:
        String(
          row.order_number ??
            "",
        ),
      total: Number(
        row.total ?? total,
      ),
      payment_status:
        String(
          row.payment_status ??
            "unpaid",
        ),
      status:
        String(
          row.status ??
            "pending",
        ),
    };
  }

  async function payFromWallet(
    orderId: string,
  ) {
    const { data, error } =
      await supabase.rpc(
        "pay_order_from_wallet",
        {
          p_order_id:
            orderId,
        },
      );

    if (error) {
      throw error;
    }

    const row =
      Array.isArray(data)
        ? data[0]
        : data;

    if (
      row &&
      row.payment_status &&
      row.payment_status !==
        "paid"
    ) {
      throw new Error(
        "تعذر تأكيد الدفع من المحفظة.",
      );
    }
  }

  async function updateReceipt(
    orderId: string,
  ) {
    if (!receiptUrl) {
      return;
    }

    const { error } =
      await supabase
        .from("orders")
        .update({
          payment_receipt_url:
            receiptUrl,
          payment_status:
            "pending",
        })
        .eq(
          "id",
          orderId,
        )
        .eq(
          "user_id",
          user?.id ?? "",
        );

    if (error) {
      throw error;
    }
  }

  async function submitOrder(
    event?: FormEvent,
  ) {
    event?.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!user?.id) {
      toast.error(
        "يجب تسجيل الدخول أولاً.",
      );
      return;
    }

    if (!validateDelivery()) {
      setStep(1);
      return;
    }

    if (!paymentMethodCode) {
      toast.error(
        "اختر طريقة الدفع.",
      );
      setStep(2);
      return;
    }

    if (
      requiresReceipt &&
      !receiptUrl
    ) {
      toast.error(
        "أرفق إيصال التحويل أولاً.",
      );
      setStep(2);
      return;
    }

    if (!agreeToTerms) {
      toast.error(
        "يجب الموافقة على شروط الطلب.",
      );
      return;
    }

    if (
      items.length === 0
    ) {
      toast.error(
        "السلة فارغة.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const order =
        await createOrder();

      await saveCustomerAddress();

      if (isWalletPayment) {
        await payFromWallet(
          order.id,
        );
      } else {
        await updateReceipt(
          order.id,
        );
      }

      await clearCart();

      try {
        await refreshProfile();
      } catch {
        // لا نمنع إكمال الطلب إذا فشل تحديث بيانات الحساب.
      }

      toast.success(
        "تم إنشاء طلبك بنجاح.",
      );

      navigate({
        to: "/orders",
        search: {
          success: order.id,
        } as never,
      });
    } catch (error) {
      const message =
        getErrorMessage(error);

      console.error(
        "Checkout error:",
        error,
      );

      if (
        /network|failed to fetch|fetch failed|offline/i.test(
          message,
        )
      ) {
        toast.error(
          "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.",
        );
      } else {
        toast.error(
          message ||
            "تعذر إنشاء الطلب.",
        );
      }
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  const progressWidth =
    step === 1
      ? "w-1/3"
      : step === 2
        ? "w-2/3"
        : "w-full";

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background pb-24"
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl px-4 pt-4">
        <div className="mb-5 flex items-center gap-3">
          <Link
            to="/cart"
            className="flex h-10 w-10 items-center justify-center rounded-full border bg-card"
            aria-label="العودة للسلة"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-xl font-bold">
              إتمام الطلب
            </h1>

            <p className="text-sm text-muted-foreground">
              أكمل بياناتك لإرسال الطلب
            </p>
          </div>
        </div>

        <div className="mb-6 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-1.5 transition-all ${progressWidth} bg-primary`}
          />
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2 text-center text-xs">
          <div
            className={
              step >= 1
                ? "font-bold text-primary"
                : "text-muted-foreground"
            }
          >
            1. التوصيل
          </div>

          <div
            className={
              step >= 2
                ? "font-bold text-primary"
                : "text-muted-foreground"
            }
          >
            2. الدفع
          </div>

          <div
            className={
              step >= 3
                ? "font-bold text-primary"
                : "text-muted-foreground"
            }
          >
            3. التأكيد
          </div>
        </div>

        {step === 1 && (
          <section className="space-y-4">
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold">
                    بيانات التوصيل
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    أين نرسل طلبك؟
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Field
                  label="اسم المستلم"
                  value={customerName}
                  onChange={
                    setCustomerName
                  }
                  placeholder="الاسم الكامل"
                />

                <Field
                  label="رقم الهاتف"
                  value={phone}
                  onChange={setPhone}
                  placeholder="7XXXXXXXX"
                  type="tel"
                  dir="ltr"
                />

                <Field
                  label="المحافظة / المدينة"
                  value={city}
                  onChange={setCity}
                  placeholder="مثال: إب"
                />

                <Field
                  label="المنطقة"
                  value={district}
                  onChange={setDistrict}
                  placeholder="اسم المنطقة أو الحي"
                />

                <Field
                  label="تفاصيل العنوان"
                  value={
                    addressDetails
                  }
                  onChange={
                    setAddressDetails
                  }
                  placeholder="الشارع، الحي، رقم المنزل..."
                  multiline
                />

                <Field
                  label="علامة مميزة"
                  value={landmark}
                  onChange={setLandmark}
                  placeholder="بجوار..."
                />

                <Field
                  label="ملاحظات الطلب"
                  value={notes}
                  onChange={setNotes}
                  placeholder="أي ملاحظات إضافية..."
                  multiline
                />

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3">
                  <input
                    type="checkbox"
                    checked={
                      saveAddress
                    }
                    onChange={(event) =>
                      setSaveAddress(
                        event.target
                          .checked,
                      )
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm">
                    حفظ هذا العنوان لحسابي
                  </span>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={
                continueToPayment
              }
              className="flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 font-bold text-primary-foreground"
            >
              متابعة الدفع
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold">
                    طريقة الدفع
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    اختر الطريقة المناسبة لك
                  </p>
                </div>
              </div>

              {paymentMethodsLoading ? (
                <div className="rounded-xl bg-muted p-5 text-center text-sm">
                  جاري تحميل طرق الدفع...
                </div>
              ) : paymentMethods.length ===
                0 ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                  لا توجد طرق دفع متاحة حالياً.
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map(
                    (method) => {
                      const selected =
                        method.code ===
                        paymentMethodCode;

                      return (
                        <label
                          key={
                            method.id
                          }
                          className={`block cursor-pointer rounded-2xl border p-4 transition ${
                            selected
                              ? "border-primary bg-primary/5"
                              : "bg-card"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="payment-method"
                              value={
                                method.code
                              }
                              checked={
                                selected
                              }
                              onChange={() =>
                                setPaymentMethodCode(
                                  method.code,
                                )
                              }
                              className="mt-1 h-4 w-4"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {method.kind ===
                                "wallet_balance" ? (
                                  <Wallet className="h-5 w-5 text-primary" />
                                ) : (
                                  <CreditCard className="h-5 w-5 text-primary" />
                                )}

                                <span className="font-bold">
                                  {
                                    method.display_name
                                  }
                                </span>
                              </div>

                              {method.account_number && (
                                <p
                                  dir="ltr"
                                  className="mt-2 text-sm font-semibold"
                                >
                                  {
                                    method.account_number
                                  }
                                </p>
                              )}

                              {method.account_name && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {
                                    method.account_name
                                  }
                                </p>
                              )}

                              {method.instructions && (
                                <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">
                                  {
                                    method.instructions
                                  }
                                </p>
                              )}

                              {method.requires_receipt && (
                                <p className="mt-2 text-xs font-semibold text-orange-600">
                                  يتطلب إرفاق إيصال التحويل
                                </p>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    },
                  )}
                </div>
              )}

              {requiresReceipt &&
                !isWalletPayment && (
                  <div className="mt-4 rounded-2xl border border-dashed p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" />

                      <span className="font-bold">
                        إيصال التحويل
                      </span>
                    </div>

                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-muted p-4 text-sm font-semibold">
                      <Upload className="h-5 w-5" />

                      <span>
                        {isUploadingReceipt
                          ? "جاري رفع الإيصال..."
                          : receiptUrl
                            ? "تم رفع الإيصال ✓"
                            : "اختر صورة الإيصال"}
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={
                          isUploadingReceipt
                        }
                        onChange={(
                          event,
                        ) => {
                          const file =
                            event
                              .target
                              .files?.[0];

                          if (
                            file
                          ) {
                            void handleReceiptUpload(
                              file,
                            );
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  الإجمالي
                </span>

                <strong className="text-lg">
                  {formatPrice(
                    total,
                  )}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setStep(1)
                }
                className="h-12 rounded-xl border bg-card font-bold"
              >
                رجوع
              </button>

              <button
                type="button"
                onClick={
                  continueToReview
                }
                className="h-12 rounded-xl bg-primary font-bold text-primary-foreground"
              >
                مراجعة الطلب
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <form
            onSubmit={
              submitOrder
            }
            className="space-y-4"
          >
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Package className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold">
                    مراجعة الطلب
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    تأكد من البيانات قبل الإرسال
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <SummaryRow
                  label="المستلم"
                  value={
                    customerName
                  }
                />

                <SummaryRow
                  label="الهاتف"
                  value={
                    phone
                  }
                  dir="ltr"
                />

                <SummaryRow
                  label="العنوان"
                  value={`${city} - ${district} - ${addressDetails}`}
                />

                <SummaryRow
                  label="الدفع"
                  value={
                    selectedMethod?.display_name ??
                    paymentMethodCode
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <h3 className="mb-3 font-bold">
                المنتجات
              </h3>

              <div className="space-y-3">
                {items.map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      className="flex items-center gap-3"
                    >
                      <div className="h-14 w-14 overflow-hidden rounded-xl bg-muted">
                        {item
                          .product
                          ?.images?.[0] ? (
                          <img
                            src={
                              item
                                .product
                                .images[0]
                            }
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold">
                          {
                            item
                              .product
                              .name
                          }
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          الكمية:{" "}
                          {
                            item.quantity
                          }
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>
                    المنتجات
                  </span>

                  <span>
                    {formatPrice(
                      subtotal,
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>
                    التوصيل
                  </span>

                  <span>
                    {formatPrice(
                      deliveryFee,
                    )}
                  </span>
                </div>

                <div className="my-3 border-t" />

                <div className="flex justify-between text-base font-bold">
                  <span>
                    الإجمالي
                  </span>

                  <span>
                    {formatPrice(
                      total,
                    )}
                  </span>
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-4">
              <input
                type="checkbox"
                checked={
                  agreeToTerms
                }
                onChange={(event) =>
                  setAgreeToTerms(
                    event.target
                      .checked,
                  )
                }
                className="mt-1 h-4 w-4"
              />

              <span className="text-sm leading-6">
                أوافق على بيانات الطلب وشروط التوصيل والدفع.
              </span>
            </label>

            <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />

              <span>
                يتم التحقق من أسعار المنتجات والمخزون داخل قاعدة البيانات عند إنشاء الطلب.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={
                  isSubmitting
                }
                onClick={() =>
                  setStep(2)
                }
                className="h-12 rounded-xl border bg-card font-bold"
              >
                تعديل الدفع
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting
                }
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-60"
              >
                {isSubmitting ? (
                  "جاري إرسال الطلب..."
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    تأكيد الطلب
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline = false,
  dir,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  dir?: "rtl" | "ltr";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">
        {label}
      </span>

      {multiline ? (
        <textarea
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          placeholder={
            placeholder
          }
          rows={3}
          dir={dir}
          className="w-full resize-none rounded-xl border bg-background px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          placeholder={
            placeholder
          }
          dir={dir}
          className="h-12 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      )}
    </label>
  );
}

function SummaryRow({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <div className="mb-1 text-xs text-muted-foreground">
        {label}
      </div>

      <div
        dir={dir}
        className="font-semibold"
      >
        {value}
      </div>
    </div>
  );
}
