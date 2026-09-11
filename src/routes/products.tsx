import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useMemo,
  useState,
} from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  Grid2X2,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";
import {
  fetchCategories,
  type Category,
} from "@/lib/db";

export const Route =
  createFileRoute("/products")({
    head: () => ({
      meta: [
        {
          title:
            "الأقسام | شهارة",
        },
        {
          name: "description",
          content:
            "تصفح أقسام متجر شهارة للوصول إلى المنتجات بسهولة وسرعة.",
        },
        {
          property: "og:title",
          content:
            "أقسام المنتجات | شهارة",
        },
        {
          property:
            "og:description",
          content:
            "اكتشف أقسام شهارة واختر القسم المناسب للوصول إلى المنتجات.",
        },
      ],
    }),

    component:
      CategoriesPage,
  });

const BRAND = {
  teal: "#0D3B4D",
  dark: "#0A2A38",
  orange: "#E2723A",
  cream: "#F6F2EE",
};

function CategoryVisual({
  category,
}: {
  category: Category;
}) {
  if (category.image_url) {
    return (
      <img
        src={category.image_url}
        alt=""
        loading="lazy"
        className="
          h-full
          w-full
          object-cover
          transition
          duration-700
          group-hover:scale-110
        "
      />
    );
  }

  if (
    category.icon &&
    (category.icon.startsWith("http") ||
      category.icon.startsWith("/"))
  ) {
    return (
      <img
        src={category.icon}
        alt=""
        loading="lazy"
        className="
          h-full
          w-full
          object-cover
          transition
          duration-700
          group-hover:scale-110
        "
      />
    );
  }

  return (
    <div
      className="
        flex
        h-full
        w-full
        items-center
        justify-center
        bg-[radial-gradient(circle_at_30%_20%,rgba(226,114,58,0.28),transparent_35%),linear-gradient(135deg,#0D3B4D,#0A2A38)]
      "
    >
      <div className="
        grid
        h-16
        w-16
        place-items-center
        rounded-[22px]
        border
        border-white/15
        bg-white/10
        text-[#E2723A]
        shadow-[0_20px_45px_-25px_rgba(0,0,0,0.8)]
        backdrop-blur-md
      ">
        <Grid2X2 className="h-7 w-7" />
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  index,
}: {
  category: Category;
  index: number;
}) {
  return (
    <Link
      to="/category/$slug"
      params={{
        slug: category.slug,
      }}
      className="
        group
        relative
        block
        overflow-hidden
        rounded-[26px]
        border
        border-[#0D3B4D]/10
        bg-white
        shadow-[0_16px_45px_-34px_rgba(13,59,77,0.8)]
        transition
        duration-300
        hover:-translate-y-1
        hover:border-[#E2723A]/25
        hover:shadow-[0_24px_55px_-32px_rgba(13,59,77,0.75)]
        active:scale-[0.985]
      "
    >
      <div className="
        relative
        aspect-[1.18]
        overflow-hidden
        bg-[#0D3B4D]/5
      ">
        <CategoryVisual
          category={category}
        />

        <div className="
          pointer-events-none
          absolute
          inset-0
          bg-gradient-to-t
          from-[#0A2A38]/70
          via-[#0A2A38]/5
          to-transparent
          opacity-80
        " />

        <span className="
          absolute
          start-3
          top-3
          grid
          h-8
          min-w-8
          place-items-center
          rounded-xl
          border
          border-white/15
          bg-[#0A2A38]/45
          px-2
          text-[9px]
          font-black
          text-white
          backdrop-blur-md
        ">
          {(index + 1).toLocaleString("ar-EG")}
        </span>

        <span className="
          absolute
          bottom-3
          start-3
          grid
          h-9
          w-9
          place-items-center
          rounded-xl
          bg-[#E2723A]
          text-white
          shadow-[0_10px_25px_-12px_rgba(226,114,58,0.9)]
          transition
          duration-300
          group-hover:-translate-x-1
        ">
          <ArrowLeft className="h-4 w-4" />
        </span>
      </div>

      <div className="px-4 py-4">
        <h2 className="
          line-clamp-1
          text-sm
          font-black
          text-[#0A2A38]
        ">
          {category.name}
        </h2>

        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E2723A]" />

          <p className="text-[10px] font-medium text-slate-400">
            استكشف منتجات القسم
          </p>
        </div>
      </div>
    </Link>
  );
}

function CategoriesPage() {
  const [query, setQuery] =
    useState("");

  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "categories",
      "directory",
    ],
    queryFn:
      fetchCategories,
    staleTime:
      1000 * 60 * 30,
    gcTime:
      1000 * 60 * 60,
  });

  const filteredCategories =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLocaleLowerCase(
            "ar",
          );

      if (!normalized) {
        return categories;
      }

      return categories.filter(
        (category) =>
          category.name
            .toLocaleLowerCase(
              "ar",
            )
            .includes(
              normalized,
            ) ||
          category.slug
            .toLocaleLowerCase(
              "ar",
            )
            .includes(
              normalized,
            ),
      );
    }, [
      categories,
      query,
    ]);

  const clearSearch = () => {
    setQuery("");
  };

  return (
    <div
      dir="rtl"
      className="
        shehara-app
        min-h-screen
        bg-[#F6F2EE]
        pb-24
        md:pb-8
      "
    >
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-5 pt-5 md:pt-8">
          <div
            className="
              relative
              overflow-hidden
              rounded-[30px]
              px-5
              py-6
              shadow-[0_25px_60px_-40px_rgba(13,59,77,0.8)]
              md:px-8
              md:py-8
            "
            style={{
              background:
                `linear-gradient(135deg, ${BRAND.dark}, ${BRAND.teal})`,
            }}
          >
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -end-16
                -top-20
                h-52
                w-52
                rounded-full
                bg-[#E2723A]/20
                blur-3xl
              "
            />

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -bottom-24
                -start-16
                h-48
                w-48
                rounded-full
                bg-white/10
                blur-3xl
              "
            />

            <div className="relative z-10 max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#E2723A]" />

                <span className="text-[9px] font-bold text-white/75">
                  تسوق أسهل مع شهارة
                </span>
              </div>

              <h1 className="
                text-2xl
                font-black
                leading-tight
                text-white
                md:text-3xl
              ">
                اكتشف الأقسام
              </h1>

              <p className="
                mt-2
                max-w-xl
                text-[11px]
                leading-6
                text-white/65
                md:text-xs
              ">
                اختر القسم الذي تبحث عنه وانتقل مباشرة إلى منتجاته بدون تشتيت.
              </p>
            </div>
          </div>
        </section>

        {/* البحث داخل الأقسام */}
        <section className="px-4">
          <div className="
            relative
            flex
            min-h-12
            items-center
            rounded-[18px]
            border
            border-[#0D3B4D]/10
            bg-white
            shadow-[0_12px_35px_-30px_rgba(13,59,77,0.8)]
          ">
            <Search className="
              ms-4
              h-4
              w-4
              shrink-0
              text-[#0D3B4D]/55
            " />

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="ابحث عن قسم..."
              aria-label="البحث عن قسم"
              className="
                min-w-0
                flex-1
                bg-transparent
                px-3
                py-3.5
                text-xs
                font-semibold
                text-[#0A2A38]
                outline-none
                placeholder:text-slate-400
              "
            />

            {query ? (
              <button
                type="button"
                onClick={
                  clearSearch
                }
                aria-label="مسح البحث"
                className="
                  me-2
                  grid
                  h-8
                  w-8
                  shrink-0
                  place-items-center
                  rounded-xl
                  text-slate-400
                  transition
                  hover:bg-[#F6F2EE]
                  hover:text-[#0A2A38]
                "
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </section>

        {/* عنوان */}
        <section className="flex items-end justify-between gap-3 px-4 pb-3 pt-6">
          <div>
            <p className="
              text-[9px]
              font-black
              uppercase
              tracking-[0.18em]
              text-[#E2723A]
            ">
              SHEHARA
            </p>

            <h2 className="
              mt-1
              text-lg
              font-black
              text-[#0A2A38]
            ">
              أقسام المتجر
            </h2>
          </div>

          {!isLoading &&
          categories.length > 0 ? (
            <span className="
              rounded-full
              bg-[#0D3B4D]/[0.06]
              px-3
              py-1.5
              text-[9px]
              font-black
              text-[#0D3B4D]
            ">
              {filteredCategories.length.toLocaleString(
                "ar-EG",
              )}{" "}
              قسم
            </span>
          ) : null}
        </section>

        {/* Loading */}
        {isLoading ? (
          <section className="
            grid
            grid-cols-2
            gap-3
            px-4
            sm:grid-cols-3
            lg:grid-cols-4
          ">
            {Array.from({
              length: 8,
            }).map((_, index) => (
              <div
                key={index}
                className="
                  overflow-hidden
                  rounded-[26px]
                  border
                  border-[#0D3B4D]/5
                  bg-white
                "
              >
                <div className="
                  aspect-[1.18]
                  animate-pulse
                  bg-slate-100
                " />

                <div className="space-y-2 p-4">
                  <div className="
                    h-4
                    w-3/5
                    animate-pulse
                    rounded
                    bg-slate-100
                  />

                  <div className="
                    h-3
                    w-4/5
                    animate-pulse
                    rounded
                    bg-slate-100
                  " />
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {/* خطأ */}
        {!isLoading &&
        isError ? (
          <section className="px-4">
            <div className="
              flex
              min-h-[300px]
              flex-col
              items-center
              justify-center
              rounded-[28px]
              border
              border-red-100
              bg-white
              px-6
              text-center
            ">
              <div className="
                grid
                h-16
                w-16
                place-items-center
                rounded-2xl
                bg-[#0D3B4D]/[0.06]
                text-[#0D3B4D]
              ">
                <Grid2X2 className="h-7 w-7" />
              </div>

              <h2 className="
                mt-4
                text-sm
                font-black
                text-[#0A2A38]
              ">
                تعذر تحميل الأقسام
              </h2>

              <p className="
                mt-2
                max-w-sm
                text-xs
                leading-6
                text-slate-400
              ">
                حدثت مشكلة مؤقتة أثناء تحميل الأقسام. حاول مرة أخرى.
              </p>

              <button
                type="button"
                onClick={() =>
                  void refetch()
                }
                className="
                  mt-5
                  rounded-2xl
                  bg-[#0D3B4D]
                  px-5
                  py-3
                  text-xs
                  font-black
                  text-white
                  transition
                  hover:bg-[#0A2A38]
                  active:scale-95
                "
              >
                إعادة المحاولة
              </button>
            </div>
          </section>
        ) : null}

        {/* الأقسام */}
        {!isLoading &&
        !isError &&
        filteredCategories.length >
          0 ? (
          <section className="
            grid
            grid-cols-2
            gap-3
            px-4
            sm:grid-cols-3
            lg:grid-cols-4
          ">
            {filteredCategories.map(
              (
                category,
                index,
              ) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  index={index}
                />
              ),
            )}
          </section>
        ) : null}

        {/* لا توجد نتائج */}
        {!isLoading &&
        !isError &&
        filteredCategories.length ===
          0 ? (
          <section className="px-4">
            <div className="
              flex
              min-h-[300px]
              flex-col
              items-center
              justify-center
              rounded-[28px]
              border
              border-[#0D3B4D]/10
              bg-white
              px-6
              text-center
            ">
              <div className="
                grid
                h-16
                w-16
                place-items-center
                rounded-2xl
                bg-[#F6F2EE]
                text-[#0D3B4D]
              ">
                <Search className="h-7 w-7" />
              </div>

              <h2 className="
                mt-4
                text-base
                font-black
                text-[#0A2A38]
              ">
                لم نجد هذا القسم
              </h2>

              <p className="
                mt-2
                max-w-sm
                text-xs
                leading-6
                text-slate-400
              ">
                جرّب كلمة أخرى أو امسح البحث لعرض جميع الأقسام.
              </p>

              {query ? (
                <button
                  type="button"
                  onClick={
                    clearSearch
                  }
                  className="
                    mt-5
                    rounded-2xl
                    bg-[#E2723A]
                    px-5
                    py-3
                    text-xs
                    font-black
                    text-white
                    transition
                    active:scale-95
                  "
                >
                  عرض جميع الأقسام
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* وصول سريع */}
        {!isLoading &&
        !isError &&
        categories.length > 0 ? (
          <section className="px-4 pb-8 pt-7">
            <div className="
              flex
              items-center
              gap-3
              rounded-[24px]
              border
              border-[#0D3B4D]/10
              bg-white
              p-4
            ">
              <div className="
                grid
                h-11
                w-11
                shrink-0
                place-items-center
                rounded-2xl
                bg-[#0D3B4D]
                text-[#E2723A]
              ">
                <Grid2X2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3 className="
                  text-xs
                  font-black
                  text-[#0A2A38]
                ">
                  اختر القسم أولاً
                </h3>

                <p className="
                  mt-1
                  text-[10px]
                  leading-5
                  text-slate-400
                ">
                  وبعدها ستظهر لك منتجات القسم فقط مع خيارات التصفية والترتيب.
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}
