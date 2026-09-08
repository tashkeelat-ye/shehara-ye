import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Star, StarOff, Trash2 } from "lucide-react";

import { AdminCard, btnCls, btnGhostCls, inputCls } from "@/components/admin-ui";
import { supabase } from "@/integrations/supabase/client";
import { fetchProducts, formatPrice, type Product } from "@/lib/db";

export const Route = createFileRoute("/admin/featured")({
  component: AdminFeatured,
});

function AdminFeatured() {
  const [rows, setRows] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(await fetchProducts({ limit: 300 }));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const featured = useMemo(
    () =>
      rows
        .filter((row) => row.is_featured)
        .sort((a, b) => (a.featured_sort ?? 0) - (b.featured_sort ?? 0)),
    [rows],
  );

  const candidates = useMemo(() => {
    const term = search.trim();
    return rows
      .filter((row) => !row.is_featured)
      .filter((row) => (term ? row.name.includes(term) : true))
      .slice(0, 20);
  }, [rows, search]);

  async function update(
    id: string,
    patch: { is_featured?: boolean; featured_sort?: number },
  ) {
    setBusy(true);
    try {
      const { error } = await supabase.from("products").update(patch).eq("id", id);
      if (error) throw error;
      await load();
    } catch {
      toast.error("تعذّر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <AdminCard title="منتجات مميزة في الصفحة الرئيسية">
        <p className="mb-3 text-xs text-muted-foreground">
          المنتجات هنا تظهر في قسم «منتجات مميزة» بالرئيسية، ويمكن ترتيبها أو حذفها من القسم.
        </p>

        {featured.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            لم تختر أي منتج مميز بعد.
          </p>
        ) : (
          <ul className="space-y-2">
            {featured.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-2.5"
              >
                <img
                  src={row.images[0] ?? "/icon-192.png"}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {formatPrice(row.price)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <input
                    type="number"
                    aria-label="ترتيب الظهور"
                    value={row.featured_sort ?? 0}
                    disabled={busy}
                    onChange={(event) =>
                      void update(row.id, {
                        featured_sort: Number(event.target.value) || 0,
                      })
                    }
                    className={`${inputCls} w-16 text-center`}
                  />

                  <button
                    type="button"
                    className={btnGhostCls}
                    disabled={busy}
                    aria-label="إزالة من المميزة"
                    onClick={() => void update(row.id, { is_featured: false })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard title="إضافة منتج إلى المميزة">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث باسم المنتج..."
          className={inputCls}
        />

        <ul className="mt-3 space-y-2">
          {candidates.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{row.name}</p>
                <p className="text-[11px] text-muted-foreground">{formatPrice(row.price)}</p>
              </div>

              <button
                type="button"
                className={btnCls}
                disabled={busy}
                onClick={() =>
                  void update(row.id, {
                    is_featured: true,
                    featured_sort: featured.length + 1,
                  })
                }
              >
                <Star className="h-4 w-4" />
                تمييز
              </button>
            </li>
          ))}

          {candidates.length === 0 ? (
            <li className="flex items-center justify-center gap-2 py-6 text-center text-xs text-muted-foreground">
              <StarOff className="h-4 w-4" />
              لا نتائج.
            </li>
          ) : null}
        </ul>
      </AdminCard>
    </div>
  );
}
