import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  useForm,
  type SubmitHandler,
} from "react-hook-form";
import {
  zodResolver,
} from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Check,
  Edit2,
  ImagePlus,
  Layers,
  Loader2,
  Package,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  AdminCard,
  btnCls,
  inputCls,
} from "@/components/admin-ui";
import { uploadManyMedia } from "@/lib/media";
import {
  fetchSettings,
} from "@/lib/store";
import {
  DEFAULT_SAR_RATE,
} from "@/lib/money";
import type {
  Category,
  Product,
} from "@/lib/db";

export const Route =
  createFileRoute("/admin/products")({
    component: AdminProducts,
  });

const PRESET_SIZES = [
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

const PRESET_COLORS = [
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
  (value) => {
    if (
      value === "" ||
      value === undefined ||
      value === null
    ) {
      return 0;
    }

    const number =
      typeof value === "number"
        ? value
        : Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  },
  z.number().finite().min(0),
);

const formSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "اسم المنتج مطلوب",
      )
      .max(
        120,
        "اسم المنتج طويل جدًا",
      ),

    category_id: z
      .string()
      .min(
        1,
        "يرجى اختيار الفئة",
      ),

    price: numberField,

    old_price: numberField,

    price_sar: numberField,

    description: z
      .string()
      .max(
        5000,
        "الوصف طويل جدًا",
      ),

    city: z
      .string()
      .trim()
      .max(
        100,
        "اسم المدينة طويل جدًا",
      ),

    badge: z
      .string()
      .trim()
      .max(
        60,
        "الشارة طويلة جدًا",
      ),

    images: z
      .array(
        z.string().min(1),
      )
      .max(
        12,
        "الحد الأقصى 12 صورة",
      ),

    sizes: z.array(
      z.string(),
    ),

    colors: z.array(
      z.string(),
    ),

    is_local: z.boolean(),

    is_active: z.boolean(),

    total_stock:
      numberField.pipe(
        z
          .number()
          .int(
            "المخزون يجب أن يكون عددًا صحيحًا",
          ),
      ),

    stock_left:
      numberField.pipe(
        z
          .number()
          .int(
            "المخزون المتبقي يجب أن يكون عددًا صحيحًا",
          ),
      ),

    low_stock_threshold:
      numberField.pipe(
        z
          .number()
          .int(
            "حد التنبيه يجب أن يكون عددًا صحيحًا",
          ),
      ),
  })
  .refine(
    (value) =>
      value.stock_left <=
      value.total_stock,
    {
      message:
        "المخزون المتبقي لا يمكن أن يكون أكبر من إجمالي المخزون",
      path: [
        "stock_left",
      ],
    },
  );

type FormValues =
  z.infer<
    typeof formSchema
  >;

type ProductRow =
  Product & {
    low_stock_threshold?: number | null;
  };

