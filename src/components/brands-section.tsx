import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Store,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SectionHeading } from "./section-heading";
import { AutoScrollRow } from "@/components/home/auto-scroll-row";

export function BrandsSection() {
  const {
    data: brands = [],
    isLoading,
  } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const {
        data,
        error,
      } = await supabase
        .from("brands")
        .select("*")
        .eq(
          "is_active",
          true,
        )
        .order(
          "sort_order",
          {
            ascending: true,
          },
        );

      if (error) {
        throw error;
      }

      return data ?? [];
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
    <section
      dir="rtl"
      className="
        relative
        overflow-hidden
        py-5
      "
    >
      <div
        className="
          mb-4
          flex
          items-center
          justify-between
          px-4
        "
      >
        <SectionHeading
          title="تصفح حسب الماركة"
          to="/products"
        />

        <span
          aria-hidden="true"
          className="
            me-2
            grid
            h-8
            w-8
            place-items-center
            rounded-full
            bg-primary/8
            text-primary
          "
        >
          <Store className="h-4 w-4" />
        </span>
      </div>

      {isLoading ? (
        <AutoScrollRow
          speed={0.25}
          ariaLabel="ماركات المتجر"
          className="px-4 pb-2"
        >
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="
                h-24
                w-36
                shrink-0
                animate-pulse
                rounded-2xl
                border
                border-border
                bg-card
              "
            />
          ))}
        </AutoScrollRow>
      ) : (
        <AutoScrollRow
          speed={0.25}
          ariaLabel="ماركات المتجر"
          className="px-4 pb-2"
        >
          {brands.map(
            (brand) => (
              <Link
                key={brand.id}
                to="/products"
                search={{
                  brand:
                    brand.slug ??
                    undefined,
                }}
                className="
                  group
                  relative
                  flex
                  h-24
                  w-36
                  shrink-0
                  flex-col
                  items-center
                  justify-center
                  gap-2
                  overflow-hidden
                  rounded-2xl
                  border
                  border-primary/10
                  bg-card
                  p-3
                  shadow-[0_8px_25px_-22px_rgba(13,59,77,0.8)]
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-primary/25
                  hover:shadow-md
                  active:scale-95
                "
              >
                <span
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    -end-4
                    -top-4
                    h-14
                    w-14
                    rounded-full
                    bg-primary/5
                    transition-transform
                    duration-500
                    group-hover:scale-150
                  "
                />

                <span
                  className="
                    relative
                    flex
                    h-12
                    w-24
                    items-center
                    justify-center
                  "
                >
                  {brand.logo_url ? (
                    <img
                      src={
                        brand.logo_url
                      }
                      alt={
                        brand.name
                      }
                      loading="lazy"
                      draggable={false}
                      className="
                        max-h-full
                        max-w-full
                        object-contain
                        transition-transform
                        duration-300
                        group-hover:scale-105
                      "
                    />
                  ) : (
                    <span
                      className="
                        text-center
                        text-sm
                        font-extrabold
                        text-foreground
                      "
                    >
                      {
                        brand.name
                      }
                    </span>
                  )}
                </span>

                <span
                  className="
                    absolute
                    bottom-0
                    start-0
                    h-0.5
                    w-0
                    bg-accent-solid
                    transition-all
                    duration-300
                    group-hover:w-full
                  "
                />
              </Link>
            ),
          )}
        </AutoScrollRow>
      )}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-y-0
          start-0
          w-10
          bg-gradient-to-r
          from-background
          to-transparent
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-y-0
          end-0
          w-10
          bg-gradient-to-l
          from-background
          to-transparent
        "
      />
    </section>
  );
}
