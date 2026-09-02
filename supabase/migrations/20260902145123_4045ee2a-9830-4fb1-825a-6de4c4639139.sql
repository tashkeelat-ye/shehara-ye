CREATE TABLE public.home_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.home_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_sections TO authenticated;
GRANT ALL ON public.home_sections TO service_role;

ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_sections_public_read_active"
ON public.home_sections FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY "home_sections_admin_read_all"
ON public.home_sections FOR SELECT TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "home_sections_admin_insert"
ON public.home_sections FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "home_sections_admin_update"
ON public.home_sections FOR UPDATE TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "home_sections_admin_delete"
ON public.home_sections FOR DELETE TO authenticated
USING (public.is_current_user_admin());

CREATE TRIGGER home_sections_touch
BEFORE UPDATE ON public.home_sections
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.home_sections (section_key, title, sort_order, is_active) VALUES
  ('stories', 'القصص', 10, true),
  ('categories', 'تسوق حسب الفئات', 20, true),
  ('best_sellers', 'الأكثر مبيعاً', 30, true),
  ('flash_sale', 'عروض فلاش', 40, true),
  ('offers', 'العروض', 50, true),
  ('banners', 'البنرات', 60, true),
  ('new_arrivals', 'منتجات جديدة', 70, true),
  ('featured', 'منتجات مميزة', 80, true),
  ('brands', 'العلامات التجارية', 90, true),
  ('local_products', 'منتجات يمنية محلية', 100, true);