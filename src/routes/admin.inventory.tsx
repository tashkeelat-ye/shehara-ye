import {
  createFileRoute,
} from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Loader2,
  Package,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  AdminCard,
  btnCls,
  btnGhostCls,
  inputCls,
} from "@/components/admin-ui";

export const Route =
  createFileRoute(
    "/admin/inventory",
  )({
    component:
      AdminInventory,
  });

type Product = {
  id: string;
  name: string;
  images: string[];
  price: number;
  total_stock: number;
  stock_left: number;
  low_stock_threshold: number;
  sales_count: number;
  is_active: boolean;
};

type InventoryMovement = {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: string;
  reference_id: string | null;
  note: string;
  created_by: string | null;
  created_at: string;
  product?: {
    name: string;
  } | null;
};

type StockStatus =
  | "available"
  | "low"
  | "out";

function normalizeNumber(
  value: unknown,
): number {
  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}

function normalizeProduct(
  row: Product,
): Product {
  return {
    ...row,

    price:
      normalizeNumber(
        row.price,
      ),

    total_stock:
      normalizeNumber(
        row.total_stock,
      ),

    stock_left:
      normalizeNumber(
        row.stock_left,
      ),

    low_stock_threshold:
      normalizeNumber(
        row.low_stock_threshold,
      ) || 5,

    sales_count:
      normalizeNumber(
        row.sales_count,
      ),

    images:
      Array.isArray(row.images)
        ? row.images
        : [],
  };
}

function getStockStatus(
  product: Product,
): StockStatus {
  if (
    product.stock_left <=
    0
  ) {
    return "out";
  }

  if (
    product.stock_left <=
    product.low_stock_threshold
  ) {
    return "low";
  }

  return "available";
}

function statusLabel(
  status: StockStatus,
): string {
  if (status === "out") {
    return "نفد المخزون";
  }

  if (status === "low") {
    return "مخزون منخفض";
  }

  return "متوفر";
}

function movementLabel(
  type: string,
): string {
  switch (type) {
    case "initial":
      return "مخزون ابتدائي";

    case "purchase":
      return "إضافة شراء";

    case "sale":
      return "بيع";

    case "return":
      return "مرتجع";

    case "adjustment":
      return "تعديل";

    case "damage":
      return "تالف";

    case "reservation_cancel":
      return "إلغاء حجز";

    default:
      return type;
  }
}

function movementIsIncrease(
  movement: InventoryMovement,
): boolean {
  return (
    movement.quantity > 0
  );
}

