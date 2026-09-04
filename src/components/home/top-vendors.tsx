import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MapPin, Store } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SectionHeading } from "@/components/section-heading";

type TopVendor = {
  id: string;
  name: string;
  city: string;
  productCount: number;
};

async function fetchTopVendors(): Promise<TopVendor[]> {
  const { data: vendors, error } = await supabase
    .from("vendors")
    .select("id,name,city")
    .eq("is_active", true)
    .limit(12);

  if (error) throw error;

  const list = vendors ?? [];
  if (list.length === 0) return [];

  const { data: products } = await supabase
    .from("products")
    .select("vendor_id")
    .eq("is_active", true)
    .in(
      "vendor_id",
      list.map((vendor) => vendor.id),
    );

  const counts = new Map<string, number>();
  for (const row of products ?? []) {
    if (!row.vendor_id) continue;
    counts.set(row.vendor_id, (counts.get(row.vendor_id) ?? 0) + 1);
  }

  return list
    .map((vendor) => ({
      ...vendor,
      productCount: counts.get(vendor.id) ?? 0,
    }))
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 10);
}

export function TopVendors() {
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["top-vendors"],
    queryFn: fetchTopVendors,
    staleTime: 5 * 60_000,
  });

  if (isLoading || vendors.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeading title="أبرز التجار" />

      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {vendors.map((vendor) => (
          <Link
            key={vendor.id}
            to="/vendor/$id"
            params={{ id: vendor.id }}
            className="flex w-[150px] shrink-0 flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm transition-transform active:scale-95"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </span>

            <span className="truncate text-sm font-bold text-foreground">
              {vendor.name}
            </span>

            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {vendor.city || "اليمن"}
            </span>

            <span className="text-[11px] font-semibold text-primary">
              {vendor.productCount} منتج
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
