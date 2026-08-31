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

import {
  useQuery,
} from "@tanstack/react-query";

import {
  toast,
} from "sonner";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  SiteHeader,
} from "@/components/site-header";

import {
  BottomNav,
} from "@/components/bottom-nav";

import {
  LocationPicker,
} from "@/components/location-picker";

import {
  FormField,
  areaCls,
  fieldCls,
} from "@/components/form-ui";

import {
  useAuth,
} from "@/lib/auth-context";

import {
  useCart,
} from "@/lib/cart-context";

import {
  useFormatPrice,
} from "@/lib/currency-context";

import {
  fetchPaymentMethods,
  fetchSettings,
} from "@/lib/store";

import {
  YEMEN_GOVERNORATES,
} from "@/lib/yemen";

import {
  uploadReceipt,
} from "@/lib/media";

import {
  normalizeYemeniPhone,
  isValidYemeniPhone,
} from "@/lib/phone";


export const Route =
  createFileRoute(
    "/_authenticated/checkout",
  )({
    head: () => ({
      meta: [
        {
          title:
            "إتمام الطلب | شهارة",
        },
        {
          name:
            "description",
          content:
            "أكمل بيانات التوصيل والدفع لإتمام طلبك من شهارة.",
        },
      ],
    }),

    component:
      CheckoutPage,
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


type CheckoutResult = {
  id?: string;
  order_number?: string;
  status?: string;
  payment_status?: string;
  existing?: boolean;
};


const ADDRESS_COLUMNS =
  "id,label,recipient_name,phone,city,district,details,landmark,latitude,longitude,is_default";


function errorMessage(
  error: unknown,
) {
  if (
    error &&
    typeof error ===
      "object"
  ) {
    const value =
      error as Record<
        string,
        unknown
      >;

    return {
      message:
        typeof value.message ===
        "string"
          ? value.message
          : "حدث خطأ غير متوقع.",
      code:
        typeof value.code ===
        "string"
          ? value.code
          : "",
      details:
        typeof value.details ===
        "string"
          ? value.details
          : "",
      hint:
        typeof value.hint ===
        "string"
          ? value.hint
          : "",
    };
  }

  if (
    error instanceof Error
  ) {
    return {
      message:
        error.message,
      code: "",
      details: "",
      hint: "",
    };
  }

  return {
    message:
      String(error),
    code: "",
    details: "",
    hint: "",
  };
}


function CheckoutPage() {
  const navigate =
    useNavigate();

  const formatPrice =
    useFormatPrice();

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


  /*
   * ------------------------------------------
   * البيانات الأساسية
   * ------------------------------------------
   */

  const {
    data: settings,
  } = useQuery({
    queryKey: [
      "settings",
    ],
    queryFn:
      fetchSettings,
  });


  const {
    data: methods = [],
    isLoading:
      methodsLoading,
  } = useQuery({
    queryKey: [
      "payment-methods",
      "active",
    ],
    queryFn: () =>
      fetchPaymentMethods(
        true,
      ),
  });


  const {
    data: addresses = [],
    refetch:
      refetchAddresses,
  } = useQuery({
    queryKey: [
      "addresses",
      user?.id ?? "",
    ],

    enabled:
      Boolean(user?.id),

    queryFn:
      async () => {
        if (!user?.id) {
          return [];
        }

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "addresses",
            )
            .select(
              ADDRESS_COLUMNS,
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
            .returns<AddressRow[]>();

        if (error) {
          throw error;
        }

        return data ?? [];
      },
  });


  /*
   * ------------------------------------------
   * حالة النموذج
   * ------------------------------------------
   */

  const [
    addressId,
    setAddressId,
  ] =
    useState("new");


  const [
    name,
    setName,
  ] =
    useState("");


  const [
    phone,
    setPhone,
  ] =
    useState("");


  const [
    city,
    setCity,
  ] =
    useState("");


  const [
    district,
    setDistrict,
  ] =
    useState("");


  const [
    details,
    setDetails,
  ] =
    useState("");


  const [
    landmark,
    setLandmark,
  ] =
    useState("");


  const [
    notes,
    setNotes,
  ] =
    useState("");


  const [
    coords,
    setCoords,
  ] =
    useState<{
      lat: number;
      lng: number;
    } | null>(
      null,
    );


  const [
    showMap,
    setShowMap,
  ] =
    useState(false);


  const [
    saveAddress,
    setSaveAddress,
  ] =
    useState(true);


  const [
    methodCode,
    setMethodCode,
  ] =
    useState("");


  const [
    senderName,
    setSenderName,
  ] =
    useState("");


  const [
    senderPhone,
    setSenderPhone,
  ] =
    useState("");


  const [
    reference,
    setReference,
  ] =
    useState("");


  const [
    receipt,
    setReceipt,
  ] =
    useState<File | null>(
      null,
    );


  const [
    agree,
    setAgree,
  ] =
    useState(false);


  const [
    busy,
    setBusy,
  ] =
    useState(false);


  const [
    step,
    setStep,
  ] =
    useState<1 | 2 | 3>(
      1,
    );


  /*
   * Token يمنع تكرار الطلب
   * عند الضغط عدة مرات.
   */

  const [
    checkoutToken,
  ] =
    useState<string>(
      () =>
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,
    );


  /*
   * ------------------------------------------
   * الأسعار
   * ------------------------------------------
   */

  const deliveryFee =
    Number(
      settings?.delivery_fee ??
        0,
    );


  const total =
    Number(subtotal) +
    deliveryFee;


  const walletBalance =
    Number(
      profile?.wallet_balance ??
        0,
    );


  /*
   * ------------------------------------------
   * طريقة الدفع المختارة
   * ------------------------------------------
   */

  const selectedMethod =
    useMemo(
      () =>
        methods.find(
          (method) =>
            method.code ===
            methodCode,
        ) ?? null,
      [
        methods,
        methodCode,
      ],
    );


  const isWallet =
    selectedMethod?.kind ===
      "wallet_balance" ||
    selectedMethod?.code ===
      "wallet_balance";


  const needsReceipt =
    Boolean(
      selectedMethod?.requires_receipt,
    );


  const mustAgree =
    !Boolean(
      profile?.accepted_order_policy,
    );


  /*
   * ------------------------------------------
   * اختيار طريقة الدفع الافتراضية
   * ------------------------------------------
   */

  useEffect(() => {
    if (
      methodCode ||
      methods.length ===
        0
    ) {
      return;
    }

    setMethodCode(
      methods[0].code,
    );
  }, [
    methods,
    methodCode,
  ]);


  /*
   * ------------------------------------------
   * اختيار العنوان الافتراضي
   * ------------------------------------------
   */

  useEffect(() => {
    if (
      addresses.length ===
      0
    ) {
      return;
    }

    const defaultAddress =
      addresses.find(
        (address) =>
          address.is_default,
      ) ??
      addresses[0];

    if (
      addressId ===
      "new"
    ) {
      setAddressId(
        defaultAddress.id,
      );
    }
  }, [
    addresses,
    addressId,
  ]);


  /*
   * ------------------------------------------
   * تعبئة بيانات العنوان
   * ------------------------------------------
   */

  useEffect(() => {
    if (
      addressId ===
      "new"
    ) {
      setName(
        profile?.full_name ??
          "",
      );

      setPhone(
        profile?.phone ??
          "",
      );

      return;
    }

    const address =
      addresses.find(
        (item) =>
          item.id ===
          addressId,
      );

    if (!address) {
      return;
    }

    setName(
      address.recipient_name,
    );

    setPhone(
      address.phone,
    );

    setCity(
      address.city,
    );

    setDistrict(
      address.district,
    );

    setDetails(
      address.details,
    );

    setLandmark(
      address.landmark ??
        "",
    );

    setCoords(
      address.latitude !==
        null &&
      address.longitude !==
        null
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


  /*
   * ------------------------------------------
   * منع Checkout بسلة فارغة
   * ------------------------------------------
   */

  useEffect(() => {
    if (
      items.length ===
        0 &&
      !busy
    ) {
      setStep(1);
    }
  }, [
    items.length,
    busy,
  ]);


  /*
   * ------------------------------------------
   * الانتقال للخطوة التالية
   * ------------------------------------------
   */

  function continueToPayment() {
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

      return;
    }

    if (
      !isValidYemeniPhone(
        phone,
      )
    ) {
      toast.error(
        "رقم الهاتف غير صحيح.",
      );

      return;
    }

    setStep(2);

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }


  /*
   * ------------------------------------------
   * الانتقال للتأكيد
   * ------------------------------------------
   */

  function continueToConfirm() {
    if (!methodCode) {
      toast.error(
        "اختر طريقة الدفع.",
      );

      return;
    }

    if (
      isWallet &&
      walletBalance <
        total
    ) {
      toast.error(
        "رصيد المحفظة غير كافٍ.",
      );

      return;
    }

    if (
      needsReceipt &&
      !receipt
    ) {
      toast.error(
        "أرفق صورة إيصال التحويل.",
      );

      return;
    }

    setStep(3);

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }


  /*
   * ------------------------------------------
   * التحقق النهائي
   * ------------------------------------------
   */

  function validateFinal() {
    if (!user?.id) {
      toast.error(
        "يجب تسجيل الدخول أولاً.",
      );

      return false;
    }

    if (
      items.length ===
      0
    ) {
      toast.error(
        "السلة فارغة.",
      );

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
        "بيانات التوصيل غير مكتملة.",
      );

      setStep(1);

      return false;
    }

    if (
      !isValidYemeniPhone(
        phone,
      )
    ) {
      toast.error(
        "رقم الهاتف غير صحيح.",
      );

      setStep(1);

      return false;
    }

    if (!methodCode) {
      toast.error(
        "اختر طريقة الدفع.",
      );

      setStep(2);

      return false;
    }

    if (
      isWallet &&
      walletBalance <
        total
    ) {
      toast.error(
        "رصيد المحفظة غير كافٍ.",
      );

      setStep(2);

      return false;
    }

    if (
      needsReceipt &&
      !receipt
    ) {
      toast.error(
        "يجب إرفاق إيصال الدفع.",
      );

      setStep(2);

      return false;
    }

    if (
      mustAgree &&
      !agree
    ) {
      toast.error(
        "يجب الموافقة على الشروط والسياسات.",
      );

      return false;
    }

    return true;
  }


  /*
   * ------------------------------------------
   * تنفيذ الطلب
   * ------------------------------------------
   */

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (!validateFinal()) {
      return;
    }

    if (!user?.id) {
      return;
    }

    setBusy(true);

    let receiptPath =
      "";

    try {
      /*
       * 1 — رفع الإيصال
       */

      if (
        needsReceipt &&
        receipt
      ) {
        toast.loading(
          "جارٍ رفع إيصال الدفع...",
          {
            id:
              "checkout",
          },
        );

        receiptPath =
          await uploadReceipt(
            user.id,
            receipt,
          );

        toast.dismiss(
          "checkout",
        );
      }


      /*
       * 2 — تجهيز عناصر الطلب
       */

      const orderItems =
        items.map(
          (item) => ({
            product_id:
              item.product_id,

            product_name:
              item.product.name,

            product_image:
              item.product
                .images?.[0] ??
              "",

            unit_price:
              Number(
                item.product
                  .price,
              ),

            quantity:
              Number(
                item.quantity,
              ),

            size:
              item.size ??
              null,

            color:
              item.color ??
              null,
          }),
        );


      /*
       * 3 — حالة الدفع
       */

      const status =
        isWallet
          ? "pending"
          : needsReceipt
            ? "awaiting_payment"
            : "pending";


      const paymentStatus =
        needsReceipt
          ? "pending"
          : "unpaid";


      /*
       * 4 — إنشاء الطلب
       */

      toast.loading(
        "جارٍ تأكيد طلبك...",
        {
          id:
            "checkout",
        },
      );


      const {
        data,
        error,
      } =
        await supabase.rpc(
          "create_checkout_order",
          {
            _checkout_token:
              checkoutToken,

            _items:
              orderItems,

            _subtotal:
              Number(
                subtotal,
              ),

            _delivery_fee:
              deliveryFee,

            _total:
              Number(
                total,
              ),

            _payment_method_code:
              methodCode,

            _payment_status:
              paymentStatus,

            _status:
              status,

            _shipping_name:
              name.trim(),

            _shipping_phone:
              normalizeYemeniPhone(
                phone,
              ),

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

            _latitude:
              coords?.lat ??
              null,

            _longitude:
              coords?.lng ??
              null,

            _needs_payment_request:
              needsReceipt,

            _sender_name:
              senderName.trim() ||
              name.trim(),

            _sender_phone:
              senderPhone.trim() ||
              normalizeYemeniPhone(
                phone,
              ),

            _reference:
              reference.trim(),

            _receipt_path:
              receiptPath,
          },
        );


      toast.dismiss(
        "checkout",
      );


      if (error) {
        throw error;
      }


      if (
        !data ||
        typeof data !==
          "object"
      ) {
        throw new Error(
          "لم يستلم التطبيق نتيجة صحيحة من الخادم.",
        );
      }


      const result =
        data as CheckoutResult;


      if (
        !result.id ||
        !result.order_number
      ) {
        throw new Error(
          "تعذر الحصول على رقم الطلب.",
        );
      }


      /*
       * 5 — الدفع من المحفظة
       */

      if (isWallet) {
        const {
          error:
            walletError,
        } =
          await supabase.rpc(
            "pay_order_from_wallet",
            {
              _order_id:
                result.id,
            },
          );

        if (walletError) {
          throw walletError;
        }
      }


      /*
       * 6 — حفظ العنوان
       */

      if (saveAddress) {
        const addressPayload =
          {
            user_id:
              user.id,

            label:
              `${city} - ${district.trim()}`
                .slice(
                  0,
                  60,
                ),

            recipient_name:
              name.trim(),

            phone:
              normalizeYemeniPhone(
                phone,
              ),

            city,

            district:
              district.trim(),

            details:
              details.trim(),

            landmark:
              landmark.trim() ||
              null,

            latitude:
              coords?.lat ??
              null,

            longitude:
              coords?.lng ??
              null,

            is_default:
              addresses.length ===
              0,
          };


        if (
          addressId ===
          "new"
        ) {
          const {
            error:
              addressError,
          } =
            await supabase
              .from(
                "addresses",
              )
              .insert(
                addressPayload,
              );

          if (
            addressError
          ) {
            console.warn(
              "[Checkout] Address save failed:",
              addressError,
            );
          }
        } else {
          const {
            error:
              addressError,
          } =
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

          if (
            addressError
          ) {
            console.warn(
              "[Checkout] Address update failed:",
              addressError,
            );
          }
        }

        await refetchAddresses();
      }


      /*
       * 7 — حفظ موافقة السياسات
       */

      if (
        mustAgree &&
        agree
      ) {
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

        if (
          policyError
        ) {
          console.warn(
            "[Checkout] Policy update failed:",
            policyError,
          );
        }
      }


      /*
       * 8 — تفريغ السلة
       */

      await clearCart();


      /*
       * 9 — تحديث الملف
       */

      await refreshProfile();


      /*
       * 10 — النجاح
       */

      toast.success(
        needsReceipt
          ? `تم إنشاء الطلب ${result.order_number} وهو بانتظار مراجعة الدفع.`
          : `تم إنشاء الطلب ${result.order_number} بنجاح.`,
        {
          duration:
            5000,
        },
      );


      await navigate({
        to: "/orders",
      });
    } catch (
      error
    ) {
      toast.dismiss(
        "checkout",
      );

      const info =
        errorMessage(
          error,
        );


      console.error(
        "[Shehara Checkout]",
        {
          message:
            info.message,
          code:
            info.code,
          details:
            info.details,
          hint:
            info.hint,
          error,
        },
      );


      let message =
        "تعذر إتمام الطلب.";


      if (
        /network|fetch|abort|load failed/i.test(
          info.message,
        )
     
