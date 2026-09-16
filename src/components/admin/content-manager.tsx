import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  BookOpen,
  CheckCircle2,
  Edit3,
  FileText,
  HelpCircle,
  MessageCircle,
  PackageCheck,
  Plus,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AdminCard,
  Field,
  btnCls,
  btnGhostCls,
  inputCls,
} from "@/components/admin-ui";

import { RichTextEditor } from "@/components/rich-text-editor";

import {
  fetchFaqs,
  fetchPages,
  type Faq,
  type PageRow,
} from "@/lib/store";

import { supabase } from "@/integrations/supabase/client";

type PageDefinition = {
  slug: string;
  title: string;
  description: string;
  icon: typeof FileText;
  defaultContent: string;
};

const PAGE_DEFINITIONS: PageDefinition[] = [
  {
    slug: "about",
    title: "من نحن",
    description:
      "تعريف شهارة ورؤيتها وخدماتها.",
    icon: BookOpen,
    defaultContent:
      "<h2>من نحن</h2><p>شهارة للتسوق منصة يمنية للتجارة الإلكترونية تجمع المنتجات والخدمات في مكان واحد.</p>",
  },
  {
    slug: "contact",
    title: "تواصل معنا",
    description:
      "بيانات التواصل وخدمة العملاء.",
    icon: MessageCircle,
    defaultContent:
      "<h2>تواصل معنا</h2><p>يسعدنا استقبال استفساراتكم وملاحظاتكم عبر قنوات التواصل الرسمية.</p>",
  },
  {
    slug: "returns",
    title:
      "سياسة الاستبدال والاسترجاع",
    description:
      "شروط الاستبدال والاسترجاع.",
    icon: RotateCcw,
    defaultContent:
      "<h2>سياسة الاستبدال والاسترجاع</h2><p>توضح هذه الصفحة شروط ومدة الاستبدال والاسترجاع للمنتجات.</p>",
  },
  {
    slug: "privacy",
    title: "سياسة الخصوصية",
    description:
      "كيفية حماية واستخدام بيانات العملاء.",
    icon: ShieldCheck,
    defaultContent:
      "<h2>سياسة الخصوصية</h2><p>نلتزم بحماية بيانات المستخدمين وعدم استخدامها إلا للأغراض المرتبطة بتقديم خدمات شهارة.</p>",
  },
  {
    slug: "delivery",
    title: "التوصيل",
    description:
      "معلومات وخيارات التوصيل.",
    icon: PackageCheck,
    defaultContent:
      "<h2>التوصيل</h2><p>نوفر خدمات توصيل داخل صنعاء وإلى المحافظات اليمنية وفق الرسوم والمدة المحددة لكل منطقة.</p>",
  },
  {
    slug: "terms",
    title: "شروط الاستخدام",
    description:
      "القواعد والشروط المنظمة لاستخدام المنصة.",
    icon: FileText,
    defaultContent:
      "<h2>شروط الاستخدام</h2><p>باستخدام منصة شهارة يوافق المستخدم على الالتزام بالأنظمة والشروط والسياسات المنشورة.</p>",
  },
];

