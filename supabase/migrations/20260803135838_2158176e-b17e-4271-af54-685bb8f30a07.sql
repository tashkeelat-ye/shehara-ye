CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT '',
  link_url text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY banners_public_read ON public.banners
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin());

CREATE POLICY banners_admin_write ON public.banners
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER banners_touch BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS telegram text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tiktok text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS twitter text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS footer_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS footer_copyright text NOT NULL DEFAULT '';

INSERT INTO public.banners (title, subtitle, cta_label, link_url, image_url, sort_order, is_active)
VALUES
  ('تشكيلة الصيف وصلت', 'أزياء وإكسسوارات بأسعار تنافسية داخل اليمن', 'تسوّق الآن', '/products', '/products/banner-1.webp', 1, true),
  ('منتجات يمنية محلية', 'عسل دوعني، بخور، وحرف يدوية أصلية', 'اكتشف المحلي', '/products?local=1', '/products/banner-1.webp', 2, true);