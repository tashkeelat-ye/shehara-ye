import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, CreditCard,
  FileImage, FileText, LockKeyhole, MapPin, PackageCheck, ShieldCheck,
  ShoppingBag, Upload, Wallet,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { LocationPicker, type LocationDetails } from "@/components/location-picker";
import { FormField, areaCls, fieldCls } from "@/components/form-ui";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useFormatPrice } from "@/lib/currency-context";
import { fetchPaymentMethods, fetchSettings } from "@/lib/store";
import { YEMEN_GOVERNORATES } from "@/lib/yemen";
import { uploadReceipt } from "@/lib/media";
import { normalizeYemeniPhone, isValidYemeniPhone } from "@/lib/phone";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "إتمام الطلب | شهارة" },
      { name: "description", content: "أكمل بيانات التوصيل والدفع ثم راجع طلبك قبل تأكيد الطلب." },
    ],
  }),
  component: CheckoutPage,
});

type Stage = 1 | 2 | 3;
type AddressRow = {
  id: string; label: string; recipient_name: string; phone: string;
  city: string; district: string; details: string; landmark: string | null;
  latitude: number | null; longitude: number | null; is_default: boolean;
};

const ADDRESS_COLUMNS =
  "id,label,recipient_name,phone,city,district,details,landmark,latitude,longitude,is_default";

