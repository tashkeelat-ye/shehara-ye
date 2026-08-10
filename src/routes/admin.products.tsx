import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, X, Upload, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, Field, btnCls, btnGhostCls, inputCls } from "@/components/admin-ui";
import { uploadManyMedia } from "@/lib/media";
import type { Category, Product } from "@/lib/db";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

const emptyProduct = {
  name: "",
  slug: "",
  category_slug: "",
  price: 0,
  original_price: 0,
  badge: "",
  origin: "",
  description: "",
  images: [] as string[],
  is_active: true,
  is_yemeni_local: false,
  sizes: "",
  colors: "",
  sort_order: 0,
};

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<(typeof emptyProduct & { id?: string }) | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    // جلب المنتجات دون اشتراط وجود sort_order لتجنب فشل الاستعلام
    const [pRes, cRes] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*"),
    ]);

    if (pRes.error) {
      console.error("خطأ في جلب المنتجات:", pRes.error);
      setFetchError(pRes.error.message);
    } else {
      setProducts((pRes.data as Product[]) ?? []);
    }

    if (cRes.data) {
      setCategories((cRes.data as Category[]) ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0 || !editing) return;
    setUploading(true);
    const { urls, errors } = await uploadManyMedia("products", Array.from(files));
    setUploading(false);

    if (urls.length > 0) {
      setEditing((prev) => (prev ? { ...prev, images: [...prev.images, ...urls] } : prev));
      toast.success(`تم رفع ${urls.length} صورة`);
    }
    if (errors.length > 0) {
      toast.error("تعذّر رفع بعض الصور: " + errors.join(" | "));
    }
  }

  function removeImage(index: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      images: editing.images.filter((_, i) => i !== index),
    });
  }

  async function save() {
    if (!editing?.name) {
      toast.error("يرجى إدخال اسم المنتج");
      return;
    }

    const generatedSlug = editing.slug || editing.name.toLowerCase().trim().replace(/\s+/g, "-");
    const payload = {
      name: editing.name,
      slug: generatedSlug,
      category_slug: editing.category_slug || (categories[0]?.slug ?? ""),
      price: Number(editing.price) || 0,
      original_price: editing.original_price ? Number(editing.original_price) : null,
      badge: editing.badge || null,
      origin: editing.origin || null,
      description: editing.description || null,
      images: editing.images,
      is_active: editing.is_active,
      is_yemeni_local: editing.is_yemeni_local,
      sizes: editing.sizes ? editing.sizes.split(",").map((s) => s.trim()) : [],
      colors: editing.colors ? editing.colors.split(",").map((c) => c.trim()) : [],
      sort_order: Number(editing.sort_order) || 0,
    };

    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);

    if (error) {
      toast.error("تعذّر حفظ المنتج: " + error.message);
      return;
    }

    toast.success("تم حفظ المنتج بنجاح");
    setEditing(null);
    await load();
  }

  async function remove(p: Product) {
    if (!window.confirm(`حذف المنتج "${p.name}"؟`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error("تعذّر الحذف: " + error.message);
    else toast.success("تم الحذف بنجاح");
    await load();
  }

  async function toggleActive(p: Product) {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);

    if (error) toast.error("تعذّر تغيير الحالة");
    else await load();
  }

  return (
    <div className="space-y-4">
      <AdminCard
        title={`المنتجات (${products.length})`}
        action={
          <button
            type="button"
            className={btnCls}
            onClick={() => setEditing({ ...emptyProduct, category_slug: categories[0]?.slug ?? "" })}
          >
            <Plus className="h-4 w-4" /> منتج جديد
          </button>
        }
      >
        {loading ? (
          <p className="p-4 text-center text-xs text-muted-foreground animate-pulse">جارٍ تحميل المنتجات...</p>
        ) : fetchError ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center text-destructive">
            <AlertCircle className="h-6 w-6" />
            <p className="text-xs font-semibold">تعذر جلب المنتجات: {fetchError}</p>
          </div>
        ) : products.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">لا توجد منتجات حالياً.</p>
        ) : (
          <ul className="space-y-2">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-2xl border border-border/70 p-2 text-xs bg-card"
              >
                <img
                  src={p.images?.[0] || "/placeholder.svg"}
                  alt={p.name}
                  className="h-12 w-12 rounded-xl object-cover bg-secondary shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {p.price.toLocaleString()} ر.ي
                  </p>
                </div>
                <button
                  type="button"
                  className={btnGhostCls}
                  onClick={() => void toggleActive(p)}
                >
                  {p.is_active ? "تعطيل" : "تفعيل"}
                </button>
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-secondary text-foreground"
                  onClick={() =>
                    setEditing({
                      ...p,
                      sizes: Array.isArray(p.sizes) ? p.sizes.join(", ") : "",
                      colors: Array.isArray(p.colors) ? p.colors.join(", ") : "",
                      badge: p.badge ?? "",
                      origin: p.origin ?? "",
                      description: p.description ?? "",
                      original_price: p.original_price ?? 0,
                    })
                  }
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="حذف"
                  onClick={() => void remove(p)}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-destructive/30 text-destructive bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      {/* النافذة المنبثقة (Modal) لإضافة/تعديل المنتج على كامل الشاشة */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-border bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">
                {editing.id ? "تعديل منتج" : "إضافة منتج جديد"}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="اسم المنتج">
                <input
                  className={inputCls}
                  value={editing.name}
                  maxLength={120}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>

              <Field label="الفئة">
                <select
                  className={inputCls}
                  value={editing.category_slug}
                  onChange={(e) => setEditing({ ...editing, category_slug: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="السعر الحالي (ر.ي)">
                  <input
                    type="number"
                    className={inputCls}
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                  />
                </Field>
                <Field label="السعر قبل الخصم (اختياري)">
                  <input
                    type="number"
                    className={inputCls}
                    value={editing.original_price || ""}
                    onChange={(e) => setEditing({ ...editing, original_price: Number(e.target.value) })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="بلد الصنع / المنسوب">
                  <input
                    className={inputCls}
                    placeholder="مثال: صنعاء"
                    value={editing.origin}
                    onChange={(e) => setEditing({ ...editing, origin: e.target.value })}
                  />
                </Field>
                <Field label="شارة علوية (اختياري)">
                  <input
                    className={inputCls}
                    placeholder="مثال: الأكثر مبيعاً"
                    value={editing.badge}
                    onChange={(e) => setEditing({ ...editing, badge: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="المقاسات (مفصولة بفاصلة)">
                <input
                  className={inputCls}
                  placeholder="S, M, L, XL"
                  value={editing.sizes}
                  onChange={(e) => setEditing({ ...editing, sizes: e.target.value })}
                />
              </Field>

              <Field label="الألوان (مفصولة بفاصلة)">
                <input
                  className={inputCls}
                  placeholder="أسود, أبيض, أحمر"
                  value={editing.colors}
                  onChange={(e) => setEditing({ ...editing, colors: e.target.value })}
                />
              </Field>

              <Field label="الوصف">
                <textarea
                  rows={3}
                  className={`${inputCls} h-auto py-2`}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>

              {/* رفع صور المنتج */}
              <Field label="صور المنتج">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {editing.images.map((img, idx) => (
                      <div key={idx} className="relative h-16 w-16 rounded-xl border border-border overflow-hidden bg-secondary">
                        <img src={img} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 left-1 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground hover:border-primary">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Upload className="h-4 w-4 text-primary" />
                    )}
                    <span>{uploading ? "جارٍ الرفع..." : "تحميل صور من الجهاز"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploading}
                      className="hidden"
                      onChange={(e) => void handleImageUpload(e.target.files)}
                    />
                  </label>
                </div>
              </Field>

              <div className="flex items-center gap-4 py-2">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_yemeni_local}
                    onChange={(e) => setEditing({ ...editing, is_yemeni_local: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span>منتج يمني محلي</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span>مُفعّل</span>
                </label>
              </div>
            </div>

            <div className="pt-3 flex gap-2 border-t border-border">
              <button type="button" className={`${btnCls} flex-1 justify-center`} onClick={() => void save()}>
                حفظ المنتج
              </button>
              <button type="button" className={`${btnGhostCls} flex-1 justify-center`} onClick={() => setEditing(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
                }
                            
