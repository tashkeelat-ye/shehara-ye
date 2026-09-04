import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Tag, Trash2 } from "lucide-react";

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

export const Route = createFileRoute("/admin/offers")({
  component: AdminOffersPage,
});

function toInputDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function OfferRow({ product }: { product: AdminOfferRow }) {
  const queryClient = useQueryClient();

  const [price, setPrice] = useState(
    product.discount_price ? String(product.discount_price) : "",
  );
  const [endDate, setEndDate] = useState(
    toInputDate(product.offer_end_date),
  );

  const save = useMutation({
    mutationFn: (patch: {
      discount_price: number | null;
      offer_end_date: string | null;
    }) => updateProductOffer(product.id, patch),
    onSuccess: () => {
      toast.success("تم تحديث العرض");
      void queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      void queryClient.invalidateQueries({ queryKey: ["offers"] });
    },
    onError: () => toast.error("تعذر تحديث العرض"),
  });

  const image = product.images?.[0];

  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/40 p-3">
      <div className="mb-3 flex items-center gap-3">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Tag className="h-4 w-4" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {product.name}
          </p>
          <p className="text-[11px] text-muted-foreground">
            السعر الحالي: {product.price}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="سعر العرض">
          <input
            type="number"
            min={0}
            className={inputCls}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="بدون عرض"
          />
        </Field>

        <Field label="ينتهي في">
          <input
            type="datetime-local"
            className={inputCls}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </Field>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={btnCls}
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              discount_price: price.trim() ? Number(price) : null,
              offer_end_date: endDate
                ? new Date(endDate).toISOString()
                : null,
            })
          }
        >
          حفظ العرض
        </button>

        <button
          type="button"
          className={btnGhostCls}
          disabled={save.isPending}
          onClick={() => {
            setPrice("");
            setEndDate("");
            save.mutate({ discount_price: null, offer_end_date: null });
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          إلغاء العرض
        </button>
      </div>
    </div>
  );
}

function AdminOffersPage() {
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-offers", search],
    queryFn: () => fetchAdminOfferProducts(search),
  });

  return (
    <div className="space-y-4">
      <AdminCard title="إدارة العروض والتخفيضات">
        <p className="mb-3 text-[11px] leading-5 text-muted-foreground">
          حدّد سعر العرض وتاريخ انتهائه لأي منتج. تظهر العروض تلقائياً في
          صفحة العروض ونافذة العروض داخل التطبيق.
        </p>

        <div className="relative mb-4">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            className={`${inputCls} pr-9`}
            placeholder="ابحث باسم المنتج..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            جاري التحميل...
          </p>
        ) : products.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            لا توجد منتجات مطابقة.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {products.map((product) => (
              <OfferRow key={product.id} product={product} />
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
