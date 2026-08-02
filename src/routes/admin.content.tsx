import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, Field, btnCls, btnGhostCls, inputCls } from "@/components/admin-ui";
import { RichTextEditor } from "@/components/rich-text-editor";
import { fetchFaqs, fetchPages, type Faq, type PageRow } from "@/lib/store";

export const Route = createFileRoute("/admin/content")({
  component: AdminContent,
});

const PAGE_LABELS: Record<string, string> = {
  about: "من نحن",
  contact: "تواصل معنا",
  returns: "سياسة الاستبدال والإرجاع",
};

function AdminContent() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [active, setActive] = useState<string>("about");

  const load = useCallback(async () => {
    const [p, f] = await Promise.all([fetchPages(), fetchFaqs()]);
    setPages(p);
    setFaqs(f);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = pages.find((p) => p.slug === active);

  function patchPage(slug: string, key: "title" | "content", value: string) {
    setPages((prev) => prev.map((p) => (p.slug === slug ? { ...p, [key]: value } : p)));
  }

  async function savePage(page: PageRow) {
    const { error } = await supabase
      .from("pages")
      .update({ title: page.title, content: page.content })
      .eq("id", page.id);
    if (error) toast.error("تعذّر الحفظ: " + error.message);
    else toast.success("تم حفظ الصفحة");
  }

  async function addFaq() {
    const { error } = await supabase
      .from("faqs")
      .insert({ question: "سؤال جديد", answer: "", sort_order: faqs.length + 1 });
    if (error) toast.error("تعذّر الإضافة");
    await load();
  }

  async function saveFaq(f: Faq) {
    const { error } = await supabase
      .from("faqs")
      .update({ question: f.question, answer: f.answer, sort_order: f.sort_order, is_active: f.is_active })
      .eq("id", f.id);
    if (error) toast.error("تعذّر الحفظ");
    else toast.success("تم حفظ السؤال");
  }

  async function removeFaq(id: string) {
    if (!window.confirm("حذف هذا السؤال؟")) return;
    await supabase.from("faqs").delete().eq("id", id);
    await load();
  }

  return (
    <div className="space-y-4">
      <AdminCard title="الصفحات">
        <div className="mb-3 flex flex-wrap gap-2">
          {Object.entries(PAGE_LABELS).map(([slug, label]) => (
            <button
              key={slug}
              type="button"
              onClick={() => setActive(slug)}
              className={`rounded-full border px-3 py-1.5 text-[11px] ${
                active === slug ? "border-primary bg-brand-soft text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {current ? (
          <div className="space-y-3">
            <Field label="عنوان الصفحة">
              <input
                className={inputCls}
                value={current.title}
                maxLength={150}
                onChange={(e) => patchPage(current.slug, "title", e.target.value)}
              />
            </Field>
            <RichTextEditor
              value={current.content}
              onChange={(html) => patchPage(current.slug, "content", html)}
            />
            <button type="button" className={btnCls} onClick={() => savePage(current)}>
              حفظ الصفحة
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">جارٍ التحميل...</p>
        )}
      </AdminCard>

      <AdminCard
        title="الأسئلة الشائعة"
        action={
          <button type="button" className={btnCls} onClick={addFaq}>
            <Plus className="h-4 w-4" /> سؤال جديد
          </button>
        }
      >
        <ul className="space-y-3">
          {faqs.map((f) => (
            <li key={f.id} className="space-y-2 rounded-xl border border-border/70 p-3">
              <input
                className={inputCls}
                value={f.question}
                maxLength={250}
                aria-label="السؤال"
                onChange={(e) =>
                  setFaqs((prev) => prev.map((x) => (x.id === f.id ? { ...x, question: e.target.value } : x)))
                }
              />
              <textarea
                className="min-h-20 w-full rounded-xl border border-border bg-secondary p-3 text-sm outline-none focus:border-primary"
                value={f.answer}
                maxLength={1500}
                aria-label="الجواب"
                onChange={(e) =>
                  setFaqs((prev) => prev.map((x) => (x.id === f.id ? { ...x, answer: e.target.value } : x)))
                }
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={f.is_active}
                    onChange={(e) =>
                      setFaqs((prev) =>
                        prev.map((x) => (x.id === f.id ? { ...x, is_active: e.target.checked } : x)),
                      )
                    }
                  />
                  ظاهر
                </label>
                <button type="button" className={btnCls} onClick={() => saveFaq(f)}>
                  حفظ
                </button>
                <button
                  type="button"
                  aria-label="حذف السؤال"
                  onClick={() => removeFaq(f.id)}
                  className={`${btnGhostCls} border-destructive/40 text-destructive`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </AdminCard>
    </div>
  );
}
