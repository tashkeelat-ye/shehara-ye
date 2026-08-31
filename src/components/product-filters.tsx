import {
  Check,
  ChevronDown,
  Filter,
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
  onSortChange: (sort: SortKey) => void;
  countLabel: string;
}) {
  const currentOption =
    SORT_OPTIONS.find(
      (option) =>
        option.value === sort,
    ) ?? SORT_OPTIONS[0];

  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-3
        px-4
      "
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="
            grid
            h-8
            w-8
            shrink-0
            place-items-center
            rounded-xl
            bg-brand-soft
            text-primary
          "
        >
          <Filter className="h-4 w-4" />
        </span>

        <p
          className="
            truncate
            text-[11px]
            font-semibold
            text-muted-foreground
          "
        >
          {countLabel}
        </p>
      </div>

      <div className="relative shrink-0">
        <label
          htmlFor="products-sort"
          className="
            sr-only
          "
        >
          ترتيب المنتجات
        </label>

        <select
          id="products-sort"
          value={sort}
          onChange={(event) =>
            onSortChange(
              event.target.value as SortKey,
            )
          }
          className="
            h-9
            min-w-[145px]
            appearance-none
            rounded-xl
            border
            border-border
            bg-card
            pe-8
            ps-3
            text-[11px]
            font-bold
            text-foreground
            outline-none
            transition
            focus:border-primary
            focus:ring-2
            focus:ring-primary/10
          "
        >
          {SORT_OPTIONS.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <ChevronDown
          className="
            pointer-events-none
            absolute
            end-2.5
            top-1/2
            h-3.5
            w-3.5
            -translate-y-1/2
            text-muted-foreground
          "
          aria-hidden="true"
        />
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
  onChange: (
    filters: ProductFilters,
  ) => void;
  cities: string[];
}) {
  const hasPriceFilter =
    filters.minPrice !==
      undefined ||
    filters.maxPrice !==
      undefined;

  const hasRatingFilter =
    filters.minRating !==
    undefined;

  const hasCityFilter =
    Boolean(filters.city);

  const activeCount =
    Number(hasPriceFilter) +
    Number(hasRatingFilter) +
    Number(hasCityFilter);

  const update = (
    patch: ProductFilters,
  ) => {
    onChange({
      ...filters,
      ...patch,
    });
  };

  const reset = () => {
    onChange({});
  };

  return (
    <aside
      className="
        overflow-hidden
        rounded-2xl
        border
        border-border/70
        bg-card
        shadow-card
      "
    >
      {/* عنوان الفلاتر */}
      <div
        className="
          flex
          items-center
          justify-between
          border-b
          border-border/60
          px-4
          py-3.5
        "
      >
        <div className="flex items-center gap-2">
          <span
            className="
              grid
              h-8
              w-8
              place-items-center
              rounded-xl
              bg-brand-soft
              text-primary
            "
          >
            <Filter className="h-4 w-4" />
          </span>

          <div>
            <h3 className="text-xs font-black text-foreground">
              تصفية المنتجات
            </h3>

            <p className="mt-0.5 text-[9px] text-muted-foreground">
              اختر ما يناسبك
            </p>
          </div>
        </div>

        {activeCount > 0 ? (
          <span
            className="
              grid
              min-h-6
              min-w-6
              place-items-center
              rounded-full
              bg-accent-solid
              px-1.5
              text-[9px]
              font-black
              text-accent-solid-foreground
            "
          >
            {activeCount.toLocaleString(
              "ar-EG",
            )}
          </span>
        ) : null}
      </div>

      <div className="space-y-5 p-4">
        {/* السعر */}
        <section>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground">
              نطاق السعر
            </h4>

            {hasPriceFilter ? (
              <button
                type="button"
                onClick={() =>
                  update({
                    minPrice:
                      undefined,
                    maxPrice:
                      undefined,
                  })
                }
                className="
                  text-[9px]
                  font-bold
                  text-primary
                  hover:underline
                "
              >
                مسح
              </button>
            ) : null}
          </div>

          <p className="mt-1 text-[9px] text-muted-foreground">
            بالريال اليمني
          </p>

          <div
            className="
              mt-3
              grid
              grid-cols-2
              gap-2
            "
          >
            <div className="relative">
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
                  update({
                    minPrice:
                      event.target
                        .value
                        ? Number(
                            event.target
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
                  bg-secondary
                  px-3
                  text-xs
                  font-semibold
                  outline-none
                  transition
                  placeholder:text-muted-foreground/60
                  focus:border-primary
                  focus:ring-2
                  focus:ring-primary/10
                "
              />
            </div>

            <div className="relative">
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
                  update({
                    maxPrice:
                      event.target
                        .value
                        ? Number(
                            event.target
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
                  bg-secondary
                  px-3
                  text-xs
                  font-semibold
                  outline-none
                  transition
                  placeholder:text-muted-foreground/60
                  focus:border-primary
                  focus:ring-2
                  focus:ring-primary/10
                "
              />
            </div>
          </div>
        </section>

        {/* التقييم */}
        <section
          className="
            border-t
            border-border/60
            pt-5
          "
        >
          <h4 className="text-xs font-bold text-foreground">
            تقييم العملاء
          </h4>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              {
                value: undefined,
                label: "كل التقييمات",
              },
              {
                value: 3,
                label: "3 نجوم فأكثر",
              },
              {
                value: 4,
                label: "4 نجوم فأكثر",
              },
              {
                value: 4.5,
                label: "4.5 نجوم فأكثر",
              },
            ].map((option) => {
              const selected =
                option.value ===
                filters.minRating;

              return (
                <button
                  key={
                    option.value ??
                    "all"
                  }
                  type="button"
                  onClick={() =>
                    update({
                      minRating:
                        option.value,
                    })
                  }
                  className={`
                    flex
                    min-h-10
                    items-center
                    justify-between
                    gap-2
                    rounded-xl
                    border
                    px-2.5
                    text-[9px]
                    font-bold
                    transition-all
                    active:scale-[0.98]
                    ${
                      selected
                        ? "border-primary bg-brand-soft text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/30"
                    }
                  `}
                >
                  <span className="flex items-center gap-1.5">
                    {option.value !==
                    undefined ? (
                      <Star
                        className="
                          h-3.5
                          w-3.5
                          fill-accent-solid
                          text-accent-solid
                        "
                      />
                    ) : null}

                    {option.label}
                  </span>

                  {selected ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* المدينة */}
        <section
          className="
            border-t
            border-border/60
            pt-5
          "
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground">
              المدينة
            </h4>

            {hasCityFilter ? (
              <button
                type="button"
                onClick={() =>
                  update({
                    city: undefined,
                  })
                }
                className="
                  text-[9px]
                  font-bold
                  text-primary
                  hover:underline
                "
              >
                مسح
              </button>
            ) : null}
          </div>

          {cities.length > 0 ? (
            <div
              className="
                mt-3
                flex
                max-h-44
                flex-wrap
                gap-2
                overflow-y-auto
                pe-1
              "
            >
              <button
                type="button"
                onClick={() =>
                  update({
                    city: undefined,
                  })
                }
                className={`
                  rounded-full
                  border
                  px-3
                  py-2
                  text-[9px]
                  font-bold
                  transition-all
                  active:scale-[0.98]
                  ${
                    !filters.city
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }
                `}
              >
                كل المدن
              </button>

              {cities.map(
                (city) => {
                  const selected =
                    filters.city ===
                    city;

                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() =>
                        update({
                          city,
                        })
                      }
                      className={`
                        rounded-full
                        border
                        px-3
                        py-2
                        text-[9px]
                        font-bold
                        transition-all
                        active:scale-[0.98]
                        ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground"
                        }
                      `}
                    >
                      {city}
                    </button>
                  );
                },
              )}
            </div>
          ) : (
            <p
              className="
                mt-3
                rounded-xl
                bg-secondary
                px-3
                py-3
                text-[10px]
                text-muted-foreground
              "
            >
              لا توجد مدن متاحة حالياً.
            </p>
          )}
        </section>

        {/* إعادة التعيين */}
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="
              flex
              min-h-11
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-border
              bg-background
              px-4
              text-[10px]
              font-bold
              text-muted-foreground
              transition-all
              hover:border-primary/30
              hover:text-primary
              active:scale-[0.98]
            "
          >
            <RotateCcw className="h-3.5 w-3.5" />
            إعادة تعيين جميع الفلاتر
          </button>
        ) : null}
      </div>
    </aside>
  );
}
