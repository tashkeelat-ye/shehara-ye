import { supabase } from "@/integrations/supabase/client";

export type NavItem = {
  id: string;
  label: string;
  path: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

const COLUMNS = "id,label,path,icon,sort_order,is_active";

export const NAV_ICON_KEYS = [
  "home",
  "grid",
  "package",
  "user",
  "cart",
  "wallet",
  "heart",
  "bell",
  "phone",
  "info",
] as const;

export async function fetchNavItems(onlyActive = true): Promise<NavItem[]> {
  let q = supabase.from("nav_items").select(COLUMNS);
  if (onlyActive) q = q.eq("is_active", true);
  const { data } = await q.order("sort_order").returns<NavItem[]>();
  return data ?? [];
}
