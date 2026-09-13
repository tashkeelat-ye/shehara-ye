import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import {
  Store,
  Package,
  Plus,
  Pencil,
  Trash2,
  Power,
  BarChart3,
  AlertTriangle,
  Save,
  X,
  Upload,
  Loader2,
  ImagePlus,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  formatPrice,
  type Product,
} from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { uploadManyMedia } from "@/lib/media";

export const Route = createFileRoute(
  "/_authenticated/merchant",
)({
  head: () => ({
    meta: [
      {
        title: "لوحة التاجر | شهارة",
      },
      {
        name: "description",
        content:
          "إدارة متجر ومنتجات التاجر في شهارة.",
      },
    ],
  }),

  component: MerchantPage,
});

type Vendor = {
  id: string;
  name: string;
  city: string;
  phone: string;
  logo_url: string | null;
  description: string;
  is_active: boolean;
  account_enabled: boolean;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ProductForm = {
  id: string | null;
  category_id: string;
  name: string;
  description: string;
  price: string;
  old_price: string;
  city: string;
  images: string[];
  sizes: string;
  colors: string;
  badge: string;
  is_local: boolean;
  is_active: boolean;
  total_stock: string;
  stock_left: string;
  low_stock_threshold: string;
};

const emptyProduct: ProductForm = {
  id: null,
  category_id: "",
  name: "",
  description: "",
  price: "",
  old_price: "",
  city: "",
  images: [],
  sizes: "",
  colors: "",
  badge: "",
  is_local: false,
  is_active: true,
  total_stock: "0",
  stock_left: "0",
  low_stock_threshold: "5",
};

const inputCls =
  "h-11 w-full rounded-2xl border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

const MAX_PRODUCT_IMAGES = 12;

function MerchantPage() {
  const { user } = useAuth();

  const [vendor, setVendor] =
    useState<Vendor | null>(null);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [uploadingImages, setUploadingImages] =
    useState(false);

  const [showProductForm, setShowProductForm] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState<ProductForm>(emptyProduct);

  const [search, setSearch] =
    useState("");

  const load = useCallback(
    async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [
          vendorResult,
          categoryResult,
        ] = await Promise.all([
          supabase
            .from("vendors")
            .select(
              "id,name,city,phone,logo_url,description,is_active,account_enabled",
            )
            .eq("user_id", user.id)
            .maybeSingle<Vendor>(),

          supabase
            .from("categories")
            .select("id,name,slug")
            .order("sort_order")
            .returns<Category[]>(),
        ]);

        if (vendorResult.error) {
          throw vendorResult.error;
        }

        if (categoryResult.error) {
          throw categoryResult.error;
        }

        setVendor(
          vendorResult.data ?? null,
        );

        setCategories(
          categoryResult.data ?? [],
        );

        if (vendorResult.data) {
          const {
            data,
            error,
          } = await supabase
            .from("products")
            .select(
              "id,category_id,vendor_id,name,description,price,old_price,rating,reviews_count,sales_count,city,images,sizes,colors,badge,is_local,is_active,is_featured,featured_sort,total_stock,stock_left,low_stock_threshold,created_at",
            )
            .eq(
              "vendor_id",
              vendorResult.data.id,
            )
            .order("created_at", {
              ascending: false,
            })
            .returns<Product[]>();

          if (error) {
            throw error;
          }

          setProducts(data ?? []);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error(
          "[Merchant] load failed:",
          error,
        );

        toast.error(
          "تعذّر تحميل بيانات المتجر.",
        );
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const active = Boolean(
    vendor?.is_active &&
      vendor?.account_enabled,
  );

  const stats = useMemo(() => {
    const activeProducts =
      products.filter(
        (product) =>
          product.is_active,
      ).length;

    const lowStock =
      products.filter(
        (product) =>
          product.stock_left <=
            product.low_stock_threshold &&
          product.is_active,
      ).length;

    const totalUnits =
      products.reduce(
        (sum, product) =>
          sum + product.stock_left,
        0,
      );

    return {
      total: products.length,
      active: activeProducts,
      lowStock,
      totalUnits,
    };
  }, [products]);

  const filteredProducts =
    useMemo(() => {
      const value =
        search.trim().toLowerCase();

      if (!value) {
        return products;
      }

      return products.filter(
        (product) =>
          product.name
            .toLowerCase()
            .includes(value) ||
          product.description
            .toLowerCase()
            .includes(value),
      );
    }, [products, search]);

  async function saveStoreInfo(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!vendor || !user) {
      return;
    }

    const form =
      new FormData(
        event.currentTarget,
      );

    const name =
      String(
        form.get("name") ?? "",
      ).trim();

    const city =
      String(
        form.get("city") ?? "",
      ).trim();

    const phone =
      String(
        form.get("phone") ?? "",
      ).trim();

    const description =
      String(
        form.get("description") ?? "",
      ).trim();

    if (!name || !city) {
      toast.error(
        "اسم المتجر والمدينة مطلوبان.",
      );
      return;
    }

    setBusy(true);

    try {
      const { error } =
        await supabase
          .from("vendors")
          .update({
            name,
            city,
            phone,
            description,
          })
          .eq("id", vendor.id)
          .eq(
            "user_id",
            user.id,
          );

      if (error) {
        throw error;
      }

      toast.success(
        "تم تحديث بيانات المتجر.",
      );

      await load();
    } catch (error) {
      console.error(
        "[Merchant] store update failed:",
        error,
      );

      toast.error(
        "تعذّر تحديث بيانات المتجر.",
      );
    } finally {
      setBusy(false);
    }
  }

  function openCreateProduct() {
    setEditingProduct({
      ...emptyProduct,
      city:
        vendor?.city ?? "",
      category_id:
        categories[0]?.id ?? "",
      images: [],
    });

    setShowProductForm(true);
  }

  function openEditProduct(
    product: Product,
  ) {
    setEditingProduct({
      id: product.id,

      category_id:
        product.category_id,

      name:
        product.name,

      description:
        product.description,

      price:
        String(product.price),

      old_price:
        product.old_price === null
          ? ""
          : String(
              product.old_price,
            ),

      city:
        product.city,

      images:
        Array.isArray(
          product.images,
        )
          ? [...product.images]
          : [],

      sizes:
        product.sizes.join(", "),

      colors:
        product.colors.join(", "),

      badge:
        product.badge ?? "",

      is_local:
        product.is_local,

      is_active:
        product.is_active,

      total_stock:
        String(
          product.total_stock,
        ),

      stock_left:
        String(
          product.stock_left,
        ),

      low_stock_threshold:
        String(
          product.low_stock_threshold,
        ),
    });

    setShowProductForm(true);
  }

  async function uploadProductImages(
    files: FileList | null,
  ) {
    if (!files || files.length === 0) {
      return;
    }

    if (!user) {
      toast.error(
        "تعذر تحديد حساب التاجر.",
      );
      return;
    }

    const currentImages =
      editingProduct.images;

    const remaining =
      MAX_PRODUCT_IMAGES -
      currentImages.length;

    if (remaining <= 0) {
      toast.error(
        `الحد الأقصى ${MAX_PRODUCT_IMAGES} صورة للمنتج.`,
      );
      return;
    }

    const selected =
      Array.from(files).slice(
        0,
        remaining,
      );

    setUploadingImages(true);

    try {
      const result =
        await uploadManyMedia(
          "products",
          selected,
          `vendors/${user.id}/products`,
        );

      if (
        result.urls.length > 0
      ) {
        setEditingProduct(
          (current) => ({
            ...current,
            images: [
              ...current.images,
              ...result.urls,
            ],
          }),
        );

        toast.success(
          `تم رفع ${result.urls.length} صورة بنجاح.`,
        );
      }

      if (
        result.errors.length > 0
      ) {
        toast.error(
          result.errors.join(" | "),
        );
      }
    } catch (error) {
      console.error(
        "[Merchant] image upload failed:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر رفع الصور.",
      );
    } finally {
      setUploadingImages(false);
    }
  }

  function removeProductImage(
    index: number,
  ) {
    setEditingProduct(
      (current) => ({
        ...current,
        images:
          current.images.filter(
            (_, imageIndex) =>
              imageIndex !== index,
          ),
      }),
    );
  }

  async function saveProduct(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!vendor || !user) {
      return;
    }

    if (!active) {
      toast.error(
        "لا يمكن إدارة المنتجات قبل تفعيل المتجر.",
      );
      return;
    }

    if (uploadingImages) {
      toast.error(
        "انتظر حتى يكتمل رفع الصور.",
      );
      return;
    }

    const form =
      new FormData(
        event.currentTarget,
      );

    const categoryId =
      String(
        form.get(
          "category_id",
        ) ?? "",
      );

    const name =
      String(
        form.get("name") ?? "",
      ).trim();

    const description =
      String(
        form.get(
          "description",
        ) ?? "",
      ).trim();

    const price =
      Number(
        form.get("price"),
      );

    const oldPriceRaw =
      String(
        form.get(
          "old_price",
        ) ?? "",
      ).trim();

    const city =
      String(
        form.get("city") ?? "",
      ).trim();

    const badge =
      String(
        form.get("badge") ?? "",
      ).trim();

    const images =
      editingProduct.images.filter(
        Boolean,
      );

    const sizes =
      String(
        form.get("sizes") ?? "",
      )
        .split(",")
        .map(
          (value) =>
            value.trim(),
        )
        .filter(Boolean);

    const colors =
      String(
        form.get("colors") ?? "",
      )
        .split(",")
        .map(
          (value) =>
            value.trim(),
        )
        .filter(Boolean);

    const totalStock =
      Math.max(
        0,
        Number(
          form.get(
            "total_stock",
          ),
        ) || 0,
      );

    const stockLeft =
      Math.max(
        0,
        Math.min(
          totalStock,
          Number(
            form.get(
              "stock_left",
            ),
          ) || 0,
        ),
      );

    const threshold =
      Math.max(
        0,
        Number(
          form.get(
            "low_stock_threshold",
          ),
        ) || 0,
      );

    const isLocal =
      form.get(
        "is_local",
      ) === "on";

    const isActive =
      form.get(
        "is_active",
      ) === "on";

    if (!categoryId) {
      toast.error(
        "اختر تصنيف المنتج.",
      );
      return;
    }

    if (!name) {
      toast.error(
        "اسم المنتج مطلوب.",
      );
      return;
    }

    if (
      !Number.isFinite(
        price,
      ) ||
      price <= 0
    ) {
      toast.error(
        "أدخل سعرًا صحيحًا.",
      );
      return;
    }

    if (!city) {
      toast.error(
        "مدينة المنتج مطلوبة.",
      );
      return;
    }

    const oldPrice =
      oldPriceRaw === ""
        ? null
        : Number(
            oldPriceRaw,
          );

    if (
      oldPrice !== null &&
      (
        !Number.isFinite(
          oldPrice,
        ) ||
        oldPrice < 0
      )
    ) {
      toast.error(
        "السعر السابق غير صحيح.",
      );
      return;
    }

    setBusy(true);

    try {
      const payload = {
        category_id:
          categoryId,

        vendor_id:
          vendor.id,

        name,

        description,

        price,

        old_price:
          oldPrice,

        city,

        images,

        sizes,

        colors,

        badge:
          badge || null,

        is_local:
          isLocal,

        is_active:
          isActive,

        total_stock:
          totalStock,

        stock_left:
          stockLeft,

        low_stock_threshold:
          threshold,
      };

      if (editingProduct.id) {
        const {
          error,
        } = await supabase
          .from("products")
          .update(payload)
          .eq(
            "id",
            editingProduct.id,
          )
          .eq(
            "vendor_id",
            vendor.id,
          );

        if (error) {
          throw error;
        }

        toast.success(
          "تم تحديث المنتج بنجاح.",
        );
      } else {
        const {
          error,
        } = await supabase
          .from("products")
          .insert(payload);

        if (error) {
          throw error;
        }

        toast.success(
          "تمت إضافة المنتج وظهر في متجرك.",
        );
      }

      setShowProductForm(false);

      setEditingProduct(
        emptyProduct,
      );

      await load();
    } catch (error) {
      console.error(
        "[Merchant] product save failed:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "تعذّر حفظ المنتج.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleProduct(
    product: Product,
  ) {
    if (!vendor) {
      return;
    }

    setBusy(true);

    try {
      const {
        error,
      } = await supabase
        .from("products")
        .update({
          is_active:
            !product.is_active,
        })
        .eq(
          "id",
          product.id,
        )
        .eq(
          "vendor_id",
          vendor.id,
        );

      if (error) {
        throw error;
      }

      toast.success(
        product.is_active
          ? "تم إيقاف المنتج."
          : "تم تفعيل المنتج.",
      );

      await load();
    } catch (error) {
      console.error(
        "[Merchant] toggle failed:",
        error,
      );

      toast.error(
        "تعذّر تغيير حالة المنتج.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(
    product: Product,
  ) {
    if (!vendor) {
      return;
    }

    const confirmed =
      window.confirm(
        `هل أنت متأكد من حذف المنتج «${product.name}»؟`,
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);

    try {
      const {
        error,
      } = await supabase
        .from("products")
        .delete()
        .eq(
          "id",
          product.id,
        )
        .eq(
          "vendor_id",
          vendor.id,
        );

      if (error) {
        throw error;
      }

      toast.success(
        "تم حذف المنتج.",
      );

      await load();
    } catch (error) {
      console.error(
        "[Merchant] delete failed:",
        error,
      );

      toast.error(
        "تعذّر حذف المنتج.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-5xl px-4 py-10 text-center text-sm text-muted-foreground"
      >
        جارٍ تحميل لوحة التاجر...
      </div>
    );
  }

  if (!vendor) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-2xl space-y-4 px-4 py-8"
      >
        <section className="rounded-3xl border border-border bg-card p-6 text-center">
          <Store className="mx-auto h-12 w-12 text-primary" />

          <h1 className="mt-4 text-xl font-bold text-foreground">
            لا يوجد متجر مرتبط
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            لا يوجد متجر مرتبط بحسابك حتى الآن.
          </p>

          <Link
            to="/account"
            className="mt-5 inline-flex h-11 items-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            العودة إلى الحساب
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-28 pt-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Store className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-foreground">
              {vendor.name}
            </h1>

            <p className="text-xs text-muted-foreground">
              لوحة إدارة المتجر
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            active
              ? "bg-primary/10 text-primary"
              : "bg-yellow-500/10 text-yellow-700"
          }`}
        >
          {active
            ? "المتجر مفعّل"
            : "بانتظار موافقة الإدارة"}
        </span>
      </header>

      {!active ? (
        <section className="rounded-3xl border border-yellow-500/30 bg-yellow-500/5 p-5">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />

            <div>
              <h2 className="text-sm font-bold text-foreground">
                المتجر قيد المراجعة
              </h2>

              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                سيتمكن التاجر من إضافة المنتجات وإدارتها بعد اعتماد المتجر من لوحة الإدارة.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={Package}
          label="إجمالي المنتجات"
          value={stats.total}
        />

        <Stat
          icon={Power}
          label="منتجات نشطة"
          value={stats.active}
        />

        <Stat
          icon={AlertTriangle}
          label="مخزون منخفض"
          value={stats.lowStock}
        />

        <Stat
          icon={BarChart3}
          label="الوحدات المتاحة"
          value={stats.totalUnits}
        />
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">
          بيانات المتجر
        </h2>

        <form
          onSubmit={saveStoreInfo}
          className="mt-4 grid gap-3 md:grid-cols-2"
        >
          <input
            name="name"
            defaultValue={
              vendor.name
            }
            className={inputCls}
            placeholder="اسم المتجر"
            maxLength={120}
          />

          <input
            name="city"
            defaultValue={
              vendor.city
            }
            className={inputCls}
            placeholder="المدينة"
            maxLength={80}
          />

          <input
            name="phone"
            defaultValue={
              vendor.phone
            }
            className={inputCls}
            dir="ltr"
            placeholder="هاتف المتجر"
            maxLength={20}
          />

          <textarea
            name="description"
            defaultValue={
              vendor.description
            }
            className={`${inputCls} h-24 py-2 md:col-span-2`}
            placeholder="وصف المتجر"
            maxLength={500}
          />

          <button
            type="submit"
            disabled={busy}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60 md:w-fit"
          >
            <Save className="h-4 w-4" />
            حفظ بيانات المتجر
          </button>
        </form>
      </section>

      {active ? (
        <section className="space-y-4 rounded-3xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                منتجات المتجر
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                أضف منتجاتك لتظهر مباشرةً في متجر شهارة.
              </p>
            </div>

            <button
              type="button"
              onClick={
                openCreateProduct
              }
              disabled={
                busy ||
                uploadingImages
              }
              className="flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              إضافة منتج
            </button>
          </div>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            className={inputCls}
            placeholder="ابحث في منتجات متجرك..."
          />

          {filteredProducts.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <Package className="mx-auto h-10 w-10 text-muted-foreground" />

              <p className="mt-3 text-sm font-semibold text-foreground">
                لا توجد منتجات
              </p>

              <button
                type="button"
                onClick={
                  openCreateProduct
                }
                className="mt-3 text-xs text-primary"
              >
                إضافة أول منتج
              </button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredProducts.map(
                (product) => (
                  <ProductCard
                    key={
                      product.id
                    }
                    product={
                      product
                    }
                    busy={busy}
                    onEdit={
                      openEditProduct
                    }
                    onToggle={
                      toggleProduct
                    }
                    onDelete={
                      removeProduct
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      ) : null}

      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">
          الوصول السريع
        </h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {active ? (
            <Link
              to="/vendor/$id"
              params={{
                id: vendor.id,
              }}
              className="rounded-2xl border border-border px-4 py-2 text-xs text-foreground"
            >
              عرض صفحة المتجر
            </Link>
          ) : null}

          <Link
            to="/account"
            className="rounded-2xl border border-border px-4 py-2 text-xs text-foreground"
          >
            حسابي
          </Link>
        </div>
      </section>

      {showProductForm ? (
        <ProductModal
          form={
            editingProduct
          }
          categories={
            categories
          }
          busy={
            busy
          }
          uploading={
            uploadingImages
          }
          onClose={() => {
            if (
              !busy &&
              !uploadingImages
            ) {
              setShowProductForm(
                false,
              );
            }
          }}
          onUpload={
            uploadProductImages
          }
          onRemoveImage={
            removeProductImage
          }
          onSubmit={
            saveProduct
          }
        />
      ) : null}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon className="h-5 w-5 text-primary" />

      <p className="mt-3 text-2xl font-bold text-foreground">
        {value.toLocaleString(
          "ar-EG",
        )}
      </p>

      <p className="mt-1 text-[11px] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function ProductCard({
  product,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  product: Product;
  busy: boolean;
  onEdit: (
    product: Product,
  ) => void;
  onToggle: (
    product: Product,
  ) => void;
  onDelete: (
    product: Product,
  ) => void;
}) {
  const image =
    product.images?.[0] ??
    "/icon-192.png";

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex gap-3 p-3">
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          className="h-20 w-20 shrink-0 rounded-xl object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {product.name}
            </h3>

            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${
                product.is_active
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {product.is_active
                ? "نشط"
                : "متوقف"}
            </span>
          </div>

          <p className="mt-1 text-sm font-bold text-primary">
            {formatPrice(
              product.price,
            )}
          </p>

          <p className="mt-1 text-[11px] text-muted-foreground">
            المخزون:{" "}
            {product.stock_left.toLocaleString(
              "ar-EG",
            )}
          </p>

          {product.stock_left <=
          product.low_stock_threshold ? (
            <p className="mt-1 text-[10px] text-yellow-700">
              مخزون منخفض
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex border-t border-border">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onEdit(product)
          }
          className="flex flex-1 items-center justify-center gap-1.5 py-3 text-xs text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
          تعديل
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onToggle(product)
          }
          className="flex flex-1 items-center justify-center gap-1.5 border-x border-border py-3 text-xs text-primary"
        >
          <Power className="h-3.5 w-3.5" />

          {product.is_active
            ? "إيقاف"
            : "تفعيل"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onDelete(product)
          }
          className="flex flex-1 items-center justify-center gap-1.5 py-3 text-xs text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          حذف
        </button>
      </div>
    </article>
  );
}

function ProductModal({
  form,
  categories,
  busy,
  uploading,
  onClose,
  onUpload,
  onRemoveImage,
  onSubmit,
}: {
  form: ProductForm;
  categories: Category[];
  busy: boolean;
  uploading: boolean;
  onClose: () => void;
  onUpload: (
    files: FileList | null,
  ) => void;
  onRemoveImage: (
    index: number,
  ) => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-card p-5 sm:rounded-[2rem]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {form.id
                ? "تعديل المنتج"
                : "إضافة منتج جديد"}
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              بيانات المنتج ستُحفظ مباشرةً في قاعدة البيانات.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={
              busy ||
              uploading
            }
            className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-5 space-y-3"
        >
          <label className="block text-xs font-medium text-foreground">
            التصنيف

            <select
              name="category_id"
              defaultValue={
                form.category_id
              }
              className={`${inputCls} mt-1`}
              required
            >
              <option value="">
                اختر التصنيف
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
          </label>

          <label className="block text-xs font-medium text-foreground">
            اسم المنتج

            <input
              name="name"
              defaultValue={
                form.name
              }
              className={`${inputCls} mt-1`}
              maxLength={200}
              required
            />
          </label>

          <label className="block text-xs font-medium text-foreground">
            وصف المنتج

            <textarea
              name="description"
              defaultValue={
                form.description
              }
              className={`${inputCls} mt-1 h-24 py-2`}
              maxLength={2000}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-foreground">
              السعر

              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  form.price
                }
                className={`${inputCls} mt-1`}
                required
              />
            </label>

            <label className="block text-xs font-medium text-foreground">
              السعر السابق

              <input
                name="old_price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  form.old_price
                }
                className={`${inputCls} mt-1`}
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-foreground">
            المدينة

            <input
              name="city"
              defaultValue={
                form.city
              }
              className={`${inputCls} mt-1`}
              maxLength={80}
              required
            />
          </label>

          <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-primary" />

              <div>
                <h3 className="text-xs font-bold text-foreground">
                  صور المنتج
                </h3>

                <p className="text-[10px] text-muted-foreground">
                  اختر الصور مباشرة من جهازك، ولا حاجة لإدخال روابط.
                </p>
              </div>
            </div>

            {form.images.length >
            0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {form.images.map(
                  (
                    image,
                    index,
                  ) => (
                    <div
                      key={`${image}-${index}`}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary"
                    >
                      <img
                        src={image}
                        alt={`صورة المنتج ${index + 1}`}
                        className="h-full w-full object-cover"
                      />

                      {index ===
                      0 ? (
                        <span className="absolute bottom-1 start-1 rounded-full bg-black/65 px-2 py-1 text-[8px] text-white">
                          الرئيسية
                        </span>
                      ) : null}

                      <button
                        type="button"
                        disabled={
                          busy ||
                          uploading
                        }
                        onClick={() =>
                          onRemoveImage(
                            index,
                          )
                        }
                        className="absolute end-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground"
                        aria-label="حذف الصورة"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center">
                <ImagePlus className="mx-auto h-7 w-7 text-muted-foreground" />

                <p className="mt-2 text-[10px] text-muted-foreground">
                  لم تتم إضافة صور بعد
                </p>
              </div>
            )}

            <label className="mt-3 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground transition hover:bg-secondary">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Upload className="h-4 w-4 text-primary" />
              )}

              <span>
                {uploading
                  ? "جارٍ رفع الصور..."
                  : "اختيار صور من الجهاز"}
              </span>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                multiple
                disabled={
                  busy ||
                  uploading ||
                  form.images.length >=
                    MAX_PRODUCT_IMAGES
                }
                className="hidden"
                onChange={(
                  event,
                ) => {
                  void onUpload(
                    event.target
                      .files,
                  );

                  event.target.value =
                    "";
                }}
              />
            </label>

            <p className="mt-2 text-[9px] text-muted-foreground">
              الحد الأقصى {MAX_PRODUCT_IMAGES} صورة — حجم الصورة وفق سياسة التخزين الحالية.
            </p>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-foreground">
              المقاسات

              <input
                name="sizes"
                defaultValue={
                  form.sizes
                }
                className={`${inputCls} mt-1`}
                placeholder="S, M, L, XL"
              />
            </label>

            <label className="block text-xs font-medium text-foreground">
              الألوان

              <input
                name="colors"
                defaultValue={
                  form.colors
                }
                className={`${inputCls} mt-1`}
                placeholder="أسود, أبيض"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-foreground">
            الشارة

            <input
              name="badge"
              defaultValue={
                form.badge
              }
              className={`${inputCls} mt-1`}
              placeholder="جديد / عرض / الأكثر مبيعًا"
              maxLength={50}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-medium text-foreground">
              إجمالي المخزون

              <input
                name="total_stock"
                type="number"
                min="0"
                step="1"
                defaultValue={
                  form.total_stock
                }
                className={`${inputCls} mt-1`}
              />
            </label>

            <label className="block text-xs font-medium text-foreground">
              المخزون الحالي

              <input
                name="stock_left"
                type="number"
                min="0"
                step="1"
                defaultValue={
                  form.stock_left
                }
                className={`${inputCls} mt-1`}
              />
            </label>

            <label className="block text-xs font-medium text-foreground">
              حد المخزون المنخفض

              <input
                name="low_stock_threshold"
                type="number"
                min="0"
                step="1"
                defaultValue={
                  form.low_stock_threshold
                }
                className={`${inputCls} mt-1`}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3 rounded-2xl border border-border p-3">
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                name="is_active"
                type="checkbox"
                defaultChecked={
                  form.is_active
                }
              />

              عرض المنتج للعملاء
            </label>

            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                name="is_local"
                type="checkbox"
                defaultChecked={
                  form.is_local
                }
              />

              منتج محلي
            </label>
          </div>

          <button
            type="submit"
            disabled={
              busy ||
              uploading
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Save className="h-4 w-4" />

            {busy
              ? "جارٍ الحفظ..."
              : form.id
                ? "حفظ تعديلات المنتج"
                : "إضافة المنتج"}
          </button>
        </form>
      </div>
    </div>
  );
}
