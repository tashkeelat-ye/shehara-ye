import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

export const SITE_URL = "https://www.shehara.store";

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function originOf() {
  try {
    const req = getRequest();
    const url = new URL(req.url);
    if (url.hostname === "localhost") return SITE_URL;
    return url.origin;
  } catch {
    return SITE_URL;
  }
}

function absolute(origin: string, img?: string | null) {
  if (!img) return null;
  if (img.startsWith("http")) return img;
  return `${origin}${img.startsWith("/") ? "" : "/"}${img}`;
}

export type SeoData = {
  origin: string;
  title: string;
  description: string;
  image: string | null;
  price?: number;
  inStock?: boolean;
  rating?: number;
  reviews?: number;
};

const idSchema = z.object({ id: z.string().min(1).max(200) });

export const getProductSeo = createServerFn({ method: "GET" })
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data }): Promise<SeoData | null> => {
    try {
      const sb = await publicClient();
      const { data: p } = await sb
        .from("products")
        .select("name,description,price,discount_price,images,stock_left,rating,reviews_count")
        .eq("id", data.id)
        .maybeSingle();
      if (!p) return null;
      const origin = originOf();
      const desc = String(p.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return {
        origin,
        title: p.name,
        description: (desc || `اشترِ ${p.name} من متجر شهارة بأفضل سعر في اليمن.`).slice(0, 158),
        image: absolute(origin, (p.images as string[] | null)?.[0]),
        price: Number(p.discount_price ?? p.price),
        inStock: Number(p.stock_left ?? 1) > 0,
        rating: Number(p.rating ?? 0),
        reviews: Number(p.reviews_count ?? 0),
      };
    } catch {
      return null;
    }
  });

export const getCategorySeo = createServerFn({ method: "GET" })
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data }): Promise<SeoData | null> => {
    try {
      const sb = await publicClient();
      const { data: c } = await sb.from("categories").select("name,image_url").eq("slug", data.id).maybeSingle();
      if (!c) return null;
      const origin = originOf();
      return {
        origin,
        title: c.name,
        description: `تسوق منتجات ${c.name} في متجر شهارة — أسعار مميزة وتوصيل لجميع محافظات اليمن.`,
        image: absolute(origin, c.image_url),
      };
    } catch {
      return null;
    }
  });

export const getVendorSeo = createServerFn({ method: "GET" })
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data }): Promise<SeoData | null> => {
    try {
      const sb = await publicClient();
      const { data: v } = await sb
        .from("vendors")
        .select("name,city,description,logo_url,cover_image_url")
        .eq("id", data.id)
        .maybeSingle();
      if (!v) return null;
      const origin = originOf();
      return {
        origin,
        title: v.name,
        description: (v.description || `تصفح منتجات متجر ${v.name} في ${v.city} عبر شهارة.`).slice(0, 158),
        image: absolute(origin, v.cover_image_url || v.logo_url),
      };
    } catch {
      return null;
    }
  });
