import {
  useMemo,
  useState,
} from "react";

import {
  CalendarClock,
  CheckCircle2,
  Edit3,
  Percent,
  Search,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AdminCard,
  Field,
  btnCls,
  btnGhostCls,
  inputCls,
} from "@/components/admin-ui";

import {
  fetchAdminOfferProducts,
  updateProductOffer,
  type AdminOfferRow,
} from "@/lib/offers";

function toInputDate(
  value: string | null,
) {
  if (!value) return "";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const pad = (n: number) =>
    String(n).padStart(
      2,
      "0",
    );

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(
    date.getDate(),
  )}T${pad(
    date.getHours(),
  )}:${pad(
    date.getMinutes(),
  )}`;
}

function discountPercent(
  product: AdminOfferRow,
) {
  const base =
    Number(
      product.old_price,
    ) || Number(product.price);

  const offer =
    Number(
      product.discount_price,
    ) ||
    Number(product.price);

  if (
    base <= 0 ||
    offer >= base
  ) {
    return 0;
  }

  return Math.round(
    ((base - offer) /
      base) *
      100,
  );
}

function OfferCard({
  product,
  onEdit,
}: {
  product: AdminOfferRow;
  onEdit: (
    product: AdminOfferRow,
  ) => void;
}) {
  const percentage =
    discountPercent(
      product,
    );

  const active =
    Boolean(
      product.discount_price,
    ) ||
    Boolean(
      product.offer_end_date,
    ) ||
    Boolean(
      product.old_price,
    );

  const image =
    product.images?.[0];

  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="flex gap-3 p-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Tag className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-foreground">
                {product.name}
              </h3>

              <p className="mt-1 text-[10px] text-muted-foreground">
                السعر الحالي:{" "}
                {Number(
                  product.price,
                ).toLocaleString(
                  "ar-YE",
                )}
              </p>
            </div>

            {percentage > 0 ? (
              <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-black text-destructive">
                -{percentage}%
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
              {product.discount_price
                ? `سعر العرض: ${Number(
                    product.discount_price,
                  ).toLocaleString(
                    "ar-YE",
                  )}`
                : "لا يوجد سعر عرض"}
            </span>

            {product.offer_end_date ? (
              <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                ينتهي{" "}
                {new Date(
                  product.offer_end_date,
                ).toLocaleDateString(
                  "ar-EG",
                )}
              </span>
            ) : null}

            {active ? (
              <span className="inline-flex items-center gap-1 text-[9px] text-primary">
                <CheckCircle2 className="h-3 w-3" />
                عرض
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-border/60 p-3">
        <button
          type="button"
          onClick={() =>
            onEdit(product)
          }
          className={`${btnCls} flex-1`}
        >
          <Edit3 className="h-3.5 w-3.5" />
          إدارة العرض
        </button>
      </div>
    </article>
  );
}

export function OffersManager() {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selected,
    setSelected,
  ] =
    useState<AdminOfferRow | null>(
      null,
    );

  const queryClient =
    useQueryClient();

  const {
    data: products = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "admin-offers",
      search,
    ],
    queryFn: () =>
      fetchAdminOfferProducts(
        search,
      ),
  });

  const [price, setPrice] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  function openEditor(
    product: AdminOfferRow,
  ) {
    setSelected(product);
    setPrice(
      product.discount_price
        ? String(
            product.discount_price,
          )
        : "",
    );
    setEndDate(
      toInputDate(
        product.offer_end_date,
      ),
    );
  }

  function closeEditor() {
    setSelected(null);
    setPrice("");
    setEndDate("");
  }

  const saveMutation =
    useMutation({
      mutationFn: async () => {
        if (!selected) {
          throw new Error(
            "لم يتم تحديد المنتج.",
          );
        }

        const numericPrice =
          price.trim()
            ? Number(price)
            : null;

        if (
          numericPrice !== null &&
          (!Number.isFinite(
            numericPrice,
          ) ||
            numericPrice <= 0)
        ) {
          throw new Error(
            "سعر العرض غير صالح.",
          );
        }

        const base =
          Number(
            selected.old_price,
          ) ||
          Number(
            selected.price,
          );

        if (
          numericPrice !== null &&
          numericPrice >= base
        ) {
          throw new Error(
            "يجب أن يكون سعر العرض أقل من السعر الأساسي.",
          );
        }

        return updateProductOffer(
          selected.id,
          {
            discount_price:
              numericPrice,
            offer_end_date:
              endDate
                ? new Date(
                    endDate,
                  ).toISOString()
                : null,
          },
        );
      },

      onSuccess: () => {
        toast.success(
          "تم تحديث العرض بنجاح.",
        );

        void queryClient.invalidateQueries(
          {
            queryKey: [
              "admin-offers",
            ],
          },
        );

        void queryClient.invalidateQueries(
          {
            queryKey: [
              "offers",
            ],
          },
        );

        closeEditor();
      },

      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تحديث العرض.",
        );
      },
    });

  const clearMutation =
    useMutation({
      mutationFn: async () => {
        if (!selected) {
          throw new Error(
            "لم يتم تحديد المنتج.",
          );
        }

        return updateProductOffer(
          selected.id,
          {
            discount_price:
              null,
            offer_end_date:
              null,
          },
        );
      },

      onSuccess: () => {
        toast.success(
          "تم إلغاء العرض.",
        );

        void queryClient.invalidateQueries(
          {
            queryKey: [
              "admin-offers",
            ],
          },
        );

        void queryClient.invalidateQueries(
          {
            queryKey: [
              "offers",
            ],
          },
        );

        closeEditor();
      },

      onError: () =>
        toast.error(
          "تعذر إلغاء العرض.",
        ),
    });

  const activeOffers =
    useMemo(
      () =>
        products.filter(
          (product) =>
            Boolean(
              product.discount_price,
            ) ||
            Boolean(
              product.offer_end_date,
            ) ||
            Boolean(
              product.old_price,
            ),
        ).length,
      [products],
    );

  return (
    <>
      <AdminCard
        title="إدارة العروض والتخفيضات"
        action={
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-black text-primary">
            {activeOffers.toLocaleString(
              "ar-EG",
            )}{" "}
            عرض
          </span>
        }
      >
        <div className="mb-4 rounded-2xl bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Percent className="h-5 w-5" />
            </span>

            <div>
              <p className="text-xs font-black">
                إدارة مركزية للعروض
              </p>

              <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                اختر المنتج ثم عدّل سعر العرض وتاريخ الانتهاء من النافذة المنبثقة.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />

          <input
            className={`${inputCls} pr-9`}
            placeholder="ابحث باسم المنتج..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />
        </div>

        {isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-xs text-destructive">
            تعذر تحميل المنتجات.
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : products.length ===
          0 ? (
          <div className="rounded-2xl border border-border/70 p-8 text-center text-xs text-muted-foreground">
            لا توجد منتجات مطابقة للبحث.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {products.map(
              (product) => (
                <OfferCard
                  key={product.id}
                  product={product}
                  onEdit={
                    openEditor
                  }
                />
              ),
            )}
          </div>
        )}
      </AdminCard>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            closeEditor();
          }
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        >
          <DialogHeader>
            <DialogTitle>
              إدارة العرض
            </DialogTitle>

            <DialogDescription>
              تعديل سعر العرض وتاريخ انتهائه للمنتج المحدد.
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-secondary/40 p-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-background">
                  {selected.images?.[0] ? (
                    <img
                      src={
                        selected.images[0]
                      }
                      alt={
                        selected.name
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Tag className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black">
                    {selected.name}
                  </p>

                  <p className="mt-1 text-[10px] text-muted-foreground">
                    السعر الأساسي:{" "}
                    {Number(
                      selected.old_price,
                    ) ||
                      Number(
                        selected.price,
                      )}{" "}
                    ريال
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="سعر العرض">
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    value={price}
                    placeholder="مثال: 15000"
                    onChange={(event) =>
                      setPrice(
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="تاريخ انتهاء العرض">
                  <input
                    type="datetime-local"
                    className={inputCls}
                    value={endDate}
                    onChange={(event) =>
                      setEndDate(
                        event.target.value,
                      )
                    }
                  />
                </Field>
              </div>

              {price &&
              Number.isFinite(
                Number(price),
              ) ? (
                <div className="rounded-2xl bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      نسبة الخصم
                    </span>

                    <strong className="text-lg font-black text-primary">
                      {discountPercent(
                        {
                          ...selected,
                          discount_price:
                            Number(
                              price,
                            ),
                        },
                      )}
                      %
                    </strong>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <button
              type="button"
              className={btnGhostCls}
              onClick={closeEditor}
              disabled={
                saveMutation.isPending ||
                clearMutation.isPending
              }
            >
              إلغاء
            </button>

            <button
              type="button"
              className={`${btnGhostCls} border-destructive/30 text-destructive`}
              onClick={() =>
                clearMutation.mutate()
              }
              disabled={
                saveMutation.isPending ||
                clearMutation.isPending
              }
            >
              <Trash2 className="h-4 w-4" />
              إلغاء العرض
            </button>

            <button
              type="button"
              className={btnCls}
              onClick={() =>
                saveMutation.mutate()
              }
              disabled={
                saveMutation.isPending ||
                clearMutation.isPending
              }
            >
              {saveMutation.isPending
                ? "جارٍ الحفظ..."
                : "حفظ العرض"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
