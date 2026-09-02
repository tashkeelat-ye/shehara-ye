import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  toast,
} from "sonner";

import {
  MapPin,
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
            "إتمام الطلب | تشكيلات",
        },
        {
          name:
            "description",
          content:
            "أكمل بيانات التوصيل، حدّد موقعك على الخريطة، واختر طريقة الدفع المناسبة.",
        },
        {
          property:
            "og:title",
          content:
            "إتمام الطلب | تشكيلات",
        },
        {
          property:
            "og:description",
          content:
            "إتمام الطلب في متجر تشكيلات.",
        },
        {
          property:
            "og:type",
          content:
            "website",
        },
        {
          name:
            "twitter:card",
          content:
            "summary",
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


const ADDRESS_COLUMNS =
  "id,label,recipient_name,phone,city,district,details,landmark,latitude,longitude,is_default";


/**
 * استخراج رسالة الخطأ الحقيقية من أي كائن
 * قادم من Supabase / PostgREST / PostgreSQL.
 */
function extractErrorDetails(
  error: unknown,
): {
  message: string;
  code: string;
  details: string;
  hint: string;
  raw: string;
} {
  if (
    error &&
    typeof error === "object"
  ) {
    const value =
      error as Record<
        string,
        unknown
      >;

    const message =
      typeof value["message"] ===
      "string"
        ? value["message"]
        : "";

    const code =
      typeof value["code"] ===
      "string"
        ? value["code"]
        : "";

    const details =
      typeof value["details"] ===
      "string"
        ? value["details"]
        : "";

    const hint =
      typeof value["hint"] ===
      "string"
        ? value["hint"]
        : "";

    let raw = "";

    try {
      raw =
        JSON.stringify(
          error,
          null,
          2,
        );
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

  if (
    error instanceof Error
  ) {
    return {
      message:
        error.message,
      code: "",
      details: "",
      hint: "",
      raw:
        error.stack ??
        error.message,
    };
  }

  return {
    message:
      typeof error ===
      "string"
        ? error
        : "",
    code: "",
    details: "",
    hint: "",
    raw: String(error),
  };
}


/**
 * تحويل خطأ Supabase إلى نص واضح
 * حتى لا نخسر code/details/hint.
 */
function buildErrorMessage(
  error: unknown,
  stage: string,
): string {
  const info =
    extractErrorDetails(
      error,
    );

  const parts = [
    `المرحلة: ${stage}`,
  ];

  if (info.message) {
    parts.push(
      `الرسالة: ${info.message}`,
    );
  }

  if (info.code) {
    parts.push(
      `الكود: ${info.code}`,
    );
  }

  if (info.details) {
    parts.push(
      `التفاصيل: ${info.details}`,
    );
  }

  if (info.hint) {
    parts.push(
      `التلميح: ${info.hint}`,
    );
  }

  return parts.join(
    "\n",
  );
}


function CheckoutPage() {
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

  const navigate =
    useNavigate();

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
        } = await supabase
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
          console.error(
            "[Checkout] Failed to load addresses:",
            error,
          );

          return [];
        }

        return data ?? [];
      },
  });


  const [
    addressId,
    setAddressId,
  ] =
    useState<string>(
      "new",
    );

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


  /**
   * Token ثابت لمنع إنشاء طلب مكرر
   * عند إعادة المحاولة.
   */
  const [
    checkoutToken,
  ] =
    useState<string>(() =>
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,
    );


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

  const mustAgree =
    !Boolean(
      profile?.accepted_order_policy,
    );


  const selected =
    useMemo(
      () =>
        methods.find(
          (m) =>
            m.code ===
            methodCode,
        ) ?? null,
      [
        methods,
        methodCode,
      ],
    );


  const isWallet =
    selected?.kind ===
      "wallet_balance" ||
    selected?.code ===
      "wallet_balance";


  const needsReceipt =
    Boolean(
      selected?.requires_receipt,
    );


  /**
   * اختيار أول طريقة دفع تلقائيًا.
   */
  useEffect(() => {
    if (
      methodCode ||
      methods.length ===
        0
    ) {
      return;
    }

    const first =
      methods[0];

    if (first) {
      setMethodCode(
        first.code,
      );
    }
  }, [
    methods,
    methodCode,
  ]);


  /**
   * اختيار العنوان الافتراضي.
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
        (a) =>
          a.is_default,
      ) ??
      addresses[0];

    if (defaultAddress) {
      setAddressId(
        defaultAddress.id,
      );
    }
  }, [
    addresses,
  ]);


  /**
   * تعبئة بيانات العنوان.
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
        (a) =>
          a.id ===
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
            lat:
              Number(
                address.latitude,
              ),
            lng:
              Number(
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


  /**
   * التحقق من الطلب.
   */
  function validateCheckout() {
    if (!user?.id) {
      toast.error(
        "انتهت جلسة الدخول. سجّل الدخول مرة أخرى.",
      );

      return false;
    }

    if (
      items.length ===
      0
    ) {
      toast.error(
        "سلتك فارغة.",
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
        "أكمل بيانات التوصيل المطلوبة.",
      );

      return false;
    }

    if (
      !isValidYemeniPhone(
        phone,
      )
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
      walletBalance <
        total
    ) {
      toast.error(
        "رصيد محفظتك غير كافٍ، يمكنك شحن الرصيد أولًا.",
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


  /**
   * تنفيذ الطلب.
   *
   * تم هنا إضافة متغير stage
   * لمعرفة المكان الدقيق للفشل.
   */
  async function submit(
    e: React.FormEvent,
  ) {
    e.preventDefault();

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
        normalizeYemeniPhone(
          phone,
        );


      /**
       * -------------------------------------------------------
       * 1. رفع إيصال الدفع
       * -------------------------------------------------------
       */
      let receiptPath = "";

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
        } catch (receiptError) {
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


      /**
       * -------------------------------------------------------
       * 2. تحديد الحالة
       * -------------------------------------------------------
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


      /**
       * -------------------------------------------------------
       * 3. تجهيز عناصر الطلب
       * -------------------------------------------------------
       */
      stage =
        "تجهيز عناصر الطلب";

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
                item.product.price,
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


      console.log(
        "[Checkout] Prepared order items:",
        orderItems,
      );


      /**
       * -------------------------------------------------------
       * 4. RPC create_checkout_order
       * -------------------------------------------------------
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
          normalizedPhone,

        _reference:
          reference.trim(),

        _receipt_path:
          receiptPath,
      };


      console.log(
        "[Checkout] Calling create_checkout_order",
        {
          payload:
            rpcPayload,
        },
      );


      const {
        data: checkoutData,
        error:
          checkoutError,
      } =
        await supabase.rpc(
          "create_checkout_order",
          rpcPayload,
        );


      console.log(
        "[Checkout] RPC response",
        {
          data:
            checkoutData,
          error:
            checkoutError,
        },
      );


      toast.dismiss(
        "checkout-progress",
      );


      /**
       * لا نخفي تفاصيل خطأ Supabase.
       */
      if (checkoutError) {
        const info =
          extractErrorDetails(
            checkoutError,
          );

        console.error(
          "[Checkout][RPC ERROR]",
          {
            message:
              info.message,

            code:
              info.code,

            details:
              info.details,

            hint:
              info.hint,

            raw:
              info.raw,
          },
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


      console.log(
        "[Checkout] RPC result:",
        result,
      );


      if (
        !result.id ||
        !result.order_number
      ) {
        throw new Error(
          "تم تنفيذ الطلب لكن لم يتم استلام رقم الطلب.",
        );
      }


      /**
       * -------------------------------------------------------
       * 5. الدفع من المحفظة
       * -------------------------------------------------------
       */
      if (isWallet) {
        stage =
          "الدفع من المحفظة";

        const {
          error:
            paymentError,
        } =
          await supabase.rpc(
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
      }


      /**
       * -------------------------------------------------------
       * 6. حفظ العنوان
       * -------------------------------------------------------
       */
      if (saveAddress) {
        stage =
          "حفظ عنوان التوصيل";

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
              normalizedPhone,

            city,

            district:
              district.trim(),

            details:
              details.trim(),

            landmark:
              landmark.trim(),

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


        try {
          if (
            addressId ===
            "new"
          ) {
            const {
              error,
            } =
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
            const {
              error,
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


      /**
       * -------------------------------------------------------
       * 7. حفظ موافقة الشروط
       * -------------------------------------------------------
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

          if (
            policyError
          ) {
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


      /**
       * -------------------------------------------------------
       * 8. تفريغ السلة
       * -------------------------------------------------------
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


      /**
       * -------------------------------------------------------
       * 9. تحديث الملف الشخصي
       * -------------------------------------------------------
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


      /**
       * -------------------------------------------------------
       * 10. النجاح
       * -------------------------------------------------------
       */
      toast.success(
        needsReceipt
          ? `تم إنشاء الطلب ${result.order_number} وهو بانتظار تأكيد الدفع من الإدارة.`
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
      const info =
        extractErrorDetails(
          error,
        );


      /**
       * تسجيل كامل في Console.
       */
      console.error(
        "================================================",
      );

      console.error(
        "[CHECKOUT FINAL ERROR]",
      );

      console.error(
        "Stage:",
        stage,
      );

      console.error(
        "Message:",
        info.message,
      );

      console.error(
        "Code:",
        info.code,
      );

      console.error(
        "Details:",
        info.details,
      );

      console.error(
        "Hint:",
        info.hint,
      );

      console.error(
        "Raw:",
        info.raw,
      );

      console.error(
        "Original error:",
        error,
      );

      console.error(
        "================================================",
      );


      /**
       * رسالة المستخدم.
       *
       * نعرض الخطأ الحقيقي مؤقتًا حتى نستطيع
       * تحديد السبب النهائي.
       */
      let message =
        buildErrorMessage(
          error,
          stage,
        );


      if (
        !message ||
        message.trim() ===
          `المرحلة: ${stage}`
      ) {
        message =
          `تعذر إتمام الطلب.\nالمرحلة: ${stage}`;
      }


      /**
       * أخطاء الشبكة.
       */
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
          duration:
            10000,
        },
      );
    } finally {
      toast.dismiss(
        "checkout-progress",
      );

      setBusy(false);
    }
  }


  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background pb-28 md:pb-8"
    >
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-6">

        <h1 className="text-lg text-foreground">
          إتمام الطلب
        </h1>


        <ul className="mt-4 space-y-2 rounded-2xl border border-border/70 bg-card p-4 text-xs">
          {items.map(
            (item) => (
              <li
                key={
                  item.id
                }
                className="flex justify-between gap-2"
              >
                <span className="line-clamp-1 text-foreground">
                  {
                    item.product
                      .name
                  }{" "}
                  ×{" "}
                  {item.quantity.toLocaleString(
                    "ar-EG",
                  )}
                </span>

                <span className="shrink-0 text-primary">
                  {formatPrice(
                    item.product
                      .price *
                      item.quantity,
                  )}
                </span>
              </li>
            ),
          )}


          <li className="flex justify-between border-t border-border pt-2">
            <span className="text-muted-foreground">
              المجموع الفرعي
            </span>

            <span className="text-foreground">
              {formatPrice(
                subtotal,
              )}
            </span>
          </li>


          <li className="flex justify-between">
            <span className="text-muted-foreground">
              رسوم التوصيل
            </span>

            <span className="text-foreground">
              {formatPrice(
                deliveryFee,
              )}
            </span>
          </li>


          <li className="flex justify-between border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">
              الإجمالي
            </span>

            <span className="text-primary">
              {formatPrice(
                total,
              )}
            </span>
          </li>
        </ul>


        <form
          onSubmit={
            submit
          }
          className="mt-4 space-y-4"
        >

          {addresses.length >
          0 ? (
            <section className="rounded-2xl border border-border/70 bg-card p-4">

              <h2 className="mb-2 text-sm text-foreground">
                عناوين محفوظة
              </h2>

              <div className="grid gap-2">

                {addresses.map(
                  (
                    address,
                  ) => (
                    <label
                      key={
                        address.id
                      }
                      className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-xs ${
                        addressId ===
                        address.id
                          ? "border-primary bg-brand-soft/60"
                          : "border-border"
                      }`}
                    >

                      <input
                        type="radio"
                        name="address"
                        className="mt-1 accent-[var(--color-primary)]"
                        checked={
                          addressId ===
                          address.id
                        }
                        onChange={() =>
                          setAddressId(
                            address.id,
                          )
                        }
                      />


                      <span className="min-w-0">

                        <span className="block text-foreground">
                          {
                            address.label
                          }
                        </span>

                        <span className="block text-muted-foreground">
                          {
                            address.recipient_name
                          }{" "}
                          —{" "}
                          {
                            address.phone
                          }
                        </span>

                        <span className="block text-muted-foreground">
                          {
                            address.details
                          }
                        </span>

                      </span>

                    </label>
                  ),
                )}


                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs ${
                    addressId ===
                    "new"
                      ? "border-primary bg-brand-soft/60"
                      : "border-border"
                  }`}
                >

                  <input
                    type="radio"
                    name="address"
                    className="accent-[var(--color-primary)]"
                    checked={
                      addressId ===
                      "new"
                    }
                    onChange={() =>
                      setAddressId(
                        "new",
                      )
                    }
                  />

                  <span className="text-foreground">
                    إضافة عنوان جديد
                  </span>

                </label>

              </div>

            </section>
          ) : null}


          <section className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-2">

            <h2 className="text-sm text-foreground sm:col-span-2">
              بيانات التوصيل
            </h2>


            <FormField
              label="اسم المستلم"
              required
            >
              <input
                value={
                  name
                }
                onChange={(
                  e,
                ) =>
                  setName(
                    e.target
                      .value,
                  )
                }
                maxLength={
                  100
                }
                placeholder="الاسم الثلاثي"
                className={
                  fieldCls
                }
              />
            </FormField>


            <FormField
              label="رقم الهاتف"
              required
              hint="مثال: 771234567"
            >
              <input
                value={
                  phone
                }
                onChange={(
                  e,
                ) =>
                  setPhone(
                    e.target
                      .value,
                  )
                }
                dir="ltr"
                inputMode="tel"
                maxLength={
                  20
                }
                placeholder="7XXXXXXXX"
                className={
                  fieldCls
                }
              />
            </FormField>


            <FormField
              label="المحافظة"
              required
            >
              <select
                value={
                  city
                }
                onChange={(
                  e,
                ) =>
                  setCity(
                    e.target
                      .value,
                  )
                }
                className={
                  fieldCls
                }
                aria-label="المحافظة"
              >

                <option value="">
                  اختر المحافظة
                </option>

                {YEMEN_GOVERNORATES.map(
                  (
                    governorate,
                  ) => (
                    <option
                      key={
                        governorate
                      }
                      value={
                        governorate
                      }
                    >
                      {
                        governorate
                      }
                    </option>
                  ),
                )}

              </select>
            </FormField>


            <FormField
              label="المديرية"
              required
            >
              <input
                value={
                  district
                }
                onChange={(
                  e,
                ) =>
                  setDistrict(
                    e.target
                      .value,
                  )
                }
                maxLength={
                  80
                }
                placeholder="اسم المديرية"
                className={
                  fieldCls
                }
              />
            </FormField>


            <FormField
              label="تفاصيل العنوان"
              required
            >
              <input
                value={
                  details
                }
                onChange={(
                  e,
                ) =>
                  setDetails(
                    e.target
                      .value,
                  )
                }
                maxLength={
                  300
                }
                placeholder="الحي، الشارع، رقم المنزل"
                className={
                  fieldCls
                }
              />
            </FormField>


            <FormField
              label="أقرب معلم"
              hint="يساعد المندوب في الوصول بسرعة"
            >
              <input
                value={
                  landmark
                }
                onChange={(
                  e,
                ) =>
                  setLandmark(
                    e.target
                      .value,
                  )
                }
                maxLength={
                  120
                }
                placeholder="مثال: أمام صيدلية النور"
                className={
                  fieldCls
                }
              />
            </FormField>


            <div className="sm:col-span-2">

              <FormField label="ملاحظات للطلب">

                <textarea
                  value={
                    notes
                  }
                  onChange={(
                    e,
                  ) =>
                    setNotes(
                      e.target
                        .value,
                    )
                  }
                  maxLength={
                    400
                  }
                  placeholder="أي تفاصيل تود إخبارنا بها"
                  className={
                    areaCls
                  }
                />

              </FormField>

            </div>


            <div className="sm:col-span-2">

              <button
                type="button"
                onClick={() =>
                  setShowMap(
                    (
                      value,
                    ) =>
                      !value,
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-foreground"
              >

                <MapPin className="h-4 w-4 text-primary" />

                {showMap
                  ? "إخفاء الخريطة"
                  : "تحديد موقعي على الخريطة"}

              </button>


              {coords ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground">

                  تم تحديد الموقع:{" "}

                  {coords.lat.toFixed(
                    5,
                  )}

                  ,{" "}

                  {coords.lng.toFixed(
                    5,
                  )}

                </p>
              ) : null}


              {showMap ? (
                <div className="mt-2">

                  <LocationPicker
                    value={
                      coords
                    }
                    onChange={
                      setCoords
                    }
                  />

                </div>
              ) : null}

            </div>


            <label className="flex items-center gap-2 text-xs text-foreground sm:col-span-2">

              <input
                type="checkbox"
                checked={
                  saveAddress
                }
                onChange={(
                  e,
                ) =>
                  setSaveAddress(
                    e.target
                      .checked,
                  )
                }
                className="accent-[var(--color-primary)]"
              />

              حفظ هذا العنوان لاستخدامه في طلباتي القادمة

            </label>

          </section>


          <section className="rounded-2xl border border-border/70 bg-card p-4">

            <h2 className="mb-2 text-sm text-foreground">
              طريقة الدفع
            </h2>


            <div className="grid gap-2">

              {methods.map(
                (
                  method,
                ) => {
                  const wallet =
                    method.code ===
                      "wallet_balance" ||
                    method.kind ===
                      "wallet_balance";

                  return (
                    <label
                      key={
                        method.id
                      }
                      className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-xs ${
                        methodCode ===
                        method.code
                          ? "border-primary bg-brand-soft/60"
                          : "border-border"
                      }`}
                    >

                      <input
                        type="radio"
                        name="method"
                        className="mt-1 accent-[var(--color-primary)]"
                        checked={
                          methodCode ===
                          method.code
                        }
                        onChange={() =>
                          setMethodCode(
                            method.code,
                          )
                        }
                      />


                      <span className="min-w-0">

                        <span className="flex items-center gap-1.5 text-foreground">

                          {wallet ? (
                            <Wallet className="h-3.5 w-3.5 text-primary" />
                          ) : null}

                          {
                            method.display_name
                          }

                        </span>


                        {wallet ? (
                          <span className="block text-muted-foreground">

                            رصيدك الحالي:{" "}

                            {formatPrice(
                              walletBalance,
                            )}

                          </span>
                        ) : null}


                        {method.account_number ? (
                          <span
                            className="block text-muted-foreground"
                            dir="ltr"
                          >
                            {
                              method.account_number
                            }{" "}
                            —{" "}
                            {
                              method.account_name
                            }
                          </span>
                        ) : null}


                        {method.instructions ? (
                          <span className="block text-muted-foreground">
                            {
                              method.instructions
                            }
                          </span>
                        ) : null}

                      </span>

                    </label>
                  );
                },
              )}

            </div>


            {isWallet &&
            walletBalance <
              total ? (
              <p className="mt-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-[11px] text-destructive">

                رصيد المحفظة غير كافٍ.{" "}

                <Link
                  to="/wallet"
                  className="underline"
                >
                  اشحن رصيدك الآن
                </Link>

              </p>
            ) : null}


            {needsReceipt ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">

                <FormField label="اسم المُحوِّل">

                  <input
                    value={
                      senderName
                    }
                    onChange={(
                      e,
                    ) =>
                      setSenderName(
                        e.target
                          .value,
                      )
                    }
                    maxLength={
                      100
                    }
                    className={
                      fieldCls
                    }
                  />

                </FormField>


                <FormField label="رقم المُحوِّل">

                  <input
                    value={
                      senderPhone
                    }
                    onChange={(
                      e,
                    ) =>
                      setSenderPhone(
                        e.target
                          .value,
                      )
                    }
                    dir="ltr"
                    maxLength={
                      20
                    }
                    className={
                      fieldCls
                    }
                  />

                </FormField>


                <FormField label="رقم عملية التحويل">

                  <input
                    value={
                      reference
                    }
                    onChange={(
                      e,
                    ) =>
                      setReference(
                        e.target
                          .value,
                      )
                    }
                    maxLength={
                      60
                    }
                    className={
                      fieldCls
                    }
                  />

                </FormField>


                <FormField
                  label="صورة الإيصال"
                  required
                >

                  <label className="flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-border bg-secondary px-3.5 text-xs text-muted-foreground">

                    <Upload className="h-4 w-4 text-primary" />

                    <span className="truncate">
                      {receipt
                        ? receipt.name
                        : "اختر صورة الإيصال"}
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(
                        e,
                      ) =>
                        setReceipt(
                          e.target
                            .files?.[0] ??
                            null,
                        )
                      }
                    />

                  </label>

                </FormField>

              </div>
            ) : null}

          </section>


          {mustAgree ? (
            <label className="flex items-start gap-2 rounded-2xl border border-border/70 bg-card p-4 text-xs text-foreground">

              <input
                type="checkbox"
                checked={
                  agree
                }
                onChange={(
                  e,
                ) =>
                  setAgree(
                    e.target
                      .checked,
                  )
                }
                className="mt-0.5 accent-[var(--color-primary)]"
              />

              <span>

                أوافق على{" "}

                <Link
                  to="/page/$slug"
                  params={{
                    slug:
                      "terms",
                  }}
                  className="text-primary underline"
                >
                  شروط الاستخدام
                </Link>

                ،{" "}

                <Link
                  to="/page/$slug"
                  params={{
                    slug:
                      "privacy",
                  }}
                  className="text-primary underline"
                >
                  سياسة الخصوصية
                </Link>{" "}

                و{" "}

                <Link
                  to="/page/$slug"
                  params={{
                    slug:
                      "returns",
                  }}
                  className="text-primary underline"
                >
                  سياسة الاستبدال والإرجاع
                </Link>

                .

              </span>

            </label>
          ) : null}


          <button
            type="submit"
            disabled={
              busy ||
              items.length ===
                0
            }
            className="h-12 w-full rounded-2xl bg-primary text-sm text-primary-foreground disabled:opacity-60"
          >

            {busy
              ? "جارٍ تنفيذ الطلب..."
              : `تأكيد الطلب — ${formatPrice(
                  total,
                )}`}

          </button>

        </form>

      </main>

      <BottomNav />

    </div>
  );
}
