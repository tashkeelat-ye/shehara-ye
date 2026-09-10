import {
  Check,
  ChevronDown,
  RotateCcw,
  Star,
} from "lucide-react";

import type {
  ProductFilters,
  SortKey,
} from "@/lib/db";

export const SORT_OPTIONS: {
  value: SortKey;
  label: string;
}[] = [
  {
    value: "best",
    label: "الأكثر مبيعًا",
  },
  {
    value: "newest",
    label: "الأحدث",
  },
  {
    value: "price_asc",
    label: "السعر: من الأقل",
  },
  {
    value: "price_desc",
    label: "السعر: من الأعلى",
  },
];

export function SortBar({
  sort,
  onSortChange,
  countLabel,
}: {
  sort: SortKey;
  onSortChange: (
    value: SortKey,
  ) => void;
  countLabel: string;
}) {
  const current =
    SORT_OPTIONS.find(
      (item) =>
        item.value === sort,
    ) ??
    SORT_OPTIONS[0];

  return (
    <div
      dir="rtl"
      className="
        flex
        items-center
        justify-between
        gap-3
        border-y
        border-border/60
        bg-background/80
        px-4
        py-3
        backdrop-blur-sm
      "
    >
      <div className="min-w-0">
        <p
          className="
            text-[11px]
            font-semibold
            text-muted-foreground
          "
        >
          {countLabel}
        </p>
      </div>

      <label
        htmlFor="sort-products"
        className="
          relative
          flex
          shrink-0
          items-center
          gap-1.5
          rounded-xl
          border
          border-border
          bg-card
          px-3
          py-2
          text-[11px]
          font-bold
          text-foreground
          shadow-sm
          transition
          hover:border-primary/30
        "
      >
        <span className="text-muted-foreground">
          ترتيب:
        </span>

        <span className="max-w-[110px] truncate text-primary">
          {current.label}
        </span>

        <ChevronDown
          className="h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />

        <select
          id="sort-products"
          value={sort}
          onChange={(event) =>
            onSortChange(
              event.target
                .value as SortKey,
            )
          }
          className="
            absolute
            inset-0
            h-full
            w-full
            cursor-pointer
            opacity-0
          "
          aria-label="ترتيب المنتجات"
        >
          {SORT_OPTIONS.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            ),
          )}
        </select>
      </label>
    </div>
  );
}

export function FiltersPanel({
  filters,
  onChange,
  cities,
}: {
  filters: ProductFilters;
  onChange: (
    filters: ProductFilters,
  ) => void;
  cities: string[];
}) {
  const selectedRating =
    filters.minRating ?? 0;

  return (
    <aside
      dir="rtl"
      className="
        overflow-hidden
        rounded-2xl
        border
        border-border/70
        bg-card
        shadow-sm
      "
    >
      {/* السعر */}
      <section className="border-b border-border/60 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-foreground">
            نطاق السعر
          </h3>

          <p className="mt-1 text-[10px] text-muted-foreground">
            حدد السعر المناسب لك
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="relative">
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
              ر.ي
            </span>

            <input
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="من"
              aria-label="أقل سعر"
              value={
                filters.minPrice ??
                ""
              }
              onChange={(event) =>
                onChange({
                  ...filters,
                  minPrice:
                    event.target
                      .value
                      ? Number(
                          event
                            .target
                            .value,
                        )
                      : undefined,
                })
              }
              className="
                h-11
                w-full
                rounded-xl
                border
                border-border
                bg-secondary/60
                pe-3
                ps-10
                text-xs
                font-semibold
                text-foreground
                outline-none
                transition
                focus:border-primary
                focus:bg-background
              "
            />
          </label>

          <label className="relative">
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
              ر.ي
            </span>

            <input
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="إلى"
              aria-label="أعلى سعر"
              value={
                filters.maxPrice ??
                ""
              }
              onChange={(event) =>
                onChange({
                  ...filters,
                  maxPrice:
                    event.target
                      .value
                      ? Number(
                          event
                            .target
                            .value,
                        )
                      : undefined,
                })
              }
              className="
                h-11
                w-full
                rounded-xl
                border
                border-border
                bg-secondary/60
                pe-3
                ps-10
                text-xs
                font-semibold
                text-foreground
                outline-none
                transition
                focus:border-primary
                focus:bg-background
              "
            />
          </label>
        </div>
      </section>

      {/* التقييم */}
      <section className="border-b border-border/60 p-4">
        <h3 className="text-sm font-bold text-foreground">
          التقييم
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            0,
            3,
            4,
            4.5,
          ].map((rating) => {
            const active =
              selectedRating ===
              rating;

            return (
              <button
                key={rating}
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    minRating:
                      rating === 0
                        ? undefined
                        : rating,
                  })
                }
                className={`
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  px-3
                  py-2
                  text-[10px]
                  font-bold
                  transition-all
                  ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-primary"
                  }
                `}
              >
                {rating === 0 ? (
                  <>
                    {active ? (
                      <Check className="h-3 w-3" />
                    ) : null}
                    الكل
                  </>
                ) : (
                  <>
                    <Star className="h-3 w-3 fill-accent-solid text-accent-solid" />

                    {rating.toLocaleString(
                      "ar-EG",
                    )}
                    +
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* المدينة */}
      {cities.length > 0 ? (
        <section className="border-b border-border/60 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-foreground">
              المدينة
            </h3>

            <p className="mt-1 text-[10px] text-muted-foreground">
              اختر المنتجات حسب موقعها
            </p>
          </div>

          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pe-0.5">
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  city: undefined,
                })
              }
              className={`
                rounded-full
                border
                px-3
                py-2
                text-[10px]
                font-bold
                transition
                ${
                  !filters.city
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }
              `}
            >
              {!filters.city ? (
                <Check className="me-1 inline h-3 w-3" />
              ) : null}
              كل المدن
            </button>

            {cities.map(
              (city) => {
                const active =
                  filters.city ===
                  city;

                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...filters,
                        city,
                      })
                    }
                    className={`
                      rounded-full
                      border
                      px-3
                      py-2
                      text-[10px]
                      font-bold
                      transition
                      ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }
                    `}
                  >
                    {active ? (
                      <Check className="me-1 inline h-3 w-3" />
                    ) : null}

                    {city}
                  </button>
                );
              },
            )}
          </div>
        </section>
      ) : null}

      {/* إعادة التعيين */}
      <div className="p-3">
        <button
          type="button"
          onClick={() =>
            onChange({})
          }
          className="
            flex
            min-h-10
            w-full
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-border
            bg-background
            px-4
            text-[11px]
            font-bold
            text-muted-foreground
            transition
            hover:border-primary/30
            hover:bg-primary/5
            hover:text-primary
          "
        >
          <RotateCcw className="h-3.5 w-3.5" />

          إعادة تعيين الفلاتر
        </button>
      </div>
    </aside>
  );
}
