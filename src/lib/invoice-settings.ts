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

export async function fetchInvoiceSettings(): Promise<InvoiceSettings> {
  const { data, error } = await supabase.rpc(
    "get_invoice_settings",
  );

  if (error) {
    console.error("fetchInvoiceSettings:", error);
    throw error;
  }

  return {
    ...DEFAULT_INVOICE_SETTINGS,
    ...(data ?? {}),
  } as InvoiceSettings;
}

export async function updateInvoiceSettings(
  values: Partial<InvoiceSettings>,
): Promise<InvoiceSettings> {
  const { data, error } = await supabase.rpc(
    "update_invoice_settings",
    {
      _settings: values,
    },
  );

  if (error) {
    console.error("updateInvoiceSettings:", error);
    throw error;
  }

  return {
    ...DEFAULT_INVOICE_SETTINGS,
    ...(data ?? {}),
  } as InvoiceSettings;
}
