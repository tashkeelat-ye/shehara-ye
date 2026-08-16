import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Upload, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import { LocationPicker } from "@/components/location-picker";
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
      { title: "إتمام الطلب | تشكيلات" },
      {
        name: "description",
        content: "أكمل بيانات التوصيل، حدّد موقعك على الخريطة، واختر طريقة الدفع المناسبة.",
      },
      { property: "og:title", content: "إتمام الطلب | تشكيلات" },
      { property: "og:description", content: "إتمام الطلب في متجر تشكيلات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

function CheckoutPage() {
  const formatPrice = useFormatPrice();
  const { user, profile, refreshProfile } = useAuth();
  const { items, total: subtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: methods = [] } = useQuery({
    queryKey: ["payment-methods", "active"],
    queryFn: () => fetchPaymentMethods(true),
  });
  const { data: addresses = [], refetch: refetchAddresses } = useQuery({
    queryKey: ["addresses", user?.id ?? ""],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("addresses")
        .select(ADDRESS_COLUMNS)
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<AddressRow[]>();
      return data ?? [];
    },
  });

  const [addressId, setAddressId] = useState<string>("new");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [details, setDetails] = useState("");
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [methodCode, setMethodCode] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  const deliveryFee = settings?.delivery_fee ?? 0;
  const total = subtotal + deliveryFee;
  const walletBalance = profile?.wallet_balance ?? 0;
  const mustAgree = !(profile?.accepted_order_policy ?? false);

  const selected = useMemo(
    () => methods.find((m) => m.code === methodCode) ?? null,
    [methods, methodCode],
  );
  const isWallet = selected?.kind === "wallet_balance" || selected?.code === "wallet_balance";
  const needsReceipt = Boolean(selected?.requires_receipt);

  useEffect(() => {
    if (methodCode || methods.length === 0) return;
    setMethodCode(methods[0]!.code);
  }, [methods, methodCode]);

  useEffect(() => {
    if (addresses.length === 0) return;
    const def = addresses[0]!;
    setAddressId(def.id);
  }, [addresses]);

  useEffect(() => {
    if (addressId === "new") {
      setName(profile?.full_name ?? "");
      setPhone(profile?.phone ?? "");
      return;
    }
    const a = addresses.find((x) => x.id === addressId);
    if (!a) return;
    setName(a.recipient_name);
    setPhone(a.phone);
    setCity(a.city);
    setDistrict(a.district);
    setDetails(a.details);
    setLandmark(a.landmark ?? "");
    setCoords(a.latitude && a.longitude ? { lat: a.latitude, lng: a.longitude } : null);
  }, [addressId, addresses, profile]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("سلتك فارغة");
      return;
    }
    if (!name.trim() || !phone.trim() || !city || !district.trim() || !details.trim()) {
      toast.error("أكمل بيانات التوصيل المطلوبة");
      return;
    }
    if (!isValidYemeniPhone(phone)) {
      toast.error("رقم الهاتف غير صحيح، مثال: 7XXXXXXXX");
      return;
    }
    if (!methodCode) {
      toast.error("اختر طريقة الدفع");
      return;
    }
    if (isWallet && walletBalance < total) {
      toast.error("رصيد محفظتك غير كافٍ، يمكنك شحن الرصيد أولًا");
      return;
    }
    if (needsReceipt && !receipt) {
      toast.error("أرفق صورة إيصال التحويل");
      return;
    }
    if (mustAgree && !agree) {
      toast.error("يجب الموافقة على الشروط وسياسة الإرجاع لإتمام الطلب");
      return;
    }

    setBusy(true);
    try {
      const normalizedPhone = normalizeYemeniPhone(phone);
      let receiptPath = "";
      if (needsReceipt && receipt) receiptPath = await uploadReceipt(user!.id, receipt);

      const status = isWallet ? "pending" : needsReceipt ? "awaiting_payment" : "pending";
      const paymentStatus = needsReceipt ? "pending" : "unpaid";

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user!.id,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          payment_method_code: methodCode,
          payment_status: paymentStatus,
          status,
          shipping_name: name.trim(),
          shipping_phone: normalizedPhone,
          shipping_city: city,
          shipping_district: district.trim(),
          shipping_details: details.trim(),
          shipping_landmark: landmark.trim(),
          notes: notes.trim(),
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        })
        .select("id,order_number")
        .maybeSingle<{ id: string; order_number: string }>();

      if (error || !order) throw new Error(error?.message ?? "تعذّر إنشاء الطلب");

      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((i) => ({
          order_id: order.id,
          product_id: i.product_id,
          product_name: i.product.name,
          product_image: i.product.images[0] ?? "",
          unit_price: i.product.price,
          quantity: i.quantity,
          size: i.size,
          color: i.color,
        })),
      );
      if (itemsError) throw new Error("تعذّر حفظ منتجات الطلب");

      if (isWallet) {
        const { error: payError } = await supabase.rpc("pay_order_from_wallet", {
          _order_id: order.id,
        });
        if (payError) throw new Error(payError.message);
      } else if (needsReceipt) {
        const { error: prError } = await supabase.from("payment_requests").insert({
          user_id: user!.id,
          purpose: "order",
          order_id: order.id,
          method_code: methodCode,
          amount: total,
          sender_name: senderName.trim() || name.trim(),
          sender_phone: senderPhone.trim() || normalizedPhone,
          reference: reference.trim(),
          receipt_path: receiptPath,
        });
        if (prError) throw new Error(prError.message);
      }

      if (saveAddress) {
        const payload = {
          user_id: user!.id,
          label: `${city} - ${district.trim()}`.slice(0, 60),
          recipient_name: name.trim(),
          phone: normalizedPhone,
          city,
          district: district.trim(),
          details: details.trim(),
          landmark: landmark.trim(),
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          is_default: addresses.length === 0,
        };
        if (addressId === "new") await supabase.from("addresses").insert(payload);
        else await supabase.from("addresses").update(payload).eq("id", addressId);
        await refetchAddresses();
      }

      if (mustAgree && agree) {
        await supabase
          .from("profiles")
          .update({ accepted_order_policy: true, accepted_terms: true })
          .eq("id", user!.id);
      }

      await clearCart();
      await refreshProfile();
      toast.success(
        needsReceipt
          ? "تم إنشاء طلبك وهو بانتظار تأكيد الدفع من الإدارة"
          : "تم إنشاء طلبك بنجاح",
      );
      void navigate({ to: "/orders" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إتمام الطلب");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-8">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-lg text-foreground">إتمام الطلب</h1>

        <ul className="mt-4 space-y-2 rounded-2xl border border-border/70 bg-card p-4 text-xs">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span className="line-clamp-1 text-foreground">
                {i.product.name} × {i.quantity.toLocaleString("ar-EG")}
              </span>
              <span className="shrink-0 text-primary">
                {formatPrice(i.product.price * i.quantity)}
              </span>
            </li>
          ))}
          <li className="flex justify-between border-t border-border pt-2">
            <span className="text-muted-foreground">المجموع الفرعي</span>
            <span className="text-foreground">{formatPrice(subtotal)}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted-foreground">رسوم التوصيل</span>
            <span className="text-foreground">{formatPrice(deliveryFee)}</span>
          </li>
          <li className="flex justify-between border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">الإجمالي</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </li>
        </ul>

        <form onSubmit={submit} className="mt-4 space-y-4">
          {addresses.length > 0 ? (
            <section className="rounded-2xl border border-border/70 bg-card p-4">
              <h2 className="mb-2 text-sm text-foreground">عناوين محفوظة</h2>
              <div className="grid gap-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-xs ${
                      addressId === a.id ? "border-primary bg-brand-soft/60" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      className="mt-1 accent-[var(--color-primary)]"
                      checked={addressId === a.id}
                      onChange={() => setAddressId(a.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-foreground">{a.label}</span>
                      <span className="block text-muted-foreground">
                        {a.recipient_name} — {a.phone}
                      </span>
                      <span className="block text-muted-foreground">{a.details}</span>
                    </span>
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs ${
                    addressId === "new" ? "border-primary bg-brand-soft/60" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    className="accent-[var(--color-primary)]"
                    checked={addressId === "new"}
                    onChange={() => setAddressId("new")}
                  />
                  <span className="text-foreground">إضافة عنوان جديد</span>
                </label>
              </div>
            </section>
          ) : null}

          <section className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-2">
            <h2 className="text-sm text-foreground sm:col-span-2">بيانات التوصيل</h2>
            <FormField label="اسم المستلم" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="الاسم الثلاثي"
                className={fieldCls}
              />
            </FormField>
            <FormField label="رقم الهاتف" required hint="مثال: 771234567">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                inputMode="tel"
                maxLength={20}
                placeholder="7XXXXXXXX"
                className={fieldCls}
              />
            </FormField>
            <FormField label="المحافظة" required>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={fieldCls}
                aria-label="المحافظة"
              >
                <option value="">اختر المحافظة</option>
                {YEMEN_GOVERNORATES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="المديرية" required>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                maxLength={80}
                placeholder="اسم المديرية"
                className={fieldCls}
              />
            </FormField>
            <FormField label="تفاصيل العنوان" required>
              <input
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={300}
                placeholder="الحي، الشارع، رقم المنزل"
                className={fieldCls}
              />
            </FormField>
            <FormField label="أقرب معلم" hint="يساعد المندوب في الوصول بسرعة">
              <input
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                maxLength={120}
                placeholder="مثال: أمام صيدلية النور"
                className={fieldCls}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="ملاحظات للطلب">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={400}
                  placeholder="أي تفاصيل تود إخبارنا بها"
                  className={areaCls}
                />
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setShowMap((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-foreground"
              >
                <MapPin className="h-4 w-4 text-primary" />
                {showMap ? "إخفاء الخريطة" : "تحديد موقعي على الخريطة"}
              </button>
              {coords ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  تم تحديد الموقع: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              ) : null}
              {showMap ? (
                <div className="mt-2">
                  <LocationPicker value={coords} onChange={setCoords} />
                </div>
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-xs text-foreground sm:col-span-2">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
                className="accent-[var(--color-primary)]"
              />
              حفظ هذا العنوان لاستخدامه في طلباتي القادمة
            </label>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-4">
            <h2 className="mb-2 text-sm text-foreground">طريقة الدفع</h2>
            <div className="grid gap-2">
              {methods.map((m) => {
                const wallet = m.code === "wallet_balance" || m.kind === "wallet_balance";
                return (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-xs ${
                      methodCode === m.code ? "border-primary bg-brand-soft/60" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="method"
                      className="mt-1 accent-[var(--color-primary)]"
                      checked={methodCode === m.code}
                      onChange={() => setMethodCode(m.code)}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-foreground">
                        {wallet ? <Wallet className="h-3.5 w-3.5 text-primary" /> : null}
                        {m.display_name}
                      </span>
                      {wallet ? (
                        <span className="block text-muted-foreground">
                          رصيدك الحالي: {formatPrice(walletBalance)}
                        </span>
                      ) : null}
                      {m.account_number ? (
                        <span className="block text-muted-foreground" dir="ltr">
                          {m.account_number} — {m.account_name}
                        </span>
                      ) : null}
                      {m.instructions ? (
                        <span className="block text-muted-foreground">{m.instructions}</span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>

            {isWallet && walletBalance < total ? (
              <p className="mt-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-[11px] text-destructive">
                رصيد المحفظة غير كافٍ.{" "}
                <Link to="/wallet" className="underline">
                  اشحن رصيدك الآن
                </Link>
              </p>
            ) : null}

            {needsReceipt ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <FormField label="اسم المُحوِّل">
                  <input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    maxLength={100}
                    className={fieldCls}
                  />
                </FormField>
                <FormField label="رقم المُحوِّل">
                  <input
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    dir="ltr"
                    maxLength={20}
                    className={fieldCls}
                  />
                </FormField>
                <FormField label="رقم عملية التحويل">
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    maxLength={60}
                    className={fieldCls}
                  />
                </FormField>
                <FormField label="صورة الإيصال" required>
                  <label className="flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-border bg-secondary px-3.5 text-xs text-muted-foreground">
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="truncate">{receipt ? receipt.name : "اختر صورة الإيصال"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
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
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 accent-[var(--color-primary)]"
              />
              <span>
                أوافق على{" "}
                <Link to="/page/$slug" params={{ slug: "terms" }} className="text-primary underline">
                  شروط الاستخدام
                </Link>
                ،{" "}
                <Link to="/page/$slug" params={{ slug: "privacy" }} className="text-primary underline">
                  سياسة الخصوصية
                </Link>{" "}
                و
                <Link to="/page/$slug" params={{ slug: "returns" }} className="text-primary underline">
                  سياسة الاستبدال والإرجاع
                </Link>
                .
              </span>
            </label>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-2xl bg-primary text-sm text-primary-foreground disabled:opacity-60"
          >
            {busy ? "جارٍ الإرسال..." : `تأكيد الطلب — ${formatPrice(total)}`}
          </button>
        </form>
      </main>
      <BottomNav />
    </div>
  );
}
