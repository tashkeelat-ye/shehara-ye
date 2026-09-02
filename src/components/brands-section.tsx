import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeading } from "./section-heading";

export function BrandsSection() {
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading || brands.length === 0) return null;

  return (
    <section className="py-6">
      <SectionHeading title="تصفح حسب الماركات" to="/products" />
      <div className="no-scrollbar mt-3 flex gap-4 overflow-x-auto px-4 pb-2">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            to="/products"
            search={{ brand: brand.slug ?? undefined }}
            className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg border border-border bg-card p-3 shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-sm font-semibold text-foreground">{brand.name}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
