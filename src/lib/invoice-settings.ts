import { supabase } from "@/integrations/supabase/client";

export type InvoiceSettings = {
  id: boolean;
  enabled: boolean;

  invoice_title: string;
  invoice_subtitle: string;

  store_name: string;
  store_tagline: string;
  store_address: string;
  store_phone: string;
  store_email: string;
  commercial_registration: string;
  tax_number: string;

  logo_url: string;

  header_note: string;
  footer_note: string;
  thank_you_message: string;

  primary_color: string;
  secondary_color: string;
  accent_color: string;

  show_invoice_number: boolean;
  show_order_number: boolean;
  show_invoice_date: boolean;

  show_customer_details: boolean;
  show_customer_phone: boolean;
  show_customer_address: boolean;

  show_store_details: boolean;
  show_commercial_registration: boolean;
  show_tax_number: boolean;

  show_product_images: boolean;
  show_product_description: boolean;

  show_payment_method: boolean;
  show_payment_status: boolean;

  show_notes: boolean;
  show_qr_code: boolean;

  show_delivery_fee: boolean;
  show_discount: boolean;

  paper_size: "A4" | "thermal";

  invoice_prefix: string;
  invoice_footer_enabled: boolean;

  updated_at: string;
};

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  id: true,
  enabled: true,

  invoice_title: "فاتورة بيع",
  invoice_subtitle: "فاتورة إلكترونية",

  store_name: "شهارة للتسوق",
  store_tagline: "تسوق بلا حدود",
  store_address: "",
  store_phone: "",
  store_email: "",
  commercial_registration: "",
  tax_number: "",

  logo_url: "/logo.png",

  header_note: "",
  footer_note: "شكراً لتسوقكم معنا",
  thank_you_message: "نسعد بخدمتكم دائماً",

  primary_color: "#0D3B4D",
  secondary_color: "#0A2A38",
  accent_color: "#E2723A",

  show_invoice_number: true,
  show_order_number: true,
  show_invoice_date: true,

  show_customer_details: true,
  show_customer_phone: true,
  show_customer_address: true,

  show_store_details: true,
  show_commercial_registration: true,
  show_tax_number: true,

  show_product_images: true,
  show_product_description: true,

  show_payment_method: true,
  show_payment_status: true,

  show_notes: true,
  show_qr_code: true,

  show_delivery_fee: true,
  show_discount: true,

  paper_size: "A4",

  invoice_prefix: "INV",
  invoice_footer_enabled: true,

  updated_at: "",
};

/*
 * ملف types.ts الحالي في المشروع لا يحتوي على invoice_settings
 * رغم أن جدولها موجود في migrations.
 *
 * لذلك نستخدم واجهة صغيرة محلية للوصول إلى الجدول،
 * بدلاً من تعطيل TypeScript أو استخدام any.
 */

type QueryResult = {
  data: unknown;
  error: unknown;
};

type InvoiceSettingsQuery = {
  select(columns?: string): InvoiceSettingsQuery;
  update(values: Record<string, unknown>): InvoiceSettingsQuery;
  eq(
    column: string,
    value: unknown,
  ): InvoiceSettingsQuery;
  maybeSingle(): Promise<QueryResult>;
  single(): Promise<QueryResult>;
};

type UntypedSupabase = {
  from(table: string): InvoiceSettingsQuery;
};

const db =
  supabase as unknown as UntypedSupabase;

function mergeInvoiceSettings(
  value: unknown,
): InvoiceSettings {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {
      ...DEFAULT_INVOICE_SETTINGS,
    };
  }

  const source =
    value as Partial<InvoiceSettings>;

  return {
    ...DEFAULT_INVOICE_SETTINGS,

    ...source,

    id: true,

    enabled:
      typeof source.enabled === "boolean"
        ? source.enabled
        : DEFAULT_INVOICE_SETTINGS.enabled,

    paper_size:
      source.paper_size === "thermal"
        ? "thermal"
        : "A4",

    invoice_prefix:
      typeof source.invoice_prefix ===
        "string" &&
      source.invoice_prefix.trim().length > 0
        ? source.invoice_prefix.trim()
        : DEFAULT_INVOICE_SETTINGS.invoice_prefix,

    updated_at:
      typeof source.updated_at ===
        "string"
        ? source.updated_at
        : DEFAULT_INVOICE_SETTINGS.updated_at,
  };
}

function normalizeError(
  error: unknown,
): Error {
  if (error instanceof Error) {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return new Error(
      String(
        (
          error as {
            message?: unknown;
          }
        ).message ??
          "خطأ غير معروف",
      ),
    );
  }

  return new Error(
    "تعذر الوصول إلى إعدادات الفاتورة.",
  );
}

/**
 * جلب إعدادات الفاتورة مباشرة من قاعدة البيانات.
 *
 * لا نعتمد هنا على RPC حتى لا تصبح صفحة إعدادات
 * المتجر بالكامل رهينة لـ PostgREST RPC schema cache.
 */
export async function fetchInvoiceSettings(): Promise<InvoiceSettings> {
  const {
    data,
    error,
  } = await db
    .from("invoice_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    console.error(
      "[InvoiceSettings] direct read failed:",
      error,
    );

    throw normalizeError(error);
  }

  if (!data) {
    throw new Error(
      "لم يتم العثور على سجل إعدادات الفاتورة.",
    );
  }

  return mergeInvoiceSettings(data);
}

/**
 * تحديث إعدادات الفاتورة مباشرة في قاعدة البيانات.
 *
 * الحماية الفعلية موجودة في RLS:
 * admin فقط يستطيع UPDATE.
 */
export async function updateInvoiceSettings(
  values: Partial<InvoiceSettings>,
): Promise<InvoiceSettings> {
  const payload: Record<
    string,
    unknown
  > = {};

  for (const [
    key,
    value,
  ] of Object.entries(values)) {
    if (
      key === "id" ||
      key === "updated_at" ||
      value === undefined ||
      value === null
    ) {
      continue;
    }

    payload[key] = value;
  }

  const {
    data,
    error,
  } = await db
    .from("invoice_settings")
    .update(payload)
    .eq("id", true)
    .select("*")
    .single();

  if (error) {
    console.error(
      "[InvoiceSettings] direct update failed:",
      error,
    );

    throw normalizeError(error);
  }

  if (!data) {
    throw new Error(
      "تعذر حفظ إعدادات الفاتورة.",
    );
  }

  return mergeInvoiceSettings(data);
}
