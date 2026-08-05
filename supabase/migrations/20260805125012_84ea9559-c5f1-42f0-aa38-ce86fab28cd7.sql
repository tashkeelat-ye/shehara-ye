CREATE TABLE public.couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.couriers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couriers TO authenticated;
GRANT ALL ON public.couriers TO service_role;

ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couriers_public_read" ON public.couriers FOR SELECT USING (true);
CREATE POLICY "couriers_admin_insert" ON public.couriers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "couriers_admin_update" ON public.couriers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "couriers_admin_delete" ON public.couriers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER couriers_touch BEFORE UPDATE ON public.couriers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.orders ADD COLUMN courier_id uuid REFERENCES public.couriers(id) ON DELETE SET NULL;

ALTER TABLE public.site_settings
  ADD COLUMN is_open boolean NOT NULL DEFAULT true,
  ADD COLUMN closed_message text NOT NULL DEFAULT 'المتجر مغلق مؤقتًا، نعتذر عن الإزعاج.',
  ADD COLUMN announcement_text text NOT NULL DEFAULT '',
  ADD COLUMN announcement_link text NOT NULL DEFAULT '',
  ADD COLUMN announcement_active boolean NOT NULL DEFAULT false;