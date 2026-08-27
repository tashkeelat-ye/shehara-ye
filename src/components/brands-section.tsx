import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  ChevronLeft,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SectionHeading } from "./section-heading";

type Brand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export function BrandsSection() {
  const {
    data: brands = [],
    isLoading,
  } = useQuery({
    queryKey: ["brands", "active"],
    queryFn: async () => {
      const {
        data,
        error,
      } = await supabase
        .from("brands")
        .select(
          "id,name,slug,logo_url,sort_order,is_active",
        )
        .eq("is_active", true)
        .order("sort_order", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      return (data ?? []) as Brand[];
    },
    staleTime:
      1000 * 60 * 10,
  });

  if (
    !isLoading &&
    brands.length === 0
  ) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0E4D64]/10 text-[#0E4D64]">
            <Award className="h-5 w-5" />
          </span>

          <div>
            <h2 className="text-base font-black text-foreground">
              تصفح حسب الماركات
            </h2>

            <p className="mt-0.5 text-[10px] text-muted-foreground">
              اختر علامتك المفضلة واكتشف منتجاتها
            </p>
          </div>
        </div>

        <Link
          to="/products"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0E4D64]"
        >
          كل الماركات
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {isLoading
          ? Array.from({
              length: 5,
            }).map((_, index) => (
              <div
                key={index}
                className="h-28 w-28 shrink-0 animate-pulse rounded-2xl bg-muted"
              />
            ))
          : brands.map((brand) => (
              <Link
                key={brand.id}
                to="/products"
                search={{
                  brand: brand.slug,
                } as never}
                className="group flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-2xl border border-[#0E4D64]/8 bg-white p-3 shadow-[0_12px_30px_-25px_rgba(14,77,100,0.65)] transition-all duration-200 hover:-translate-y-1 hover:border-[#D65A31]/30 hover:shadow-lg active:scale-95 dark:bg-card"
              >
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-[#FAF9F6]">
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      loading="lazy"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-lg font-black text-[#0E4D64]">
                      {brand.name
                        .trim()
                        .charAt(0)}
                    </span>
                  )}
                </div>

                <span className="mt-2 max-w-full truncate text-[10px] font-bold text-foreground">
                  {brand.name}
                </span>

                <span className="mt-1 flex items-center gap-0.5 text-[8px] text-muted-foreground">
                  اكتشف
                  <ChevronLeft className="h-3 w-3" />
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
}
