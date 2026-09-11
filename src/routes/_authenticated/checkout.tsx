import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { useQuery } from "@tanstack/react-query";

import { toast } from "sonner";

import {
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  FileImage,
  LockKeyhole,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Upload,
  Wallet,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { LocationPicker } from "@/components/location-picker";

import {
  FormField,
  areaCls,
  fieldCls,
} from "@/components/form-ui";

import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";

import {
  fetchPaymentMethods,
  fetchSettings,
} from "@/lib/store";

import { YEMEN_GOVERNORATES } from "@/lib/yemen";

import { uploadReceipt } from "@/lib/media";

import {
  normalizeYemeniPhone,
  isValidYemeniPhone,
} from "@/lib/phone";

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
          "أكمل بيانات التوصيل واختر طريقة الدفع المناسبة لإتمام طلبك من شهارة.",
      },
      {
        property: "og:title",
        content: "إتمام الطلب | شهارة",
      },
      {
        property: "og:description",
        content: "إتمام الطلب في متجر شهارة.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
    ],
  }),

  component: CheckoutPage,
});

type AddressRow = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  city: string;
  district: string;
  details: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
};

const ADDRESS_COLUMNS =
  "id,label,recipient_name,phone,city,district,details,landmark,latitude,longitude,is_default";

function extractErrorDetails(error: unknown) {
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;

    const message =
      typeof value.message === "string"
        ? value.message
        : "";

    const code =
      typeof value.code === "string"
        ? value.code
        : "";

    const details =
      typeof value.details === "string"
        ? value.details
        : "";

    const hint =
      typeof value.hint === "string"
        ? value.hint
        : "";

    let raw = "";

    try {
      raw = JSON.stringify(error, null, 2);
    } catch {
      raw = String(error);
    }

    return {
      message,
      code,
      details,
      hint,
      raw,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: "",
      details: "",
      hint: "",
      raw: error.stack ?? error.message,
    };
  }

  return {
    message:
      typeof error === "string"
        ? error
        : "",
    code: "",
    details: "",
    hint: "",
    raw: String(error),
  };
}

function buildErrorMessage(
  error: unknown,
  stage: string,
) {
  const info = extractErrorDetails(error);

  const parts = [`المرحلة: ${stage}`];

  if (info.message) {
    parts.push(`الرسالة: ${info.message}`);
  }

  if (info.code) {
    parts.push(`الكود: ${info.code}`);
  }

  if (info.details) {
    parts.push(`التفاصيل: ${info.details}`);
  }

  if (info.hint) {
    parts.push(`التلميح: ${info.hint}`);
  }

  return parts.join("\n");
}

