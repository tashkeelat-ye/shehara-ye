ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_sort integer NOT NULL DEFAULT 0;

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';

INSERT INTO public.home_sections (section_key, title, sort_order, is_active)
VALUES ('featured_products', 'منتجات مميزة', 45, true)
ON CONFLICT (section_key) DO NOTHING;

DROP POLICY IF EXISTS vendors_own_read ON public.vendors;
CREATE POLICY vendors_own_read ON public.vendors
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY vendors_self_apply ON public.vendors
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_active = false
    AND account_enabled = false
  );
