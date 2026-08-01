import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  sort_order: number;
};

export type Product = {
  id: string;
  category_id: string;
  vendor_id: string | null;
  name: string;
  description: string;
  price: number;
  old_price: number | null;
  rating: number;
  reviews_count: number;
  sales_count: number;
  city: string;
  images: string[];
  sizes: string[];
  colors: string[];
  badge: string | null;
  is_local: boolean;
  created_at: string;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string | null;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type SortKey = "best" | "newest" | "price_asc" | "price_desc";

export type ProductFilters = {
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  minRating?: number | undefined;
  city?: string | undefined;
};


const PRODUCT_COLUMNS =
  "id,category_id,vendor_id,name,description,price,old_price,rating,reviews_count,sales_count,city,images,sizes,colors,badge,is_local,created_at";

const sel = (s: string): string => s;

export const formatPrice = (value: number) =>
  `${Math.round(value).toLocaleString("ar-EG")} ر.ي`;

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select(sel("id,slug,name,icon,sort_order"))
    .order("sort_order")
    .returns<Category[]>();
  if (error) throw error;
  return data ?? [];
}

export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .select(sel("id,slug,name,icon,sort_order"))
    .eq("slug", slug)
    .maybeSingle<Category>();
  if (error) throw error;
  return data ?? null;
}

function applySort<T>(query: T, sort: SortKey): T {
  const q = query as unknown as {
    order: (col: string, opts?: { ascending?: boolean }) => T;
  };
  switch (sort) {
    case "newest":
      return q.order("created_at", { ascending: false });
    case "price_asc":
      return q.order("price", { ascending: true });
    case "price_desc":
      return q.order("price", { ascending: false });
    default:
      return q.order("sales_count", { ascending: false });
  }
}

export async function fetchProducts(opts: {
  categorySlug?: string;
  categoryId?: string;
  local?: boolean;
  sort?: SortKey;
  filters?: ProductFilters;
  limit?: number;
}): Promise<Product[]> {
  let query = supabase.from("products").select(sel(PRODUCT_COLUMNS));

  if (opts.categoryId) query = query.eq("category_id", opts.categoryId);
  if (opts.local) query = query.eq("is_local", true);

  const f = opts.filters ?? {};
  if (typeof f.minPrice === "number") query = query.gte("price", f.minPrice);
  if (typeof f.maxPrice === "number") query = query.lte("price", f.maxPrice);
  if (typeof f.minRating === "number" && f.minRating > 0)
    query = query.gte("rating", f.minRating);
  if (f.city) query = query.eq("city", f.city);

  query = applySort(query, opts.sort ?? "best");
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query.returns<Product[]>();
  if (error) throw error;
  return data ?? [];
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(sel(PRODUCT_COLUMNS))
    .eq("id", id)
    .maybeSingle<Product>();
  if (error) throw error;
  return data ?? null;
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("products")
    .select(sel(PRODUCT_COLUMNS))
    .in("id", ids)
    .returns<Product[]>();
  if (error) throw error;
  return data ?? [];
}

export async function fetchReviews(productId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(sel("id,product_id,user_id,author_name,rating,comment,created_at"))
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .returns<Review[]>();
  if (error) throw error;
  return data ?? [];
}

export async function fetchCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from("products")
    .select(sel("city"))
    .returns<{ city: string }[]>();
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((r) => r.city))).sort();
}
