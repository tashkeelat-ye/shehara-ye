import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  FileText,
  MapPin,
  Phone,
  Printer,
  QrCode,
  ReceiptText,
  ShoppingBag,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  DEFAULT_INVOICE_SETTINGS,
  fetchInvoiceSettings,
  type InvoiceSettings,
} from "@/lib/invoice-settings";

export interface OrderItem {
  id: string;
  title: string;
  description?: string;
  image?: string;
  quantity: number;
  price: number;
  currency?: string;
  size?: string | null;
  color?: string | null;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;

  storeDetails: {
    name: string;
    crNumber: string;
    taxNumber: string;
    address: string;
    phone: string;
    email?: string;
  };

  customerDetails: {
    name: string;
    phone: string;
    address: string;
    paymentMethod: string;
    paymentStatus?: string;
    currency: string;
  };

  items: OrderItem[];

  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;

  notes?: string;
}

type LegacyInvoiceOrder = Partial<InvoiceData> & {
  id?: string;

  invoice_number?: string | null;
  order_number?: string | null;
  created_at?: string | null;

  currency?: string | null;

  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_city?: string | null;
  shipping_district?: string | null;
  shipping_details?: string | null;
  shipping_landmark?: string | null;

  payment_method_code?: string | null;
  payment_status?: string | null;

  subtotal?: number | null;
  delivery_fee?: number | null;
  total?: number | null;
  refunded_amount?: number | null;
  notes?: string | null;

  order_items?: Array<{
    id: string;
    product_id?: string | null;
    product_name: string;
    product_image?: string | null;
    quantity: number;
    unit_price: number;
    currency?: string | null;
    size?: string | null;
    color?: string | null;
  }>;

  invoice?: {
    invoice_number?: string | null;
    issued_at?: string | null;
    snapshot?: unknown;
  };
};

interface InvoiceViewProps {
  order?: LegacyInvoiceOrder;
  settings?: Partial<InvoiceSettings>;
}

function safe(value: unknown): string {
  return String(value ?? "").trim();
}

function finiteNumber(value: unknown, fallback = 0): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function normalizeCurrency(value: unknown): string {
  const currency = safe(value).toUpperCase();

  if (!currency) {
    return "YER";
  }

  if (
    currency === "ريال يمني" ||
    currency === "ريال يمني (YER)" ||
    currency === "ر.ي"
  ) {
    return "YER";
  }

  return currency;
}

function currencyLabel(currency: string): string {
  switch (normalizeCurrency(currency)) {
    case "YER":
      return "ر.ي";
    case "SAR":
      return "ر.س";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    default:
      return currency || "ر.ي";
  }
}

function money(value: unknown, currency = "YER"): string {
  const amount = finiteNumber(value);

  return `${amount.toLocaleString("ar-YE", {
    maximumFractionDigits: 2,
  })} ${currencyLabel(currency)}`;
}