function CheckoutPage() {
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

  const navigate = useNavigate();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods", "active"],
    queryFn: () => fetchPaymentMethods(true),
  });

  const {
    data: addresses = [],
    refetch: refetchAddresses,
  } = useQuery({
    queryKey: ["addresses", user?.id ?? ""],
    enabled: Boolean(user?.id),

    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("addresses")
        .select(ADDRESS_COLUMNS)
        .eq("user_id", user.id)
        .order("is_default", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        })
        .returns<AddressRow[]>();

      if (error) {
        console.error(
          "[Checkout] Failed to load addresses:",
          error,
        );

        return [];
      }

      return data ?? [];
    },
  });

  const [addressId, setAddressId] =
    useState<string>("new");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [details, setDetails] = useState("");
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");

  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [showMap, setShowMap] = useState(false);

  const [saveAddress, setSaveAddress] =
    useState(true);

  const [methodCode, setMethodCode] =
    useState("");

  const [senderName, setSenderName] =
    useState("");

  const [senderPhone, setSenderPhone] =
    useState("");

  const [reference, setReference] =
    useState("");

  const [receipt, setReceipt] =
    useState<File | null>(null);

  const [agree, setAgree] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [checkoutToken] =
    useState<string>(() => {
      return (
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`
      );
    });

  const deliveryFee = Number(
    settings?.delivery_fee ?? 0,
  );

  const total =
    Number(subtotal) + deliveryFee;

  const selected = useMemo(
    () =>
      methods.find(
        (method) =>
          method.code === methodCode,
      ) ?? null,
    [methods, methodCode],
  );

  const isWallet =
    selected?.kind ===
      "wallet_balance" ||
    selected?.code ===
      "wallet_balance";

  const {
    data: walletBalance = 0,
    refetch: refetchWalletBalance,
  } = useQuery({
    queryKey: [
      "wallet-balance",
      user?.id ?? "",
      "YER",
    ],

    enabled: Boolean(user?.id),

    queryFn: async () => {
      if (!user?.id) {
        return 0;
      }

      try {
        const {
          data,
          error,
        } = await (supabase as any).rpc(
          "get_wallet",
          {
            requested_currency: "YER",
          },
        );

        if (error) {
          console.error(
            "[Checkout][Wallet]",
            error,
          );

          return 0;
        }

        if (Array.isArray(data)) {
          return Number(
            data[0]?.balance ?? 0,
          );
        }

        return Number(
          data?.balance ?? 0,
        );
      } catch (error) {
        console.error(
          "[Checkout][Wallet]",
          error,
        );

        return 0;
      }
    },
  });

  const mustAgree =
    !Boolean(
      profile?.accepted_order_policy,
    );

  const needsReceipt =
    Boolean(
      selected?.requires_receipt,
    );

  useEffect(() => {
    if (
      methodCode ||
      methods.length === 0
    ) {
      return;
    }

    const first = methods[0];

    if (first) {
      setMethodCode(first.code);
    }
  }, [methods, methodCode]);

  useEffect(() => {
    if (addresses.length === 0) {
      return;
    }

    const defaultAddress =
      addresses.find(
        (address) =>
          address.is_default,
      ) ?? addresses[0];

    if (defaultAddress) {
      setAddressId(
        defaultAddress.id,
      );
    }
  }, [addresses]);

  useEffect(() => {
    if (addressId === "new") {
      setName(
        profile?.full_name ?? "",
      );

      setPhone(
        profile?.phone ?? "",
      );

      return;
    }

    const address =
      addresses.find(
        (item) =>
          item.id === addressId,
      );

    if (!address) {
      return;
    }

    setName(
      address.recipient_name,
    );

    setPhone(address.phone);
    setCity(address.city);
    setDistrict(address.district);
    setDetails(address.details);

    setLandmark(
      address.landmark ?? "",
    );

    setCoords(
      address.latitude !== null &&
        address.longitude !== null
        ? {
            lat: Number(
              address.latitude,
            ),
            lng: Number(
              address.longitude,
            ),
          }
        : null,
    );
  }, [
    addressId,
    addresses,
    profile,
  ]);

  function validateCheckout() {
    if (!user?.id) {
      toast.error(
        "انتهت جلسة الدخول. سجّل الدخول مرة أخرى.",
      );

      return false;
    }

    if (items.length === 0) {
      toast.error("سلتك فارغة.");
      return false;
    }

    if (
      !name.trim() ||
      !phone.trim() ||
      !city ||
      !district.trim() ||
      !details.trim()
    ) {
      toast.error(
        "أكمل بيانات التوصيل المطلوبة.",
      );

      return false;
    }

    if (
      !isValidYemeniPhone(phone)
    ) {
      toast.error(
        "رقم الهاتف غير صحيح، مثال: 771234567",
      );

      return false;
    }

    if (!methodCode) {
      toast.error(
        "اختر طريقة الدفع.",
      );

      return false;
    }

    if (
      isWallet &&
      walletBalance < total
    ) {
      toast.error(
        "رصيد محفظتك غير كافٍ.",
      );

      return false;
    }

    if (
      needsReceipt &&
      !receipt
    ) {
      toast.error(
        "أرفق صورة إيصال التحويل.",
      );

      return false;
    }

    if (
      mustAgree &&
      !agree
    ) {
      toast.error(
        "يجب الموافقة على الشروط وسياسة الإرجاع لإتمام الطلب.",
      );

      return false;
    }

    return true;
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (!validateCheckout()) {
      return;
    }

    if (!user?.id) {
      return;
    }

    setBusy(true);

    let stage =
      "بدء تنفيذ الطلب";

    try {
      stage =
        "تطبيع رقم الهاتف";

      const normalizedPhone =
        normalizeYemeniPhone(phone);

      let receiptPath = "";

      /*
       * رفع إيصال الدفع
       */
      if (
        needsReceipt &&
        receipt
      ) {
        stage =
          "رفع إيصال الدفع";

        toast.loading(
          "جارٍ رفع إيصال التحويل...",
          {
            id:
              "checkout-progress",
          },
        );

        try {
          receiptPath =
            await uploadReceipt(
              user.id,
              receipt,
            );
        } catch (
          receiptError
        ) {
          console.error(
            "[Checkout][ReceiptUpload]",
            extractErrorDetails(
              receiptError,
            ),
          );

          throw receiptError;
        } finally {
          toast.dismiss(
            "checkout-progress",
          );
        }
      }

      /*
       * حالة الطلب والدفع
       */
      stage =
        "تحديد حالة الطلب والدفع";

      const status = (
        isWallet
          ? "pending"
          : needsReceipt
            ? "awaiting_payment"
            : "pending"
      ) as
        | "pending"
        | "awaiting_payment";

      const paymentStatus =
        needsReceipt
          ? "pending"
          : "unpaid";

      /*
       * تجهيز عناصر الطلب
       *
       * هذه القيم ليست مصدر الحقيقة للسعر.
       * الخادم يعيد حساب الأسعار.
       */
      stage =
        "تجهيز عناصر الطلب";

      const orderItems =
        items.map((item) => ({
          product_id:
            item.product_id,

          product_name:
            item.product.name,

          product_image:
            item.product.images?.[0] ??
            "",

          unit_price:
            Number(
              item.product.price,
            ),

          quantity:
            Number(
              item.quantity,
            ),

          size:
            item.size ?? null,

          color:
            item.color ?? null,
        }));

      /*
       * إنشاء الطلب عبر المسار الآمن
       */
      stage =
        "استدعاء create_checkout_order";

      toast.loading(
        "جارٍ تأكيد الطلب...",
        {
          id:
            "checkout-progress",
        },
      );

      const rpcPayload = {
        _checkout_token:
          checkoutToken,

        _items:
          orderItems,

        _subtotal:
          Number(subtotal),

        _delivery_fee:
          deliveryFee,

        _total:
          Number(total),

        _payment_method_code:
          methodCode,

        _payment_status:
          paymentStatus,

        _status:
          status,

        _shipping_name:
          name.trim(),

        _shipping_phone:
          normalizedPhone,

        _shipping_city:
          city,

        _shipping_district:
          district.trim(),

        _shipping_details:
          details.trim(),

        _shipping_landmark:
          landmark.trim(),

        _notes:
          notes.trim(),

        ...(coords
          ? {
              _latitude:
                coords.lat,

              _longitude:
                coords.lng,
            }
          : {}),

        _needs_payment_request:
          needsReceipt,

        _sender_name:
          senderName.trim() ||
          name.trim(),

        _sender_phone:
          senderPhone.trim() ||
          normalizedPhone,

        _reference:
          reference.trim(),

        _receipt_path:
          receiptPath,
      };

      const {
        data: checkoutData,
        error: checkoutError,
      } = await (supabase as any).rpc(
        "create_checkout_order",
        rpcPayload,
      );

      toast.dismiss(
        "checkout-progress",
      );

      if (checkoutError) {
        console.error(
          "[Checkout][RPC ERROR]",
          extractErrorDetails(
            checkoutError,
          ),
        );

        throw checkoutError;
      }

      if (
        !checkoutData ||
        typeof checkoutData !==
          "object"
      ) {
        throw new Error(
          "لم يستلم التطبيق نتيجة صحيحة من الخادم.",
        );
      }

      const result =
        checkoutData as {
          id?: string;
          order_number?: string;
          status?: string;
          payment_status?: string;
          existing?: boolean;
        };

      if (
        !result.id ||
        !result.order_number
      ) {
        throw new Error(
          "تم تنفيذ الطلب لكن لم يتم استلام رقم الطلب.",
        );
      }

      /*
       * الدفع من المحفظة
       *
       * العملية المالية الحقيقية تتم في PostgreSQL.
       */
      if (isWallet) {
        stage =
          "الدفع من المحفظة";

        const {
          error:
            paymentError,
        } = await (supabase as any).rpc(
          "pay_order_from_wallet",
          {
            _order_id:
              result.id,
          },
        );

        if (paymentError) {
          console.error(
            "[Checkout][WalletPayment]",
            extractErrorDetails(
              paymentError,
            ),
          );

          throw paymentError;
        }

        try {
          await refetchWalletBalance();
        } catch (
          walletRefreshError
        ) {
          console.warn(
            "[Checkout] Wallet refresh warning:",
            walletRefreshError,
          );
        }
      }

      /*
       * حفظ العنوان
       */
      if (saveAddress) {
        stage =
          "حفظ عنوان التوصيل";

        const addressPayload = {
          user_id:
            user.id,

          label:
            `${city} - ${district.trim()}`
              .slice(0, 60),

          recipient_name:
            name.trim(),

          phone:
            normalizedPhone,

          city,

          district:
            district.trim(),

          details:
            details.trim(),

          landmark:
            landmark.trim(),

          latitude:
            coords?.lat ?? null,

          longitude:
            coords?.lng ?? null,

          is_default:
            addresses.length === 0,
        };

        try {
          if (
            addressId ===
            "new"
          ) {
            const { error } =
              await supabase
                .from(
                  "addresses",
                )
                .insert(
                  addressPayload,
                );

            if (error) {
              console.warn(
                "[Checkout] Failed to save address:",
                error,
              );
            }
          } else {
            const { error } =
              await supabase
                .from(
                  "addresses",
                )
                .update(
                  addressPayload,
                )
                .eq(
                  "id",
                  addressId,
                )
                .eq(
                  "user_id",
                  user.id,
                );

            if (error) {
              console.warn(
                "[Checkout] Failed to update address:",
                error,
              );
            }
          }

          await refetchAddresses();
        } catch (
          addressError
        ) {
          console.warn(
            "[Checkout] Address save warning:",
            addressError,
          );
        }
      }

      /*
       * حفظ موافقة الشروط
       */
      if (
        mustAgree &&
        agree
      ) {
        stage =
          "حفظ موافقة الشروط";

        try {
          const {
            error:
              policyError,
          } =
            await supabase
              .from(
                "profiles",
              )
              .update({
                accepted_order_policy:
                  true,

                accepted_terms:
                  true,
              })
              .eq(
                "id",
                user.id,
              );

          if (policyError) {
            console.warn(
              "[Checkout] Failed to save policy acceptance:",
              policyError,
            );
          }
        } catch (
          policyError
        ) {
          console.warn(
            "[Checkout] Policy save warning:",
            policyError,
          );
        }
      }

      /*
       * تفريغ السلة
       */
      stage =
        "تفريغ السلة";

      try {
        await clearCart();
      } catch (
        cartError
      ) {
        console.warn(
          "[Checkout] Cart cleanup warning:",
          cartError,
        );
      }

      /*
       * تحديث الملف الشخصي
       */
      stage =
        "تحديث الملف الشخصي";

      try {
        await refreshProfile();
      } catch (
        profileError
      ) {
        console.warn(
          "[Checkout] Profile refresh warning:",
          profileError,
        );
      }

      toast.success(
        needsReceipt
          ? `تم إنشاء الطلب ${result.order_number} وهو بانتظار تأكيد الدفع من الإدارة.`
          : `تم إنشاء الطلب ${result.order_number} بنجاح.`,
        {
          duration: 5000,
        },
      );

      await navigate({
        to: "/orders",
      });
    } catch (error) {
      const info =
        extractErrorDetails(error);

      console.error(
        "[CHECKOUT FINAL ERROR]",
        {
          stage,
          message:
            info.message,
          code:
            info.code,
          details:
            info.details,
          hint:
            info.hint,
        },
      );

      let message =
        buildErrorMessage(
          error,
          stage,
        );

      if (
        /HTTP request cancelled|request cancelled|AbortError|aborted/i.test(
          info.message,
        )
      ) {
        message =
          `انقطع الاتصال أثناء تنفيذ الطلب.\nالمرحلة: ${stage}\n\nلا تضغط عدة مرات. أعد المحاولة مرة واحدة بعد استقرار الإنترنت.`;
      } else if (
        /Failed to fetch|NetworkError|Load failed|fetch failed|network/i.test(
          info.message,
        )
      ) {
        message =
          `تعذر الاتصال بالخادم.\nالمرحلة: ${stage}\n\nتحقق من الإنترنت ثم حاول مرة أخرى.`;
      }

      toast.error(
        message,
        {
          duration: 10000,
        },
      );
    } finally {
      toast.dismiss(
        "checkout-progress",
      );

      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#F6F2EE] pb-28 md:pb-8"
      >
        <SiteHeader />

        <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-10">
          <section className="w-full max-w-md rounded-[28px] border border-[#0D3B4D]/10 bg-white p-8 text-center shadow-[0_25px_70px_-45px_rgba(13,59,77,0.65)]">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[#0D3B4D]/[0.06]">
              <ShoppingBag className="h-9 w-9 text-[#0D3B4D]" />
            </div>

            <h1 className="mt-6 text-xl font-black text-[#0A2A38]">
              سلة التسوق فارغة
            </h1>

            <p className="mt-2 text-xs leading-6 text-slate-500">
              أضف المنتجات التي تريدها إلى السلة أولًا، ثم عد لإتمام
              الطلب.
            </p>

            <Link
              to="/products"
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0D3B4D] px-6 text-sm font-black text-white shadow-[0_18px_35px_-20px_rgba(13,59,77,0.8)]"
            >
              <ShoppingBag className="h-4 w-4" />
              تصفح المتجر
            </Link>
          </section>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F6F2EE] pb-28 md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-5">
          <Link
            to="/products"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-[#0D3B4D]"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للتسوق
          </Link>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#E2723A]/20 bg-[#E2723A]/[0.07] px-3 py-1.5 text-[10px] font-black text-[#A84E27]">
                <LockKeyhole className="h-3.5 w-3.5" />
                إتمام آمن
              </div>

              <h1 className="text-2xl font-black tracking-tight text-[#0A2A38] sm:text-3xl">
                إتمام الطلب
              </h1>

              <p className="mt-1.5 text-xs leading-6 text-slate-500">
                أكمل بيانات التوصيل واختر طريقة الدفع المناسبة.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-[#0D3B4D]/10 bg-white px-3 py-2.5 text-[10px] font-bold text-slate-500 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-[#0D3B4D]" />
              عملية الطلب محمية وآمنة
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[#E2723A]/20 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#E2723A] text-white">
                <Check className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-400">
                  الخطوة 1
                </p>
                <p className="text-[10px] font-black text-[#0A2A38]">
                  السلة
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#0D3B4D]/10 bg-[#0D3B4D] p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-[#E2723A]">
                <MapPin className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[9px] font-bold text-white/50">
                  الخطوة 2
                </p>
                <p className="text-[10px] font-black text-white">
                  التوصيل
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#0D3B4D]/10 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#0D3B4D]/[0.06] text-[#0D3B4D]">
                <CreditCard className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-400">
                  الخطوة 3
                </p>
                <p className="text-[10px] font-black text-[#0A2A38]">
                  الدفع
                </p>
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_350px]"
        >
          {/* Main */}
          <div className="space-y-5">
            {/* Saved addresses */}
            {addresses.length > 0 ? (
              <section className="overflow-hidden rounded-[26px] border border-[#0D3B4D]/10 bg-white shadow-[0_15px_50px_-40px_rgba(13,59,77,0.7)]">
                <div className="border-b border-[#0D3B4D]/[0.07] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0D3B4D]/[0.06] text-[#0D3B4D]">
                      <MapPin className="h-4 w-4" />
                    </div>

                    <div>
                      <h2 className="text-sm font-black text-[#0A2A38]">
                        عناوين التوصيل
                      </h2>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        اختر عنوانًا محفوظًا أو أضف عنوانًا جديدًا.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 p-4">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition ${
                        addressId === address.id
                          ? "border-[#E2723A]/40 bg-[#E2723A]/[0.05]"
                          : "border-[#0D3B4D]/10 bg-[#F6F2EE]/40 hover:bg-[#F6F2EE]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={
                          addressId ===
                          address.id
                        }
                        onChange={() =>
                          setAddressId(
                            address.id,
                          )
                        }
                        className="mt-1 accent-[#E2723A]"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black text-[#0A2A38]">
                            {address.label}
                          </span>

                          {address.is_default ? (
                            <span className="rounded-full bg-[#0D3B4D]/[0.07] px-2 py-0.5 text-[8px] font-black text-[#0D3B4D]">
                              الافتراضي
                            </span>
                          ) : null}
                        </span>

                        <span className="mt-1 block text-[10px] text-slate-500">
                          {address.recipient_name} —{" "}
                          {address.phone}
                        </span>

                        <span className="mt-1 block text-[10px] leading-5 text-slate-400">
                          {address.city} —{" "}
                          {address.district} —{" "}
                          {address.details}
                        </span>
                      </span>
                    </label>
                  ))}

                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition ${
                      addressId === "new"
                        ? "border-[#E2723A]/40 bg-[#E2723A]/[0.05]"
                        : "border-[#0D3B4D]/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={
                        addressId === "new"
                      }
                      onChange={() =>
                        setAddressId("new")
                      }
                      className="accent-[#E2723A]"
                    />

                    <span className="text-xs font-black text-[#0A2A38]">
                      إضافة عنوان جديد
                    </span>
                  </label>
                </div>
              </section>
            ) : null}

            {/* Delivery */}
            <section className="overflow-hidden rounded-[26px] border border-[#0D3B4D]/10 bg-white shadow-[0_15px_50px_-40px_rgba(13,59,77,0.7)]">
              <div className="border-b border-[#0D3B4D]/[0.07] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E2723A]/[0.09] text-[#E2723A]">
                    <PackageCheck className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-sm font-black text-[#0A2A38]">
                      بيانات التوصيل
                    </h2>

                    <p className="mt-0.5 text-[10px] text-slate-400">
                      نحتاج هذه البيانات لتوصيل طلبك بشكل صحيح.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <FormField
                  label="اسم المستلم"
                  required
                >
                  <input
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value,
                      )
                    }
                    maxLength={100}
                    autoComplete="name"
                    placeholder="الاسم الثلاثي"
                    className={fieldCls}
                  />
                </FormField>

                <FormField
                  label="رقم الهاتف"
                  required
                  hint="مثال: 771234567"
                >
                  <input
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value,
                      )
                    }
                    dir="ltr"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={20}
                    placeholder="7XXXXXXXX"
                    className={fieldCls}
                  />
                </FormField>

                <FormField
                  label="المحافظة"
                  required
                >
                  <div className="relative">
                    <select
                      value={city}
                      onChange={(event) =>
                        setCity(
                          event.target.value,
                        )
                      }
                      className={`${fieldCls} appearance-none`}
                      aria-label="المحافظة"
                    >
                      <option value="">
                        اختر المحافظة
                      </option>

                      {YEMEN_GOVERNORATES.map(
                        (governorate) => (
                          <option
                            key={
                              governorate
                            }
                            value={
                              governorate
                            }
                          >
                            {governorate}
                          </option>
                        ),
                      )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </FormField>

                <FormField
                  label="المديرية"
                  required
                >
                  <input
                    value={district}
                    onChange={(event) =>
                      setDistrict(
                        event.target.value,
                      )
                    }
                    maxLength={80}
                    placeholder="اسم المديرية"
                    className={fieldCls}
                  />
                </FormField>

                <div className="sm:col-span-2">
                  <FormField
                    label="تفاصيل العنوان"
                    required
                  >
                    <input
                      value={details}
                      onChange={(event) =>
                        setDetails(
                          event.target.value,
                        )
                      }
                      maxLength={300}
                      placeholder="الحي، الشارع، رقم المنزل"
                      className={fieldCls}
                    />
                  </FormField>
                </div>

                <FormField
                  label="أقرب معلم"
                  hint="يساعد المندوب في الوصول بسرعة"
                >
                  <input
                    value={landmark}
                    onChange={(event) =>
                      setLandmark(
                        event.target.value,
                      )
                    }
                    maxLength={120}
                    placeholder="مثال: أمام صيدلية النور"
                    className={fieldCls}
                  />
                </FormField>

                <FormField label="ملاحظات للطلب">
                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(
                        event.target.value,
                      )
                    }
                    maxLength={400}
                    placeholder="أي تفاصيل إضافية للطلب"
                    className={areaCls}
                  />
                </FormField>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowMap(
                        (value) =>
                          !value,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#0D3B4D]/10 bg-[#F6F2EE] px-4 py-3 text-xs font-black text-[#0D3B4D] transition hover:bg-[#0D3B4D]/[0.07] active:scale-[0.99]"
                  >
                    <MapPin className="h-4 w-4 text-[#E2723A]" />

                    {showMap
                      ? "إخفاء الخريطة"
                      : "تحديد موقعي على الخريطة"}
                  </button>

                  {coords ? (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#0D3B4D]/[0.05] px-3 py-2 text-[9px] font-bold text-[#0D3B4D]">
                      <Check className="h-3.5 w-3.5 text-[#E2723A]" />
                      تم تحديد الموقع
                    </div>
                  ) : null}

                  {showMap ? (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-[#0D3B4D]/10">
                      <LocationPicker
                        value={coords}
                        onChange={
                          setCoords
                        }
                      />
                    </div>
                  ) : null}
                </div>

                <label className="flex items-start gap-2 text-[10px] font-bold text-slate-600 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(event) =>
                      setSaveAddress(
                        event.target
                          .checked,
                      )
                    }
                    className="mt-0.5 accent-[#E2723A]"
                  />

                  حفظ هذا العنوان لاستخدامه في طلباتي القادمة
                </label>
              </div>
            </section>

            {/* Payment */}
            <section className="overflow-hidden rounded-[26px] border border-[#0D3B4D]/10 bg-white shadow-[0_15px_50px_-40px_rgba(13,59,77,0.7)]">
              <div className="border-b border-[#0D3B4D]/[0.07] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0D3B4D]/[0.06] text-[#0D3B4D]">
                    <CreditCard className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-sm font-black text-[#0A2A38]">
                      طريقة الدفع
                    </h2>

                    <p className="mt-0.5 text-[10px] text-slate-400">
                      اختر طريقة الدفع المناسبة لطلبك.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 p-5">
                {methods.length === 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-700">
                    لا توجد طرق دفع متاحة حاليًا. حاول مرة أخرى لاحقًا.
                  </div>
                ) : null}

                {methods.map((method) => {
                  const wallet =
                    method.code ===
                      "wallet_balance" ||
                    method.kind ===
                      "wallet_balance";

                  const active =
                    methodCode ===
                    method.code;

                  return (
                    <label
                      key={method.id}
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        active
                          ? "border-[#E2723A]/40 bg-[#E2723A]/[0.045]"
                          : "border-[#0D3B4D]/10 hover:bg-[#F6F2EE]/50"
                      }`}
                    >
                      <div className="flex gap-3">
                        <input
                          type="radio"
                          name="method"
                          checked={active}
                          onChange={() =>
                            setMethodCode(
                              method.code,
                            )
                          }
                          className="mt-1 accent-[#E2723A]"
                        />

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            {wallet ? (
                              <Wallet className="h-4 w-4 text-[#E2723A]" />
                            ) : (
                              <CreditCard className="h-4 w-4 text-[#0D3B4D]" />
                            )}

                            <span className="text-xs font-black text-[#0A2A38]">
                              {method.display_name}
                            </span>
                          </span>

                          {wallet ? (
                            <span className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-[#0D3B4D]/[0.05] px-3 py-2 text-[10px] font-bold">
                              <span className="text-slate-500">
                                رصيد المحفظة
                              </span>

                              <span className="text-[#E2723A]">
                                {formatPrice(
                                  walletBalance,
                                )}
                              </span>
                            </span>
                          ) : null}

                          {method.account_number ? (
                            <span
                              className="mt-2 block rounded-xl bg-[#F6F2EE] px-3 py-2 text-[10px] font-bold text-slate-500"
                              dir="ltr"
                            >
                              {method.account_number}
                              {method.account_name
                                ? ` — ${method.account_name}`
                                : ""}
                            </span>
                          ) : null}

                          {method.instructions ? (
                            <span className="mt-2 block text-[10px] leading-5 text-slate-400">
                              {method.instructions}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </label>
                  );
                })}

                {isWallet &&
                walletBalance <
                  total ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="text-[10px] font-bold leading-5 text-red-600">
                      رصيد المحفظة غير كافٍ لإتمام هذا الطلب.
                    </p>

                    <Link
                      to="/wallet"
                      className="mt-2 inline-flex text-[10px] font-black text-red-700 underline"
                    >
                      الانتقال إلى المحفظة وشحن الرصيد
                    </Link>
                  </div>
                ) : null}

                {needsReceipt ? (
                  <div className="mt-4 rounded-2xl border border-[#0D3B4D]/10 bg-[#F6F2EE]/60 p-4">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E2723A]/10 text-[#E2723A]">
                        <FileImage className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-xs font-black text-[#0A2A38]">
                          بيانات التحويل
                        </p>

                        <p className="mt-1 text-[9px] leading-5 text-slate-400">
                          أدخل بيانات التحويل وأرفق صورة الإيصال ليتم
                          التحقق من الدفع.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="اسم المُحوِّل">
                        <input
                          value={senderName}
                          onChange={(event) =>
                            setSenderName(
                              event.target
                                .value,
                            )
                          }
                          maxLength={100}
                          className={fieldCls}
                        />
                      </FormField>

                      <FormField label="رقم المُحوِّل">
                        <input
                          value={senderPhone}
                          onChange={(event) =>
                            setSenderPhone(
                              event.target
                                .value,
                            )
                          }
                          dir="ltr"
                          inputMode="tel"
                          maxLength={20}
                          className={fieldCls}
                        />
                      </FormField>

                      <FormField label="رقم عملية التحويل">
                        <input
                          value={reference}
                          onChange={(event) =>
                            setReference(
                              event.target
                                .value,
                            )
                          }
                          maxLength={60}
                          className={fieldCls}
                        />
                      </FormField>

                      <FormField
                        label="صورة الإيصال"
                        required
                      >
                        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#0D3B4D]/20 bg-white px-3.5 text-xs transition hover:border-[#E2723A]/40">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#0D3B4D]/[0.06]">
                            <Upload className="h-4 w-4 text-[#E2723A]" />
                          </div>

                          <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-slate-500">
                            {receipt
                              ? receipt.name
                              : "اختر صورة الإيصال"}
                          </span>

                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file =
                                event.target
                                  .files?.[0] ??
                                null;

                              if (
                                file &&
                                file.size >
                                  8 *
                                    1024 *
                                    1024
                              ) {
                                toast.error(
                                  "حجم صورة الإيصال يجب ألا يتجاوز 8MB.",
                                );

                                event.target.value =
                                  "";

                                setReceipt(
                                  null,
                                );

                                return;
                              }

                              setReceipt(
                                file,
                              );
                            }}
                          />
                        </label>
                      </FormField>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            {/* Policy */}
            {mustAgree ? (
              <section className="rounded-[26px] border border-[#0D3B4D]/10 bg-white p-5 shadow-[0_15px_50px_-40px_rgba(13,59,77,0.7)]">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(event) =>
                      setAgree(
                        event.target.checked,
                      )
                    }
                    className="mt-1 h-4 w-4 accent-[#E2723A]"
                  />

                  <span className="text-[10px] leading-6 text-slate-500">
                    أوافق على{" "}
                    <Link
                      to="/page/$slug"
                      params={{
                        slug: "terms",
                      }}
                      className="font-black text-[#0D3B4D] underline"
                    >
                      شروط الاستخدام
                    </Link>
                    ،{" "}
                    <Link
                      to="/page/$slug"
                      params={{
                        slug: "privacy",
                      }}
                      className="font-black text-[#0D3B4D] underline"
                    >
                      سياسة الخصوصية
                    </Link>{" "}
                    و{" "}
                    <Link
                      to="/page/$slug"
                      params={{
                        slug: "returns",
                      }}
                      className="font-black text-[#0D3B4D] underline"
                    >
                      سياسة الاستبدال والإرجاع
                    </Link>
                    .
                  </span>
                </label>
              </section>
            ) : null}
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <section className="overflow-hidden rounded-[28px] border border-[#0D3B4D]/10 bg-white shadow-[0_25px_70px_-45px_rgba(13,59,77,0.75)]">
              <div
                className="px-5 py-5"
                style={{
                  background:
                    "linear-gradient(145deg, #0D3B4D, #0A2A38)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#E2723A]">
                    <ShoppingBag className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-sm font-black text-white">
                      ملخص الطلب
                    </h2>

                    <p className="mt-1 text-[9px] text-white/50">
                      {items.length.toLocaleString(
                        "ar-EG",
                      )}{" "}
                      منتجات مختلفة
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="max-h-[330px] space-y-2 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 rounded-2xl bg-[#F6F2EE]/70 p-2.5"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white">
                        <img
                          src={
                            item.product
                              .images?.[0] ||
                            "/placeholder.svg"
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[10px] font-black leading-4 text-[#0A2A38]">
                          {item.product.name}
                        </p>

                        <p className="mt-1 text-[9px] text-slate-400">
                          الكمية:{" "}
                          {item.quantity.toLocaleString(
                            "ar-EG",
                          )}
                        </p>

                        <p className="mt-1 text-[10px] font-black text-[#E2723A]">
                          {formatPrice(
                            Number(
                              item.product.price,
                            ) *
                              item.quantity,
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="my-4 h-px bg-[#0D3B4D]/10" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      المجموع الفرعي
                    </span>

                    <span className="font-bold text-[#0A2A38]">
                      {formatPrice(
                        subtotal,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      رسوم التوصيل
                    </span>

                    <span className="font-bold text-[#0A2A38]">
                      {formatPrice(
                        deliveryFee,
                      )}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-[#0D3B4D]/[0.05] p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-black text-[#0A2A38]">
                        الإجمالي
                      </span>

                      <span className="text-xl font-black text-[#E2723A]">
                        {formatPrice(
                          total,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    busy ||
                    items.length === 0
                  }
                  className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-[18px] bg-[#E2723A] text-sm font-black text-white shadow-[0_18px_35px_-20px_rgba(226,114,58,0.8)] transition hover:brightness-105 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      جارٍ تنفيذ الطلب...
                    </>
                  ) : (
                    <>
                      <LockKeyhole className="h-4 w-4" />
                      تأكيد الطلب
                    </>
                  )}
                </button>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[#F6F2EE] p-2.5 text-center">
                    <ShieldCheck className="mx-auto h-4 w-4 text-[#0D3B4D]" />

                    <p className="mt-1 text-[8px] font-bold text-slate-500">
                      دفع آمن
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F6F2EE] p-2.5 text-center">
                    <PackageCheck className="mx-auto h-4 w-4 text-[#E2723A]" />

                    <p className="mt-1 text-[8px] font-bold text-slate-500">
                      توصيل للباب
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
