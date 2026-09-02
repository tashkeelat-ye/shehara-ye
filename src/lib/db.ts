import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/money";
import {
  offlineGet,
  offlineGetAll,
  offlinePutMany,
} from "@/lib/offline-db";

/**
 * تنسيق ثابت بالريال اليمني فقط — لا يتفاعل مع تبديل العملة.
 *
 * استخدم useFormatPrice() داخل مكونات React
 * عندما تحتاج إلى عرض السعر وفق العملة الحالية.
 */
export const formatPrice = (value: number) =>
  formatMoney(value);

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  image_url: string | null;
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
  is_active: boolean;

  /**
   * نظام المخزون
   */
  total_stock: number;
  stock_left: number;
  low_stock_threshold: number;

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

export type SortKey =
  | "best"
  | "newest"
  | "price_asc"
  | "price_desc";

export type ProductFilters = {
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  minRating?: number | undefined;
  city?: string | undefined;
};

const PRODUCT_COLUMNS = [
  "id",
  "category_id",
  "vendor_id",
  "name",
  "description",
  "price",
  "old_price",
  "rating",
  "reviews_count",
  "sales_count",
  "city",
  "images",
  "sizes",
  "colors",
  "badge",
  "is_local",
  "is_active",
  "total_stock",
  "stock_left",
  "low_stock_threshold",
  "created_at",
].join(",");

const CATEGORY_COLUMNS =
  "id,slug,name,icon,image_url,sort_order";

const sel = (value: string): string => value;

function normalizeProduct(
  product: Product,
): Product {
  return {
    ...product,

    price: Number(product.price) || 0,
    old_price:
      product.old_price === null
        ? null
        : Number(product.old_price) || 0,

    rating: Number(product.rating) || 0,
    reviews_count:
      Number(product.reviews_count) || 0,
    sales_count:
      Number(product.sales_count) || 0,

    images: Array.isArray(product.images)
      ? product.images
      : [],

    sizes: Array.isArray(product.sizes)
      ? product.sizes
      : [],

    colors: Array.isArray(product.colors)
      ? product.colors
      : [],

    is_local: Boolean(product.is_local),
    is_active:
      product.is_active !== false,

    total_stock:
      Number(product.total_stock) || 0,

    stock_left:
      Number(product.stock_left) || 0,

    low_stock_threshold:
      Number(product.low_stock_threshold) || 5,
  };
}

function normalizeProducts(
  products: Product[],
): Product[] {
  return products.map(normalizeProduct);
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const { data, error } =
      await supabase
        .from("categories")
        .select(sel(CATEGORY_COLUMNS))
        .order("sort_order")
        .returns<Category[]>();

    if (error) {
      throw error;
    }

    return data ?? [];
  } catch (error) {
    console.warn(
      "[Offline] تعذر تحميل التصنيفات من Supabase.",
      error,
    );

    return offlineGetAll<Category>(
      "categories",
    );
  }
}

export async function fetchCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  try {
    const { data, error } =
      await supabase
        .from("categories")
        .select(sel(CATEGORY_COLUMNS))
        .eq("slug", slug)
        .maybeSingle<Category>();

    if (error) {
      throw error;
    }

    return data ?? null;
  } catch (error) {
    console.warn(
      "[Offline] تعذر تحميل التصنيف من Supabase.",
      error,
    );

    const categories =
      await offlineGetAll<Category>(
        "categories",
      );

    return (
      categories.find(
        (category) => category.slug === slug,
      ) ?? null
    );
  }
}

function applySort<T>(
  query: T,
  sort: SortKey,
): T {
  const q = query as unknown as {
    order: (
      column: string,
      options?: {
        ascending?: boolean;
      },
    ) => T;
  };

  switch (sort) {
    case "newest":
      return q.order("created_at", {
        ascending: false,
      });

    case "price_asc":
      return q.order("price", {
        ascending: true,
      });

    case "price_desc":
      return q.order("price", {
        ascending: false,
      });

    default:
      return q.order("sales_count", {
        ascending: false,
      });
  }
}

function sortOfflineProducts(
  products: Product[],
  sort: SortKey,
): Product[] {
  const result = [...products];

  switch (sort) {
    case "newest":
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime(),
      );
      break;

    case "price_asc":
      result.sort(
        (a, b) => a.price - b.price,
      );
      break;

    case "price_desc":
      result.sort(
        (a, b) => b.price - a.price,
      );
      break;

    default:
      result.sort(
        (a, b) =>
          b.sales_count - a.sales_count,
      );
      break;
  }

  return result;
}

function filterOfflineProducts(
  products: Product[],
  opts: {
    categoryId?: string | undefined;
    local?: boolean | undefined;
    filters?: ProductFilters | undefined;
  },
): Product[] {
  const filters = opts.filters ?? {};

  return products.filter((product) => {
    if (
      opts.categoryId &&
      product.category_id !== opts.categoryId
    ) {
      return false;
    }

    if (
      opts.local &&
      !product.is_local
    ) {
      return false;
    }

    if (
      typeof filters.minPrice === "number" &&
      product.price < filters.minPrice
    ) {
      return false;
    }

    if (
      typeof filters.maxPrice === "number" &&
      product.price > filters.maxPrice
    ) {
      return false;
    }

    if (
      typeof filters.minRating === "number" &&
      product.rating < filters.minRating
    ) {
      return false;
    }

    if (
      filters.city &&
      product.city !== filters.city
    ) {
      return false;
    }

    return true;
  });
}

