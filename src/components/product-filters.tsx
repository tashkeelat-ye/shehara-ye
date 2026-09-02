import { Star } from "lucide-react";
import type { ProductFilters, SortKey } from "@/lib/db";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "best", label: "الأكثر مبيعًا" },
  { value: "newest", label: "الأحدث" },
  { value: "price_asc", label: "السعر: من الأقل" },
  { value: "price_desc", label: "السعر: من الأعلى" },
];

export function SortBar({
  sort,
  onSortChange,
  countLabel,
}: {
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  countLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4">
      <p className="text-xs text-muted-foreground">{countLabel}</p>
      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="text-xs text-muted-foreground">
          ترتيب حسب
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="h-9 rounded-xl border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-primary"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function FiltersPanel({
  filters,
  onChange,
  cities,
}: {
  filters: ProductFilters;
  onChange: (f: ProductFilters) => void;
  cities: string[];
}) {
  return (
    <aside className="space-y-5 rounded-2xl border border-border/70 bg-card p-4">
      <div>
        <h3 className="text-sm text-foreground">السعر (ريال يمني)</h3>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="من"
            aria-label="أقل سعر"
            value={filters.minPrice ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                minPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="إلى"
            aria-label="أعلى سعر"
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                maxPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="h-10 w-full rounded-xl border border-border bg-secondary px-3 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm text-foreground">التقييم</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ ...filters, minRating: r || undefined })}
              className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] ${
                (filters.minRating ?? 0) === r
                  ? "border-primary bg-brand-soft text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {r === 0 ? (
                "الكل"
              ) : (
                <>
                  <Star className="h-3 w-3 fill-accent-solid text-accent-solid" />
                  {r.toLocaleString("ar-EG")}+
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm text-foreground">المدينة</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...filters, city: undefined })}
            className={`rounded-full border px-3 py-1.5 text-[11px] ${
              !filters.city ? "border-primary bg-brand-soft text-primary" : "border-border text-muted-foreground"
            }`}
          >
            كل المدن
          </button>
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...filters, city: c })}
              className={`rounded-full border px-3 py-1.5 text-[11px] ${
                filters.city === c
                  ? "border-primary bg-brand-soft text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange({})}
        className="w-full rounded-xl border border-border py-2 text-xs text-muted-foreground"
      >
        إعادة تعيين الفلاتر
      </button>
    </aside>
  );
}