export function ContentManager() {
  const [
    pages,
    setPages,
  ] = useState<PageRow[]>([]);

  const [
    faqs,
    setFaqs,
  ] = useState<Faq[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    editingPage,
    setEditingPage,
  ] =
    useState<PageRow | null>(
      null,
    );

  const [
    faqOpen,
    setFaqOpen,
  ] = useState(false);

  const [
    savingPage,
    setSavingPage,
  ] = useState(false);

  const [
    savingFaq,
    setSavingFaq,
  ] = useState<string | null>(
    null,
  );

  const load =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const [
            loadedPages,
            loadedFaqs,
          ] = await Promise.all([
            fetchPages(),
            fetchFaqs(),
          ]);

          setPages(
            loadedPages,
          );

          setFaqs(
            loadedFaqs,
          );
        } catch (error) {
          console.error(
            "[ContentManager] load:",
            error,
          );

          toast.error(
            "تعذر تحميل المحتوى.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void load();
  }, [load]);

  async function ensurePage(
    definition: PageDefinition,
  ) {
    const existing =
      pages.find(
        (page) =>
          page.slug ===
          definition.slug,
      );

    if (existing) {
      setEditingPage(
        existing,
      );
      return;
    }

    try {
      const {
        data,
        error,
      } = await supabase
        .from("pages")
        .upsert(
          {
            slug:
              definition.slug,
            title:
              definition.title,
            content:
              definition.defaultContent,
            is_published:
              true,
          },
          {
            onConflict:
              "slug",
          },
        )
        .select(
          "id,slug,title,content,is_published,updated_at",
        )
        .single<PageRow>();

      if (error) {
        throw error;
      }

      setPages((current) => [
        ...current,
        data,
      ]);

      setEditingPage(data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر إنشاء الصفحة.",
      );
    }
  }

  async function savePage() {
    if (!editingPage) {
      return;
    }

    if (
      !editingPage.title.trim()
    ) {
      toast.error(
        "عنوان الصفحة مطلوب.",
      );
      return;
    }

    setSavingPage(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("pages")
        .update({
          title:
            editingPage.title.trim(),
          content:
            editingPage.content,
          is_published:
            editingPage.is_published,
        })
        .eq(
          "id",
          editingPage.id,
        )
        .select(
          "id,slug,title,content,is_published,updated_at",
        )
        .single<PageRow>();

      if (error) {
        throw error;
      }

      setPages((current) =>
        current.map(
          (page) =>
            page.id === data.id
              ? data
              : page,
        ),
      );

      setEditingPage(
        data,
      );

      toast.success(
        "تم حفظ الصفحة بنجاح.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حفظ الصفحة.",
      );
    } finally {
      setSavingPage(false);
    }
  }

  function updateFaq(
    id: string,
    patch: Partial<Faq>,
  ) {
    setFaqs((current) =>
      current.map(
        (faq) =>
          faq.id === id
            ? {
                ...faq,
                ...patch,
              }
            : faq,
      ),
    );
  }

  async function saveFaq(
    faq: Faq,
  ) {
    setSavingFaq(faq.id);

    try {
      const {
        error,
      } = await supabase
        .from("faqs")
        .update({
          question:
            faq.question.trim(),
          answer:
            faq.answer,
          sort_order:
            faq.sort_order,
          is_active:
            faq.is_active,
        })
        .eq(
          "id",
          faq.id,
        );

      if (error) {
        throw error;
      }

      toast.success(
        "تم حفظ السؤال.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر حفظ السؤال.",
      );
    } finally {
      setSavingFaq(null);
    }
  }

  async function addFaq() {
    try {
      const {
        data,
        error,
      } = await supabase
        .from("faqs")
        .insert({
          question:
            "سؤال جديد",
          answer:
            "اكتب إجابة السؤال هنا.",
          sort_order:
            faqs.length + 1,
          is_active:
            true,
        })
        .select(
          "id,question,answer,sort_order,is_active",
        )
        .single<Faq>();

      if (error) {
        throw error;
      }

      setFaqs((current) => [
        ...current,
        data,
      ]);

      toast.success(
        "تمت إضافة سؤال جديد.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر إضافة السؤال.",
      );
    }
  }

  async function removeFaq(
    id: string,
  ) {
    if (
      !window.confirm(
        "هل تريد حذف هذا السؤال؟",
      )
    ) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("faqs")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(
        error.message,
      );
      return;
    }

    setFaqs((current) =>
      current.filter(
        (faq) =>
          faq.id !== id,
      ),
    );

    toast.success(
      "تم حذف السؤال.",
    );
  }

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({
          length: 7,
        }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <AdminCard title="إدارة صفحات المتجر">
          <p className="mb-4 text-xs leading-6 text-muted-foreground">
            اختر الصفحة التي تريد تعديلها. سيتم فتح محرر المحتوى في نافذة مستقلة دون مغادرة لوحة التحكم.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PAGE_DEFINITIONS.map(
              (
                definition,
              ) => {
                const page =
                  pages.find(
                    (item) =>
                      item.slug ===
                      definition.slug,
                  );

                const Icon =
                  definition.icon;

                return (
                  <button
                    key={
                      definition.slug
                    }
                    type="button"
                    onClick={() =>
                      void ensurePage(
                        definition,
                      )
                    }
                    className="group rounded-2xl border border-border/70 bg-card p-4 text-right transition-all hover:border-primary/50 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>

                      <Edit3 className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>

                    <h3 className="mt-4 text-sm font-black">
                      {
                        definition.title
                      }
                    </h3>

                    <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                      {
                        definition.description
                      }
                    </p>

                    <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-primary">
                      <CheckCircle2 className="h-3 w-3" />

                      {page
                        ?.is_published
                        ? "منشورة"
                        : "غير منشورة"}
                    </div>
                  </button>
                );
              },
            )}

            <button
              type="button"
              onClick={() =>
                setFaqOpen(true)
              }
              className="rounded-2xl border border-border/70 bg-card p-4 text-right transition-all hover:border-primary/50 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <HelpCircle className="h-5 w-5" />
                </span>

                <Edit3 className="h-4 w-4 text-muted-foreground" />
              </div>

              <h3 className="mt-4 text-sm font-black">
                الأسئلة الشائعة
              </h3>

              <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                إدارة الأسئلة والأجوبة وترتيبها وحالة ظهورها.
              </p>

              <div className="mt-3 text-[9px] font-bold text-primary">
                {faqs.length.toLocaleString(
                  "ar-EG",
                )}{" "}
                سؤال
              </div>
            </button>
          </div>
        </AdminCard>
      </div>

      <Dialog
        open={Boolean(
          editingPage,
        )}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPage(
              null,
            );
          }
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"
        >
          <DialogHeader>
            <DialogTitle>
              {editingPage?.title ||
                "تحرير الصفحة"}
            </DialogTitle>

            <DialogDescription>
              تعديل محتوى الصفحة ونشرها مباشرة في المتجر.
            </DialogDescription>
          </DialogHeader>

          {editingPage ? (
            <div className="space-y-4">
              <Field label="عنوان الصفحة">
                <input
                  className={inputCls}
                  value={
                    editingPage.title
                  }
                  maxLength={150}
                  onChange={(event) =>
                    setEditingPage(
                      {
                        ...editingPage,
                        title:
                          event
                            .target
                            .value,
                      },
                    )
                  }
                />
              </Field>

              <RichTextEditor
                value={
                  editingPage.content
                }
                onChange={(
                  content,
                ) =>
                  setEditingPage(
                    {
                      ...editingPage,
                      content,
                    },
                  )
                }
              />

              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={
                    editingPage.is_published
                  }
                  onChange={(
                    event,
                  ) =>
                    setEditingPage(
                      {
                        ...editingPage,
                        is_published:
                          event
                            .target
                            .checked,
                      },
                    )
                  }
                />
                نشر الصفحة
              </label>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <button
              type="button"
              className={btnGhostCls}
              onClick={() =>
                setEditingPage(
                  null,
                )
              }
            >
              إلغاء
            </button>

            <button
              type="button"
              className={btnCls}
              disabled={
                savingPage
              }
              onClick={() =>
                void savePage()
              }
            >
              {savingPage
                ? "جارٍ الحفظ..."
                : "حفظ الصفحة"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={faqOpen}
        onOpenChange={
          setFaqOpen
        }
      >
        <DialogContent
          dir="rtl"
          className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"
        >
          <DialogHeader>
            <DialogTitle>
              الأسئلة الشائعة
            </DialogTitle>

            <DialogDescription>
              إضافة وتعديل وحذف الأسئلة والأجوبة الظاهرة للعملاء.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {faqs.map(
              (faq, index) => (
                <div
                  key={faq.id}
                  className="rounded-2xl border border-border/70 bg-secondary/20 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-primary">
                      السؤال #
                      {(
                        index + 1
                      ).toLocaleString(
                        "ar-EG",
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        void removeFaq(
                          faq.id,
                        )
                      }
                      className="text-[10px] font-bold text-destructive"
                    >
                      حذف
                    </button>
                  </div>

                  <div className="space-y-3">
                    <Field label="السؤال">
                      <input
                        className={inputCls}
                        value={
                          faq.question
                        }
                        maxLength={
                          250
                        }
                        onChange={(
                          event,
                        ) =>
                          updateFaq(
                            faq.id,
                            {
                              question:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                      />
                    </Field>

                    <Field label="الإجابة">
                      <textarea
                        className="min-h-28 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                        value={
                          faq.answer
                        }
                        maxLength={
                          5000
                        }
                        onChange={(
                          event,
                        ) =>
                          updateFaq(
                            faq.id,
                            {
                              answer:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                      />
                    </Field>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={
                            faq.is_active
                          }
                          onChange={(
                            event,
                          ) =>
                            updateFaq(
                              faq.id,
                              {
                                is_active:
                                  event
                                    .target
                                    .checked,
                              },
                            )
                          }
                        />
                        ظاهر للعملاء
                      </label>

                      <input
                        type="number"
                        min={0}
                        className="h-9 w-24 rounded-xl border border-border bg-background px-2 text-xs"
                        value={
                          faq.sort_order
                        }
                        onChange={(
                          event,
                        ) =>
                          updateFaq(
                            faq.id,
                            {
                              sort_order:
                                Number(
                                  event
                                    .target
                                    .value,
                                ),
                            },
                          )
                        }
                      />

                      <button
                        type="button"
                        className={btnCls}
                        disabled={
                          savingFaq ===
                          faq.id
                        }
                        onClick={() =>
                          void saveFaq(
                            faq,
                          )
                        }
                      >
                        {savingFaq ===
                        faq.id
                          ? "جارٍ الحفظ..."
                          : "حفظ السؤال"}
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )}

            {faqs.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                لا توجد أسئلة حالياً.
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <button
              type="button"
              className={btnCls}
              onClick={() =>
                void addFaq()
              }
            >
              <Plus className="h-4 w-4" />
              إضافة سؤال
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
