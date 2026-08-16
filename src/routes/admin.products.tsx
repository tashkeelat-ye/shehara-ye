import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, X, Upload, Loader2, AlertCircle, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, Field, btnCls, inputCls } from "@/components/admin-ui";
import { uploadManyMedia } from "@/lib/media";
import { fetchSettings } from "@/lib/store";
import { DEFAULT_SAR_RATE } from "@/lib/money";
import type { Category, Product } from "@/lib/db";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

const PRESET_SIZES = ["S", "M", "L", "XL", "2XL", "قطعة", "ملي", "لتر", "100 جم", "نصف كيلو", "1 كيلو"];
const PRESET_COLORS = ["وردي", "أسود", "أبيض", "أحمر", "أزرق", "كحلي", "بيج", "رمادي", "ذهبي"];
// ملاحظة: كان هذا الرقم ثابتًا (420) ومنفصلاً تمامًا عن سعر الصرف الحقيقي
// المخزَّن في site_settings.sar_rate (والمستخدم في كل مكان آخر بالمتجر).
// النتيجة كانت أسعارًا سعودية غير متطابقة بين لوحة التحكم والمتجر الفعلي.
// الآن يُجلب السعر الحيّ من الإعدادات ويُستخدم كمصدر وحيد للتحويل.

type ExtendedProduct = Product & {
  price_sar?: number | null;
  unit?: string | null;
  category_attributes?: Record<string, unknown> | null;
  supplier_info?: Record<string, unknown> | null;
};

const emptyProductForm = {
  id: undefined as string | undefined,
  name: "",
  slug: "",
  category_slug: "",
  price: 0,
  original_price: 0,
  price_sar: 0,
  badge: "",
  origin: "",
  description: "",
  images: [] as string[],
  is_active: true,
  is_yemeni_local: false,
  sizes: [] as string[],
  colors: [] as string[],
  unit: "قطعة",
  sort_order: 0,
  category_attributes: {
    production_date: "",
    expiry_date: "",
    unit_capacity: "",
    warranty_period: "",
  },
  supplier_info: {
    supplier_name: "",
    supplier_phone: "",
    supplier_product_url: "",
    cost_price: 0,
    shipping_fee: 0,
    delivery_duration: "",
  },
};

