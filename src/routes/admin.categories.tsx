import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Tag, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, Field, btnCls, btnGhostCls, inputCls } from "@/components/admin-ui";
import { uploadManyMedia } from "@/lib/media";
import type { Category } from "@/lib/db";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
};

const emptyCat = { slug: "", name: "", icon: "Shirt", image_url: "", sort_order: 0 };
const emptyBrand = { slug: "", name: "", logo_url: "", is_active: true, sort_order: 0 };

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCat, setEditingCat] = useState<(typeof emptyCat & { id?: string }) | null>(null);

  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [editingBrand, setEditingBrand] = useState<(typeof emptyBrand & { id?: string }) | null>(null);

  const [uploadingCat, setUploadingCat] = useState(false);
  const [uploadingBrand, setUploadingBrand] = useState(false);

  const load = useCallback(async () => {
    const [cRes, bRes] = await Promise.all([
      supabase.from("categories").select("id,slug,name,icon,image_url,sort_order").order("sort_order"),
      supabase.from("brands").select("id,slug,name,logo_url,is_active,sort_order").order("sort_order"),
    ]);

    setCategories((cRes.data as Category[]) ?? []);
    setBrands((bRes.data as BrandRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // رفع صورة الفئة
  async function handleCatImageUpload(files: FileList | null) {
    if (!files || files.length === 0 || !editingCat) return;
    setUploadingCat(true);
    const { urls, errors } = await uploadManyMedia("categories", Array.from(files));
    setUploadingCat(false);
    if (urls.length > 0) {
      setEditingCat((prev) => (prev ? { ...prev, image_url: urls[0] } : prev));
      toast.success("تم رفع صورة الفئة بنجاح");
    }
    if (errors.length > 0) {
      toast.error("تعذّر رفع الصورة: " + errors.join(" | "));
    }
  }

  // رفع شعار الماركة
  async function handleBrandLogoUpload(files: FileList | null) {
    if (!files || files.length === 0 || !editingBrand) return;
    setUploadingBrand(true);
    const { urls, errors } = await uploadManyMedia("brands", Array.from(files));
    setUploadingBrand(false);
    if (urls.length > 0) {
      setEditingBrand((prev) => (prev ? { ...prev, logo_url: urls[0] } : prev));
      toast.success("تم رفع شعار الماركة بنجاح");
    }
    if (errors.length > 0) {
      toast.error("تعذّر رفع الشعار: " + errors.join(" | "));
    }
  }

  async function saveCategory() {
    if (!editingCat?.name || !editingCat.slug) {
      toast.error("أكمل الاسم والمعرّف للفئة");
      return;
    }
    const payload = {
      slug: editingCat.slug,
      name: editingCat.name,
      icon: editingCat.icon,
      image_url: editingCat.image_url || null,
      sort_order: editingCat.sort_order,
    };
    const { error } = editingCat.id
      ? await supabase.from("categories").update(payload).eq("id", editingCat.id)
      : await supabase.from("categories").insert(payload);

    if (error) {
      toast.error("تعذّر حفظ الفئة: " + error.message);
      return;
    }
    toast.success("تم حفظ الفئة");
    setEditingCat(null);
    await load();
  }

  async function removeCategory(row: Category) {
    if (!window.confirm(`حذف الفئة "${row.name}"؟`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", row.id);
    if (error) toast.error("لا يمكن حذف فئة تحتوي منتجات");
    else toast.success("تم الحذف");
    await load();
  }

  async function saveBrand() {
    if (!editingBrand?.name || !editingBrand.slug) {
      toast.error("أكمل اسم الماركة والمعرّف");
      return;
    }
    const payload = {
      slug: editingBrand.slug,
      name: editingBrand.name,
      logo_url: editingBrand.logo_url || null,
      is_active: editingBrand.is_active,
      sort_order: editingBrand.sort_order,
    };
    const { error } = editingBrand.id
      ? await supabase.from("brands").update(payload).eq("id", editingBrand.id)
      : await supabase.from("brands").insert(payload);

    if (error) {
      toast.error("تعذّر حفظ الماركة: " + error.message);
      return;
    }
    toast.success("تم حفظ الماركة");
    setEditingBrand(null);
    await load();
  }

  async function removeBrand(row: BrandRow) {
    if (!window.confirm(`حذف الماركة "${row.name}"؟`)) return;
    const { error } = await supabase.from("brands").delete().eq("id", row.id);
    if (error) toast.error("تعذّر الحذف: " + error.message);
    else toast.success("تم حذف الماركة");
    await load();
  }

  return (
    <div className="space-y-6">
      {/* 1. قسم إدارة الفئات */}
      <AdminCard
        title="الفئات"
        action={
          <button type="button" className={btnCls} onClick={() => setEditingCat({ ...emptyCat })}>
            <Plus className="h-4 w-4" /> فئة جديدة
          </button>
        }
      >
        <ul className="space-y-2">
          {categories.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-xl border border-border/70 p-2 text-xs">
              {r.image_url ? (
                <img src={r.image_url} alt={r.name} className="h-8 w-8 rounded-full object-cover" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{r.name}</p>
                <p dir="ltr" className="text-[11px] text-muted-foreground">
                  {r.slug} · {r.icon}
                </p>
              </div>
              <button
                type="button"
                className={btnGhostCls}
                onClick={() => setEditingCat({ ...r, image_url: r.image_url ?? "" })}
              >
                تعديل
              </button>
              <button
                type="button"
                aria-label="حذف"
                onClick={() => removeCategory(r)}
                className="inline-flex h-10 items-center rounded-xl border border-destructive/40 px-3 text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </AdminCard>

      {editingCat ? (
        <AdminCard title={editingCat.id ? "تعديل فئة" : "إضافة فئة"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم الفئة">
              <input
                className={inputCls}
                value={editingCat.name}
                maxLength={80}
                onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
              />
            </Field>
            <Field label="المعرّف (بالإنجليزية)">
              <input
                dir="ltr"
                className={inputCls}
                value={editingCat.slug}
                maxLength={60}
                onChange={(e) => setEditingCat({ ...editingCat, slug: e.target.value })}
              />
            </Field>
            <Field label="اسم الأيقونة (Lucide)">
              <input
                dir="ltr"
                className={inputCls}
                value={editingCat.icon}
                maxLength={40}
                onChange={(e) => setEditingCat({ ...editingCat, icon: e.target.value })}
              />
            </Field>

            {/* رفع صورة الفئة */}
            <div className="sm:col-span-2">
              <Field label="صورة الفئة">
                <div className="flex items-center gap-3">
                  {editingCat.image_url ? (
                    <div className="relative h-16 w-16 shrink-0 rounded-xl border border-border overflow-hidden bg-secondary">
                      <img src={editingCat.image_url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label="حذف الصورة"
                        onClick={() => setEditingCat({ ...editingCat, image_url: "" })}
                        className="absolute top-1 left-1 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground text-[10px]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}
                  <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground hover:border-primary">
                    {uploadingCat ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Upload className="h-4 w-4 text-primary" />
                    )}
                    <span>{uploadingCat ? "جارٍ الرفع..." : "تحميل صورة من الجهاز"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingCat}
                      className="hidden"
                      onChange={(e) => void handleCatImageUpload(e.target.files)}
                    />
                  </label>
                </div>
              </Field>
            </div>

            <Field label="الترتيب">
              <input
                type="number"
                className={inputCls}
                value={editingCat.sort_order}
                onChange={(e) => setEditingCat({ ...editingCat, sort_order: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className={btnCls} onClick={saveCategory}>
              حفظ
            </button>
            <button type="button" className={btnGhostCls} onClick={() => setEditingCat(null)}>
              إلغاء
            </button>
          </div>
        </AdminCard>
      ) : null}

      {/* 2. قسم إدارة الماركات التجارية */}
      <AdminCard
        title="الماركات التجارية"
        action={
          <button type="button" className={btnCls} onClick={() => setEditingBrand({ ...emptyBrand })}>
            <Plus className="h-4 w-4" /> ماركة جديدة
          </button>
        }
      >
        <ul className="space-y-2">
          {brands.map((b) => (
            <li key={b.id} className="flex items-center gap-2 rounded-xl border border-border/70 p-2 text-xs">
              {b.logo_url ? (
                <img src={b.logo_url} alt={b.name} className="h-8 w-8 rounded-lg object-contain bg-secondary p-1" />
              ) : (
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-muted-foreground">
                  <Tag className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{b.name}</p>
                <p dir="ltr" className="text-[11px] text-muted-foreground">
                  {b.slug}
                </p>
              </div>
              <button
                type="button"
                className={btnGhostCls}
                onClick={() => setEditingBrand({ ...b, logo_url: b.logo_url ?? "" })}
              >
                تعديل
              </button>
              <button
                type="button"
                aria-label="حذف"
                onClick={() => removeBrand(b)}
                className="inline-flex h-10 items-center rounded-xl border border-destructive/40 px-3 text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </AdminCard>

      {editingBrand ? (
        <AdminCard title={editingBrand.id ? "تعديل ماركة" : "إضافة ماركة"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم الماركة">
              <input
                className={inputCls}
                value={editingBrand.name}
                maxLength={80}
                onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })}
              />
            </Field>
            <Field label="المعرّف (بالإنجليزية)">
              <input
                dir="ltr"
                className={inputCls}
                value={editingBrand.slug}
                maxLength={60}
                onChange={(e) => setEditingBrand({ ...editingBrand, slug: e.target.value })}
              />
            </Field>

            {/* رفع شعار الماركة */}
            <div className="sm:col-span-2">
              <Field label="شعار / لوجو الماركة">
                <div className="flex items-center gap-3">
                  {editingBrand.logo_url ? (
                    <div className="relative h-16 w-16 shrink-0 rounded-xl border border-border p-1 bg-secondary">
                      <img src={editingBrand.logo_url} alt="" className="h-full w-full object-contain" />
                      <button
                        type="button"
                        aria-label="حذف الشعار"
                        onClick={() => setEditingBrand({ ...editingBrand, logo_url: "" })}
                        className="absolute -top-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground text-[10px]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}
                  <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground hover:border-primary">
                    {uploadingBrand ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Upload className="h-4 w-4 text-primary" />
                    )}
                    <span>{uploadingBrand ? "جارٍ الرفع..." : "تحميل الشعار من الجهاز"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingBrand}
                      className="hidden"
                      onChange={(e) => void handleBrandLogoUpload(e.target.files)}
                    />
                  </label>
                </div>
              </Field>
            </div>

            <Field label="الترتيب">
              <input
                type="number"
                className={inputCls}
                value={editingBrand.sort_order}
                onChange={(e) => setEditingBrand({ ...editingBrand, sort_order: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className={btnCls} onClick={saveBrand}>
              حفظ
            </button>
            <button type="button" className={btnGhostCls} onClick={() => setEditingBrand(null)}>
              إلغاء
            </button>
          </div>
        </AdminCard>
      ) : null}
    </div>
  );
        }
                      
