import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BadgeCheck,
  Check,
  Eye,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AdminCard,
  btnGhostCls,
} from "@/components/admin-ui";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/db";

export const Route = createFileRoute("/admin/vendors")({
  component: AdminVendors,
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
  is_verified: boolean;
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
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [selected, setSelected] = useState<VendorRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [verificationLoading, setVerificationLoading] = useState<
    Set<string>
  >(new Set());

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [vendorsResult, productsResult, profilesResult] =
        await Promise.all([
          supabase
            .from("vendors")
            .select(
              "id,name,city,phone,logo_url,description,is_active,account_enabled,user_id,created_at,is_verified",
            )
            .order("created_at", { ascending: false })
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

      if (vendorsResult.error) throw vendorsResult.error;
      if (productsResult.error) throw productsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      setRows(vendorsResult.data ?? []);
      setProducts(productsResult.data ?? []);

      const profileMap: Record<string, ProfileRow> = {};
      for (const profile of profilesResult.data ?? []) {
        profileMap[profile.id] = profile;
      }
      setProfiles(profileMap);
    } catch (error) {
      console.error("[AdminVendors] load failed:", error);
      toast.error("تعذّر تحميل بيانات الموردين.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return rows;

    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.city.toLowerCase().includes(query) ||
        row.phone.toLowerCase().includes(query),
    );
  }, [rows, search]);

  const productsForSelected = selected
    ? products.filter((product) =>
        getVendorIdForProduct(product, selected.id),
      )
    : [];

  async function openVendor(vendor: VendorRow) {
    setSelected(vendor);
    setDetailsLoading(true);

    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,price,old_price,stock_left,total_stock,is_active,images,city",
        )
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })
        .returns<ProductRow[]>();

      if (error) throw error;

      setProducts((current) => {
        const other = current.filter(
          (product) =>
            !data?.some((item) => item.id === product.id),
        );

        return [...other, ...(data ?? [])];
      });
    } catch (error) {
      console.error("[AdminVendors] vendor products failed:", error);
      toast.error("تعذّر تحميل منتجات المورد.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function toggle(vendor: VendorRow) {
    try {
      const next = !(vendor.is_active && vendor.account_enabled);

      const { error } = await supabase
        .from("vendors")
        .update({
          is_active: next,
          account_enabled: next,
        })
        .eq("id", vendor.id);

      if (error) throw error;

      toast.success(next ? "تم تفعيل المورد." : "تم إيقاف المورد.");
      await load();

      if (selected?.id === vendor.id) {
        setSelected((current) =>
          current
            ? {
                ...current,
                is_active: next,
                account_enabled: next,
              }
            : null,
        );
      }
    } catch (error) {
      console.error("[AdminVendors] toggle failed:", error);
      toast.error("تعذّر تغيير حالة المورد.");
    }
  }

  async function toggleVerification(vendor: VendorRow) {
    const next = !vendor.is_verified;

    const message = next
      ? `هل تريد توثيق التاجر «${vendor.name}»؟\n\nسيتم إظهار علامة التوثيق الزرقاء بجانب اسم المتجر للعملاء.`
      : `هل تريد إلغاء توثيق التاجر «${vendor.name}»؟\n\nستختفي علامة التوثيق الزرقاء من واجهة العملاء.`;

    if (typeof window !== "undefined" && !window.confirm(message)) {
      return;
    }

    setVerificationLoading((current) => {
      const nextSet = new Set(current);
      nextSet.add(vendor.id);
      return nextSet;
    });

    try {
      const { data, error } = await (
        supabase as unknown as {
          rpc: (
            functionName: string,
            args: Record<string, unknown>,
          ) => Promise<{
            data: unknown;
            error: { message: string } | null;
          }>;
        }
      ).rpc("admin_set_vendor_verified", {
        p_vendor_id: vendor.id,
        p_verified: next,
      });

      if (error) throw error;

      const returnedVendor = data as
        | Partial<VendorRow>
        | null
        | undefined;

      setRows((current) =>
        current.map((item) =>
          item.id === vendor.id
            ? {
                ...item,
                is_verified:
                  typeof returnedVendor?.is_verified === "boolean"
                    ? returnedVendor.is_verified
                    : next,
              }
            : item,
        ),
      );

      setSelected((current) =>
        current?.id === vendor.id
          ? {
              ...current,
              is_verified:
                typeof returnedVendor?.is_verified === "boolean"
                  ? returnedVendor.is_verified
                  : next,
            }
          : current,
      );

      toast.success(
        next
          ? `تم توثيق «${vendor.name}» بنجاح.`
          : `تم إلغاء توثيق «${vendor.name}».`,
      );
    } catch (error) {
      console.error(
        "[AdminVendors] verification failed:",
        error,
      );
      toast.error(
        next
          ? "تعذّر توثيق التاجر."
          : "تعذّر إلغاء توثيق التاجر.",
      );
    } finally {
      setVerificationLoading((current) => {
        const nextSet = new Set(current);
        nextSet.delete(vendor.id);
        return nextSet;
      });
    }
  }

  return (
    <div dir="rtl" className="space-y-4">
      <AdminCard title="إدارة الموردين / التجار">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث باسم المتجر أو المدينة أو الهاتف..."
            className="h-11 min-w-[240px] flex-1 rounded-2xl border border-border bg-secondary px-4 text-sm outline-none"
          />

          <button
            type="button"
            className={btnGhostCls}
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            تحديث
          </button>
        </div>
      </AdminCard>

      <AdminCard title={`الموردون (${filtered.length})`}>
        <div className="space-y-3">
          {filtered.map((vendor) => {
            const profile = vendor.user_id
              ? profiles[vendor.user_id]
              : null;

            const vendorProducts = products.filter((product) =>
              getVendorIdForProduct(product, vendor.id),
            );

            const verifying = verificationLoading.has(vendor.id);

            return (
              <div
                key={vendor.id}
                className="rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                    {vendor.logo_url ? (
                      <img
                        src={vendor.logo_url}
                        alt={vendor.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5 font-bold">
                      <span className="truncate">{vendor.name}</span>

                      {vendor.is_verified ? (
                        <BadgeCheck
                          className="h-[18px] w-[18px] shrink-0 fill-[#168BFF] text-white"
                          title="تاجر موثّق"
                          aria-label="تاجر موثّق"
                        />
                      ) : null}
                    </p>

                    <p className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span>{vendor.city}</span>

                      <span dir="ltr">{vendor.phone}</span>

                      <span>{vendorProducts.length} منتج</span>

                      {vendor.is_verified ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[#168BFF]">
                          <ShieldCheck className="h-3 w-3" />
                          موثّق
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          غير موثّق
                        </span>
                      )}
                    </p>
                  </div>

                  {profile ? (
                    <div className="text-left">
                      <p className="text-xs font-bold text-primary">
                        {formatPrice(Number(profile.wallet_balance))}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        محفظة الحساب
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={
                        vendor.is_verified
                          ? "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#168BFF]/20 bg-[#168BFF]/10 px-3 text-xs font-bold text-[#168BFF] transition hover:bg-[#168BFF]/15 disabled:cursor-not-allowed disabled:opacity-60"
                          : "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#168BFF]/20 bg-[#168BFF] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#0E7FEF] disabled:cursor-not-allowed disabled:opacity-60"
                      }
                      onClick={() => void toggleVerification(vendor)}
                      disabled={verifying}
                    >
                      {verifying ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : vendor.is_verified ? (
                        <BadgeCheck className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}

                      {verifying
                        ? "جارٍ التحديث..."
                        : vendor.is_verified
                          ? "إلغاء التوثيق"
                          : "توثيق التاجر"}
                    </button>

                    <button
                      type="button"
                      className={btnGhostCls}
                      onClick={() => void openVendor(vendor)}
                    >
                      <Eye className="h-4 w-4" />
                      التفاصيل
                    </button>

                    <button
                      type="button"
                      className={btnGhostCls}
                      onClick={() => void toggle(vendor)}
                    >
                      {vendor.is_active && vendor.account_enabled
                        ? "إيقاف"
                        : "تفعيل"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            لا توجد نتائج.
          </p>
        ) : null}
      </AdminCard>

      {selected ? (
        <AdminCard title={`بيانات المورد: ${selected.name}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {selected.is_verified ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#168BFF]/10 px-3 py-1.5 text-xs font-bold text-[#168BFF]">
                  <BadgeCheck className="h-4 w-4 fill-[#168BFF] text-white" />
                  تاجر موثّق
                </span>
              ) : (
                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
                  غير موثّق
                </span>
              )}

              <button
                type="button"
                className={
                  selected.is_verified
                    ? "inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#168BFF]/20 bg-[#168BFF]/10 px-3 text-xs font-bold text-[#168BFF]"
                    : "inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#168BFF] px-3 text-xs font-bold text-white"
                }
                onClick={() => void toggleVerification(selected)}
                disabled={verificationLoading.has(selected.id)}
              >
                {selected.is_verified ? (
                  <BadgeCheck className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {selected.is_verified
                  ? "إلغاء التوثيق"
                  : "توثيق التاجر"}
              </button>
            </div>

            <button
              type="button"
              className={btnGhostCls}
              onClick={() => setSelected(null)}
            >
              <X className="h-4 w-4" />
              إغلاق
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-border p-4">
              <h3 className="font-bold">بيانات المتجر</h3>

              <div className="mt-4 space-y-3 text-xs">
                <Info icon={User} label="اسم المتجر" value={selected.name} />
                <Info icon={MapPin} label="المدينة" value={selected.city} />
                <Info
                  icon={Phone}
                  label="الهاتف"
                  value={selected.phone}
                  dir="ltr"
                />

                <p>{selected.description || "لا يوجد وصف."}</p>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] text-primary">
                    {selected.is_active && selected.account_enabled
                      ? "حساب المتجر مفعّل"
                      : "حساب المتجر غير مفعّل"}
                  </span>

                  {selected.is_verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#168BFF]/10 px-3 py-1 text-[10px] font-bold text-[#168BFF]">
                      <BadgeCheck className="h-3.5 w-3.5 fill-[#168BFF] text-white" />
                      موثّق من شهارة
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
                      غير موثّق
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border p-4">
              <h3 className="font-bold">صاحب الحساب</h3>

              {selected.user_id && profiles[selected.user_id] ? (
                <div className="mt-4 space-y-3 text-xs">
                  <Info
                    icon={User}
                    label="الاسم"
                    value={profiles[selected.user_id].full_name}
                  />
                  <Info
                    icon={Phone}
                    label="الهاتف"
                    value={profiles[selected.user_id].phone || "غير مسجل"}
                    dir="ltr"
                  />
                  <Info
                    icon={MapPin}
                    label="المحافظة"
                    value={profiles[selected.user_id].province || "غير محددة"}
                  />
                  <Info
                    icon={User}
                    label="البريد"
                    value={
                      profiles[selected.user_id].contact_email || "غير مسجل"
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
            ) : productsForSelected.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                لا توجد منتجات مرتبطة بهذا المورد.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {productsForSelected.map((product) => (
                  <div
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-border"
                  >
                    <div className="h-36 bg-secondary">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
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
                        {formatPrice(Number(product.price))}
                      </p>

                      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                        <span>المخزون: {product.stock_left}</span>
                        <span>
                          {product.is_active ? "نشط" : "متوقف"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
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

      <p dir={dir} className="mt-1 font-medium">
        {value}
      </p>
    </div>
  );
}
