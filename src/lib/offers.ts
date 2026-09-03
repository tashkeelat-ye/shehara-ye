import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/db";

/**
 * منتجات العروض الحقيقية من قاعدة البيانات.
 *
 * يعتبر المنتج "عرضاً" إذا كان لديه سعر خصم،
 * أو سعر قديم أعلى من السعر الحالي،
 * أو تاريخ انتهاء عرض ما زال ساريًا.
 */
export type OfferProduct = Product & {
  discount_price: number | null;
  offer_end_date: string | null;
  category_slug: string | null;
};

const OFFER_COLUMNS =
  "id,category_id,vendor_id,name,description,price,old_price,discount_price,offer_end_date,rating,reviews_count,sales_count,city,images,sizes,colors,badge,is_local,is_active,total_stock,stock_left,low_stock_threshold,created_at";

export function offerPrice(product: OfferProduct): number {
  const discount = Number(product.discount_price) || 0;
  return discount > 0 ? discount : Number(product.price) || 0;
}

export function offerBasePrice(product: OfferProduct): number {
  const price = Number(product.price) || 0;
  const oldPrice = Number(product.old_price) || 0;
  const discount = Number(product.discount_price) || 0;
  if (discount > 0) return price;
  return oldPrice > price ? oldPrice : price;
}

export function offerPercent(product: OfferProduct): number {
  const base = offerBasePrice(product);
  const now = offerPrice(product);
  if (base <= 0 || now >= base) return 0;
  return Math.round(((base - now) / base) * 100);
}

export async function fetchOfferProducts(
  limit = 60,
): Promise<OfferProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(OFFER_COLUMNS)
    .eq("is_active", true)
    .or(
      "discount_price.not.is.null,offer_end_date.not.is.null,old_price.not.is.null",
    )
    .order("sales_count", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const nowIso = Date.now();

  return ((data ?? []) as unknown as OfferProduct[]).filter((product) => {
    if (
      product.offer_end_date &&
      new Date(product.offer_end_date).getTime() < nowIso
    ) {
      return false;
    }
    return offerPercent(product) > 0 || Boolean(product.offer_end_date);
  });
}

export type AdminOfferRow = {
  id: string;
  name: string;
  price: number;
  old_price: number | null;
  discount_price: number | null;
  offer_end_date: string | null;
  images: string[];
  category_id: string | null;
};

export async function fetchAdminOfferProducts(
  search: string,
): Promise<AdminOfferRow[]> {
  let query = supabase
    .from("products")
    .select(
      "id,name,price,old_price,discount_price,offer_end_date,images,category_id",
    )
    .order("created_at", { ascending: false })
    .limit(60);

  if (search.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AdminOfferRow[];
}

export async function updateProductOffer(
  id: string,
  patch: {
    discount_price: number | null;
    offer_end_date: string | null;
  },
) {
  const { error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}
