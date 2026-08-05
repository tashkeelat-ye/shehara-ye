import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  id: boolean;
  store_name: string;
  tagline: string;
  logo_url: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  telegram: string;
  tiktok: string;
  twitter: string;
  footer_note: string;
  footer_copyright: string;
  delivery_fee: number;
  sar_rate: number;
  is_open: boolean;
  closed_message: string;
  announcement_text: string;
  announcement_link: string;
  announcement_active: boolean;
};

export type Courier = {
  id: string;
  name: string;
  phone: string;
  city: string;
  is_active: boolean;
};


export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  cta_label: string;
  link_url: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

export type PageRow = {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  updated_at: string;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
};

export type PaymentMethod = {
  id: string;
  code: string;
  kind: string;
  display_name: string;
  account_number: string;
  account_name: string;
  instructions: string;
  requires_receipt: boolean;
  is_active: boolean;
  sort_order: number;
};

export type WalletTransaction = {
  id: string;
  amount: number;
  kind: string;
  description: string;
  created_at: string;
};

export type PaymentRequest = {
  id: string;
  user_id: string;
  purpose: string;
  order_id: string | null;
  method_code: string;
  amount: number;
  sender_name: string;
  sender_phone: string;
  reference: string;
  receipt_path: string;
  status: string;
  admin_note: string;
  created_at: string;
};

const SETTINGS_COLUMNS =
  "id,store_name,tagline,logo_url,phone,whatsapp,email,address,facebook,instagram,telegram,tiktok,twitter,footer_note,footer_copyright,delivery_fee,sar_rate,is_open,closed_message,announcement_text,announcement_link,announcement_active";
const BANNER_COLUMNS = "id,title,subtitle,cta_label,link_url,image_url,sort_order,is_active";
const PM_COLUMNS =
  "id,code,kind,display_name,account_number,account_name,instructions,requires_receipt,is_active,sort_order";

export async function fetchSettings(): Promise<SiteSettings | null> {
  const { data } = await supabase
    .from("site_settings")
    .select(SETTINGS_COLUMNS)
    .maybeSingle<SiteSettings>();
  return data ?? null;
}

export async function fetchBanners(onlyActive = true): Promise<Banner[]> {
  let q = supabase.from("banners").select(BANNER_COLUMNS);
  if (onlyActive) q = q.eq("is_active", true);
  const { data } = await q.order("sort_order").returns<Banner[]>();
  return data ?? [];
}

export async function fetchCouriers(onlyActive = true): Promise<Courier[]> {
  let q = supabase.from("couriers").select("id,name,phone,city,is_active");
  if (onlyActive) q = q.eq("is_active", true);
  const { data } = await q.order("name").returns<Courier[]>();
  return data ?? [];
}

export async function fetchPage(slug: string): Promise<PageRow | null> {
  const { data } = await supabase
    .from("pages")
    .select("id,slug,title,content,is_published,updated_at")
    .eq("slug", slug)
    .maybeSingle<PageRow>();
  return data ?? null;
}

export async function fetchPages(): Promise<PageRow[]> {
  const { data } = await supabase
    .from("pages")
    .select("id,slug,title,content,is_published,updated_at")
    .order("slug")
    .returns<PageRow[]>();
  return data ?? [];
}

export async function fetchFaqs(): Promise<Faq[]> {
  const { data } = await supabase
    .from("faqs")
    .select("id,question,answer,sort_order,is_active")
    .order("sort_order")
    .returns<Faq[]>();
  return data ?? [];
}

export async function fetchPaymentMethods(onlyActive = true): Promise<PaymentMethod[]> {
  let q = supabase.from("payment_methods").select(PM_COLUMNS);
  if (onlyActive) q = q.eq("is_active", true);
  const { data } = await q.order("sort_order").returns<PaymentMethod[]>();
  return data ?? [];
}

export async function fetchWalletTransactions(userId: string): Promise<WalletTransaction[]> {
  const { data } = await supabase
    .from("wallet_transactions")
    .select("id,amount,kind,description,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<WalletTransaction[]>();
  return data ?? [];
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار التأكيد",
  awaiting_payment: "بانتظار تأكيد الدفع",
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "غير مدفوع",
  pending: "بانتظار تأكيد الدفع",
  paid: "مدفوع",
  rejected: "تم رفض الدفع",
};

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