function CheckoutPage() {
  const formatPrice = useFormatPrice();
  const { user, profile, refreshProfile } = useAuth();
  const { items, total: subtotal, clearCart } = useCart();

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods", "active"],
    queryFn: () => fetchPaymentMethods(true),
  });

  const { data: addresses = [], refetch: refetchAddresses } = useQuery({
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
    id: string; orderNumber: string; awaitingPayment: boolean;
  } | null>(null);

  const [checkoutToken] = useState(
    () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const deliveryFee = Number(settings?.delivery_fee ?? 0);
  const total = Number(subtotal) + deliveryFee;

  const selected = useMemo(
    () => methods.find((method) => method.code === methodCode) ?? null,
    [methods, methodCode],
  );

  const isWallet = selected?.kind === "wallet_balance" || selected?.code === "wallet_balance";
  const needsReceipt = Boolean(selected?.requires_receipt);
  const mustAgree = !Boolean(profile?.accepted_order_policy);

  const { data: walletBalance = 0, refetch: refetchWalletBalance } = useQuery({
    queryKey: ["wallet-balance", user?.id ?? "", "YER"],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await (supabase as any).rpc("get_wallet", { requested_currency: "YER" });
      if (error) return 0;
      return Array.isArray(data) ? Number(data[0]?.balance ?? 0) : Number(data?.balance ?? 0);
    },
  });

  useEffect(() => {
    if (!methodCode && methods[0]) setMethodCode(methods[0].code);
  }, [methodCode, methods]);

  useEffect(() => {
    if (!addresses.length) return;
    const address = addresses.find((item) => item.is_default) ?? addresses[0];
    if (address) setAddressId(address.id);
  }, [addresses]);

  useEffect(() => {
    if (addressId === "new") {
      setName(profile?.full_name ?? "");
      setPhone(profile?.phone ?? "");
      return;
    }
    const address = addresses.find((item) => item.id === addressId);
    if (!address) return;
    setName(address.recipient_name);
    setPhone(address.phone);
    setCity(address.city);
    setDistrict(address.district);
    setDetails(address.details);
    setLandmark(address.landmark ?? "");
    setCoords(
      address.latitude !== null && address.longitude !== null
        ? { lat: Number(address.latitude), lng: Number(address.longitude) }
        : null,
    );
  }, [addressId, addresses, profile]);

  function validateDelivery() {
    if (!name.trim() || !phone.trim() || !city || !district.trim() || !details.trim()) {
      toast.error("أكمل بيانات التوصيل المطلوبة.");
      return false;
    }
    if (!isValidYemeniPhone(phone)) {
      toast.error("رقم الهاتف غير صحيح، مثال: 771234567");
      return false;
    }
    return true;
  }

  function validatePayment() {
    if (!methodCode) { toast.error("اختر طريقة الدفع."); return false; }
    if (isWallet && walletBalance < total) { toast.error("رصيد محفظتك غير كافٍ."); return false; }
    if (needsReceipt && !receipt) { toast.error("أرفق صورة إيصال التحويل."); return false; }
    return true;
  }

  function goStage(next: Stage) {
    if (next >= 2 && !validateDelivery()) { setStage(1); return; }
    if (next >= 3 && !validatePayment()) { setStage(2); return; }
    setStage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmLocation(location: LocationDetails) {
    setCoords({ lat: location.lat, lng: location.lng });
    setLocationPopup(location);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!user?.id) { toast.error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى."); return; }
    if (!validateDelivery() || !validatePayment()) return;
    if (mustAgree && !agree) { toast.error("يجب الموافقة على الشروط وسياسة الإرجاع."); return; }
    if (!items.length) { toast.error("سلتك فارغة."); return; }

    setBusy(true);
    try {
      const normalizedPhone = normalizeYemeniPhone(phone);
      let receiptPath = "";

      if (needsReceipt && receipt) {
        toast.loading("جارٍ رفع إيصال التحويل...", { id: "checkout-progress" });
        try { receiptPath = await uploadReceipt(user.id, receipt); }
        finally { toast.dismiss("checkout-progress"); }
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

      toast.loading("جارٍ تأكيد الطلب...", { id: "checkout-progress" });

      const { data, error } = await (supabase as any).rpc("create_checkout_order", {
        _checkout_token: checkoutToken,
        _items: orderItems,
        _subtotal: Number(subtotal),
        _delivery_fee: deliveryFee,
        _total: Number(total),
        _payment_method_code: methodCode,
        _payment_status: needsReceipt ? "pending" : "unpaid",
        _status: (isWallet ? "pending" : needsReceipt ? "awaiting_payment" : "pending"),
        _shipping_name: name.trim(),
        _shipping_phone: normalizedPhone,
        _shipping_city: city,
        _shipping_district: district.trim(),
        _shipping_details: details.trim(),
        _shipping_landmark: landmark.trim(),
        _notes: notes.trim(),
        ...(coords ? { _latitude: coords.lat, _longitude: coords.lng } : {}),
        _needs_payment_request: needsReceipt,
        _sender_name: senderName.trim() || name.trim(),
        _sender_phone: senderPhone.trim() || normalizedPhone,
        _reference: reference.trim(),
        _receipt_path: receiptPath,
      });

      toast.dismiss("checkout-progress");
      if (error) throw error;

      const result = data as { id?: string; order_number?: string } | null;
      if (!result?.id || !result.order_number) throw new Error("تم تنفيذ الطلب لكن لم يتم استلام رقم الطلب.");

      if (isWallet) {
        const { error: paymentError } = await (supabase as any).rpc("pay_order_from_wallet", { _order_id: result.id });
        if (paymentError) throw paymentError;
        await refetchWalletBalance();
      }

      if (saveAddress) {
        const payload = {
          user_id: user.id,
          label: `${city} - ${district.trim()}`.slice(0, 60),
          recipient_name: name.trim(), phone: normalizedPhone, city,
          district: district.trim(), details: details.trim(),
          landmark: landmark.trim(), latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null, is_default: addresses.length === 0,
        };
        if (addressId === "new") await supabase.from("addresses").insert(payload);
        else await supabase.from("addresses").update(payload).eq("id", addressId).eq("user_id", user.id);
        await refetchAddresses();
      }

      if (mustAgree && agree) {
        await supabase.from("profiles").update({ accepted_order_policy: true, accepted_terms: true }).eq("id", user.id);
      }

      await clearCart();
      await refreshProfile();
      setSuccess({ id: result.id, orderNumber: result.order_number, awaitingPayment: needsReceipt });
    } catch (error) {
      toast.dismiss("checkout-progress");
      toast.error(error instanceof Error ? error.message : "تعذر تنفيذ الطلب. حاول مرة أخرى.", { duration: 9000 });
    } finally {
      setBusy(false);
    }
  }

  if (!items.length && !success) return (
    <div dir="rtl" className="min-h-screen bg-[#F6F2EE] pb-28">
      <SiteHeader />
      <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
        <section className="w-full rounded-[30px] border border-[#0D3B4D]/10 bg-white p-8 text-center shadow-xl">
          <ShoppingBag className="mx-auto h-12 w-12 text-[#0D3B4D]" />
          <h1 className="mt-5 text-xl font-black text-[#0A2A38]">سلة التسوق فارغة</h1>
          <p className="mt-2 text-xs leading-6 text-slate-500">أضف المنتجات إلى السلة أولًا ثم عد لإتمام الطلب.</p>
          <Link to="/products" className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-[#0D3B4D] px-6 text-sm font-black text-white">تصفح المتجر</Link>
        </section>
      </main>
      <BottomNav />
    </div>
  );

  const steps = [
    { id: 1 as Stage, title: "بيانات التوصيل", icon: MapPin },
    { id: 2 as Stage, title: "إتمام الدفع", icon: CreditCard },
    { id: 3 as Stage, title: "ملخص الطلب", icon: Check },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F2EE] pb-28">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5">
          <Link to="/products" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500"><ArrowRight className="h-4 w-4" /> العودة للتسوق</Link>
          <h1 className="text-2xl font-black text-[#0A2A38] sm:text-3xl">إتمام الطلب</h1>
          <p className="mt-1 text-xs text-slate-500">ثلاث مراحل واضحة: التوصيل، الدفع، ثم مراجعة الطلب.</p>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2">
          {steps.map(({ id, title, icon: Icon }) => {
            const active = stage === id;
            const done = stage > id;
            return <button key={id} type="button" onClick={() => goStage(id)}
              className={`rounded-2xl border p-3 text-start ${active ? "border-[#0D3B4D] bg-[#0D3B4D] text-white" : "border-[#0D3B4D]/10 bg-white text-slate-500"}`}>
              <span className="flex items-center gap-2">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? "bg-white/10 text-[#E2723A]" : "bg-[#0D3B4D]/[0.06] text-[#0D3B4D]"}`}>{done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span>
                <span><span className="block text-[9px] opacity-60">المرحلة {id}</span><span className="block text-[10px] font-black">{title}</span></span>
              </span>
            </button>;
          })}
        </div>

        <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            {stage === 1 ? (
              <section className="overflow-hidden rounded-[28px] border border-[#0D3B4D]/10 bg-white shadow-xl">
                <header className="bg-[#0D3B4D] px-5 py-5 text-white"><div className="flex gap-3"><MapPin className="mt-1 h-5 w-5 text-[#E2723A]" /><div><h2 className="text-base font-black">بيانات التوصيل</h2><p className="mt-1 text-[10px] text-white/55">أدخل عنوان الاستلام وحدد موقعك على الخريطة.</p></div></div></header>
                <div className="space-y-5 p-5">
                  {addresses.length ? <div className="space-y-2">
                    <p className="text-xs font-black">العناوين المحفوظة</p>
                    {addresses.map(a => <label key={a.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-3 ${addressId === a.id ? "border-[#D65A31]/40 bg-[#D65A31]/[0.05]" : "border-[#0D3B4D]/10"}`}>
                      <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-[#D65A31]" />
                      <span><b className="text-xs">{a.label}</b><span className="mt-1 block text-[10px] text-slate-500">{a.recipient_name} — {a.phone}</span><span className="mt-1 block text-[10px] text-slate-400">{a.city} — {a.district} — {a.details}</span></span>
                    </label>)}
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#0D3B4D]/10 p-3"><input type="radio" name="address" checked={addressId === "new"} onChange={() => setAddressId("new")} className="accent-[#D65A31]" /><b className="text-xs">إضافة عنوان جديد</b></label>
                  </div> : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="اسم المستلم" required><input value={name} onChange={e => setName(e.target.value)} className={fieldCls} placeholder="الاسم الثلاثي" /></FormField>
                    <FormField label="رقم الهاتف" required><input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" inputMode="tel" className={fieldCls} placeholder="7XXXXXXXX" /></FormField>
                    <FormField label="المحافظة" required><div className="relative"><select value={city} onChange={e => setCity(e.target.value)} className={`${fieldCls} appearance-none`}><option value="">اختر المحافظة</option>{YEMEN_GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}</select><ChevronDown className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div></FormField>
                    <FormField label="المديرية" required><input value={district} onChange={e => setDistrict(e.target.value)} className={fieldCls} placeholder="اسم المديرية" /></FormField>
                    <div className="sm:col-span-2"><FormField label="تفاصيل العنوان" required><input value={details} onChange={e => setDetails(e.target.value)} className={fieldCls} placeholder="الحي، الشارع، رقم المنزل" /></FormField></div>
                    <FormField label="أقرب معلم"><input value={landmark} onChange={e => setLandmark(e.target.value)} className={fieldCls} placeholder="مثال: أمام صيدلية النور" /></FormField>
                    <FormField label="ملاحظات"><textarea value={notes} onChange={e => setNotes(e.target.value)} className={areaCls} /></FormField>
                  </div>

                  <div className="rounded-2xl border border-[#0D3B4D]/10 bg-[#F6F2EE]/70 p-4">
                    <div className="flex items-center justify-between gap-3"><div><b className="text-xs">موقع التوصيل على الخريطة</b><p className="mt-1 text-[9px] text-slate-400">خريطة مباشرة + إحداثيات + دقة GPS + عنوان تقريبي.</p></div>
                      <button type="button" onClick={() => setShowMap(v => !v)} className="rounded-xl bg-[#0D3B4D] px-3 py-2 text-[10px] font-black text-white">{showMap ? "إخفاء الخريطة" : "تحديد موقعي"}</button></div>
                    {showMap ? <div className="mt-3"><LocationPicker value={coords} onChange={setCoords} onConfirmed={confirmLocation} /></div> : null}
                    {coords ? <p className="mt-3 rounded-xl bg-[#0D3B4D]/[0.05] p-2 text-[9px] font-bold" dir="ltr">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p> : null}
                  </div>

                  <label className="flex items-start gap-2 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} className="mt-0.5 accent-[#D65A31]" /> حفظ العنوان لاستخدامه لاحقًا</label>
                  <button type="button" onClick={() => goStage(2)} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#D65A31] text-sm font-black text-white">المتابعة إلى الدفع <ChevronLeft className="h-4 w-4" /></button>
                </div>
              </section>
            ) : null}

            {stage === 2 ? (
              <section className="overflow-hidden rounded-[28px] border border-[#0D3B4D]/10 bg-white shadow-xl">
                <header className="bg-[#0D3B4D] px-5 py-5 text-white"><div className="flex gap-3"><CreditCard className="mt-1 h-5 w-5 text-[#E2723A]" /><div><h2 className="text-base font-black">إتمام الدفع</h2><p className="mt-1 text-[10px] text-white/55">اختر طريقة الدفع وأكمل بياناتها إن لزم.</p></div></div></header>
                <div className="space-y-3 p-5">
                  {methods.map(method => {
                    const wallet = method.code === "wallet_balance" || method.kind === "wallet_balance";
                    return <label key={method.id} className={`block cursor-pointer rounded-2xl border p-4 ${methodCode === method.code ? "border-[#D65A31]/40 bg-[#D65A31]/[0.05]" : "border-[#0D3B4D]/10"}`}>
                      <div className="flex gap-3"><input type="radio" name="payment" checked={methodCode === method.code} onChange={() => setMethodCode(method.code)} className="mt-1 accent-[#D65A31]" />
                        <span className="flex-1"><span className="flex items-center gap-2 text-xs font-black">{wallet ? <Wallet className="h-4 w-4 text-[#D65A31]" /> : <CreditCard className="h-4 w-4 text-[#0D3B4D]" />}{method.display_name}</span>
                          {wallet ? <span className="mt-2 flex justify-between rounded-xl bg-[#0D3B4D]/[0.05] p-2 text-[10px]"><span>رصيد المحفظة</span><b>{formatPrice(walletBalance)}</b></span> : null}
                          {method.account_number ? <span dir="ltr" className="mt-2 block rounded-xl bg-[#F6F2EE] p-2 text-[10px]">{method.account_number}{method.account_name ? ` — ${method.account_name}` : ""}</span> : null}
                          {method.instructions ? <span className="mt-2 block text-[10px] leading-5 text-slate-400">{method.instructions}</span> : null}
                        </span>
                      </div>
                    </label>;
                  })}
                  {needsReceipt ? <div className="rounded-2xl border border-[#0D3B4D]/10 bg-[#F6F2EE]/70 p-4"><div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="اسم المُحوِّل"><input value={senderName} onChange={e => setSenderName(e.target.value)} className={fieldCls} /></FormField>
                    <FormField label="رقم المُحوِّل"><input value={senderPhone} onChange={e => setSenderPhone(e.target.value)} dir="ltr" className={fieldCls} /></FormField>
                    <FormField label="رقم عملية التحويل"><input value={reference} onChange={e => setReference(e.target.value)} className={fieldCls} /></FormField>
                    <FormField label="صورة الإيصال" required><label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-dashed p-3 text-[10px]"><Upload className="h-4 w-4 text-[#D65A31]" /><span className="truncate flex-1">{receipt?.name || "اختر صورة الإيصال"}</span><input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0] ?? null; if(f && f.size>8*1024*1024){toast.error("حجم الإيصال يجب ألا يتجاوز 8MB."); return;} setReceipt(f); }} /></label></FormField>
                  </div></div> : null}
                  <div className="flex gap-2 pt-2"><button type="button" onClick={() => goStage(1)} className="h-13 flex-1 rounded-2xl border text-xs font-black"><ChevronRight className="me-1 inline h-4 w-4" /> السابق</button><button type="button" onClick={() => goStage(3)} className="h-13 flex-[2] rounded-2xl bg-[#D65A31] text-sm font-black text-white">مراجعة الطلب <ChevronLeft className="ms-1 inline h-4 w-4" /></button></div>
                </div>
              </section>
            ) : null}

            {stage === 3 ? (
              <section className="overflow-hidden rounded-[28px] border border-[#0D3B4D]/10 bg-white shadow-xl">
                <header className="bg-[#0D3B4D] px-5 py-5 text-white"><div className="flex gap-3"><Check className="mt-1 h-5 w-5 text-[#E2723A]" /><div><h2 className="text-base font-black">ملخص الطلب</h2><p className="mt-1 text-[10px] text-white/55">تأكد من كل التفاصيل قبل إرسال الطلب.</p></div></div></header>
                <div className="space-y-5 p-5">
                  <div className="space-y-2">{items.map(item => <div key={item.id} className="flex gap-3 rounded-2xl bg-[#F6F2EE] p-3"><img src={item.product.images?.[0] || "/placeholder.svg"} alt="" className="h-16 w-16 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="text-xs font-black">{item.product.name}</p><p className="mt-1 text-[10px] text-slate-400">الكمية: {item.quantity.toLocaleString("ar-YE")}</p></div><b className="text-xs text-[#D65A31]">{formatPrice(Number(item.product.price)*item.quantity)}</b></div>)}</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoBox title="بيانات التوصيل"><p>{name}</p><p dir="ltr">{phone}</p><p>{city} — {district}</p><p>{details}</p>{landmark ? <p>المعلم: {landmark}</p> : null}{coords ? <p dir="ltr">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p> : null}</InfoBox>
                    <InfoBox title="طريقة الدفع"><p>{selected?.display_name ?? methodCode}</p>{isWallet ? <p>الرصيد: {formatPrice(walletBalance)}</p> : null}{needsReceipt ? <p>تم إرفاق إيصال التحويل</p> : null}</InfoBox>
                  </div>
                  <div className="rounded-2xl bg-[#0D3B4D]/[0.05] p-4"><div className="flex justify-between text-xs"><span>المجموع الفرعي</span><b>{formatPrice(subtotal)}</b></div><div className="mt-2 flex justify-between text-xs"><span>التوصيل</span><b>{formatPrice(deliveryFee)}</b></div><div className="mt-3 flex justify-between border-t pt-3"><b>الإجمالي</b><strong className="text-xl text-[#D65A31]">{formatPrice(total)}</strong></div></div>
                  {mustAgree ? <label className="flex gap-3 rounded-2xl border p-4 text-[10px] leading-6"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-1 accent-[#D65A31]" /> أوافق على شروط الاستخدام وسياسة الاستبدال والإرجاع.</label> : null}
                  <div className="flex gap-2"><button type="button" onClick={() => goStage(2)} className="h-13 flex-1 rounded-2xl border text-xs font-black">السابق</button><button type="submit" disabled={busy} className="h-13 flex-[2] rounded-2xl bg-[#D65A31] text-sm font-black text-white">{busy ? "جارٍ تنفيذ الطلب..." : <><LockKeyhole className="me-1 inline h-4 w-4" /> تأكيد الطلب</>}</button></div>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-[28px] border bg-white shadow-xl">
              <div className="bg-[#0D3B4D] p-5 text-white"><div className="flex items-center gap-3"><ShoppingBag className="text-[#E2723A]" /><div><b>ملخص السعر</b><p className="text-[9px] text-white/50">{items.length} منتجات مختلفة</p></div></div></div>
              <div className="space-y-3 p-4 text-xs"><div className="flex justify-between"><span>المجموع الفرعي</span><b>{formatPrice(subtotal)}</b></div><div className="flex justify-between"><span>التوصيل</span><b>{formatPrice(deliveryFee)}</b></div><div className="flex justify-between rounded-2xl bg-[#D65A31]/10 p-3"><b>الإجمالي</b><strong className="text-lg text-[#D65A31]">{formatPrice(total)}</strong></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#F6F2EE] p-2 text-center"><ShieldCheck className="mx-auto h-4 w-4" /><p className="mt-1 text-[8px]">دفع آمن</p></div><div className="rounded-xl bg-[#F6F2EE] p-2 text-center"><PackageCheck className="mx-auto h-4 w-4 text-[#D65A31]" /><p className="mt-1 text-[8px]">توصيل للباب</p></div></div></div>
            </section>
          </aside>
        </form>
      </main>

      {locationPopup ? <Modal onClose={() => setLocationPopup(null)}>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#0D3B4D] text-[#D65A31]"><Check className="h-8 w-8" /></div>
        <h2 className="mt-4 text-lg font-black">تم تحديد الموقع</h2>
        <p className="mt-2 text-xs leading-6 text-slate-500">تم حفظ موقع التوصيل ويمكنك متابعة إتمام الطلب.</p>
        <div className="mt-4 rounded-2xl bg-[#F6F2EE] p-3 text-[9px] text-slate-500"><p dir="ltr" className="font-bold">{locationPopup.lat.toFixed(6)}, {locationPopup.lng.toFixed(6)}</p>{locationPopup.accuracy ? <p>دقة GPS ±{Math.round(locationPopup.accuracy)} متر</p> : null}<p>{locationPopup.address || "تم تحديد الإحداثيات بنجاح."}</p></div>
        <button type="button" onClick={() => setLocationPopup(null)} className="mt-5 h-11 w-full rounded-2xl bg-[#D65A31] text-xs font-black text-white">متابعة</button>
      </Modal> : null}

      {success ? <Modal onClose={() => setSuccess(null)}>
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#0D3B4D] text-[#D65A31] shadow-lg"><Check className="h-10 w-10" /></div>
        <h2 className="mt-5 text-xl font-black">تم تأكيد طلبك بنجاح</h2>
        <p className="mt-2 text-xs leading-6 text-slate-500">شكرًا لاختيارك متجر شهارة.</p>
        <p dir="ltr" className="mt-3 font-mono text-lg font-black text-[#0D3B4D]">{success.orderNumber}</p>
        <p className="mt-3 rounded-2xl bg-[#F6F2EE] p-3 text-[10px] text-slate-500">{success.awaitingPayment ? "تم إنشاء الطلب، وسيتم التحقق من إيصال الدفع من الإدارة." : "تم تسجيل الطلب وسيظهر في صفحة طلباتي."}</p>
        <Link to="/invoice/$id" params={{ id: success.id }} className="mt-3 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0D3B4D] text-xs font-black text-white"><FileText className="h-4 w-4 text-[#D65A31]" /> عرض الفاتورة</Link>
        <Link to="/orders" className="mt-2 flex h-12 items-center justify-center rounded-2xl border text-xs font-black text-[#0D3B4D]">عرض طلباتي</Link>
      </Modal> : null}

      <BottomNav />
    </div>
  );
}

function InfoBox({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-[#0D3B4D]/10 bg-[#F6F2EE]/60 p-4 text-[10px] leading-5 text-slate-500"><p className="mb-2 text-xs font-black text-[#0A2A38]">{title}</p>{children}</div>;
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[22000] grid place-items-center bg-black/60 p-4 backdrop-blur-md"><div className="relative w-full max-w-md rounded-[32px] bg-white p-6 text-center shadow-2xl"><button type="button" onClick={onClose} className="absolute end-4 top-4 rounded-full p-2 text-slate-400">×</button>{children}</div></div>;
}
