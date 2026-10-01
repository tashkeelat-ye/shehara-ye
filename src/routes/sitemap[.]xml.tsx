import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://www.shehara.store";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const urls: { loc: string; freq: string; pri: string }[] = [
          { loc: "/", freq: "daily", pri: "1.0" },
          { loc: "/products", freq: "daily", pri: "0.9" },
          { loc: "/offers", freq: "daily", pri: "0.9" },
          { loc: "/faq", freq: "monthly", pri: "0.5" },
        ];
        const [p, c, v, pg] = await Promise.all([
          sb.from("products").select("id").eq("is_active", true).limit(5000),
          sb.from("categories").select("slug"),
          sb.from("vendors").select("id").eq("is_active", true),
          sb.from("pages").select("slug").eq("is_published", true),
        ]);
        c.data?.forEach((r) => urls.push({ loc: `/category/${r.slug}`, freq: "daily", pri: "0.8" }));
        v.data?.forEach((r) => urls.push({ loc: `/vendor/${r.id}`, freq: "weekly", pri: "0.7" }));
        p.data?.forEach((r) => urls.push({ loc: `/product/${r.id}`, freq: "weekly", pri: "0.8" }));
        pg.data?.forEach((r) => urls.push({ loc: `/page/${r.slug}`, freq: "monthly", pri: "0.4" }));
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((u) => `<url><loc>${SITE}${encodeURI(u.loc)}</loc><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`)
          .join("\n")}\n</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
