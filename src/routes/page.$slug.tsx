import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { fetchPage } from "@/lib/store";

export const Route = createFileRoute("/page/$slug")({
  head: () => ({
    meta: [
      { title: "صفحات المتجر | شهارة" },
      {
        name: "description",
        content: "معلومات متجر شهارة: من نحن، التواصل، سياسات الإرجاع والخصوصية والتوصيل.",
      },
      { property: "og:title", content: "صفحات المتجر | شهارة" },
      { property: "og:description", content: "سياسات ومعلومات متجر شهارة اليمني." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaticPage,
});

function StaticPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: () => fetchPage(slug),
  });

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-7 w-1/2 animate-pulse rounded-xl bg-muted" />
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          </div>
        ) : !data || !data.is_published ? (
          <div className="rounded-2xl border border-border/70 bg-card p-8 text-center">
            <h1 className="text-lg text-foreground">الصفحة غير متوفرة</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              لم يتم نشر هذه الصفحة بعد. يمكنك العودة للرئيسية ومتابعة التسوق.
            </p>
            <Link
              to="/"
              className="mt-4 inline-flex h-11 items-center rounded-2xl bg-primary px-4 text-sm text-primary-foreground"
            >
              العودة للرئيسية
            </Link>
          </div>
        ) : (
          <article className="rounded-2xl border border-border/70 bg-card p-5">
            <h1 className="text-xl text-foreground">{data.title}</h1>
            <div
              className="prose-shehara mt-4 space-y-3 text-sm leading-8 text-muted-foreground [&_a]:text-primary [&_h2]:text-base [&_h2]:text-foreground [&_h3]:text-sm [&_h3]:text-foreground [&_li]:ms-5 [&_li]:list-disc [&_strong]:text-foreground"
              // المحتوى يُدار من لوحة التحكم فقط
              dangerouslySetInnerHTML={{ __html: data.content }}
            />
          </article>
        )}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