function formatDate(
  value: string,
): string {
  try {
    return new Intl.DateTimeFormat(
      "ar-YE",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    ).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    error &&
    typeof error ===
      "object"
  ) {
    const e =
      error as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
        code?: unknown;
      };

    const parts: string[] =
      [];

    if (
      typeof e.message ===
      "string"
    ) {
      parts.push(
        e.message,
      );
    }

    if (
      typeof e.details ===
      "string" &&
      e.details
    ) {
      parts.push(
        `التفاصيل: ${e.details}`,
      );
    }

    if (
      typeof e.hint ===
      "string" &&
      e.hint
    ) {
      parts.push(
        `التلميح: ${e.hint}`,
      );
    }

    if (
      typeof e.code ===
      "string" &&
      e.code
    ) {
      parts.push(
        `رمز: ${e.code}`,
      );
    }

    if (parts.length) {
      return parts.join(
        " — ",
      );
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "حدث خطأ غير معروف";
}

function AdminInventory() {
  const [
    products,
    setProducts,
  ] = useState<Product[]>(
    [],
  );

  const [
    movements,
    setMovements,
  ] = useState<
    InventoryMovement[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    movementsLoading,
    setMovementsLoading,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    savingId,
    setSavingId,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState<
    "all" | "low" | "out"
  >("all");

  const [
    stockInputs,
    setStockInputs,
  ] = useState<
    Record<string, string>
  >({});

  const loadProducts =
    useCallback(
      async () => {
        const {
          data,
          error: queryError,
        } =
          await supabase
            .from(
              "products",
            )
            .select(
              "id,name,images,price,total_stock,stock_left,low_stock_threshold,sales_count,is_active",
            )
            .order(
              "stock_left",
              {
                ascending:
                  true,
              },
            );

        if (queryError) {
          throw queryError;
        }

        const normalized =
          (
            data ?? []
          ).map(
            (item) =>
              normalizeProduct(
                item as Product,
              ),
          );

        setProducts(
          normalized,
        );

        const inputs: Record<
          string,
          string
        > = {};

        normalized.forEach(
          (product) => {
            inputs[
              product.id
            ] =
              String(
                product.total_stock,
              );
          },
        );

        setStockInputs(
          inputs,
        );
      },
      [],
    );

  const loadMovements =
    useCallback(
      async () => {
        setMovementsLoading(
          true,
        );

        try {
          const {
            data,
            error: queryError,
          } =
            await supabase
              .from(
                "inventory_movements" as never,
              )
              .select(
                "id,product_id,quantity,movement_type,reference_id,note,created_by,created_at,product:products(name)",
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              )
              .limit(
                100,
              );

          if (
            queryError
          ) {
            throw queryError;
          }

          setMovements(
            (data ??
              []) as unknown as InventoryMovement[],
          );
        } finally {
          setMovementsLoading(
            false,
          );
        }
      },
      [],
    );

  const loadAll =
    useCallback(
      async () => {
        setError(null);

        try {
          await Promise.all([
            loadProducts(),
            loadMovements(),
          ]);
        } catch (
          loadError
        ) {
          setError(
            getErrorMessage(
              loadError,
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [
        loadProducts,
        loadMovements,
      ],
    );

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function refresh() {
    setRefreshing(true);

    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }

  async function updateStock(
    product: Product,
  ) {
    const raw =
      stockInputs[
        product.id
      ];

    const totalStock =
      Number(raw);

    if (
      !Number.isInteger(
        totalStock,
      ) ||
      totalStock < 0
    ) {
      setError(
        "يجب أن تكون كمية المخزون رقمًا صحيحًا أكبر من أو يساوي صفر.",
      );

      return;
    }

    if (
      totalStock ===
      product.total_stock
    ) {
      return;
    }

    setSavingId(
      product.id,
    );
    setError(null);

    try {
      /*
       * نستخدم دالة قاعدة البيانات
       * set_product_stock بدل UPDATE مباشر.
       *
       * الدالة تقوم بحساب الفرق وتحديث
       * stock_left وتسجيل حركة adjustment.
       */
      const {
        error: rpcError,
      } =
        await supabase.rpc(
          "set_product_stock" as never,
          {
            _product_id:
              product.id,
            _total_stock:
              totalStock,
          } as never,
        );

      if (rpcError) {
        throw rpcError;
      }

      await Promise.all([
        loadProducts(),
        loadMovements(),
      ]);
    } catch (
      saveError
    ) {
      setError(
        `تعذر تحديث مخزون "${product.name}": ${getErrorMessage(
          saveError,
        )}`,
      );
    } finally {
      setSavingId(
        null,
      );
    }
  }

  const filteredProducts =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return products.filter(
        (product) => {
          const status =
            getStockStatus(
              product,
            );

          if (
            filter === "low" &&
            status !== "low"
          ) {
            return false;
          }

          if (
            filter === "out" &&
            status !== "out"
          ) {
            return false;
          }

          if (
            normalizedSearch &&
            !product.name
              .toLowerCase()
              .includes(
                normalizedSearch,
              )
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      products,
      search,
      filter,
    ]);

  const totalProducts =
    products.length;

  const availableProducts =
    products.filter(
      (product) =>
        getStockStatus(
          product,
        ) === "available",
    ).length;

  const lowProducts =
    products.filter(
      (product) =>
        getStockStatus(
          product,
        ) === "low",
    ).length;

  const outProducts =
    products.filter(
      (product) =>
        getStockStatus(
          product,
        ) === "out",
    ).length;

  const totalUnits =
    products.reduce(
      (sum, product) =>
        sum +
        product.stock_left,
      0,
    );

  return (
    <div
      dir="rtl"
      className="space-y-4 pb-8"
    >
      <AdminCard
        title="إدارة المخزون"
        action={
          <button
            type="button"
            onClick={() =>
              void refresh()
            }
            disabled={
              refreshing
            }
            className={
              btnGhostCls
            }
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />
            تحديث
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StatCard
            icon={
              <Package className="h-4 w-4" />
            }
            label="كل المنتجات"
            value={
              totalProducts
            }
          />

          <StatCard
            icon={
              <CheckCircle2 className="h-4 w-4" />
            }
            label="متوفر"
            value={
              availableProducts
            }
          />

          <StatCard
            icon={
              <AlertTriangle className="h-4 w-4" />
            }
            label="منخفض"
            value={
              lowProducts
            }
          />

          <StatCard
            icon={
              <XCircle className="h-4 w-4" />
            }
            label="نافد"
            value={
              outProducts
            }
          />

          <StatCard
            icon={
              <TrendingUp className="h-4 w-4" />
            }
            label="الوحدات المتاحة"
            value={
              totalUnits
            }
          />
        </div>
      </AdminCard>

      {error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-bold">
                تعذر تنفيذ العملية
              </p>

              <p className="mt-1 break-words text-[10px]">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
              className="text-[10px] underline"
            >
              إغلاق
            </button>
          </div>
        </div>
      ) : null}

      <AdminCard title="المخزون">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="ابحث باسم المنتج..."
              className={`${inputCls} pr-9`}
            />
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1 sm:w-64">
            <FilterButton
              active={
                filter ===
                "all"
              }
              onClick={() =>
                setFilter(
                  "all",
                )
              }
            >
              الكل
            </FilterButton>

            <FilterButton
              active={
                filter ===
                "low"
              }
              onClick={() =>
                setFilter(
                  "low",
                )
              }
            >
              منخفض
            </FilterButton>

            <FilterButton
              active={
                filter ===
                "out"
              }
              onClick={() =>
                setFilter(
                  "out",
                )
              }
            >
              نافد
            </FilterButton>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : filteredProducts.length ===
          0 ? (
          <EmptyState
            text={
              search ||
              filter !== "all"
                ? "لا توجد منتجات مطابقة للبحث أو الفلتر."
                : "لا توجد منتجات."
            }
          />
        ) : (
          <div className="space-y-2">
            {filteredProducts.map(
              (product) => {
                const status =
                  getStockStatus(
                    product,
                  );

                const percentage =
                  product
                    .total_stock >
                  0
                    ? Math.min(
                        100,
                        Math.round(
                          (product.stock_left /
                            product.total_stock) *
                            100,
                        ),
                      )
                    : 0;

                return (
                  <div
                    key={
                      product.id
                    }
                    className="rounded-2xl border border-border bg-card p-3"
                  >
                    <div className="flex items-center gap-2.5">
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
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-xs font-bold">
                              {
                                product.name
                              }
                            </h3>

                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              إجمالي:{" "}
                              {
                                product.total_stock
                              }{" "}
                              • المتبقي:{" "}
                              {
                                product.stock_left
                              }{" "}
                              • حد التنبيه:{" "}
                              {
                                product.low_stock_threshold
                              }
                            </p>
                          </div>

                          <StockBadge
                            status={
                              status
                            }
                          />
                        </div>

                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full transition-all ${
                              status ===
                              "out"
                                ? "bg-destructive"
                                : status ===
                                    "low"
                                  ? "bg-amber-500"
                                  : "bg-primary"
                            }`}
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <div>
                        <label className="mb-1 block text-[9px] font-medium text-muted-foreground">
                          إجمالي المخزون الجديد
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={
                            stockInputs[
                              product.id
                            ] ??
                            String(
                              product.total_stock,
                            )
                          }
                          onChange={(
                            event,
                          ) =>
                            setStockInputs(
                              (
                                current,
                              ) => ({
                                ...current,
                                [product.id]:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                          className={
                            inputCls
                          }
                        />
                      </div>

                      <button
                        type="button"
                        disabled={
                          savingId ===
                          product.id
                        }
                        onClick={() =>
                          void updateStock(
                            product,
                          )
                        }
                        className={`${btnCls} mt-[18px] min-w-24`}
                      >
                        {savingId ===
                        product.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}

                        حفظ
                      </button>
                    </div>

                    <p className="mt-2 text-[9px] text-muted-foreground">
                      عند زيادة أو تخفيض إجمالي المخزون، يتم تسجيل حركة تعديل تلقائيًا في سجل المخزون.
                    </p>
                  </div>
                );
              },
            )}
          </div>
        )}
      </AdminCard>

      <AdminCard
        title="سجل حركات المخزون"
        action={
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            آخر 100 حركة
          </div>
        }
      >
        {movementsLoading ? (
          <LoadingState />
        ) : movements.length ===
          0 ? (
          <EmptyState text="لا توجد حركات مخزون مسجلة حتى الآن." />
        ) : (
          <div className="space-y-2">
            {movements.map(
              (movement) => {
                const increase =
                  movementIsIncrease(
                    movement,
                  );

                return (
                  <div
                    key={
                      movement.id
                    }
                    className="flex items-start gap-2 rounded-xl border border-border bg-secondary/30 p-2.5"
                  >
                    <div
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                        increase
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {increase ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[10px] font-bold">
                          {movement
                            .product
                            ?.name ??
                            "منتج"}
                        </p>

                        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">
                          {movementLabel(
                            movement.movement_type,
                          )}
                        </span>
                      </div>

                      <p className="mt-1 text-[9px] text-muted-foreground">
                        {movement.note ||
                          "بدون ملاحظات"}
                      </p>

                      <p className="mt-1 text-[8px] text-muted-foreground">
                        {formatDate(
                          movement.created_at,
                        )}
                      </p>
                    </div>

                    <strong
                      className={`shrink-0 text-xs ${
                        increase
                          ? "text-emerald-700"
                          : "text-destructive"
                      }`}
                      dir="ltr"
                    >
                      {increase
                        ? "+"
                        : ""}
                      {
                        movement.quantity
                      }
                    </strong>
                  </div>
                );
              },
            )}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}

        <span className="text-[9px]">
          {label}
        </span>
      </div>

      <p className="mt-1 text-base font-bold">
        {value.toLocaleString(
          "ar-EG",
        )}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg py-1.5 text-[9px] font-medium transition-all ${
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function StockBadge({
  status,
}: {
  status: StockStatus;
}) {
  if (status === "out") {
    return (
      <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-1 text-[8px] font-bold text-destructive">
        نفد
      </span>
    );
  }

  if (status === "low") {
    return (
      <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-1 text-[8px] font-bold text-amber-700">
        منخفض
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[8px] font-bold text-emerald-700">
      متوفر
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-32 items-center justify-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      جارٍ تحميل بيانات المخزون...
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <Package className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />

      <p className="text-[10px] text-muted-foreground">
        {text}
      </p>
    </div>
  );
}
