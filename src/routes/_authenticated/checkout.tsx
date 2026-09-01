import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  Loader2,
  MapPin,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";
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
import { YEMEN_GOVERNORATES } from "@/lib/yemen";
import { uploadReceipt } from "@/lib/media";
import {
  isValidYemeniPhone,
  normalizeYemeniPhone,
} from "@/lib/phone";

type Address = {
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
};

const COLS =
  "id,label,recipient_name,phone,city,district,details,landmark,latitude,longitude,is_default";

const errText = (e: unknown) =>
  e instanceof Error ? e.message : "تعذر إتمام الطلب.";

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
    data: methods = [],
    isLoading: loading,
  } = useQuery({
    queryKey: ["payment-methods", "active"],
    queryFn: () => fetchPaymentMethods(true),
  });

  const {
    data: addresses = [],
    refetch,
  } = useQuery({
    queryKey: ["addresses", user?.id ?? ""],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) {
        return [] as Address[];
      }

      const {
        data,
        error,
      } = await supabase
        .from("addresses")
        .select(COLS)
        .eq("user_id", user.id)
        .order("is_default", {
          ascending: false,
        })
        .returns<Address[]>();

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const [
    addressId,
    setAddressId,
  ] = useState("new");

  const [
    name,
    setName,
  ] = useState(profile?.full_name ?? "");

  const [
    phone,
    setPhone,
  ] = useState(profile?.phone ?? "");

  const [
    city,
    setCity,
  ] = useState("");

  const [
    district,
    setDistrict,
  ] = useState("");

  const [
    details,
    setDetails,
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
    methodCode,
    setMethodCode,
  ] = useState("");

  const [
    senderName,
    setSenderName,
  ] = useState("");

  const [
    senderPhone,
    setSenderPhone,
  ] = useState("");

  const [
    reference,
    setReference,
  ] = useState("");

  const [
    receipt,
    setReceipt,
  ] = useState<File | null>(null);

  const [
    saveAddress,
    setSaveAddress,
  ] = useState(true);

  const [
    agree,
    setAgree,
  ] = useState(false);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    lat,
    setLat,
  ] = useState<number | null>(null);

  const [
    lng,
    setLng,
  ] = useState<number | null>(null);

  const [
    token,
  ] = useState(
    () =>
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random()}`,
  );

  const fee =
    Number(settings?.delivery_fee ?? 0);

  const total =
    Number(subtotal) + fee;

  const balance =
    Number(profile?.wallet_balance ?? 0);

  const method =
    useMemo(
      () =>
        methods.find(
          (m) =>
            m.code === methodCode,
        ) ?? null,
      [
        methods,
        methodCode,
      ],
    );

  const wallet =
    method?.kind ===
      "wallet_balance" ||
    method?.code ===
      "wallet_balance";

  const receiptNeeded =
    !!method?.requires_receipt;

  const needAgree =
    !profile?.accepted_order_policy;

  useEffect(() => {
    if (
      !methodCode &&
      methods[0]
    ) {
      setMethodCode(
        methods[0].code,
      );
    }
  }, [
    methods,
    methodCode,
  ]);

  useEffect(() => {
    if (
      addresses.length &&
      addressId === "new"
    ) {
      setAddressId(
        (
          addresses.find(
            (a) => a.is_default,
          ) ??
          addresses[0]
        ).id,
      );
    }
  }, [
    addresses,
    addressId,
  ]);

  useEffect(() => {
    if (
      addressId === "new"
    ) {
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
        (x) =>
          x.id === addressId,
      );

    if (address) {
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
        address.landmark ?? "",
      );

      setLat(
        address.latitude,
      );

      setLng(
        address.longitude,
      );
    }
  }, [
    addressId,
    addresses,
    profile,
  ]);

  const delivery = () => {
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
        "رقم الهاتف غير صحيح.",
      );

      return false;
    }

    return true;
  };

  async function submit(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (
      busy ||
      !user?.id ||
      !items.length ||
      !delivery()
    ) {
      return;
    }

    if (!methodCode) {
      toast.error(
        "اختر طريقة الدفع.",
      );

      return;
    }

    if (
      wallet &&
      balance < total
    ) {
      toast.error(
        "رصيد المحفظة غير كافٍ.",
      );

      return;
    }

    if (
      receiptNeeded &&
      !receipt
    ) {
      toast.error(
        "أرفق صورة إيصال التحويل.",
      );

      return;
    }

    if (
      needAgree &&
      !agree
    ) {
      toast.error(
        "يجب الموافقة على الشروط والسياسات.",
      );

      return;
    }

    setBusy(true);

    let path = "";

    try {
      if (
        receiptNeeded &&
        receipt
      ) {
        toast.loading(
          "جارٍ رفع الإيصال...",
          {
            id: "checkout",
          },
        );

        path =
          await uploadReceipt(
            user.id,
            receipt,
          );
      }

      const orderItems =
        items.map((i) => ({
          product_id:
            i.product_id,

          product_name:
            i.product.name,

          product_image:
            i.product.images?.[0] ??
            "",

          unit_price:
            Number(
              i.product.price,
            ),

          quantity:
            Number(
              i.quantity,
            ),

          size:
            i.size ?? null,

          color:
            i.color ?? null,
        }));

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "create_checkout_order",
          {
            _checkout_token:
              token,

            _items:
              orderItems,

            _subtotal:
              Number(
                subtotal,
              ),

            _delivery_fee:
              fee,

            _total:
              total,

            _payment_method_code:
              methodCode,

            _payment_status:
              receiptNeeded
                ? "pending"
                : "unpaid",

            _status:
              wallet
                ? "pending"
                : receiptNeeded
                  ? "awaiting_payment"
                  : "pending",

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
              lat,

            _longitude:
              lng,

            _needs_payment_request:
              receiptNeeded,

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
              path,
          },
        );

      if (error) {
        throw error;
      }

      const result =
        data as CheckoutResult;

      if (
        !result?.id ||
        !result.order_number
      ) {
        throw new Error(
          "تعذر الحصول على رقم الطلب.",
        );
      }

      if (wallet) {
        const {
          error: paymentError,
        } =
          await supabase.rpc(
            "pay_order_from_wallet",
            {
              _order_id:
                result.id,
            },
          );

        if (paymentError) {
          throw paymentError;
        }
      }

      if (saveAddress) {
        const payload = {
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
            lat,

          longitude:
            lng,

          is_default:
            addresses.length ===
            0,
        };

        const query =
          addressId === "new"
            ? supabase
                .from(
                  "addresses",
                )
                .insert(
                  payload,
                )
            : supabase
                .from(
                  "addresses",
                )
                .update(
                  payload,
                )
                .eq(
                  "id",
                  addressId,
                )
                .eq(
                  "user_id",
                  user.id,
                );

        const {
          error: addressError,
        } =
          await query;

        if (addressError) {
          console.warn(
            "[Checkout] address save failed",
            addressError,
          );
        }

        await refetch();
      }

      if (
        needAgree &&
        agree
      ) {
        const {
          error: policyError,
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
            "[Checkout] policy update failed",
            policyError,
          );
        }
      }

      await clearCart();
      await refreshProfile();

      toast.dismiss(
        "checkout",
      );

      toast.success(
        `تم إنشاء الطلب ${result.order_number}${
          receiptNeeded
            ? " وهو بانتظار مراجعة الدفع"
            : " بنجاح"
        }.`,
      );

      await navigate({
        to: "/orders",
      });
    } catch (e) {
      toast.dismiss(
        "checkout",
      );

      console.error(
        "[Shehara Checkout]",
        e,
      );

      const message =
        errText(e);

      toast.error(
        /network|fetch|abort|load failed/i.test(
          message,
        )
          ? "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى."
          : message,
        {
          duration: 6000,
        },
      );
    } finally {
      setBusy(false);
    }
  }

  if (!items.length) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl rounded-3xl border bg-card p-8 text-center">
          <Check className="mx-auto h-12 w-12 text-primary" />

          <h1 className="mt-3 text-xl font-bold">
            السلة فارغة
          </h1>

          <button
            onClick={() =>
              navigate({
                to: "/",
              })
            }
            className="mt-5 h-12 rounded-xl bg-primary px-6 font-bold text-primary-foreground"
          >
            العودة للتسوق
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <form
        onSubmit={submit}
        className="mx-auto max-w-3xl space-y-4"
      >
        <div className="rounded-3xl border bg-card p-5">
          <h1 className="text-2xl font-bold">
            إتمام الطلب
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            أكمل بيانات التوصيل والدفع ثم أكد الطلب.
          </p>
        </div>

        <section className="rounded-3xl border bg-card p-5">
          <Title
            icon={<MapPin />}
            title="بيانات التوصيل"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.length > 0 && (
              <label className="text-sm font-medium sm:col-span-2">
                العنوان المحفوظ

                <select
                  value={addressId}
                  onChange={(e) =>
                    setAddressId(
                      e.target.value,
                    )
                  }
                  className="field"
                >
                  <option value="new">
                    عنوان جديد
                  </option>

                  {addresses.map(
                    (a) => (
                      <option
                        key={a.id}
                        value={a.id}
                      >
                        {a.label ||
                          `${a.city} - ${a.district}`}
                      </option>
                    ),
                  )}
                </select>
              </label>
            )}

            <Input
              label="اسم المستلم"
              value={name}
              set={setName}
              required
            />

            <Input
              label="رقم الهاتف"
              value={phone}
              set={setPhone}
              required
            />

            <label className="text-sm font-medium">
              المحافظة

              <select
                value={city}
                onChange={(e) =>
                  setCity(
                    e.target.value,
                  )
                }
                className="field"
                required
              >
                <option value="">
                  اختر المحافظة
                </option>

                {YEMEN_GOVERNORATES.map(
                  (g) => (
                    <option
                      key={g}
                      value={g}
                    >
                      {g}
                    </option>
                  ),
                )}
              </select>
            </label>

            <Input
              label="المديرية / المنطقة"
              value={district}
              set={setDistrict}
              required
            />

            <div className="sm:col-span-2">
              <Input
                label="تفاصيل العنوان"
                value={details}
                set={setDetails}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="معلم قريب"
                value={landmark}
                set={setLandmark}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="ملاحظات الطلب"
                value={notes}
                set={setNotes}
              />
            </div>
          </div>

          <label className="mt-4 flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) =>
                setSaveAddress(
                  e.target.checked,
                )
              }
            />

            حفظ العنوان لاستخدامه لاحقاً
          </label>
        </section>

        <section className="rounded-3xl border bg-card p-5">
          <Title
            icon={<Wallet />}
            title="الدفع"
          />

          {loading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : methods.length ? (
            <div className="space-y-2">
              {methods.map(
                (m) => (
                  <label
                    key={m.code}
                    className={`block rounded-2xl border p-4 ${
                      methodCode ===
                      m.code
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={
                        methodCode ===
                        m.code
                      }
                      onChange={() =>
                        setMethodCode(
                          m.code,
                        )
                      }
                    />

                    <b>
                      {
                        m.display_name
                      }
                    </b>

                    {m.instructions && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {
                          m.instructions
                        }
                      </p>
                    )}
                  </label>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm">
              لا توجد طرق دفع متاحة.
            </p>
          )}

          {wallet && (
            <p className="mt-3 rounded-xl bg-primary/5 p-3 text-sm">
              رصيد المحفظة:{" "}
              <b>
                {formatPrice(
                  balance,
                )}
              </b>
            </p>
          )}

          {receiptNeeded && (
            <div className="mt-3 rounded-2xl border border-dashed p-4">
              <label className="flex cursor-pointer gap-2 font-semibold">
                <Upload className="h-5 w-5" />

                إرفاق الإيصال

                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) =>
                    setReceipt(
                      e.target.files?.[0] ??
                        null,
                    )
                  }
                />
              </label>

              {receipt && (
                <p className="mt-2 text-xs">
                  {receipt.name}
                </p>
              )}

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input
                  label="اسم المحول"
                  value={senderName}
                  set={setSenderName}
                />

                <Input
                  label="رقم المحول"
                  value={senderPhone}
                  set={setSenderPhone}
                />
              </div>

              <Input
                label="رقم المرجع"
                value={reference}
                set={setReference}
              />
            </div>
          )}
        </section>

        <section className="rounded-3xl border bg-card p-5">
          <Title
            icon={<ShieldCheck />}
            title="المراجعة والتأكيد"
          />

          <div className="space-y-2 text-sm">
            <Row
              a="المنتجات"
              b={formatPrice(
                Number(subtotal),
              )}
            />

            <Row
              a="التوصيل"
              b={formatPrice(fee)}
            />

            <Row
              a="طريقة الدفع"
              b={
                method?.display_name ??
                "—"
              }
            />

            <div className="flex justify-between border-t pt-3 font-bold">
              <span>
                الإجمالي
              </span>

              <span className="text-primary">
                {formatPrice(
                  total,
                )}
              </span>
            </div>
          </div>

          {needAgree && (
            <label className="mt-4 flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) =>
                  setAgree(
                    e.target.checked,
                  )
                }
              />

              أوافق على شروط الطلب وسياسات شهارة.
            </label>
          )}

          <button
            disabled={busy}
            className="mt-5 h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : (
              "تأكيد الطلب"
            )}
          </button>
        </section>
      </form>
    </Shell>
  );
}

function Shell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background text-foreground"
    >
      <SiteHeader />

      <main className="px-4 py-5 pb-28">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}

function Title({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>

      <h2 className="font-bold">
        {title}
      </h2>
    </div>
  );
}

function Input({
  label,
  value,
  set,
  required = false,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}

      <input
        value={value}
        onChange={(e) =>
          set(e.target.value)
        }
        required={required}
        className="field"
      />
    </label>
  );
}

function Row({
  a,
  b,
}: {
  a: string;
  b: string;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">
        {a}
      </span>

      <b>{b}</b>
    </div>
  );
}