function formatInvoiceDate(value: unknown): string {
  const raw = safe(value);

  if (!raw) {
    return "";
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function paymentMethodLabel(
  methodCode: unknown,
  paymentStatus: unknown,
): string {
  const method = safe(methodCode);

  if (method) {
    return method;
  }

  const status = safe(paymentStatus);

  return status || "—";
}

function paymentStatusLabel(value: unknown): string {
  const status = safe(value);

  const labels: Record<string, string> = {
    unpaid: "غير مدفوع",
    pending: "بانتظار تأكيد الدفع",
    paid: "مدفوع",
    rejected: "تم رفض الدفع",
  };

  return labels[status] ?? status;
}

function buildAddress(order: LegacyInvoiceOrder): string {
  const explicitAddress = safe(
    order.customerDetails?.address,
  );

  if (explicitAddress) {
    return explicitAddress;
  }

  const parts = [
    safe(order.shipping_city),
    safe(order.shipping_district),
    safe(order.shipping_details),
    safe(order.shipping_landmark),
  ].filter(Boolean);

  return parts.join(" - ");
}

function normalizeItems(
  order: LegacyInvoiceOrder,
): OrderItem[] {
  if (
    Array.isArray(order.order_items) &&
    order.order_items.length > 0
  ) {
    return order.order_items.map((item) => ({
      id: safe(item.id),
      title: safe(item.product_name) || "منتج",
      image: safe(item.product_image) || undefined,
      quantity: Math.max(
        0,
        Math.trunc(finiteNumber(item.quantity)),
      ),
      price: finiteNumber(item.unit_price),
      currency:
        normalizeCurrency(item.currency) ||
        normalizeCurrency(order.currency),
      size: item.size ?? null,
      color: item.color ?? null,
    }));
  }

  if (Array.isArray(order.items)) {
    return order.items.map((item) => ({
      ...item,
      id: safe(item.id),
      title: safe(item.title) || "منتج",
      quantity: Math.max(
        0,
        Math.trunc(finiteNumber(item.quantity)),
      ),
      price: finiteNumber(item.price),
      currency:
        normalizeCurrency(item.currency) ||
        normalizeCurrency(order.currency),
    }));
  }

  return [];
}

function resolveInvoiceNumber(
  order: LegacyInvoiceOrder,
): string {
  return (
    safe(order.invoice_number) ||
    safe(order.invoice?.invoice_number) ||
    safe(order.invoiceNumber)
  );
}

function resolveOrderNumber(
  order: LegacyInvoiceOrder,
): string {
  return (
    safe(order.order_number) ||
    safe(order.orderNumber)
  );
}

function resolveInvoiceDate(
  order: LegacyInvoiceOrder,
): string {
  return formatInvoiceDate(
    order.invoice?.issued_at ||
      order.invoiceDate ||
      order.created_at,
  );
}

function resolveCurrency(
  order: LegacyInvoiceOrder,
  items: OrderItem[],
): string {
  const orderCurrency = normalizeCurrency(
    order.currency ||
      order.customerDetails?.currency,
  );

  if (orderCurrency) {
    return orderCurrency;
  }

  const firstItemCurrency = normalizeCurrency(
    items[0]?.currency,
  );

  return firstItemCurrency || "YER";
}

export function InvoiceView({
  order,
  settings: suppliedSettings,
}: InvoiceViewProps) {
  const [settings, setSettings] =
    useState<InvoiceSettings>({
      ...DEFAULT_INVOICE_SETTINGS,
      ...(suppliedSettings ?? {}),
    });

  const [loadingSettings, setLoadingSettings] =
    useState(!suppliedSettings);

  const [settingsError, setSettingsError] =
    useState<string | null>(null);

  useEffect(() => {
    if (suppliedSettings) {
      setSettings({
        ...DEFAULT_INVOICE_SETTINGS,
        ...suppliedSettings,
      });
      setLoadingSettings(false);
      setSettingsError(null);
      return;
    }

    let mounted = true;

    setLoadingSettings(true);
    setSettingsError(null);

    void fetchInvoiceSettings()
      .then((result) => {
        if (!mounted) {
          return;
        }

        setSettings({
          ...DEFAULT_INVOICE_SETTINGS,
          ...result,
        });

        setSettingsError(null);
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return;
        }

        console.error(
          "InvoiceView: failed to load invoice settings",
          error,
        );

        setSettings({
          ...DEFAULT_INVOICE_SETTINGS,
        });

        setSettingsError(
          "تعذر تحميل إعدادات الفاتورة، تم استخدام الإعدادات الافتراضية.",
        );
      })
      .finally(() => {
        if (mounted) {
          setLoadingSettings(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [suppliedSettings]);

  const data = useMemo<InvoiceData>(() => {
    const currentOrder = order ?? {};
    const items = normalizeItems(currentOrder);
    const currency = resolveCurrency(
      currentOrder,
      items,
    );

    const subtotalFromItems = items.reduce(
      (sum, item) =>
        sum +
        finiteNumber(item.price) *
          Math.max(0, finiteNumber(item.quantity)),
      0,
    );

    const subtotal = finiteNumber(
      currentOrder.subtotal,
      subtotalFromItems,
    );

    const discount = Math.max(
      0,
      finiteNumber(currentOrder.discount),
    );

    const shippingFee = Math.max(
      0,
      finiteNumber(
        currentOrder.delivery_fee ??
          currentOrder.shippingFee,
      ),
    );

    const suppliedTotal = finiteNumber(
      currentOrder.total,
    );

    const calculatedTotal = Math.max(
      0,
      subtotal - discount + shippingFee,
    );

    const total =
      suppliedTotal > 0
        ? suppliedTotal
        : calculatedTotal;

    const paymentStatus = safe(
      currentOrder.payment_status ||
        currentOrder.customerDetails?.paymentStatus,
    );

    const paymentMethod = paymentMethodLabel(
      currentOrder.payment_method_code ||
        currentOrder.customerDetails?.paymentMethod,
      paymentStatus,
    );

    const customerName =
      safe(currentOrder.shipping_name) ||
      safe(currentOrder.customerDetails?.name);

    const customerPhone =
      safe(currentOrder.shipping_phone) ||
      safe(currentOrder.customerDetails?.phone);

    return {
      invoiceNumber:
        resolveInvoiceNumber(currentOrder),
      invoiceDate:
        resolveInvoiceDate(currentOrder),
      orderNumber:
        resolveOrderNumber(currentOrder),

      storeDetails: {
        name:
          safe(currentOrder.storeDetails?.name) ||
          settings.store_name,

        crNumber:
          safe(currentOrder.storeDetails?.crNumber) ||
          settings.commercial_registration,

        taxNumber:
          safe(currentOrder.storeDetails?.taxNumber) ||
          settings.tax_number,

        address:
          safe(currentOrder.storeDetails?.address) ||
          settings.store_address,

        phone:
          safe(currentOrder.storeDetails?.phone) ||
          settings.store_phone,

        email:
          safe(currentOrder.storeDetails?.email) ||
          settings.store_email,
      },

      customerDetails: {
        name: customerName,
        phone: customerPhone,
        address: buildAddress(currentOrder),
        paymentMethod,
        paymentStatus:
          paymentStatusLabel(paymentStatus),
        currency,
      },

      items,

      subtotal,
      discount,
      shippingFee,
      total,

      notes:
        safe(currentOrder.notes) ||
        safe(currentOrder.notes),
    };
  }, [order, settings]);

  const handlePrint = () => {
    window.print();
  };

  if (loadingSettings) {
    return (
      <div
        dir="rtl"
        className="mx-auto w-full max-w-4xl rounded-3xl border border-border bg-card p-8 text-center"
      >
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-[#E2723A]" />

        <p className="text-sm text-muted-foreground">
          جارٍ تجهيز الفاتورة...
        </p>
      </div>
    );
  }

  if (!settings.enabled) {
    return (
      <div
        dir="rtl"
        className="mx-auto w-full max-w-3xl rounded-3xl border border-border bg-card p-8 text-center"
      >
        <ReceiptText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />

        <h2 className="text-lg font-bold">
          الفاتورة غير مفعلة
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          تم تعطيل عرض الفواتير من إعدادات الإدارة.
        </p>
      </div>
    );
  }

  const showDiscount =
    settings.show_discount && data.discount > 0;

  const grandTotal = Math.max(
    0,
    data.total ||
      data.subtotal -
        data.discount +
        data.shippingFee,
  );

  const hasInvoiceNumber =
    Boolean(data.invoiceNumber);

  const hasOrderNumber =
    Boolean(data.orderNumber);

  const invoiceVerificationText =
    data.invoiceNumber ||
    data.orderNumber ||
    "فاتورة إلكترونية";

  return (
    <div
      dir="rtl"
      className="invoice-page mx-auto w-full max-w-4xl overflow-hidden rounded-[28px] border border-[#0D3B4D]/10 bg-white text-[#17242B] shadow-[0_25px_80px_rgba(13,59,77,0.14)] print:max-w-none print:rounded-none print:border-0 print:shadow-none"
      style={{
        ["--invoice-primary" as string]:
          settings.primary_color,
        ["--invoice-secondary" as string]:
          settings.secondary_color,
        ["--invoice-accent" as string]:
          settings.accent_color,
      }}
    >
      {/* Actions */}
      <div className="invoice-actions flex items-center justify-between gap-4 border-b border-[#0D3B4D]/10 bg-[#F6F2EE] px-5 py-4 md:px-8 print:hidden">
        <div className="flex items-center gap-2 text-xs font-medium text-[#0D3B4D]/70">
          <FileText className="h-4 w-4 text-[#E2723A]" />

          <span>
            {settings.invoice_subtitle}
          </span>

          {settingsError && (
            <span className="text-[10px] text-[#C94C35]">
              • {settingsError}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0D3B4D] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0A2A38]"
        >
          <Printer className="h-4 w-4 text-[#E2723A]" />

          طباعة / حفظ PDF
        </button>
      </div>

      {/* Top luxury strip */}
      <div className="h-1.5 bg-gradient-to-l from-[#E2723A] via-[#0D3B4D] to-[#0A2A38]" />

      <div className="p-5 md:p-8">
        {/* Header */}
        <header className="flex flex-col gap-7 border-b border-[#0D3B4D]/10 pb-7 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0D3B4D] p-3 shadow-[0_10px_30px_rgba(13,59,77,0.18)]">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-5 top-5 h-14 w-14 rounded-full border-2 border-white" />

                <div className="absolute -left-6 bottom-0 h-16 w-16 rounded-full border-2 border-white" />
              </div>

              <img
                src={
                  settings.logo_url ||
                  "/logo.png"
                }
                alt={settings.store_name}
                className="relative z-10 max-h-full max-w-full object-contain"
              />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0D3B4D] md:text-3xl">
                {settings.store_name}
              </h1>

              {settings.store_tagline && (
                <p className="mt-1 text-xs font-bold tracking-wide text-[#E2723A]">
                  {settings.store_tagline}
                </p>
              )}

              {settings.header_note && (
                <p className="mt-2 max-w-sm text-xs leading-6 text-[#0D3B4D]/60">
                  {settings.header_note}
                </p>
              )}
            </div>
          </div>

          <div className="md:text-left">
            <div className="inline-flex items-center gap-2 rounded-xl bg-[#0D3B4D] px-4 py-2 text-xs font-bold text-white">
              <ReceiptText className="h-4 w-4 text-[#E2723A]" />

              {settings.invoice_title}
            </div>

            <div className="mt-4 space-y-2 text-xs">
              {settings.show_invoice_number &&
                hasInvoiceNumber && (
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-[#0D3B4D]/50">
                      رقم الفاتورة
                    </span>

                    <span
                      dir="ltr"
                      className="font-mono font-bold text-[#0D3B4D]"
                    >
                      {data.invoiceNumber}
                    </span>
                  </div>
                )}

              {settings.show_order_number &&
                hasOrderNumber && (
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-[#0D3B4D]/50">
                      رقم الطلب
                    </span>

                    <span
                      dir="ltr"
                      className="font-mono font-bold text-[#0D3B4D]"
                    >
                      {data.orderNumber}
                    </span>
                  </div>
                )}

              {settings.show_invoice_date &&
                data.invoiceDate && (
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-[#0D3B4D]/50">
                      التاريخ
                    </span>

                    <span className="font-semibold">
                      {data.invoiceDate}
                    </span>
                  </div>
                )}

              <div className="flex items-center justify-between gap-8">
                <span className="text-[#0D3B4D]/50">
                  العملة
                </span>

                <span
                  dir="ltr"
                  className="font-bold"
                >
                  {data.customerDetails.currency}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Information cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {settings.show_store_details && (
            <section className="overflow-hidden rounded-2xl border border-[#0D3B4D]/10 bg-[#F6F2EE]/55">
              <div className="flex items-center justify-between bg-[#0D3B4D] px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#E2723A]" />

                  <span className="text-xs font-bold">
                    بيانات المتجر
                  </span>
                </div>
              </div>

              <div className="space-y-2 p-4 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-[#0D3B4D]/50">
                    المتجر
                  </span>

                  <span className="font-bold">
                    {data.storeDetails.name}
                  </span>
                </div>

                {settings.show_commercial_registration &&
                  data.storeDetails.crNumber && (
                    <div className="flex justify-between gap-4">
                      <span className="text-[#0D3B4D]/50">
                        السجل التجاري
                      </span>

                      <span className="font-semibold">
                        {data.storeDetails.crNumber}
                      </span>
                    </div>
                  )}

                {settings.show_tax_number &&
                  data.storeDetails.taxNumber && (
                    <div className="flex justify-between gap-4">
                      <span className="text-[#0D3B4D]/50">
                        الرقم الضريبي
                      </span>

                      <span className="font-semibold">
                        {data.storeDetails.taxNumber}
                      </span>
                    </div>
                  )}

                {data.storeDetails.address && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[#0D3B4D]/50">
                      العنوان
                    </span>

                    <span className="max-w-[70%] text-left font-semibold">
                      {data.storeDetails.address}
                    </span>
                  </div>
                )}

                {data.storeDetails.phone && (
                  <div className="flex justify-between gap-4">
                    <span className="inline-flex items-center gap-1 text-[#0D3B4D]/50">
                      <Phone className="h-3 w-3" />
                      الهاتف
                    </span>

                    <span
                      dir="ltr"
                      className="font-semibold"
                    >
                      {data.storeDetails.phone}
                    </span>
                  </div>
                )}

                {data.storeDetails.email && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#0D3B4D]/50">
                      البريد
                    </span>

                    <span
                      dir="ltr"
                      className="max-w-[70%] break-all text-left font-semibold"
                    >
                      {data.storeDetails.email}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {settings.show_customer_details && (
            <section className="overflow-hidden rounded-2xl border border-[#0D3B4D]/10 bg-[#F6F2EE]/55">
              <div className="flex items-center justify-between bg-[#0D3B4D] px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-[#E2723A]" />

                  <span className="text-xs font-bold">
                    بيانات العميل
                  </span>
                </div>

                {settings.show_payment_status &&
                  data.customerDetails.paymentStatus && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold">
                      <CheckCircle2 className="h-3 w-3 text-[#E2723A]" />

                      {data.customerDetails.paymentStatus}
                    </span>
                  )}
              </div>

              <div className="space-y-2 p-4 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-[#0D3B4D]/50">
                    الاسم
                  </span>

                  <span className="font-bold">
                    {data.customerDetails.name ||
                      "—"}
                  </span>
                </div>

                {settings.show_customer_phone &&
                  data.customerDetails.phone && (
                    <div className="flex justify-between gap-4">
                      <span className="inline-flex items-center gap-1 text-[#0D3B4D]/50">
                        <Phone className="h-3 w-3" />
                        الهاتف
                      </span>

                      <span
                        dir="ltr"
                        className="font-semibold"
                      >
                        {data.customerDetails.phone}
                      </span>
                    </div>
                  )}

                {settings.show_customer_address &&
                  data.customerDetails.address && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex items-center gap-1 text-[#0D3B4D]/50">
                        <MapPin className="h-3 w-3" />

                        العنوان
                      </span>

                      <span className="max-w-[70%] text-left font-semibold">
                        {data.customerDetails.address}
                      </span>
                    </div>
                  )}

                {settings.show_payment_method &&
                  data.customerDetails.paymentMethod && (
                    <div className="flex justify-between gap-4">
                      <span className="flex items-center gap-1 text-[#0D3B4D]/50">
                        <WalletCards className="h-3 w-3" />

                        الدفع
                      </span>

                      <span className="font-semibold">
                        {data.customerDetails.paymentMethod}
                      </span>
                    </div>
                  )}

                {settings.show_payment_status &&
                  data.customerDetails.paymentStatus && (
                    <div className="flex justify-between gap-4">
                      <span className="text-[#0D3B4D]/50">
                        حالة الدفع
                      </span>

                      <span className="font-semibold">
                        {data.customerDetails.paymentStatus}
                      </span>
                    </div>
                  )}
              </div>
            </section>
          )}
        </div>

        {/* Items */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-[#0D3B4D]/10">
          <div className="flex items-center gap-2 bg-[#0D3B4D] px-4 py-3 text-white">
            <ShoppingBag className="h-4 w-4 text-[#E2723A]" />

            <span className="text-xs font-bold">
              تفاصيل الطلب
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-xs">
              <thead>
                <tr className="bg-[#F6F2EE] text-[#0D3B4D]">
                  <th className="w-12 px-4 py-3 text-center">
                    #
                  </th>

                  <th className="px-4 py-3 text-right">
                    المنتج
                  </th>

                  <th className="w-24 px-4 py-3 text-center">
                    الكمية
                  </th>

                  <th className="w-32 px-4 py-3 text-center">
                    سعر الوحدة
                  </th>

                  <th className="w-36 px-4 py-3 text-left">
                    الإجمالي
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#0D3B4D]/8">
                {data.items.map((item, index) => {
                  const itemCurrency =
                    normalizeCurrency(
                      item.currency ||
                        data.customerDetails
                          .currency,
                    );

                  const lineTotal =
                    finiteNumber(item.price) *
                    Math.max(
                      0,
                      finiteNumber(
                        item.quantity,
                      ),
                    );

                  return (
                    <tr
                      key={
                        item.id ||
                        `${item.title}-${index}`
                      }
                    >
                      <td className="px-4 py-4 text-center font-bold text-[#0D3B4D]/40">
                        {index + 1}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {settings.show_product_images &&
                            item.image && (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#0D3B4D]/10 bg-[#F6F2EE]">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}

                          <div>
                            <p className="font-bold text-[#0D3B4D]">
                              {item.title}
                            </p>

                            {(item.size ||
                              item.color) && (
                              <p className="mt-1 text-[10px] text-[#0D3B4D]/50">
                                {item.size &&
                                  `المقاس: ${item.size}`}
                                {item.size &&
                                  item.color &&
                                  " • "}
                                {item.color &&
                                  `اللون: ${item.color}`}
                              </p>
                            )}

                            {settings.show_product_description &&
                              item.description && (
                                <p className="mt-1 text-[10px] leading-5 text-[#0D3B4D]/45">
                                  {
                                    item.description
                                  }
                                </p>
                              )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center font-bold">
                        {item.quantity.toLocaleString(
                          "ar-YE",
                        )}
                      </td>

                      <td className="px-4 py-4 text-center font-semibold">
                        {money(
                          item.price,
                          itemCurrency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-left font-black text-[#0D3B4D]">
                        {money(
                          lineTotal,
                          itemCurrency,
                        )}
                      </td>
                    </tr>
                  );
                })}

                {data.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      لا توجد منتجات في هذه الفاتورة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Totals */}
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {settings.show_notes &&
              data.notes && (
                <div className="rounded-2xl border border-[#0D3B4D]/10 bg-[#F6F2EE]/55 p-4">
                  <p className="text-xs font-black text-[#0D3B4D]">
                    ملاحظات الطلب
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[#0D3B4D]/65">
                    {data.notes}
                  </p>
                </div>
              )}

            {settings.show_qr_code && (
              <div className="flex items-center gap-4 rounded-2xl border border-[#0D3B4D]/10 bg-white p-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#F6F2EE]">
                  <QrCode className="h-9 w-9 text-[#0D3B4D]" />
                </div>

                <div>
                  <p className="text-xs font-black text-[#0D3B4D]">
                    فاتورة إلكترونية
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#0D3B4D]/50">
                    يمكن استخدام رقم الفاتورة أو
                    رقم الطلب للتحقق من تفاصيل
                    العملية داخل النظام.
                  </p>

                  <p
                    dir="ltr"
                    className="mt-1 break-all font-mono text-[9px] text-[#0D3B4D]/40"
                  >
                    {invoiceVerificationText}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#0D3B4D]/10">
            <div className="space-y-3 bg-[#F6F2EE]/55 p-5 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-[#0D3B4D]/55">
                  المجموع الفرعي
                </span>

                <span className="font-bold">
                  {money(
                    data.subtotal,
                    data.customerDetails
                      .currency,
                  )}
                </span>
              </div>

              {showDiscount && (
                <div className="flex justify-between gap-4 text-[#C94C35]">
                  <span>الخصم</span>

                  <span className="font-bold">
                    -{" "}
                    {money(
                      data.discount,
                      data.customerDetails
                        .currency,
                    )}
                  </span>
                </div>
              )}

              {settings.show_delivery_fee && (
                <div className="flex justify-between gap-4">
                  <span className="flex items-center gap-1 text-[#0D3B4D]/55">
                    <TruckIcon />

                    التوصيل
                  </span>

                  <span className="font-bold">
                    {money(
                      data.shippingFee,
                      data.customerDetails
                        .currency,
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-[#0D3B4D] p-5 text-white">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold text-white/55">
                    الإجمالي المستحق
                  </p>

                  <p className="mt-1 text-2xl font-black text-[#E2723A]">
                    {money(
                      grandTotal,
                      data.customerDetails
                        .currency,
                    )}
                  </p>
                </div>

                <span
                  dir="ltr"
                  className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold"
                >
                  {data.customerDetails.currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {settings.invoice_footer_enabled && (
          <footer className="mt-8 border-t border-[#0D3B4D]/10 pt-6 text-center">
            <p className="text-sm font-black text-[#0D3B4D]">
              {settings.thank_you_message}
            </p>

            {settings.footer_note && (
              <p className="mt-2 text-xs text-[#0D3B4D]/50">
                {settings.footer_note}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-[#0D3B4D]/45">
              {settings.store_phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />

                  {settings.store_phone}
                </span>
              )}

              {settings.store_address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />

                  {settings.store_address}
                </span>
              )}

              {settings.store_email && (
                <span
                  dir="ltr"
                  className="inline-flex items-center gap-1"
                >
                  {settings.store_email}
                </span>
              )}
            </div>

            <div className="mx-auto mt-5 h-1 w-24 rounded-full bg-gradient-to-l from-[#E2723A] to-[#0D3B4D]" />
          </footer>
        )}
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          body {
            background: white !important;
          }

          .invoice-page {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
          }

          .invoice-actions {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function TruckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M3 6h11v10H3z" />
      <path d="M14 9h4l3 3v4h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}
