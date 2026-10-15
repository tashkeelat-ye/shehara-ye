import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
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
import { LocationPicker, type LocationDetails } from "@/components/location-picker";
import { FormField, areaCls, fieldCls } from "@/components/form-ui";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";
import { fetchPaymentMethods, fetchSettings, type PaymentMethod } from "@/lib/store";
import { YEMEN_GOVERNORATES } from "@/lib/yemen";
import { uploadReceipt } from "@/lib/media";
import { normalizeYemeniPhone, isValidYemeniPhone } from "@/lib/phone";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "إتمام الطلب | شهارة" },
      {
        name: "description",
        content: "أكمل بيانات التوصيل والدفع ثم راجع طلبك قبل تأكيد الطلب.",
      },
    ],
  }),
  component: CheckoutPage,
});

type Stage = 1 | 2 | 3;

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

type CreatedOrder = {
  id: string;
  order_number: string;
};

const ADDRESS_COLUMNS =
  "id,label,recipient_name,phone,city,district,details,landmark,latitude,longitude,is_default";

function CheckoutPage() {
  const formatPrice = useFormatPrice();
  const { user, profile, refreshProfile } = useAuth();
  const { items, total: subtotal, clearCart } = useCart();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const {
    data: methods = [],
    isLoading: loadingMethods,
    error: methodsError,
  } = useQuery({
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
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("addresses")
        .select(ADDRESS_COLUMNS)
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<AddressRow[]>();

      if (error) throw error;
      return data ?? [];
    },
  });

  const [stage, setStage] = useState<Stage>(1);
  const [addressId, setAddressId] = useState("new");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [details, setDetails] = useState("");
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [locationPopup, setLocationPopup] = useState<LocationDetails | null>(null);
  const [saveAddress, setSaveAddress] = useState(true);

  const [methodCode, setMethodCode] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{
    id: string;
    orderNumber: string;
    awaitingPayment: boolean;
    cartClearFailed: boolean;
  } | null>(null);

  // Keep the same idempotency token for this mounted checkout page.
  // A retry after a network interruption must not create a duplicate order.
  const [checkoutToken] = useState(
    () =>
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
  );

  const deliveryFee = Math.max(0, Number(settings?.delivery_fee ?? 0) || 0);
  const total = Number(subtotal) + deliveryFee;

  const selected = useMemo(
    () => methods.find((method) => method.code === methodCode) ?? null,
    [methods, methodCode],
  );

  const isWallet =
    selected?.kind === "wallet_balance" || selected?.code === "wallet_balance";
  const needsReceipt = Boolean(selected?.requires_receipt);
  const mustAgree = !Boolean(profile?.accepted_order_policy);

  const {
    data: walletBalance = 0,
    refetch: refetchWalletBalance,
  } = useQuery({
    queryKey: ["wallet-balance", user?.id ?? "", "YER"],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await (supabase as any).rpc("get_wallet", {
        requested_currency: "YER",
      });
      if (error) throw error;
      return Array.isArray(data)
        ? Number(data[0]?.balance ?? 0)
        : Number(data?.balance ?? 0);
    },
  });

  useEffect(() => {
    if (!methodCode && methods.length > 0) {
      setMethodCode(methods[0].code);
    }
  }, [methodCode, methods]);

  useEffect(() => {
    if (!addresses.length) return;
    const preferred = addresses.find((address) => address.is_default) ?? addresses[0];
    if (preferred) setAddressId((current) => current === "new" ? preferred.id : current);
  }, [addresses]);

  useEffect(() => {
    if (addressId === "new") {
      setName(profile?.full_name ?? "");
      setPhone(profile?.phone ?? "");
      setCity("");
      setDistrict("");
      setDetails("");
      setLandmark("");
      setCoords(null);
      return;
    }

    const address = addresses.find((item) => item.id === addressId);
    if (!address) return;
    setName(address.recipient_name ?? "");
    setPhone(address.phone ?? "");
    setCity(address.city ?? "");
    setDistrict(address.district ?? "");
    setDetails(address.details ?? "");
    setLandmark(address.landmark ?? "");
    setCoords(
      address.latitude !== null && address.longitude !== null
        ? { lat: Number(address.latitude), lng: Number(address.longitude) }
        : null,
    );
  }, [addressId, addresses, profile?.full_name, profile?.phone]);

  function validateDelivery() {
    if (
      !name.trim() ||
      !phone.trim() ||
      !city.trim() ||
      !district.trim() ||
      !details.trim()
    ) {
      toast.error("أكمل اسم المستلم ورقم الهاتف والمحافظة والمديرية وتفاصيل العنوان.");
      return false;
    }
    if (!isValidYemeniPhone(phone)) {
      toast.error("رقم الهاتف غير صحيح، مثال: 771234567");
      return false;
    }
    return true;
  }

  function validatePayment() {
    if (loadingMethods) {
      toast.error("انتظر حتى يتم تحميل طرق الدفع.");
      return false;
    }
    if (methodsError || methods.length === 0) {
      toast.error("لا توجد طريقة دفع متاحة حالياً. يرجى المحاولة لاحقاً.");
      return false;
    }
    if (!selected) {
      toast.error("اختر طريقة الدفع.");
      return false;
    }
    if (isWallet && Number(walletBalance) < total) {
      toast.error("رصيد محفظتك غير كافٍ لإتمام هذا الطلب.");
      return false;
    }
    if (needsReceipt && !receipt) {
      toast.error("أرفق صورة إيصال التحويل قبل المتابعة.");
      return false;
    }
    return true;
  }

  function goStage(next: Stage) {
    if (busy) return;
    if (next >= 2 && !validateDelivery()) {
      setStage(1);
      return;
    }
    if (next >= 3 && !validatePayment()) {
      setStage(2);
      return;
    }
    setStage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmLocation(location: LocationDetails) {
    setCoords({ lat: location.lat, lng: location.lng });
    setLocationPopup(location);
  }

  async function saveDeliveryAddress(normalizedPhone: string) {
    if (!saveAddress || !user?.id) return;

    const payload = {
      user_id: user.id,
      label: `${city} - ${district.trim()}`.slice(0, 60),
      recipient_name: name.trim(),
      phone: normalizedPhone,
      city: city.trim(),
      district: district.trim(),
      details: details.trim(),
      landmark: landmark.trim(),
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      is_default: addresses.length === 0,
    };

    const result =
      addressId === "new"
        ? await supabase.from("addresses").insert(payload)
        : await supabase
            .from("addresses")
            .update(payload)
            .eq("id", addressId)
            .eq("user_id", user.id);

    if (result.error) {
      console.error("[Checkout] Order created but address save failed:", result.error);
      toast.warning("تم إنشاء الطلب، لكن تعذر حفظ تحديث العنوان.");
      return;
    }

    await refetchAddresses();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (!user?.id) {
      toast.error("يجب تسجيل الدخول قبل إتمام الطلب.");
      return;
    }
    if (!items.length) {
      toast.error("سلة التسوق فارغة. أضف المنتجات أولاً.");
      return;
    }
    if (!validateDelivery() || !validatePayment()) return;
    if (mustAgree && !agree) {
      toast.error("يجب الموافقة على شروط الاستخدام وسياسة الاستبدال والإرجاع.");
      return;
    }

    setBusy(true);
    let orderCreated = false;

    try {
      const normalizedPhone = normalizeYemeniPhone(phone);
      let receiptPath = "";

      if (needsReceipt && receipt) {
        toast.loading("جارٍ رفع إيصال التحويل...", { id: "checkout-progress" });
        receiptPath = await uploadReceipt(user.id, receipt);
        toast.dismiss("checkout-progress");
      }

      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product.name,
        product_image: item.product.images?.[0] ?? "",
        unit_price: Number(item.product.price),
        quantity: Number(item.quantity),
        size: item.size ?? null,
        color: item.color ?? null,
      }));

      toast.loading("جارٍ التحقق من المخزون وإنشاء الطلب...", {
        id: "checkout-progress",
      });

      // The database RPC is the source of truth for prices, stock, totals,
      // and payment request creation. Do not insert orders from the browser.
      const { data, error } = await (supabase as any).rpc("create_checkout_order", {
        _checkout_token: checkoutToken,
        _items: orderItems,
        _subtotal: Number(subtotal),
        _delivery_fee: deliveryFee,
        _total: Number(total),
        _payment_method_code: methodCode,
        _payment_status: needsReceipt ? "pending" : "unpaid",
        _status: isWallet ? "pending" : needsReceipt ? "awaiting_payment" : "pending",
        _shipping_name: name.trim(),
        _shipping_phone: normalizedPhone,
        _shipping_city: city.trim(),
        _shipping_district: district.trim(),
        _shipping_details: details.trim(),
        _shipping_landmark: landmark.trim(),
        _notes: notes.trim(),
        ...(coords
          ? { _latitude: coords.lat, _longitude: coords.lng }
          : {}),
        _needs_payment_request: needsReceipt,
        _sender_name: senderName.trim() || name.trim(),
        _sender_phone: senderPhone.trim() || normalizedPhone,
        _reference: reference.trim(),
        _receipt_path: receiptPath,
      });

      if (error) throw error;

      const result = (Array.isArray(data) ? data[0] : data) as CreatedOrder | null;
      if (!result?.id || !result?.order_number) {
        throw new Error("لم يتم استلام رقم الطلب من الخادم. لا تعاود الإرسال قبل تحديث الصفحة أو مراجعة طلباتك.");
      }
      orderCreated = true;

      if (isWallet) {
        const { error: paymentError } = await (supabase as any).rpc(
          "pay_order_from_wallet",
          { _order_id: result.id },
        );
        if (paymentError) {
          throw new Error(
            `تم إنشاء الطلب رقم ${result.order_number} لكن تعذر خصم المبلغ من المحفظة: ${paymentError.message ?? "خطأ غير معروف"}. أعد المحاولة من صفحة الطلبات أو تواصل مع الدعم.`,
          );
        }
        await refetchWalletBalance();
      }

      // The order has already been created securely. Failures in optional
      // address/profile housekeeping must not report the purchase as failed.
      await saveDeliveryAddress(normalizedPhone);

      if (mustAgree && agree) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ accepted_order_policy: true, accepted_terms: true })
          .eq("id", user.id);
        if (profileError) {
          console.warn("[Checkout] Could not save policy acceptance:", profileError);
        }
      }

      let cartClearFailed = false;
      try {
        await clearCart();
      } catch (clearError) {
        cartClearFailed = true;
        console.error("[Checkout] Order created but cart clear failed:", clearError);
      }

      try {
        await refreshProfile();
      } catch (profileRefreshError) {
        console.warn("[Checkout] Profile refresh failed after order:", profileRefreshError);
      }

      toast.dismiss("checkout-progress");
      setSuccess({
        id: result.id,
        orderNumber: result.order_number,
        awaitingPayment: needsReceipt,
        cartClearFailed,
      });

      if (cartClearFailed) {
        toast.warning("تم إنشاء الطلب بنجاح، لكن تعذر تحديث السلة. راجع طلباتي قبل إعادة الشراء.");
      } else {
        toast.success("تم إنشاء طلبك بنجاح.");
      }
    } catch (error) {
      toast.dismiss("checkout-progress");
      console.error("[Checkout] Order submission failed:", error);

      if (orderCreated) {
        toast.error(
          error instanceof Error
            ? error.message
            : "تم إنشاء الطلب، لكن تعذر إكمال خطوة الدفع. راجع طلباتك قبل إعادة المحاولة.",
          { duration: 10000 },
        );
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تنفيذ الطلب. تحقق من الاتصال وحاول مرة أخرى.",
          { duration: 10000 },
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (!items.length && !success) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#FAF9F6] pb-28">
        <SiteHeader />
        <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
          <section className="w-full rounded-3xl border border-[#0E4D64]/10 bg-white p-8 text-center shadow-lg">
            <ShoppingBag className="mx-auto h-12 w-12 text-[#0E4D64]" />
            <h1 className="mt-5 text-xl font-black text-slate-900">سلة التسوق فارغة</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              أضف المنتجات إلى السلة أولاً، ثم عد لإتمام الطلب.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#0E4D64] px-6 py-3 text-sm font-black text-white"
            >
              تصفح المنتجات
            </Link>
          </section>
        </main>
        <BottomNav />
      </div>
    );
  }

  const steps = [
    { id: 1 as Stage, title: "بيانات التوصيل", icon: MapPin },
    { id: 2 as Stage, title: "طريقة الدفع", icon: CreditCard },
    { id: 3 as Stage, title: "مراجعة الطلب", icon: Check },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF9F6] pb-28 text-slate-900">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="mb-6">
          <Link
            to="/products"
            className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#0E4D64]"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للتسوق
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-[#0E4D64] sm:text-3xl">
            إتمام الطلب
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            أدخل بيانات التوصيل، اختر طريقة الدفع، ثم راجع تفاصيل الطلب قبل التأكيد.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
          {steps.map(({ id, title, icon: Icon }) => {
            const active = stage === id;
            const done = stage > id;
            return (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => goStage(id)}
                className={`min-w-0 rounded-2xl border p-3 text-start transition disabled:opacity-60 sm:p-4 ${
                  active
                    ? "border-[#0E4D64] bg-[#0E4D64] text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                      active ? "bg-white/10 text-[#F3A184]" : "bg-[#0E4D64]/[0.06] text-[#0E4D64]"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] opacity-70">المرحلة {id}</span>
                    <span className="block truncate text-xs font-black sm:text-sm">{title}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <form onSubmit={submit} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            {stage === 1 ? (
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <header className="bg-[#0E4D64] px-5 py-5 text-white sm:px-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-[#F3A184]" />
                    <div>
                      <h2 className="text-base font-black">بيانات التوصيل</h2>
                      <p className="mt-1 text-xs leading-5 text-white/70">
                        تأكد من صحة رقم الهاتف والعنوان لتسهيل تسليم الطلب.
                      </p>
                    </div>
                  </div>
                </header>

                <div className="space-y-5 p-4 sm:p-6">
                  {addresses.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-black">العناوين المحفوظة</p>
                      {addresses.map((address) => (
                        <label
                          key={address.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                            addressId === address.id
                              ? "border-[#D65A31]/50 bg-[#D65A31]/[0.05]"
                              : "border-slate-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="delivery-address"
                            checked={addressId === address.id}
                            onChange={() => setAddressId(address.id)}
                            className="mt-1 accent-[#D65A31]"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-bold">{address.label || "عنوان محفوظ"}</span>
                            <span className="mt-1 block break-words text-xs text-slate-500">
                              {address.recipient_name} — {address.phone}
                            </span>
                            <span className="mt-1 block break-words text-xs leading-5 text-slate-500">
                              {[address.city, address.district, address.details].filter(Boolean).join("، ")}
                            </span>
                          </span>
                        </label>
                      ))}
                      <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 ${addressId === "new" ? "border-[#D65A31]/50 bg-[#D65A31]/[0.05]" : "border-slate-200"}`}>
                        <input
                          type="radio"
                          name="delivery-address"
                          checked={addressId === "new"}
                          onChange={() => setAddressId("new")}
                          className="accent-[#D65A31]"
                        />
                        <span className="text-sm font-bold">إضافة عنوان جديد</span>
                      </label>
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="اسم المستلم" required>
                      <input value={name} onChange={(event) => setName(event.target.value)} className={fieldCls} autoComplete="name" required maxLength={120} placeholder="الاسم الكامل" />
                    </FormField>
                    <FormField label="رقم الهاتف" required>
                      <input value={phone} onChange={(event) => setPhone(event.target.value)} dir="ltr" inputMode="tel" autoComplete="tel" className={fieldCls} required maxLength={30} placeholder="7XXXXXXXX" />
                    </FormField>
                    <FormField label="المحافظة" required>
                      <div className="relative">
                        <select value={city} onChange={(event) => setCity(event.target.value)} className={`${fieldCls} appearance-none`} required>
                          <option value="">اختر المحافظة</option>
                          {YEMEN_GOVERNORATES.map((governorate) => (
                            <option key={governorate} value={governorate}>{governorate}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </FormField>
                    <FormField label="المديرية" required>
                      <input value={district} onChange={(event) => setDistrict(event.target.value)} className={fieldCls} required maxLength={120} placeholder="اسم المديرية" />
                    </FormField>
                    <div className="sm:col-span-2">
                      <FormField label="تفاصيل العنوان" required>
                        <input value={details} onChange={(event) => setDetails(event.target.value)} className={fieldCls} required maxLength={500} autoComplete="street-address" placeholder="الحي، الشارع، رقم المنزل أو أقرب وصف" />
                      </FormField>
                    </div>
                    <FormField label="أقرب معلم">
                      <input value={landmark} onChange={(event) => setLandmark(event.target.value)} className={fieldCls} maxLength={200} placeholder="معلم قريب من العنوان" />
                    </FormField>
                    <FormField label="ملاحظات للطلب">
                      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={areaCls} maxLength={1000} placeholder="ملاحظات اختيارية للمندوب" />
                    </FormField>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">موقع التوصيل على الخريطة</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">يساعد تحديد الموقع المندوب على الوصول إليك.</p>
                      </div>
                      <button type="button" disabled={busy} onClick={() => setShowMap((value) => !value)} className="min-h-10 rounded-xl bg-[#0E4D64] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                        {showMap ? "إخفاء الخريطة" : "تحديد الموقع"}
                      </button>
                    </div>
                    {showMap ? (
                      <div className="mt-4">
                        <LocationPicker value={coords} onChange={setCoords} onConfirmed={confirmLocation} />
                      </div>
                    ) : null}
                    {coords ? (
                      <p dir="ltr" className="mt-3 rounded-xl bg-white p-2 text-start text-xs font-bold text-[#0E4D64]">
                        {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                      </p>
                    ) : null}
                  </div>

                  <label className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                    <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} className="mt-1 accent-[#D65A31]" />
                    حفظ العنوان أو تحديثه لاستخدامه في المرات القادمة
                  </label>

                  <button type="button" onClick={() => goStage(2)} disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D65A31] px-4 py-3 text-sm font-black text-white transition hover:brightness-105 disabled:opacity-60">
                    المتابعة إلى الدفع <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              </section>
            ) : null}

            {stage === 2 ? (
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <header className="bg-[#0E4D64] px-5 py-5 text-white sm:px-6">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-[#F3A184]" />
                    <div>
                      <h2 className="text-base font-black">طريقة الدفع</h2>
                      <p className="mt-1 text-xs leading-5 text-white/70">اختر إحدى طرق الدفع المتاحة في المتجر.</p>
                    </div>
                  </div>
                </header>

                <div className="space-y-4 p-4 sm:p-6">
                  {loadingMethods ? (
                    <div role="status" className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">جارٍ تحميل طرق الدفع...</div>
                  ) : methodsError ? (
                    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">تعذر تحميل طرق الدفع. تحقق من اتصالك ثم أعد المحاولة.</div>
                  ) : methods.length === 0 ? (
                    <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">لا توجد طرق دفع مفعّلة حالياً. يرجى التواصل مع الدعم أو المحاولة لاحقاً.</div>
                  ) : (
                    <div className="space-y-3">
                      {methods.map((method: PaymentMethod) => {
                        const wallet = method.code === "wallet_balance" || method.kind === "wallet_balance";
                        return (
                          <label key={method.id} className={`block cursor-pointer rounded-2xl border p-4 transition ${methodCode === method.code ? "border-[#D65A31]/50 bg-[#D65A31]/[0.05] ring-1 ring-[#D65A31]/20" : "border-slate-200 hover:border-slate-300"}`}>
                            <span className="flex items-start gap-3">
                              <input type="radio" name="payment-method" checked={methodCode === method.code} onChange={() => setMethodCode(method.code)} className="mt-1 accent-[#D65A31]" />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2 text-sm font-black text-slate-900">
                                  {wallet ? <Wallet className="h-4 w-4 text-[#D65A31]" /> : <CreditCard className="h-4 w-4 text-[#0E4D64]" />}
                                  {method.display_name}
                                </span>
                                {wallet ? (
                                  <span className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#0E4D64]/[0.05] p-3 text-xs">
                                    <span className="text-slate-600">رصيد المحفظة المتاح</span>
                                    <b className="text-[#0E4D64]">{formatPrice(walletBalance)}</b>
                                  </span>
                                ) : null}
                                {method.account_number ? (
                                  <span dir="ltr" className="mt-3 block break-words rounded-xl bg-slate-50 p-3 text-start text-xs text-slate-700">
                                    {method.account_number}{method.account_name ? ` — ${method.account_name}` : ""}
                                  </span>
                                ) : null}
                                {method.instructions ? <span className="mt-2 block whitespace-pre-wrap text-xs leading-6 text-slate-500">{method.instructions}</span> : null}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {needsReceipt ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="mb-3 text-sm font-black">بيانات التحويل والإيصال</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="اسم المحوّل">
                          <input value={senderName} onChange={(event) => setSenderName(event.target.value)} className={fieldCls} maxLength={120} />
                        </FormField>
                        <FormField label="رقم هاتف المحوّل">
                          <input value={senderPhone} onChange={(event) => setSenderPhone(event.target.value)} dir="ltr" className={fieldCls} maxLength={30} inputMode="tel" />
                        </FormField>
                        <FormField label="رقم عملية التحويل">
                          <input value={reference} onChange={(event) => setReference(event.target.value)} className={fieldCls} maxLength={120} />
                        </FormField>
                        <FormField label="صورة إيصال التحويل" required>
                          <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-3 text-xs">
                            <Upload className="h-4 w-4 shrink-0 text-[#D65A31]" />
                            <span className="min-w-0 flex-1 truncate">{receipt?.name || "اختر صورة الإيصال"}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                if (file && file.size > 8 * 1024 * 1024) {
                                  toast.error("حجم الإيصال يجب ألا يتجاوز 8 ميجابايت.");
                                  event.target.value = "";
                                  return;
                                }
                                setReceipt(file);
                              }}
                            />
                          </label>
                        </FormField>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setStage(1)} disabled={busy} className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-60">
                      <ChevronRight className="h-4 w-4" /> السابق
                    </button>
                    <button type="button" onClick={() => goStage(3)} disabled={busy} className="flex min-h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-[#D65A31] px-4 py-2 text-sm font-black text-white disabled:opacity-60">
                      مراجعة الطلب <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {stage === 3 ? (
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <header className="bg-[#0E4D64] px-5 py-5 text-white sm:px-6">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-[#F3A184]" />
                    <div>
                      <h2 className="text-base font-black">مراجعة الطلب</h2>
                      <p className="mt-1 text-xs leading-5 text-white/70">راجع البيانات قبل تأكيد الطلب نهائياً.</p>
                    </div>
                  </div>
                </header>
                <div className="space-y-5 p-4 sm:p-6">
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 p-3">
                        <img src={item.product.images?.[0] || "/placeholder.svg"} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-white object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-black">{item.product.name}</p>
                          <p className="mt-1 text-xs text-slate-500">الكمية: {item.quantity}</p>
                          {item.size || item.color ? <p className="mt-1 text-xs text-slate-500">{[item.size, item.color].filter(Boolean).join(" • ")}</p> : null}
                        </div>
                        <b className="shrink-0 text-sm text-[#D65A31]">{formatPrice(Number(item.product.price) * Number(item.quantity))}</b>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoBox title="بيانات التوصيل">
                      <p>{name}</p>
                      <p dir="ltr" className="text-start">{phone}</p>
                      <p>{city}، {district}</p>
                      <p>{details}</p>
                      {landmark ? <p>أقرب معلم: {landmark}</p> : null}
                      {coords ? <p dir="ltr" className="text-start">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p> : null}
                    </InfoBox>
                    <InfoBox title="طريقة الدفع">
                      <p>{selected?.display_name ?? methodCode}</p>
                      {isWallet ? <p>رصيد المحفظة: {formatPrice(walletBalance)}</p> : null}
                      {needsReceipt ? <p>الإيصال: {receipt?.name || "لم يتم إرفاق إيصال"}</p> : null}
                    </InfoBox>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <PriceLine label="المجموع الفرعي" value={formatPrice(subtotal)} />
                    <PriceLine label="رسوم التوصيل" value={formatPrice(deliveryFee)} />
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                      <b className="text-sm">الإجمالي النهائي</b>
                      <strong className="text-xl font-black text-[#D65A31]">{formatPrice(total)}</strong>
                    </div>
                  </div>

                  {mustAgree ? (
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-600">
                      <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} className="mt-1 accent-[#D65A31]" />
                      <span>أوافق على شروط الاستخدام وسياسة الاستبدال والإرجاع الخاصة بمتجر شهارة.</span>
                    </label>
                  ) : null}

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStage(2)} disabled={busy} className="min-h-12 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-60">السابق</button>
                    <button type="submit" disabled={busy || !selected || loadingMethods || methods.length === 0} className="flex min-h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-[#D65A31] px-4 py-3 text-sm font-black text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">
                      <LockKeyhole className="h-4 w-4" />
                      {busy ? "جارٍ تأكيد الطلب..." : "تأكيد الطلب بأمان"}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-[#0E4D64] p-5 text-white">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-5 w-5 text-[#F3A184]" />
                  <div>
                    <b className="text-sm">ملخص السلة</b>
                    <p className="mt-1 text-xs text-white/70">{items.length} منتجات في السلة</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <PriceLine label="المجموع الفرعي" value={formatPrice(subtotal)} />
                <PriceLine label="رسوم التوصيل" value={formatPrice(deliveryFee)} />
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#D65A31]/10 p-3">
                  <b className="text-sm">الإجمالي</b>
                  <strong className="text-lg font-black text-[#D65A31]">{formatPrice(total)}</strong>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <ShieldCheck className="mx-auto h-5 w-5 text-[#0E4D64]" />
                    <p className="mt-1 text-xs font-bold">دفع آمن</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <PackageCheck className="mx-auto h-5 w-5 text-[#D65A31]" />
                    <p className="mt-1 text-xs font-bold">توصيل للباب</p>
                  </div>
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  يتم التحقق من الأسعار والمخزون والإجمالي داخل النظام قبل اعتماد الطلب.
                </p>
              </div>
            </section>
          </aside>
        </form>
      </main>

      {locationPopup ? (
        <Modal onClose={() => setLocationPopup(null)}>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#0E4D64] text-[#F3A184]">
            <Check className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-black">تم تحديد الموقع</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">تم حفظ إحداثيات موقع التوصيل في نموذج الطلب.</p>
          <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">
            <p dir="ltr" className="text-start font-bold">{locationPopup.lat.toFixed(6)}, {locationPopup.lng.toFixed(6)}</p>
            {locationPopup.accuracy ? <p>دقة GPS ±{Math.round(locationPopup.accuracy)} متر</p> : null}
            <p>{locationPopup.address || "تم تحديد الإحداثيات بنجاح."}</p>
          </div>
          <button type="button" onClick={() => setLocationPopup(null)} className="mt-5 min-h-11 w-full rounded-xl bg-[#D65A31] px-4 py-3 text-sm font-black text-white">متابعة</button>
        </Modal>
      ) : null}

      {success ? (
        <Modal onClose={() => setSuccess(null)}>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#0E4D64] text-[#F3A184]">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-black">تم إنشاء طلبك بنجاح</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">شكراً لاختيارك متجر شهارة.</p>
          <p dir="ltr" className="mt-3 break-all font-mono text-lg font-black text-[#0E4D64]">{success.orderNumber}</p>
          <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-6 text-slate-600">
            {success.awaitingPayment
              ? "تم تسجيل الطلب وإرسال بيانات التحويل للإدارة لمراجعة إيصال الدفع."
              : isWallet
                ? "تم تسجيل الطلب ومعالجة الدفع من المحفظة."
                : "تم تسجيل الطلب وسيظهر في صفحة طلباتي."}
          </p>
          {success.cartClearFailed ? (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              لم يتم تحديث محتويات السلة. لا تعاود إرسال الطلب؛ افتح طلباتي أولاً للتأكد من حالة الطلب.
            </p>
          ) : null}
          <Link to="/invoice/$id" params={{ id: success.id }} className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0E4D64] px-4 py-3 text-sm font-black text-white">
            <FileText className="h-4 w-4 text-[#F3A184]" /> عرض الفاتورة
          </Link>
          <Link to="/orders" className="mt-2 flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-[#0E4D64]">عرض طلباتي</Link>
        </Modal>
      ) : null}

      <BottomNav />
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <b className="text-slate-800">{value}</b>
    </div>
  );
}

function InfoBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
      <p className="mb-2 text-sm font-black text-[#0E4D64]">{title}</p>
      {children}
    </div>
  );
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[22000] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" role="presentation">
      <section role="dialog" aria-modal="true" className="relative my-auto w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
        <button type="button" aria-label="إغلاق" onClick={onClose} className="absolute end-3 top-3 grid h-10 w-10 place-items-center rounded-xl text-xl text-slate-500 hover:bg-slate-100">×</button>
        {children}
      </section>
    </div>
  );
}