export async function fetchProducts(
  opts: {
    categorySlug?: string | undefined;
    categoryId?: string | undefined;
    local?: boolean | undefined;
    sort?: SortKey | undefined;
    filters?: ProductFilters | undefined;
    limit?: number | undefined;
  },
): Promise<Product[]> {
  try {
    let query = supabase
      .from("products")
      .select(sel(PRODUCT_COLUMNS));

    if (opts.categoryId) {
      query = query.eq(
        "category_id",
        opts.categoryId,
      );
    }

    if (opts.local) {
      query = query.eq(
        "is_local",
        true,
      );
    }

    const filters = opts.filters ?? {};

    if (
      typeof filters.minPrice ===
      "number"
    ) {
      query = query.gte(
        "price",
        filters.minPrice,
      );
    }

    if (
      typeof filters.maxPrice ===
      "number"
    ) {
      query = query.lte(
        "price",
        filters.maxPrice,
      );
    }

    if (
      typeof filters.minRating ===
        "number" &&
      filters.minRating > 0
    ) {
      query = query.gte(
        "rating",
        filters.minRating,
      );
    }

    if (filters.city) {
      query = query.eq(
        "city",
        filters.city,
      );
    }

    if (
      opts.categorySlug
    ) {
      const category =
        await fetchCategoryBySlug(
          opts.categorySlug,
        );

      if (category) {
        query = query.eq(
          "category_id",
          category.id,
        );
      }
    }

    query = applySort(
      query,
      opts.sort ?? "best",
    );

    if (opts.limit) {
      query = query.limit(
        opts.limit,
      );
    }

    const { data, error } =
      await query.returns<Product[]>();

    if (error) {
      throw error;
    }

    const products =
      normalizeProducts(data ?? []);

    if (products.length > 0) {
      void offlinePutMany(
        "products",
        products,
      ).catch((error) => {
        console.warn(
          "[Offline] تعذر حفظ المنتجات محلياً.",
          error,
        );
      });
    }

    return products;
  } catch (error) {
    console.warn(
      "[Offline] استخدام نسخة المنتجات المحلية.",
      error,
    );

    let products =
      await offlineGetAll<Product>(
        "products",
      );

    products = normalizeProducts(
      products,
    );

    products = filterOfflineProducts(
      products,
      opts,
    );

    products = sortOfflineProducts(
      products,
      opts.sort ?? "best",
    );

    if (opts.limit) {
      products = products.slice(
        0,
        opts.limit,
      );
    }

    return products;
  }
}

export async function fetchProduct(
  id: string,
): Promise<Product | null> {
  try {
    const { data, error } =
      await supabase
        .from("products")
        .select(sel(PRODUCT_COLUMNS))
        .eq("id", id)
        .maybeSingle<Product>();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    const product =
      normalizeProduct(data);

    void offlinePutMany(
      "products",
      [product],
    ).catch((error) => {
      console.warn(
        "[Offline] تعذر حفظ المنتج محلياً.",
        error,
      );
    });

    return product;
  } catch (error) {
    console.warn(
      "[Offline] استخدام نسخة المنتج المحلية.",
      error,
    );

    const cached =
      await offlineGet<Product>(
        "products",
        id,
      );

    return cached
      ? normalizeProduct(cached)
      : null;
  }
}

export async function fetchProductsByIds(
  ids: string[],
): Promise<Product[]> {
  if (ids.length === 0) {
    return [];
  }

  try {
    const { data, error } =
      await supabase
        .from("products")
        .select(sel(PRODUCT_COLUMNS))
        .in("id", ids)
        .returns<Product[]>();

    if (error) {
      throw error;
    }

    const products =
      normalizeProducts(data ?? []);

    if (products.length > 0) {
      void offlinePutMany(
        "products",
        products,
      ).catch((error) => {
        console.warn(
          "[Offline] تعذر حفظ منتجات السلة محلياً.",
          error,
        );
      });
    }

    return products;
  } catch (error) {
    console.warn(
      "[Offline] استخدام المنتجات المحلية للسلة.",
      error,
    );

    const products =
      await Promise.all(
        ids.map((id) =>
          offlineGet<Product>(
            "products",
            id,
          ),
        ),
      );

    return products
      .filter(
        (
          product,
        ): product is Product =>
          product !== null,
      )
      .map(normalizeProduct);
  }
}

export async function fetchReviews(
  productId: string,
): Promise<Review[]> {
  const { data, error } =
    await supabase
      .from("reviews")
      .select(
        sel(
          "id,product_id,user_id,author_name,rating,comment,created_at",
        ),
      )
      .eq(
        "product_id",
        productId,
      )
      .order("created_at", {
        ascending: false,
      })
      .returns<Review[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchCities(): Promise<string[]> {
  try {
    const { data, error } =
      await supabase
        .from("products")
        .select(
          sel("city"),
        )
        .returns<{ city: string }[]>();

    if (error) {
      throw error;
    }

    return Array.from(
      new Set(
        (data ?? []).map(
          (row) => row.city,
        ),
      ),
    ).sort();
  } catch (error) {
    console.warn(
      "[Offline] استخدام المدن من المنتجات المحلية.",
      error,
    );

    const products =
      await offlineGetAll<Product>(
        "products",
      );

    return Array.from(
      new Set(
        products
          .map(
            (product) =>
              product.city,
          )
          .filter(Boolean),
      ),
    ).sort();
  }
}
