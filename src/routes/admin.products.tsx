import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import type { ReactNode } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Check,
  Edit2,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminCard, btnCls, inputCls } from "@/components/admin-ui";
import { uploadManyMedia } from "@/lib/media";
import type { Category, Product } from "@/lib/db";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

const SIZES = [
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "قطعة",
  "ملي",
  "لتر",
  "100 جم",
  "نصف كيلو",
  "1 كيلو",
];

const COLORS = [
  "وردي",
  "أسود",
  "أبيض",
  "أحمر",
  "أزرق",
  "كحلي",
  "بيج",
  "رمادي",
  "ذهبي",
];

const numberField = z.preprocess(
  (value) =>
    value === "" ||
    value === undefined ||
    Number.isNaN(Number(value))
      ? 0
      : Number(value),
  z.number().finite().min(0),
);

const formSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "اسم المنتج مطلوب")
      .max(120, "اسم المنتج طويل جدًا"),

    category_id: z.string().min(1, "اختر الفئة"),

    price: numberField,

    old_price: numberField,

    description: z
      .string()
      .max(5000, "الوصف طويل جدًا"),

    city: z
      .string()
      .trim()
      .max(80, "اسم المدينة طويل جدًا"),

    badge: z
      .string()
      .trim()
      .max(50, "الشارة طويلة جدًا"),

    images: z
      .array(z.string().min(1))
      .max(12, "الحد الأقصى 12 صورة"),

    sizes: z.array(z.string()),

    colors: z.array(z.string()),

    is_local: z.boolean(),

    is_active: z.boolean(),

    total_stock: numberField.pipe(
      z.number().int("يجب أن يكون المخزون عددًا صحيحًا"),
    ),

    stock_left: numberField.pipe(
      z.number().int("يجب أن يكون المخزون عددًا صحيحًا"),
    ),

    low_stock_threshold: numberField.pipe(
      z
        .number()
        .int("يجب أن يكون حد التنبيه عددًا صحيحًا"),
    ),
  })
  .refine(
    (value) => value.stock_left <= value.total_stock,
    {
      message:
        "المخزون المتبقي لا يمكن أن يتجاوز المخزون الكلي",
      path: ["stock_left"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

type ProductRow = Product & {
  low_stock_threshold?: number | null;
};

const EMPTY: FormValues = {
  name: "",
  category_id: "",
  price: 0,
  old_price: 0,
  description: "",
  city: "صنعاء",
  badge: "",
  images: [],
  sizes: [],
  colors: [],
  is_local: false,
  is_active: true,
  total_stock: 0,
  stock_left: 0,
  low_stock_threshold: 5,
};

function n(value: unknown): number {
  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : 0;
}

function normalize(product: ProductRow): ProductRow {
  return {
    ...product,

    price: n(product.price),

    old_price:
      product.old_price == null
        ? null
        : n(product.old_price),

    total_stock: n(product.total_stock),

    stock_left: n(product.stock_left),

    low_stock_threshold:
      product.low_stock_threshold == null
        ? 5
        : n(product.low_stock_threshold),

    sales_count: n(product.sales_count),

    rating: n(product.rating),

    reviews_count: n(
      product.reviews_count,
    ),

    images: Array.isArray(product.images)
      ? product.images
      : [],

    sizes: Array.isArray(product.sizes)
      ? product.sizes
      : [],

    colors: Array.isArray(product.colors)
      ? product.colors
      : [],
  };
}

function toForm(
  product: ProductRow,
): FormValues {
  const p = normalize(product);

  return {
    name: p.name ?? "",

    category_id:
      p.category_id ?? "",

    price: p.price,

    old_price:
      p.old_price ?? 0,

    description:
      p.description ?? "",

    city:
      p.city ?? "صنعاء",

    badge:
      p.badge ?? "",

    images:
      p.images,

    sizes:
      p.sizes,

    colors:
      p.colors,

    is_local:
      p.is_local ?? false,

    is_active:
      p.is_active ?? true,

    total_stock:
      p.total_stock,

    stock_left:
      p.stock_left,

    low_stock_threshold:
      p.low_stock_threshold ?? 5,
  };
}

function ErrorText({
  children,
}: {
  children?: string;
}) {
  if (!children) {
    return null;
  }

  return (
    <p className="mt-1 text-[10px] text-destructive">
      {children}
    </p>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-foreground">
        {label}
      </span>

      {children}

      <ErrorText>
        {error}
      </ErrorText>
    </label>
  );
}

export function AdminProducts() {
  const [products, setProducts] =
    useState<ProductRow[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [editing, setEditing] =
    useState<ProductRow | null>(null);

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const form =
    useForm<FormValues>({
      resolver:
        zodResolver(formSchema),

      defaultValues:
        EMPTY,

      mode: "onBlur",
    });

  const images =
    form.watch("images");

  const sizes =
    form.watch("sizes");

  const colors =
    form.watch("colors");

  const totalStock =
    form.watch("total_stock");

  const stockLeft =
    form.watch("stock_left");

  const threshold =
    form.watch(
      "low_stock_threshold",
    );

  const load = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          productsResult,
          categoriesResult,
        ] = await Promise.all([
          supabase
            .from("products")
            .select("*")
            .order(
              "created_at",
              {
                ascending: false,
              },
            ),

          supabase
            .from("categories")
            .select(
              "id,slug,name,icon,sort_order",
            )
            .order("sort_order"),
        ]);

        if (productsResult.error) {
          throw productsResult.error;
        }

        if (categoriesResult.error) {
          throw categoriesResult.error;
        }

        setProducts(
          (
            (productsResult.data ??
              []) as unknown as ProductRow[]
          ).map(normalize),
        );

        setCategories(
          (categoriesResult.data ??
            []) as Category[],
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "تعذر تحميل المنتجات",
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

  function createProduct() {
    setEditing(null);

    form.reset({
      ...EMPTY,

      category_id:
        categories[0]?.id ?? "",
    });

    setOpen(true);
  }

  function editProduct(
    product: ProductRow,
  ) {
    setEditing(product);

    form.reset(
      toForm(product),
    );

    setOpen(true);
  }

  function close() {
    if (
      saving ||
      uploading
    ) {
      return;
    }

    setOpen(false);

    setEditing(null);

    form.reset(EMPTY);
  }

  function toggle(
    field:
      | "sizes"
      | "colors",
    value: string,
  ) {
    const current =
      form.getValues(field);

    const next =
      current.includes(value)
        ? current.filter(
            (item) =>
              item !== value,
          )
        : [
            ...current,
            value,
          ];

    form.setValue(
      field,
      next,
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  }

  async function uploadImages(
    files: FileList | null,
  ) {
    if (!files?.length) {
      return;
    }

    const remaining =
      12 - images.length;

    if (remaining <= 0) {
      toast.error(
        "الحد الأقصى 12 صورة",
      );
      return;
    }

    setUploading(true);

    try {
      const selected =
        Array.from(files).slice(
          0,
          remaining,
        );

      const result =
        await uploadManyMedia(
          "products",
          selected,
          "admin/products",
        );

      if (result.urls.length) {
        form.setValue(
          "images",
          [
            ...images,
            ...result.urls,
          ],
          {
            shouldDirty: true,
            shouldValidate: true,
          },
        );

        toast.success(
          `تم رفع ${result.urls.length} صورة`,
        );
      }

      if (
        result.errors.length
      ) {
        toast.error(
          result.errors.join(
            " | ",
          ),
        );
      }
    } finally {
      setUploading(false);
    }
  }

  const submit:
    SubmitHandler<FormValues> =
    async (values) => {
      setSaving(true);

      try {
        const oldStock =
          editing
            ? n(
                editing.stock_left,
              )
            : 0;

        const payload = {
          name:
            values.name.trim(),

          category_id:
            values.category_id,

          description:
            values.description.trim(),

          price:
            values.price,

          old_price:
            values.old_price > 0
              ? values.old_price
              : null,

          city:
            values.city.trim() ||
            "صنعاء",

          images:
            values.images,

          sizes:
            values.sizes,

          colors:
            values.colors,

          badge:
            values.badge.trim() ||
            null,

          is_local:
            values.is_local,

          is_active:
            values.is_active,

          total_stock:
            values.total_stock,

          stock_left:
            values.stock_left,

          low_stock_threshold:
            values.low_stock_threshold,
        };

        let productId =
          editing?.id;

        if (editing) {
          const {
            error: updateError,
          } = await supabase
            .from("products")
            .update(
              payload as never,
            )
            .eq(
              "id",
              editing.id,
            );

          if (updateError) {
            throw updateError;
          }
        } else {
          const {
            data,
            error:
              insertError,
          } = await supabase
            .from("products")
            .insert(
              payload as never,
            )
            .select("id")
            .single();

          if (insertError) {
            throw insertError;
          }

          productId = (
            data as {
              id: string;
            }
          ).id;
        }

        const difference =
          values.stock_left -
          oldStock;

        if (
          productId &&
          difference !== 0
        ) {
          const {
            error:
              movementError,
          } = await supabase
            .from(
              "inventory_movements" as never,
            )
            .insert({
              product_id:
                productId,

              quantity:
                difference,

              movement_type:
                difference > 0
                  ? "purchase"
                  : "adjustment",

              note:
                editing
                  ? "تعديل المخزون من إدارة المنتجات"
                  : "المخزون الأولي للمنتج",
            } as never);

          if (movementError) {
            toast.warning(
              `تم حفظ المنتج، لكن لم يُسجل سجل المخزون: ${movementError.message}`,
            );
          }
        }

        toast.success(
          editing
            ? "تم تحديث المنتج والمخزون بنجاح"
            : "تم إنشاء المنتج بنجاح",
        );

        close();

        await load();
      } catch (e) {
        toast.error(
          `تعذر الحفظ: ${
            e instanceof Error
              ? e.message
              : "خطأ غير معروف"
          }`,
        );
      } finally {
        setSaving(false);
      }
    };

  async function remove(
    product: ProductRow,
  ) {
    if (
      !window.confirm(
        `حذف المنتج "${product.name}"؟`,
      )
    ) {
      return;
    }

    const {
      error: deleteError,
    } = await supabase
      .from("products")
      .delete()
      .eq(
        "id",
        product.id,
      );

    if (deleteError) {
      toast.error(
        `تعذر الحذف: ${deleteError.message}`,
      );

      return;
    }

    toast.success(
      "تم حذف المنتج",
    );

    await load();
  }

  return (
    <div
      dir="rtl"
      className="space-y-4 pb-8"
    >
      <AdminCard
        title={`إدارة المنتجات (${products.length})`}
        action={
          <button
            type="button"
            className={btnCls}
            onClick={
              createProduct
            }
          >
            <Plus className="h-4 w-4" />
            منتج جديد
          </button>
        }
      >
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-border bg-secondary/40 p-3">
            <p className="text-[10px] text-muted-foreground">
              المنتجات
            </p>

            <p className="mt-1 text-lg font-bold">
              {products.length.toLocaleString(
                "ar-EG",
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/40 p-3">
            <p className="text-[10px] text-muted-foreground">
              منخفض
            </p>

            <p className="mt-1 text-lg font-bold text-amber-700">
              {products
                .filter(
                  (p) =>
                    p.stock_left >
                      0 &&
                    p.stock_left <=
                      (p.low_stock_threshold ??
                        5),
                )
                .length.toLocaleString(
                  "ar-EG",
                )}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/40 p-3">
            <p className="text-[10px] text-muted-foreground">
              نافد
            </p>

            <p className="mt-1 text-lg font-bold text-destructive">
              {products
                .filter(
                  (p) =>
                    p.stock_left <=
                    0,
                )
                .length.toLocaleString(
                  "ar-EG",
                )}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8 text-xs text-muted-foreground">
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            جارٍ التحميل...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
            <AlertCircle className="mx-auto mb-2 h-6 w-6" />

            <p className="text-xs font-bold">
              {error}
            </p>

            <button
              type="button"
              className={`${btnCls} mt-3`}
              onClick={() =>
                void load()
              }
            >
              إعادة المحاولة
            </button>
          </div>
        ) : products.length ===
          0 ? (
          <p className="p-8 text-center text-xs text-muted-foreground">
            لا توجد منتجات.
          </p>
        ) : (
          <div className="space-y-2">
            {products.map(
              (product) => {
                const limit =
                  product.low_stock_threshold ??
                  5;

                const status =
                  product.stock_left <=
                  0
                    ? "نافد"
                    : product.stock_left <=
                        limit
                      ? "منخفض"
                      : "متوفر";

                return (
                  <div
                    key={
                      product.id
                    }
                    className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2.5"
                  >
                    <img
                      src={
                        product
                          .images?.[0] ||
                        "/placeholder.svg"
                      }
                      alt={
                        product.name
                      }
                      className="h-14 w-14 shrink-0 rounded-xl bg-secondary object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-bold">
                          {
                            product.name
                          }
                        </p>

                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${
                            status ===
                            "نافد"
                              ? "bg-destructive/10 text-destructive"
                              : status ===
                                  "منخفض"
                                ? "bg-amber-500/10 text-amber-700"
                                : "bg-emerald-500/10 text-emerald-700"
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {product.price.toLocaleString(
                          "ar-EG",
                        )}{" "}
                        ر.ي • المخزون{" "}
                        {product.stock_left.toLocaleString(
                          "ar-EG",
                        )}{" "}
                        /{" "}
                        {product.total_stock.toLocaleString(
                          "ar-EG",
                        )}{" "}
                        • المبيعات{" "}
                        {product.sales_count.toLocaleString(
                          "ar-EG",
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        editProduct(
                          product,
                        )
                      }
                      className="grid h-9 w-9 place-items-center rounded-xl bg-secondary"
                      aria-label={`تعديل ${product.name}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void remove(
                          product,
                        )
                      }
                      className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/10 text-destructive"
                      aria-label={`حذف ${product.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              },
            )}
          </div>
        )}
      </AdminCard>

      {open ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-border bg-card shadow-2xl sm:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-bold">
                  {editing
                    ? "تعديل المنتج"
                    : "إضافة منتج جديد"}
                </h2>

                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  نموذج آمن ومتجاوب لإدارة المنتج والمخزون
                </p>
              </div>

              <button
                type="button"
                onClick={close}
                disabled={
                  saving ||
                  uploading
                }
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={form.handleSubmit(
                submit,
              )}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <div className="space-y-5 p-4">
                <section className="space-y-3">
                  <h3 className="text-xs font-bold text-primary">
                    البيانات الأساسية
                  </h3>

                  <Field
                    label="اسم المنتج *"
                    error={
                      form
                        .formState
                        .errors
                        .name
                        ?.message
                    }
                  >
                    <input
                      {...form.register(
                        "name",
                      )}
                      className={
                        inputCls
                      }
                      placeholder="مثال: عسل سدر دوعني أصلي"
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      label="الفئة *"
                      error={
                        form
                          .formState
                          .errors
                          .category_id
                          ?.message
                      }
                    >
                      <select
                        {...form.register(
                          "category_id",
                        )}
                        className={
                          inputCls
                        }
                      >
                        <option value="">
                          اختر الفئة
                        </option>

                        {categories.map(
                          (
                            category,
                          ) => (
                            <option
                              key={
                                category.id
                              }
                              value={
                                category.id
                              }
                            >
                              {
                                category.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </Field>

                    <Field label="المدينة">
                      <input
                        {...form.register(
                          "city",
                        )}
                        className={
                          inputCls
                        }
                        placeholder="صنعاء"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="السعر الحالي (ر.ي) *"
                      error={
                        form
                          .formState
                          .errors
                          .price
                          ?.message
                      }
                    >
                      <input
                        {...form.register(
                          "price",
                          {
                            valueAsNumber:
                              true,
                          },
                        )}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className={
                          inputCls
                        }
                      />
                    </Field>

                    <Field label="السعر السابق">
                      <input
                        {...form.register(
                          "old_price",
                          {
                            valueAsNumber:
                              true,
                          },
                        )}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className={
                          inputCls
                        }
                        placeholder="0 بدون خصم"
                      />
                    </Field>
                  </div>

                  <Field
                    label="الوصف"
                    error={
                      form
                        .formState
                        .errors
                        .description
                        ?.message
                    }
                  >
                    <textarea
                      {...form.register(
                        "description",
                      )}
                      rows={4}
                      className={`${inputCls} h-auto resize-y py-2.5`}
                      placeholder="وصف واضح ومفيد للمنتج..."
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      label="الشارة"
                      error={
                        form
                          .formState
                          .errors
                          .badge
                          ?.message
                      }
                    >
                      <input
                        {...form.register(
                          "badge",
                        )}
                        className={
                          inputCls
                        }
                        placeholder="جديد / خصم 20% / محلي"
                      />
                    </Field>

                    <label className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3">
                      <span>
                        <b className="block text-[11px]">
                          منتج يمني محلي
                        </b>

                        <small className="text-[9px] text-muted-foreground">
                          ضمن المنتجات المحلية
                        </small>
                      </span>

                      <input
                        {...form.register(
                          "is_local",
                        )}
                        type="checkbox"
                        className="h-4 w-4"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
                    <input
                      {...form.register(
                        "is_active",
                      )}
                      type="checkbox"
                      className="h-4 w-4"
                    />

                    <span>
                      <b className="block text-[11px]">
                        نشر المنتج
                      </b>

                      <small className="text-[9px] text-muted-foreground">
                        إلغاء التحديد يخفيه عن العملاء
                      </small>
                    </span>
                  </label>
                </section>

                <section className="space-y-3 rounded-2xl border border-primary/15 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />

                    <div>
                      <h3 className="text-xs font-bold">
                        المخزون والتنبيهات
                      </h3>

                      <p className="text-[10px] text-muted-foreground">
                        يتم التحقق من الكميات قبل الحفظ
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field
                      label="إجمالي المخزون *"
                      error={
                        form
                          .formState
                          .errors
                          .total_stock
                          ?.message
                      }
                    >
                      <input
                        {...form.register(
                          "total_stock",
                          {
                            valueAsNumber:
                              true,
                          },
                        )}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        className={
                          inputCls
                        }
                      />
                    </Field>

                    <Field
                      label="المتبقي حاليًا *"
                      error={
                        form
                          .formState
                          .errors
                          .stock_left
                          ?.message
                      }
                    >
                      <input
                        {...form.register(
                          "stock_left",
                          {
                            valueAsNumber:
                              true,
                          },
                        )}
                        type="number"
                        min="0"
                        max={
                          totalStock
                        }
                        step="1"
                        inputMode="numeric"
                        className={
                          inputCls
                        }
                      />
                    </Field>

                    <Field
                      label="حد التنبيه *"
                      error={
                        form
                          .formState
                          .errors
                          .low_stock_threshold
                          ?.message
                      }
                    >
                      <input
                        {...form.register(
                          "low_stock_threshold",
                          {
                            valueAsNumber:
                              true,
                          },
                        )}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        className={
                          inputCls
                        }
                      />
                    </Field>
                  </div>

                  <div
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-[10px] font-bold ${
                      stockLeft <=
                      0
                        ? "bg-destructive/10 text-destructive"
                        : stockLeft <=
                            threshold
                          ? "bg-amber-500/10 text-amber-700"
                          : "bg-emerald-500/10 text-emerald-700"
                    }`}
                  >
                    <span>
                      {stockLeft <=
                      0
                        ? "سيظهر كنافد"
                        : stockLeft <=
                            threshold
                          ? "تنبيه: المخزون منخفض"
                          : "المخزون متوفر"}
                    </span>

                    <span>
                      {stockLeft.toLocaleString(
                        "ar-EG",
                      )}{" "}
                      /{" "}
                      {totalStock.toLocaleString(
                        "ar-EG",
                      )}
                    </span>
                  </div>
                </section>

                <section className="space-y-3">
                  <div>
                    <h3 className="text-xs font-bold">
                      المقاسات / الأحجام
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {SIZES.map(
                        (value) => (
                          <button
                            key={
                              value
                            }
                            type="button"
                            onClick={() =>
                              toggle(
                                "sizes",
                                value,
                              )
                            }
                            className={`rounded-lg border px-2.5 py-1.5 text-[10px] ${
                              sizes.includes(
                                value,
                              )
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-secondary text-muted-foreground"
                            }`}
                          >
                            {sizes.includes(
                              value,
                            ) ? (
                              <Check className="me-1 inline h-3 w-3" />
                            ) : null}

                            {value}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold">
                      الألوان
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {COLORS.map(
                        (value) => (
                          <button
                            key={
                              value
                            }
                            type="button"
                            onClick={() =>
                              toggle(
                                "colors",
                                value,
                              )
                            }
                            className={`rounded-lg border px-2.5 py-1.5 text-[10px] ${
                              colors.includes(
                                value,
                              )
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-secondary text-muted-foreground"
                            }`}
                          >
                            {colors.includes(
                              value,
                            ) ? (
                              <Check className="me-1 inline h-3 w-3" />
                            ) : null}

                            {value}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold">
                        صور المنتج
                      </h3>

                      <p className="text-[9px] text-muted-foreground">
                        {images.length} / 12
                      </p>
                    </div>

                    <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 text-[10px] font-bold text-primary-foreground">
                      {uploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5" />
                      )}

                      إضافة صور

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={
                          uploading ||
                          images.length >=
                            12
                        }
                        className="hidden"
                        onChange={(
                          event,
                        ) => {
                          void uploadImages(
                            event
                              .target
                              .files,
                          );

                          event.target.value =
                            "";
                        }}
                      />
                    </label>
                  </div>

                  {images.length ? (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {images.map(
                        (
                          src,
                          index,
                        ) => (
                          <div
                            key={`${src}-${index}`}
                            className="relative aspect-square overflow-hidden rounded-xl border border-border"
                          >
                            <img
                              src={src}
                              alt=""
                              className="h-full w-full object-cover"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                form.setValue(
                                  "images",
                                  images.filter(
                                    (
                                      _,
                                      imageIndex,
                                    ) =>
                                      imageIndex !==
                                      index,
                                  ),
                                  {
                                    shouldDirty:
                                      true,
                                  },
                                )
                              }
                              className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground"
                              aria-label="حذف الصورة"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                      <ImagePlus className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />

                      <p className="text-[10px] text-muted-foreground">
                        لم تتم إضافة صور بعد
                      </p>
                    </div>
                  )}

                  <ErrorText>
                    {
                      form
                        .formState
                        .errors
                        .images
                        ?.message
                    }
                  </ErrorText>
                </section>
              </div>

              <div className="sticky bottom-0 border-t border-border bg-card/95 p-3 backdrop-blur">
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={
                      saving ||
                      uploading
                    }
                    className={`h-11 flex-1 ${btnCls}`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جارٍ الحفظ...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        {editing
                          ? "حفظ التعديلات"
                          : "إنشاء المنتج"}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={close}
                    disabled={
                      saving ||
                      uploading
                    }
                    className="h-11 rounded-xl border border-border bg-secondary px-4 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