const EMPTY_FORM: FormValues =
  {
    name: "",
    category_id: "",
    price: 0,
    old_price: 0,
    price_sar: 0,
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

function toNumber(
  value: unknown,
): number {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function normalizeProduct(
  product: ProductRow,
): ProductRow {
  return {
    ...product,

    price: toNumber(
      product.price,
    ),

    old_price:
      product.old_price ===
      null
        ? null
        : toNumber(
            product.old_price,
          ),

    sales_count:
      toNumber(
        product.sales_count,
      ),

    rating:
      toNumber(
        product.rating,
      ),

    reviews_count:
      toNumber(
        product.reviews_count,
      ),

    total_stock:
      toNumber(
        product.total_stock,
      ),

    stock_left:
      toNumber(
        product.stock_left,
      ),

    low_stock_threshold:
      product.low_stock_threshold ==
      null
        ? 5
        : toNumber(
            product.low_stock_threshold,
          ),

    images:
      Array.isArray(
        product.images,
      )
        ? product.images
        : [],

    sizes:
      Array.isArray(
        product.sizes,
      )
        ? product.sizes
        : [],

    colors:
      Array.isArray(
        product.colors,
      )
        ? product.colors
        : [],
  };
}

function productToForm(
  product: ProductRow,
  sarRate: number,
): FormValues {
  const p =
    normalizeProduct(
      product,
    );

  return {
    name:
      p.name ?? "",

    category_id:
      p.category_id ?? "",

    price:
      p.price,

    old_price:
      p.old_price ?? 0,

    price_sar:
      sarRate > 0
        ? Math.round(
            (p.price /
              sarRate) *
              100,
          ) / 100
        : 0,

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
      p.is_active !== false,

    total_stock:
      p.total_stock,

    stock_left:
      p.stock_left,

    low_stock_threshold:
      p.low_stock_threshold ??
      5,
  };
}

function getSupabaseErrorMessage(
  error: unknown,
): string {
  if (
    error &&
    typeof error === "object"
  ) {
    const candidate =
      error as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
        code?: unknown;
      };

    const parts: string[] =
      [];

    if (
      typeof candidate.message ===
      "string" &&
      candidate.message.trim()
    ) {
      parts.push(
        candidate.message.trim(),
      );
    }

    if (
      typeof candidate.details ===
      "string" &&
      candidate.details.trim()
    ) {
      parts.push(
        `التفاصيل: ${candidate.details.trim()}`,
      );
    }

    if (
      typeof candidate.hint ===
      "string" &&
      candidate.hint.trim()
    ) {
      parts.push(
        `التلميح: ${candidate.hint.trim()}`,
      );
    }

    if (
      typeof candidate.code ===
      "string" &&
      candidate.code.trim()
    ) {
      parts.push(
        `رمز الخطأ: ${candidate.code.trim()}`,
      );
    }

    if (parts.length) {
      return parts.join(
        " — ",
      );
    }
  }

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  if (
    typeof error === "string" &&
    error.trim()
  ) {
    return error;
  }

  try {
    return JSON.stringify(
      error,
    );
  } catch {
    return "حدث خطأ غير معروف أثناء تنفيذ العملية";
  }
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string | undefined;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-foreground">
        {label}
      </span>

      {children}

      {error ? (
        <span className="mt-1 block text-[10px] font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function AdminProducts() {
  const [
    products,
    setProducts,
  ] = useState<ProductRow[]>(
    [],
  );

  const [
    categories,
    setCategories,
  ] = useState<Category[]>(
    [],
  );

  const [
    editing,
    setEditing,
  ] = useState<ProductRow | null>(
    null,
  );

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    fetchError,
    setFetchError,
  ] = useState<
    string | null
  >(null);

  const [
    sarRate,
    setSarRate,
  ] = useState(
    DEFAULT_SAR_RATE,
  );

  const [
    activeTab,
    setActiveTab,
  ] = useState<
    | "basic"
    | "attributes"
    | "supplier"
  >("basic");

  const form =
    useForm<FormValues>({
      resolver:
        zodResolver(
          formSchema,
        ) as unknown as Resolver<FormValues>,
      defaultValues:
        EMPTY_FORM,
      mode: "onBlur",
    });

  const images =
    form.watch("images");

  const sizes =
    form.watch("sizes");

  const colors =
    form.watch("colors");

  const totalStock =
    form.watch(
      "total_stock",
    );

  const stockLeft =
    form.watch(
      "stock_left",
    );

  const threshold =
    form.watch(
      "low_stock_threshold",
    );

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setFetchError(null);

        try {
          const [
            productsResult,
            categoriesResult,
            settings,
          ] =
            await Promise.all([
              supabase
                .from(
                  "products",
                )
                .select("*")
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  },
                ),

              supabase
                .from(
                  "categories",
                )
                .select(
                  "id,slug,name,icon,sort_order",
                )
                .order(
                  "sort_order",
                ),

              fetchSettings().catch(
                () => null,
              ),
            ]);

          if (
            productsResult.error
          ) {
            throw productsResult.error;
          }

          if (
            categoriesResult.error
          ) {
            throw categoriesResult.error;
          }

          setProducts(
            (
              (productsResult.data ??
                []) as unknown as ProductRow[]
            ).map(
              normalizeProduct,
            ),
          );

          setCategories(
            (categoriesResult.data ??
              []) as Category[],
          );

          if (
            settings?.sar_rate &&
            settings.sar_rate >
              0
          ) {
            setSarRate(
              settings.sar_rate,
            );
          }
        } catch (error) {
          const message =
            getSupabaseErrorMessage(
              error,
            );

          setFetchError(
            message,
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

  function openNewProduct() {
    setEditing(null);
    setActiveTab(
      "basic",
    );

    form.reset({
      ...EMPTY_FORM,
      category_id:
        categories[0]?.id ??
        "",
      price_sar: 0,
    });

    setOpen(true);
  }

  function openEditProduct(
    product: ProductRow,
  ) {
    setEditing(
      product,
    );

    setActiveTab(
      "basic",
    );

    form.reset(
      productToForm(
        product,
        sarRate,
      ),
    );

    setOpen(true);
  }

  function closeForm() {
    if (
      saving ||
      uploading
    ) {
      return;
    }

    setOpen(false);
    setEditing(null);
    form.reset(
      EMPTY_FORM,
    );
  }

  function togglePreset(
    field:
      | "sizes"
      | "colors",
    value: string,
  ) {
    const current =
      form.getValues(
        field,
      );

    const exists =
      current.includes(
        value,
      );

    const next = exists
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
        shouldDirty:
          true,
        shouldValidate:
          true,
      },
    );
  }

  function changeYERPrice(
    value: number,
  ) {
    const price =
      Number.isFinite(
        value,
      )
        ? value
        : 0;

    const priceSAR =
      sarRate > 0
        ? Math.round(
            (price /
              sarRate) *
              100,
          ) / 100
        : 0;

    form.setValue(
      "price",
      price,
      {
        shouldDirty:
          true,
        shouldValidate:
          true,
      },
    );

    form.setValue(
      "price_sar",
      priceSAR,
      {
        shouldDirty:
          true,
        shouldValidate:
          true,
      },
    );
  }

  function changeSARPrice(
    value: number,
  ) {
    const priceSAR =
      Number.isFinite(
        value,
      )
        ? value
        : 0;

    const priceYER =
      Math.round(
        priceSAR *
          sarRate,
      );

    form.setValue(
      "price_sar",
      priceSAR,
      {
        shouldDirty:
          true,
        shouldValidate:
          true,
      },
    );

    form.setValue(
      "price",
      priceYER,
      {
        shouldDirty:
          true,
        shouldValidate:
          true,
      },
    );
  }

  async function uploadImages(
    files: FileList | null,
  ) {
    if (
      !files ||
      files.length === 0
    ) {
      return;
    }

    const remaining =
      12 - images.length;

    if (remaining <= 0) {
      toast.error(
        "الحد الأقصى 12 صورة للمنتج",
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

      if (
        result.urls.length
      ) {
        form.setValue(
          "images",
          [
            ...images,
            ...result.urls,
          ],
          {
            shouldDirty:
              true,
            shouldValidate:
              true,
          },
        );

        toast.success(
          `تم رفع ${result.urls.length} صورة بنجاح`,
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
    } catch (error) {
      toast.error(
        `تعذر رفع الصور: ${getSupabaseErrorMessage(
          error,
        )}`,
      );
    } finally {
      setUploading(false);
    }
  }

  const save:
    SubmitHandler<FormValues> =
    async (values) => {
      setSaving(true);

      try {
        if (
          !values.category_id
        ) {
          toast.error(
            "يرجى اختيار فئة المنتج",
          );
          return;
        }

        const payload = {
          name:
            values.name.trim(),

          category_id:
            values.category_id,

          description:
            values.description.trim(),

          price:
            Number(values.price),

          old_price:
            values.old_price >
            0
              ? Number(
                  values.old_price,
                )
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
            Number(
              values.total_stock,
            ),

          stock_left:
            Number(
              values.stock_left,
            ),

          low_stock_threshold:
            Number(
              values.low_stock_threshold,
            ),
        };

        /*
         * مهم:
         * لا نرسل price_sar إلى قاعدة البيانات.
         * هو قيمة محسوبة للعرض فقط.
         */

        if (editing) {
          const {
            error,
          } =
            await supabase
              .from(
                "products",
              )
              .update(
                payload,
              )
              .eq(
                "id",
                editing.id,
              );

          if (error) {
            throw error;
          }

          const oldStock =
            toNumber(
              editing.stock_left,
            );

          const newStock =
            Number(
              values.stock_left,
            );

          const difference =
            newStock -
            oldStock;

          /*
           * نسجل حركة المخزون فقط إذا تغيرت الكمية.
           * فشل سجل الحركة لا يلغي نجاح تحديث المنتج.
           */
          if (
            difference !== 0
          ) {
            const {
              data:
                sessionData,
            } =
              await supabase.auth.getSession();

            const userId =
              sessionData
                .session
                ?.user.id ??
              null;

            const {
              error:
                movementError,
            } =
              await supabase
                .from(
                  "inventory_movements" as never,
                )
                .insert({
                  product_id:
                    editing.id,

                  quantity:
                    difference,

                  movement_type:
                    difference >
                    0
                      ? "purchase"
                      : "adjustment",

                  note:
                    "تعديل المخزون من صفحة إدارة المنتجات",

                  created_by:
                    userId,
                } as never);

            if (
              movementError
            ) {
              toast.warning(
                `تم تحديث المنتج، لكن تعذر تسجيل حركة المخزون: ${getSupabaseErrorMessage(
                  movementError,
                )}`,
              );
            }
          }

          toast.success(
            "تم تحديث المنتج والمخزون بنجاح",
          );
        } else {
          /*
           * إنشاء المنتج.
           *
           * لا نستخدم select().single()
           * هنا حتى لا يفشل الإنشاء بسبب
           * مشكلة في سياسة SELECT.
           */
          const {
            error,
          } =
            await supabase
              .from(
                "products",
              )
              .insert(
                payload,
              );

          if (error) {
            throw error;
          }

          toast.success(
            "تم إنشاء المنتج والمخزون بنجاح",
          );
        }

        closeForm();

        await load();
      } catch (error) {
        const message =
          getSupabaseErrorMessage(
            error,
          );

        console.error(
          "AdminProducts save error:",
          error,
        );

        toast.error(
          `تعذر حفظ المنتج: ${message}`,
          {
            duration: 9000,
          },
        );
      } finally {
        setSaving(false);
      }
    };

  async function removeProduct(
    product: ProductRow,
  ) {
    const confirmed =
      window.confirm(
        `هل تريد حذف المنتج "${product.name}"؟`,
      );

    if (!confirmed) {
      return;
    }

    try {
      const {
        error,
      } =
        await supabase
          .from("products")
          .delete()
          .eq(
            "id",
            product.id,
          );

      if (error) {
        throw error;
      }

      toast.success(
        "تم حذف المنتج بنجاح",
      );

      await load();
    } catch (error) {
      toast.error(
        `تعذر حذف المنتج: ${getSupabaseErrorMessage(
          error,
        )}`,
      );
    }
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
              openNewProduct
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
                  (product) =>
                    product.stock_left >
                      0 &&
                    product.stock_left <=
                      (product.low_stock_threshold ??
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
                  (product) =>
                    product.stock_left <=
                    0,
                )
                .length.toLocaleString(
                  "ar-EG",
                )}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            جارٍ تحميل المنتجات...
          </div>
        ) : fetchError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
            <AlertCircle className="mx-auto mb-2 h-6 w-6" />

            <p className="text-xs font-bold">
              {fetchError}
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
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Package className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />

            <p className="text-xs text-muted-foreground">
              لا توجد منتجات حاليًا.
            </p>
          </div>
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
                        openEditProduct(
                          product,
                        )
                      }
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary"
                      aria-label={`تعديل ${product.name}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void removeProduct(
                          product,
                        )
                      }
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"
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
                  إدارة المنتج والأسعار والمخزون
                </p>
              </div>

              <button
                type="button"
                disabled={
                  saving ||
                  uploading
                }
                onClick={
                  closeForm
                }
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={form.handleSubmit(
                save,
              )}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <div className="space-y-4 p-4">
                <div className="flex rounded-xl bg-secondary p-1 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "basic",
                      )
                    }
                    className={`flex-1 rounded-lg py-2 font-medium ${
                      activeTab ===
                      "basic"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    الأساسية
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "attributes",
                      )
                    }
                    className={`flex-1 rounded-lg py-2 font-medium ${
                      activeTab ===
                      "attributes"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    الخصائص
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "supplier",
                      )
                    }
                    className={`flex-1 rounded-lg py-2 font-medium ${
                      activeTab ===
                      "supplier"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    المورد
                  </button>
                </div>

                {activeTab ===
                "basic" ? (
                  <div className="space-y-4">
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

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field
                        label="السعر بالريال اليمني *"
                        error={
                          form
                            .formState
                            .errors
                            .price
                            ?.message
                        }
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className={
                            inputCls
                          }
                          value={
                            form.watch(
                              "price",
                            ) ||
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            changeYERPrice(
                              Number(
                                event
                                  .target
                                  .value,
                              ),
                            )
                          }
                        />
                      </Field>

                      <Field label={`السعر بالريال السعودي — 1 ر.س = ${sarRate.toLocaleString("ar-EG")} ر.ي`}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className={
                            inputCls
                          }
                          value={
                            form.watch(
                              "price_sar",
                            ) ||
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            changeSARPrice(
                              Number(
                                event
                                  .target
                                  .value,
                              ),
                            )
                          }
                        />
                      </Field>
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      يتم احتساب السعر المقابل تلقائيًا باستخدام سعر الصرف الحالي.
                    </p>

                    <Field
                      label="السعر السابق"
                      error={
                        form
                          .formState
                          .errors
                          .old_price
                          ?.message
                      }
                    >
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
                        placeholder="اتركه 0 إذا لم يوجد خصم"
                      />
                    </Field>

                    <Field label="الشارة">
                      <input
                        {...form.register(
                          "badge",
                        )}
                        className={
                          inputCls
                        }
                        placeholder="جديد / خصم 20% / الأكثر مبيعًا"
                      />
                    </Field>

                    <Field label="الوصف">
                      <textarea
                        {...form.register(
                          "description",
                        )}
                        rows={4}
                        className={`${inputCls} h-auto resize-y py-2.5`}
                        placeholder="اكتب وصف المنتج..."
                      />
                    </Field>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
                        <span>
                          <b className="block text-[11px]">
                            منتج يمني محلي
                          </b>

                          <small className="text-[9px] text-muted-foreground">
                            يظهر ضمن المنتجات المحلية
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

                      <label className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
                        <span>
                          <b className="block text-[11px]">
                            نشر المنتج
                          </b>

                          <small className="text-[9px] text-muted-foreground">
                            يظهر للعملاء
                          </small>
                        </span>

                        <input
                          {...form.register(
                            "is_active",
                          )}
                          type="checkbox"
                          className="h-4 w-4"
                        />
                      </label>
                    </div>

                    <section className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
                      <div className="mb-3 flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />

                        <div>
                          <h3 className="text-xs font-bold">
                            المخزون
                          </h3>

                          <p className="text-[9px] text-muted-foreground">
                            حدد الكمية الفعلية وحد التنبيه
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
                          label="المتوفر حاليًا *"
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
                        className={`mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-[10px] font-bold ${
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
                            ? "المنتج سيظهر كنافد"
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

                    <Field label="المقاسات / الأحجام">
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_SIZES.map(
                          (
                            size,
                          ) => {
                            const active =
                              sizes.includes(
                                size,
                              );

                            return (
                              <button
                                key={
                                  size
                                }
                                type="button"
                                onClick={() =>
                                  togglePreset(
                                    "sizes",
                                    size,
                                  )
                                }
                                className={`rounded-lg border px-2.5 py-1.5 text-[10px] ${
                                  active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-secondary text-muted-foreground"
                                }`}
                              >
                                {active ? (
                                  <Check className="me-1 inline h-3 w-3" />
                                ) : null}

                                {
                                  size
                                }
                              </button>
                            );
                          },
                        )}
                      </div>
                    </Field>

                    <Field label="الألوان">
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_COLORS.map(
                          (
                            color,
                          ) => {
                            const active =
                              colors.includes(
                                color,
                              );

                            return (
                              <button
                                key={
                                  color
                                }
                                type="button"
                                onClick={() =>
                                  togglePreset(
                                    "colors",
                                    color,
                                  )
                                }
                                className={`rounded-lg border px-2.5 py-1.5 text-[10px] ${
                                  active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-secondary text-muted-foreground"
                                }`}
                              >
                                {active ? (
                                  <Check className="me-1 inline h-3 w-3" />
                                ) : null}

                                {
                                  color
                                }
                              </button>
                            );
                          },
                        )}
                      </div>
                    </Field>

                    <Field label="صور المنتج">
                      <div className="space-y-2">
                        {images.length >
                        0 ? (
                          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                            {images.map(
                              (
                                image,
                                index,
                              ) => (
                                <div
                                  key={`${image}-${index}`}
                                  className="relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary"
                                >
                                  <img
                                    src={
                                      image
                                    }
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
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                            <ImagePlus className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />

                            <p className="text-[10px] text-muted-foreground">
                              لم تتم إضافة صور
                            </p>
                          </div>
                        )}

                        <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 text-xs font-medium">
                          {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Upload className="h-4 w-4 text-primary" />
                          )}

                          <span>
                            {uploading
                              ? "جارٍ الرفع..."
                              : "تحميل صور من الجهاز"}
                          </span>

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
                    </Field>
                  </div>
                ) : null}

                {activeTab ===
                "attributes" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-3">
                      <Layers className="h-5 w-5 text-primary" />

                      <div>
                        <p className="text-xs font-bold">
                          خصائص المنتج
                        </p>

                        <p className="text-[10px] text-muted-foreground">
                          يمكن توسيع هذا القسم لاحقًا حسب نوع المنتج.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTab ===
                "supplier" ? (
                  <div className="rounded-2xl border border-border bg-secondary/30 p-5 text-center">
                    <Package className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />

                    <p className="text-xs font-bold">
                      بيانات المورد
                    </p>

                    <p className="mt-1 text-[10px] text-muted-foreground">
                      سيتم ربط هذا القسم بنظام الموردين في المرحلة القادمة.
                    </p>
                  </div>
                ) : null}
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
                    disabled={
                      saving ||
                      uploading
                    }
                    onClick={
                      closeForm
                    }
                    className="h-11 rounded-xl border border-border bg-secondary px-5 text-xs font-bold"
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
