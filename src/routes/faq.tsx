import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { fetchFaqs } from "@/lib/store";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة | شهارة" },
      {
        name: "description",
        content: "أجوبة أسئلة عملاء شهارة حول الشراء والدفع والتوصيل والإرجاع في اليمن.",
      },
      { property: "og:title", content: "الأسئلة الشائعة | شهارة" },
      { property: "og:description", content: "كل ما تريد معرفته عن التسوق من متجر شهارة." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ["faqs"], queryFn: fetchFaqs });
  const [openId, setOpenId] = useState<string | null>(null);
  const items = data.filter((f) => f.is_active);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl text-foreground">الأسئلة الشائعة</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          إن لم تجد إجابتك، تواصل معنا وسنسعد بخدمتك.
        </p>

        {isLoading ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">لا توجد أسئلة منشورة حاليًا.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map((f) => {
              const open = openId === f.id;
              return (
                <li key={f.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : f.id)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start"
                  >
                    <span className="text-sm text-foreground">{f.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-primary transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open ? (
                    <p className="border-t border-border/70 px-4 py-3 text-xs leading-7 text-muted-foreground">
                      {f.answer}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
