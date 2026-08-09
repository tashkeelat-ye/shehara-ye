import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, Field, btnCls, btnGhostCls, inputCls } from "@/components/admin-ui";
import { formatPrice, type Category } from "@/lib/db";
import { uploadManyMedia } from "@/lib/media";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Row = {
  id: string;
  name: string;
  description: string;
  price: number;
  old_price: number | null;
  discount_price: number | null;
  offer_end_date: string | null;
  category_id: string;
  city: string;
  images: string[];
  sizes: string[];
  colors: string[];
  badge: string | null;
  is_local: boolean;
  is_active: boolean;
};

const empty: Omit<Row, "id"> = {
  name: "",
  description: "",
  price: 0,
  old_price: null,
  discount_price: null,
  offer_end_date: null,
  category_id: "",
  city: "صنعاء",
  images: [],
  sizes: [],
  colors: [],
  badge: null,
  is_local: false,
  is_active: true,
};

const COLUMNS =
  "id,name,description,price,old_price,discount_price,offer_end_date,category_id,city,images,sizes,colors,badge,is_local,is_active";

function AdminProducts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [editing, setEditing] = useState<(Omit<Row, "id"> & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from("products").select(COLUMNS).order("created_at", { ascending: false }).returns<Row[]>(),
      supabase.from("categories").select("id,slug,name,icon,sort_order").order("sort_order").returns<Category[]>(),
    ]);
    setRows(p.data ?? []);
    setCats(c.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!editing) return;
    if (!editing.name || !editing.category_id || !editing.price) {
      toast.error("أكمل الاسم والفئة والسعر");
      return;
    }
    setBusy(true);
    const payload = { ...editing };
    delete (payload as { id?: string }).id;
    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    setBusy(false);
    if (error) {
      toast.error("تعذّر الحفظ: " + error.message);
      return;
    }
    toast.success("تم الحفظ");
    setEditing(null);
    await load();
  }

  async function toggleActive(row: Row) {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) toast.error("تعذّر التحديث");
    await load();
  }

  async function remove(row: Row) {
    if (!window.confirm(`حذف المنتج "${row.name}"؟`)) return;
    const { error } = await supabase.from("products").delete().eq("id", row.id);
    if (error) toast.error("تعذّر الحذف: " + error.message);
    else toast.success("تم الحذف");
    await load();
  }

  async function uploadImages(files: File[]) {
    if (!editing || files.length === 0) return;
    setBusy(true);
    const { urls, errors } = await uploadManyMedia("products", files);
    setBusy(false);
    if (urls.length > 0) {
      setEditing((prev) => (prev ? { ...prev, images: [...prev.images, ...urls] } : prev));
      toast.success(`تم رفع ${urls.length.toLocaleString("ar-EG")} صورة`);
    }
    if (errors.length > 0) toast.error("تعذّر رفع بعض الصور: " + errors.join(" | "));
  }

  function moveImage(index: number, dir: -1 | 1) {
    if (!editing) return;
    const next = [...editing.images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setEditing({ ...editing, images: next });
  }

  function makePrimary(index: number) {
    if (!editing || index === 0) return;
    const next = [...editing.images];
    const [img] = next.splice(index, 1);
    setEditing({ ...editing, images: [img!, ...next] });
  }

  return (
    <div className="space-y-4">
      <AdminCard
        title={`المنتجات (${rows.length.toLocaleString("ar-EG")})`}
        action={
          <button type="button" className={btnCls} onClick={() => setEditing({ ...empty })}>
            <Plus className="h-4 w-4" /> منتج جديد
          </button>
        }
      >
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 p-2 text-xs"
            >
              <img
                src={r.images[0] ?? ""}
                alt={r.name}
                loading="lazy"
                className="h-12 w-12 shrink-0 rounded-lg bg-muted object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-foreground font-medium">{r.name}</p>
                <p className="text-primary">{formatPrice(r.price)}</p>
              </div>
              <button type="button" onClick={() => toggleActive(r)} className={btnGhostCls}>
                {r.is_active ? "تعطيل" : "تفعيل"}
              </button>
              <button
                type="button"
                onClick={() => setEditing({ ...r })}
                aria-label="تعديل"
                className={btnGhostCls}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => remove(r)}
                aria-label="حذف"
                className="inline-flex h-10 items-center rounded-xl border border-destructive/40 px-3 text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </AdminCard>

      {editing ? (
        <AdminCard title={editing.id ? "تعديل منتج" : "إضافة منتج"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم المنتج">
              <input
                className={inputCls}
                value={editing.name}
                maxLength={200}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="الفئة">
              <select
                className={inputCls}
                value={editing.category_id}
                onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}
              >
                <option value="">اختر فئة</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="السعر الأصلي (ر.ي)">
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
                value={editing.old_price ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, old_price: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
            <Field label="سعر التخفيض/العرض (اختياري)">
              <input
                type="number"
                className={inputCls}
                value={editing.discount_price ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, discount_price: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
            <Field label="تاريخ ووقت انتهاء العرض (اختياري)">
              <input
                type="datetime-local"
                className={inputCls}
                value={editing.offer_end_date ? new Date(editing.offer_end_date).toISOString().slice(0, 16) : ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    offer_end_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
              />
            </Field>
            <Field label="المدينة">
              <input
                className={inputCls}
                value={editing.city}
                maxLength={60}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })}
              />
            </Field>
            <Field label="شارة (اختياري)">
              <input
                className={inputCls}
                value={editing.badge ?? ""}
                maxLength={30}
                onChange={(e) => setEditing({ ...editing, badge: e.target.value || null })}
              />
            </Field>
            <Field label="المقاسات (مفصولة بفاصلة)">
              <input
                className={inputCls}
                value={editing.sizes.join(",")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    sizes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </Field>
            <Field label="الألوان (مفصولة بفاصلة)">
              <input
                className={inputCls}
                value={editing.colors.join(",")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    colors: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="الوصف">
                <textarea
                  className="min-h-24 w-full rounded-xl border border-border bg-secondary p-3 text-sm outline-none focus:border-primary"
                  value={editing.description}
                  maxLength={2000}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="الصور (الصورة الأولى هي الرئيسية)">
                <div className="flex flex-wrap items-end gap-3">
                  {editing.images.map((img, idx) => (
                    <div key={img} className="w-20">
                      <span className="relative block">
                        <img
                          src={img}
                          alt=""
                          className={`h-20 w-20 rounded-lg object-cover ${
                            idx === 0 ? "ring-2 ring-primary" : ""
                          }`}
                        />
                        <button
                          type="button"
                          aria-label="حذف الصورة"
                          onClick={() =>
                            setEditing({
                              ...editing,
                              images: editing.images.filter((i) => i !== img),
                            })
                          }
                          className="absolute -top-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-destructive text-[10px] text-destructive-foreground"
                        >
                          ×
                        </button>
                        {idx === 0 ? (
                          <span className="absolute bottom-0 start-0 rounded-se-lg bg-primary px-1 text-[9px] text-primary-foreground">
                            رئيسية
                          </span>
                        ) : null}
                      </span>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          aria-label="تحريك يمينًا"
                          onClick={() => moveImage(idx, -1)}
                          className="rounded border border-border px-1 text-[11px]"
                        >
                          ›
                        </button>
                        <button
                          type="button"
                          onClick={() => makePrimary(idx)}
                          className="rounded border border-border px-1 text-[10px] text-primary"
                        >
                          رئيسية
                        </button>
                        <button
                          type="button"
                          aria-label="تحريك يسارًا"
                          onClick={() => moveImage(idx, 1)}
                          className="rounded border border-border px-1 text-[11px]"
                        >
                          ‹
                        </button>
                      </div>
                    </div>
                  ))}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    aria-label="رفع صور المنتج"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length > 0) void uploadImages(files);
                      e.target.value = "";
                    }}
                    className="text-xs"
                  />
                </div>
              </Field>
            </div>

            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={editing.is_local}
                onChange={(e) => setEditing({ ...editing, is_local: e.target.checked })}
              />
              منتج يمني محلي
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              مُفعّل
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} className={btnCls} onClick={save}>
              {busy ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            <button type="button" className={btnGhostCls} onClick={() => setEditing(null)}>
              إلغاء
            </button>
          </div>
        </AdminCard>
      ) : null}
    </div>
  );
                                                                                 }
      
