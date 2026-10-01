import type { SeoData } from "./seo.functions";

const SITE = "https://www.shehara.store";

export function buildHead(opts: {
  path: string;
  title: string;
  description: string;
  image?: string | null;
  type?: string;
  jsonLd?: Record<string, unknown>[];
}) {
  const url = `${SITE}${opts.path}`;
  const meta: Record<string, string>[] = [
    { title: opts.title },
    { name: "description", content: opts.description },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:type", content: opts.type ?? "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: "شهارة | SHEHARA" },
    { property: "og:locale", content: "ar_YE" },
    { name: "twitter:card", content: opts.image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
  ];
  if (opts.image) {
    meta.push({ property: "og:image", content: opts.image }, { name: "twitter:image", content: opts.image });
  }
  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts: (opts.jsonLd ?? []).map((j) => ({
      type: "application/ld+json",
      children: JSON.stringify({ "@context": "https://schema.org", ...j }),
    })),
  };
}

export function breadcrumb(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

export function productLd(id: string, d: SeoData) {
  return {
    "@type": "Product",
    name: d.title,
    description: d.description,
    ...(d.image ? { image: [d.image] } : {}),
    url: `${SITE}/product/${id}`,
    brand: { "@type": "Brand", name: "شهارة" },
    offers: {
      "@type": "Offer",
      priceCurrency: "YER",
      price: d.price ?? 0,
      availability: d.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE}/product/${id}`,
    },
    ...(d.reviews && d.rating
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: d.rating, reviewCount: d.reviews } }
      : {}),
  };
}
