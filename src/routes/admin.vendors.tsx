import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BadgeCheck,
  Package,
  Phone,
  MapPin,
  User,
  RefreshCw,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AdminCard,
  btnGhostCls,
} from "@/components/admin-ui";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/db";

export const Route =
  createFileRoute(
    "/admin/vendors",
  )({
    component:
      AdminVendors,
  });

type VendorRow = {
  id: string;
  name: string;
  city: string;
  phone: string;
  logo_url: string | null;
  description: string;
  is_active: boolean;
  account_enabled: boolean;
  user_id: string | null;
  created_at: string;
};

type ProductRow = {
  id: string;
  name: string;
  price: number;
  old_price: number | null;
  stock_left: number;
  total_stock: number;
  is_active: boolean;
  images: string[];
  city: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  first_name: string;
  second_name: string;
  last_name: string;
  phone: string | null;
  contact_email: string | null;
  province: string;
  wallet_balance: number;
  created_at: string;
};

function AdminVendors() {
  const [rows, setRows] =
    useState<VendorRow[]>([]);

  const [products, setProducts] =
    useState<ProductRow[]>([]);

  const [profiles, setProfiles] =
    useState<
      Record<
        string,
        ProfileRow
      >
    >({});

  const [selected, setSelected] =
    useState<VendorRow | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const load = useCallback(
    async () => {
      setLoading(true);

      try {
        const [
          vendorsResult,
          productsResult,
          profilesResult,
        ] = await Promise.all([
          supabase
            .from("vendors")
            .select(
              "id,name,city,phone,logo_url,description,is_active,account_enabled,user_id,created_at",
            )
            .order(
              "created_at",
              {
                ascending: false,
              },
            )
            .returns<VendorRow[]>(),

          supabase
            .from("products")
            .select(
              "id,name,price,old_price,stock_left,total_stock,is_active,images,city",
            )
            .returns<ProductRow[]>(),

          supabase
            .from("profiles")
            .select(
              "id,full_name,first_name,second_name,last_name,phone,contact_email,province,wallet_balance,created_at",
            )
            .returns<ProfileRow[]>(),
        ]);

        if (vendorsResult.error) {
          throw vendorsResult.error;
        }

        if (productsResult.error) {
          throw productsResult.error;
        }

        if (profilesResult.error) {
          throw profilesResult.error;
        }

        setRows(
          vendorsResult.data ??
            [],
        );

        setProducts(
          productsResult.data ??
            [],
        );

        const profileMap:
          Record<
            string,
            ProfileRow
          > = {};

        for (const profile of
          profilesResult.data ??
          []) {
          profileMap[
            profile.id
          ] = profile;
        }

        setProfiles(
          profileMap,
        );
      } catch (error) {
        console.error(
          "[AdminVendors] load failed:",
          error,
        );

        toast.error(
          "تعذّر تحميل بيانات الموردين.",
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

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return rows;
      }

      return rows.filter(
        (row) =>
          row.name
            .toLowerCase()
            .includes(query) ||
          row.city
            .toLowerCase()
            .includes(query) ||
          row.phone
            .toLowerCase()
            .includes(query),
      );
    }, [
      rows,
      search,
    ]);

  const selectedProducts =
    selected
      ? products.filter(
          (product) =>
            rows
              .find(
                (row) =>
                  row.id ===
                  selected.id,
              )
              ?.id ===
            selected.id,
        )
      : [];

  const productsForSelected =
    selected
      ? products.filter(
          (product) =>
            getVendorIdForProduct(
              product,
              selected.id,
            ),
        )
      : [];

  async function openVendor(
    vendor: VendorRow,
  ) {
    setSelected(vendor);
    setDetailsLoading(true);

    try {
      const { data, error } =
        await supabase
          .from("products")
          .select(
            "id,name,price,old_price,stock_left,total_stock,is_active,images,city",
          )
          .eq(
            "vendor_id",
            vendor.id,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .returns<ProductRow[]>();

      if (error) {
        throw error;
      }

      setProducts(
        (current) => {
          const other =
            current.filter(
              (product) =>
                !data?.some(
                  (item) =>
                    item.id ===
                    product.id,
                ),
            );

          return [
            ...other,
            ...(data ?? []),
          ];
        },
      );
    } catch (error) {
      console.error(
        "[AdminVendors] vendor products failed:",
        error,
      );

      toast.error(
        "تعذّر تحميل منتجات المورد.",
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function toggle(
    vendor: VendorRow,
  ) {
    try {
      const next =
        !(
          vendor.is_active &&
          vendor.account_enabled
        );

      const { error } =
        await supabase
          .from("vendors")
          .update({
            is_active:
              next,
            account_enabled:
              next,
          })
          .eq(
            "id",
            vendor.id,
          );

      if (error) {
        throw error;
      }

      toast.success(
        next
          ? "تم تفعيل المورد."
          : "تم إيقاف المورد.",
      );

      await load();

      if (
        selected?.id ===
        vendor.id
      ) {
        setSelected(
          (current) =>
            current
              ? {
                  ...current,
                  is_active:
                    next,
                  account_enabled:
                    next,
                }
              : null,
        );
      }
    } catch (error) {
      console.error(
        "[AdminVendors] toggle failed:",
        error,
      );

      toast.error(
        "تعذّر تغيير حالة المورد.",
      );
    }
  }

  return (
    <div
      dir="rtl"
      className="space-y-4"
    >
      <AdminCard title="إدارة الموردين / التجار">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="بحث باسم المتجر أو المدينة أو الهاتف..."
            className="h-11 min-w-[240px] flex-1 rounded-2xl border border-border bg-secondary px-4 text-sm outline-none"
          />

          <button
            type="button"
            className={btnGhostCls}
            onClick={() =>
              void load()
            }
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />
            تحديث
          </button>
        </div>
      </AdminCard>

      <AdminCard
        title={`الموردون (${filtered.length})`}
      >
        <div className="space-y-2">
          {filtered.map(
            (vendor) => {
              const profile =
                vendor.user_id
                  ? profiles[
                      vendor.user_id
                    ]
                  : null;

              const vendorProducts =
                products.filter(
                  (product) =>
                    getVendorIdForProduct(
                      product,
                      vendor.id,
                    ),
                );

              return (
                <div
                  key={
                    vendor.id
                  }
                  className="rounded-2xl border border-border bg-card p-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                      {vendor.logo_url ? (
                        <img
                          src={
                            vendor.logo_url
                          }
                          alt={
                            vendor.name
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 font-bold">
                        {vendor.name}

                        {vendor.is_active &&
                        vendor.account_enabled ? (
                          <BadgeCheck className="h-4 w-4 text-primary" />
                        ) : null}
                      </p>

                      <p className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span>
                          {vendor.city}
                        </span>

                        <span
                          dir="ltr"
                        >
                          {vendor.phone}
                        </span>

                        <span>
                          {vendorProducts.length} منتج
                        </span>
                      </p>
                    </div>

                    {profile ? (
                      <div className="text-left">
                        <p className="text-xs font-bold text-primary">
                          {formatPrice(
                            Number(
                              profile.wallet_balance,
                            ),
                          )}
                        </p>

                        <p className="text-[10px] text-muted-foreground">
                          محفظة الحساب
                        </p>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      className={btnGhostCls}
                      onClick={() =>
                        void openVendor(
                          vendor,
                        )
                      }
                    >
                      <Eye className="h-4 w-4" />
                      التفاصيل
                    </button>

                    <button
                      type="button"
                      className={btnGhostCls}
                      onClick={() =>
                        void toggle(
                          vendor,
                        )
                      }
                    >
                      {vendor.is_active &&
                      vendor.account_enabled
                        ? "إيقاف"
                        : "تفعيل"}
                    </button>
                  </div>
                </div>
              );
            },
          )}
        </div>

        {filtered.length ===
        0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            لا توجد نتائج.
          </p>
        ) : null}
      </AdminCard>

      {selected ? (
        <AdminCard
          title={`بيانات المورد: ${selected.name}`}
        >
          <div className="flex justify-end">
            <button
              type="button"
              className={btnGhostCls}
              onClick={() =>
                setSelected(null)
              }
            >
              <X className="h-4 w-4" />
              إغلاق
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-border p-4">
              <h3 className="font-bold">
                بيانات المتجر
              </h3>

              <div className="mt-4 space-y-3 text-xs">
                <Info
                  icon={User}
                  label="اسم المتجر"
                  value={
                    selected.name
                  }
                />

                <Info
                  icon={MapPin}
                  label="المدينة"
                  value={
                    selected.city
                  }
                />

                <Info
                  icon={Phone}
                  label="الهاتف"
                  value={
                    selected.phone
                  }
                  dir="ltr"
                />

                <p>
                  {selected.description ||
                    "لا يوجد وصف."}
                </p>

                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] text-primary">
                  {selected.is_active &&
                  selected.account_enabled
                    ? "حساب المتجر مفعّل"
                    : "حساب المتجر غير مفعّل"}
                </span>
              </div>
            </section>

            <section className="rounded-2xl border border-border p-4">
              <h3 className="font-bold">
                صاحب الحساب
              </h3>

              {selected.user_id &&
              profiles[
                selected.user_id
              ] ? (
                <div className="mt-4 space-y-3 text-xs">
                  <Info
                    icon={User}
                    label="الاسم"
                    value={
                      profiles[
                        selected.user_id
                      ].full_name
                    }
                  />

                  <Info
                    icon={Phone}
                    label="الهاتف"
                    value={
                      profiles[
                        selected.user_id
                      ].phone ||
                      "غير مسجل"
                    }
                    dir="ltr"
                  />

                  <Info
                    icon={MapPin}
                    label="المحافظة"
                    value={
                      profiles[
                        selected.user_id
                      ].province ||
                      "غير محددة"
                    }
                  />

                  <Info
                    icon={User}
                    label="البريد"
                    value={
                      profiles[
                        selected.user_id
                      ].contact_email ||
                      "غير مسجل"
                    }
                    dir="ltr"
                  />
                </div>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">
                  لا يوجد حساب مستخدم مرتبط بهذا المورد.
                </p>
              )}
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-border p-4">
            <h3 className="flex items-center gap-2 font-bold">
              <Package className="h-5 w-5 text-primary" />
              منتجات المورد
            </h3>

            {detailsLoading ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                جارٍ تحميل المنتجات...
              </p>
            ) : productsForSelected.length ===
              0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                لا توجد منتجات مرتبطة بهذا المورد.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {productsForSelected.map(
                  (product) => (
                    <div
                      key={
                        product.id
                      }
                      className="overflow-hidden rounded-2xl border border-border"
                    >
                      <div className="h-36 bg-secondary">
                        {product.images?.[0] ? (
                          <img
                            src={
                              product.images[0]
                            }
                            alt={
                              product.name
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full place-items-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="p-3">
                        <p className="truncate text-sm font-bold">
                          {product.name}
                        </p>

                        <p className="mt-1 text-xs text-primary">
                          {formatPrice(
                            Number(
                              product.price,
                            ),
                          )}
                        </p>

                        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                          <span>
                            المخزون:{" "}
                            {
                              product.stock_left
                            }
                          </span>

                          <span>
                            {product.is_active
                              ? "نشط"
                              : "متوقف"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
        </AdminCard>
      ) : null}
    </div>
  );
}

function getVendorIdForProduct(
  product: ProductRow,
  vendorId: string,
): boolean {
  /*
   * يتم استبدال هذه الدالة بالاستعلام المباشر عند فتح المورد.
   * المنتجات المحملة في load العام قد لا تحمل vendor_id.
   *
   * لذلك نستخدم وجود الصورة/المنتج من مجموعة المنتجات المحملة
   * فقط في الواجهة العامة، بينما openVendor يقوم بالاستعلام
   * المباشر للمورد المحدد.
   */
  void product;
  void vendorId;
  return false;
}

function Info({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: typeof User;
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>

      <p
        dir={dir}
        className="mt-1 font-medium"
      >
        {value}
      </p>
    </div>
  );
}