export function AdminProducts() {
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<typeof emptyProductForm | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "attributes" | "supplier">("basic");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sarRate, setSarRate] = useState(DEFAULT_SAR_RATE);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const [pRes, cRes, settings] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*"),
        fetchSettings().catch(() => null),
      ]);

      if (pRes.error) {
        setFetchError(pRes.error.message);
      } else {
        setProducts((pRes.data as unknown as ExtendedProduct[]) ?? []);
      }

      if (cRes.data) {
        setCategories((cRes.data as Category[]) ?? []);
      }

      if (settings?.sar_rate && settings.sar_rate > 0) {
        setSarRate(settings.sar_rate);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء تحميل البيانات";
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
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

  function togglePresetSize(size: string) {
    if (!editing) return;
    const exists = editing.sizes.includes(size);
    const updated = exists ? editing.sizes.filter((s) => s !== size) : [...editing.sizes, size];
    setEditing({ ...editing, sizes: updated });
  }

  function togglePresetColor(color: string) {
    if (!editing) return;
    const exists = editing.colors.includes(color);
    const updated = exists ? editing.colors.filter((c) => c !== color) : [...editing.colors, color];
    setEditing({ ...editing, colors: updated });
  }

  function handleYerPriceChange(yerPrice: number) {
    if (!editing) return;
    const sarCalculated = Math.round((yerPrice / sarRate) * 100) / 100;
    setEditing({ ...editing, price: yerPrice, price_sar: sarCalculated });
  }

  function handleSarPriceChange(sarPrice: number) {
    if (!editing) return;
    const yerCalculated = Math.round(sarPrice * sarRate);
    setEditing({ ...editing, price_sar: sarPrice, price: yerCalculated });
  }

  // --- دالة الحفظ المرنة والجذرية ---
  async function save() {
    if (!editing?.name) {
      toast.error("يرجى إدخال اسم المنتج");
      return;
    }

    const generatedSlug = editing.slug || editing.name.toLowerCase().trim().replace(/\s+/g, "-");

    // نرسل البيانات الأساسية الآمنة لضمان عدم رفضها من Schema Cache
    const payload: Record<string, unknown> = {
      name: editing.name,
      slug: generatedSlug,
      price: Number(editing.price) || 0,
      images: editing.images || [],
      is_active: editing.is_active ?? true,
    };

    // إضافة الحقول التكميلية فقط عند توفر قيم لها
    if (editing.category_slug) payload.category_slug = editing.category_slug;
    if (editing.description) payload.description = editing.description;
    if (editing.sizes?.length) payload.sizes = editing.sizes;
    if (editing.colors?.length) payload.colors = editing.colors;
    if (editing.unit) payload.unit = editing.unit;

    const { error } = editing.id
      ? await supabase.from("products").update(payload as never).eq("id", editing.id)
      : await supabase.from("products").insert(payload as never);

    if (error) {
      toast.error("تعذّر حفظ المنتج: " + error.message);
      return;
    }

    toast.success("تم حفظ المنتج بنجاح!");
    setEditing(null);
    await load();
  }

  async function remove(p: ExtendedProduct) {
    if (!window.confirm(`حذف المنتج "${p.name}"؟`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error("تعذّر الحذف: " + error.message);
    else toast.success("تم الحذف بنجاح");
    await load();
  }

  return (
    <div className="space-y-4">
      <AdminCard
        title={`المنتجات (${products.length})`}
        action={
          <button
            type="button"
            className={btnCls}
            onClick={() => {
              setActiveTab("basic");
              setEditing({ ...emptyProductForm, category_slug: categories[0]?.slug ?? "" });
            }}
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
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span>{p.price?.toLocaleString()} ر.ي</span>
                    {p.price_sar ? <span>({p.price_sar} ر.س)</span> : null}
                  </div>
                </div>
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-secondary text-foreground"
                  onClick={() => {
                    setActiveTab("basic");
                    setEditing({
                      ...emptyProductForm,
                      id: p.id,
                      name: p.name || "",
                      slug: p.slug || "",
                      category_slug: p.category_slug || "",
                      price: p.price || 0,
                      original_price: p.original_price || 0,
                      price_sar: p.price_sar || 0,
                      badge: p.badge || "",
                      origin: p.origin || "",
                      description: p.description || "",
                      images: Array.isArray(p.images) ? p.images : [],
                      is_active: p.is_active ?? true,
                      is_yemeni_local: p.is_yemeni_local ?? false,
                      sizes: Array.isArray(p.sizes)
                        ? p.sizes
                        : typeof p.sizes === "string"
                        ? (p.sizes as string).split(",").map((s) => s.trim())
                        : [],
                      colors: Array.isArray(p.colors)
                        ? p.colors
                        : typeof p.colors === "string"
                        ? (p.colors as string).split(",").map((c) => c.trim())
                        : [],
                      unit: p.unit || "قطعة",
                      sort_order: p.sort_order || 0,
                    });
                  }}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
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

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-border bg-card p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-bold text-foreground">
                {editing.id ? "تعديل المنتج" : "إضافة منتج جديد"}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex rounded-xl bg-secondary p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "basic" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                الأساسية
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("attributes")}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "attributes" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                الخصائص
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("supplier")}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "supplier" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                المورد (خاص)
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3.5 pr-1">
              {activeTab === "basic" ? (
                <>
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
                    <Field label="السعر (ريال يمني)">
                      <input
                        type="number"
                        className={inputCls}
                        value={editing.price || ""}
                        onChange={(e) => handleYerPriceChange(Number(e.target.value))}
                      />
                    </Field>
                    <Field label={`السعر (ريال سعودي) — بسعر صرف ١ ر.س = ${sarRate.toLocaleString("ar-EG")} ر.ي`}>
                      <input
                        type="number"
                        step="0.01"
                        className={inputCls}
                        value={editing.price_sar || ""}
                        onChange={(e) => handleSarPriceChange(Number(e.target.value))}
                      />
                    </Field>
                  </div>
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    يُحتسب تلقائيًا من سعر الصرف الحالي في «إعدادات المتجر». عدّل أي حقل والآخر يتحدّث تلقائيًا.
                  </p>

                  <Field label="وحدة الصنف">
                    <select
                      className={inputCls}
                      value={editing.unit || "قطعة"}
                      onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                    >
                      <option value="قطعة">قطعة</option>
                      <option value="طقم">طقم</option>
                      <option value="كرتون">كرتون</option>
                      <option value="كيلو">كيلو</option>
                      <option value="جرام">جرام</option>
                      <option value="لتر">لتر</option>
                    </select>
                  </Field>

                  <Field label="المقاسات / الأحجام المتاحة">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {PRESET_SIZES.map((size) => {
                        const active = editing.sizes.includes(size);
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => togglePresetSize(size)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-all border ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-muted-foreground border-border"
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="الألوان المتوفرة">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {PRESET_COLORS.map((color) => {
                        const active = editing.colors.includes(color);
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => togglePresetColor(color)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-all border ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-muted-foreground border-border"
                            }`}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="الوصف">
                    <textarea
                      rows={2}
                      className={`${inputCls} h-auto py-2`}
                      value={editing.description}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    />
                  </Field>

                  <Field label="صور المنتج">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {editing.images.map((img, idx) => (
                          <div key={idx} className="relative h-14 w-14 rounded-xl border border-border overflow-hidden bg-secondary">
                            <img src={img} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditing({ ...editing, images: editing.images.filter((_, i) => i !== idx) })}
                              className="absolute top-1 left-1 grid h-4 w-4 place-items-center rounded-full bg-destructive text-destructive-foreground"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-primary" />}
                        <span>{uploading ? "جارٍ الرفع..." : "تحميل صور من الجهاز"}</span>
                        <input type="file" accept="image/*" multiple disabled={uploading} className="hidden" onChange={(e) => void handleImageUpload(e.target.files)} />
                      </label>
                    </div>
                  </Field>
                </>
              ) : null}

              {activeTab === "attributes" ? (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 shrink-0 text-primary" />
                    <span>الخصائص الإضافية للمنتج.</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <button type="button" onClick={() => void save()} className={`flex-1 ${btnCls}`}>
                حفظ
              </button>
              <button type="button" onClick={() => setEditing(null)} className={btnCls}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
                                               }
                
