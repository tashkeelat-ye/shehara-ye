-- 1) product_reviews ownership
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.product_reviews ALTER COLUMN is_approved SET DEFAULT false;

DROP POLICY IF EXISTS "product_reviews insert authenticated" ON public.product_reviews;
CREATE POLICY "product_reviews insert own" ON public.product_reviews
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Enable read for all users" ON public.product_reviews;
CREATE POLICY "product_reviews read approved" ON public.product_reviews
  FOR SELECT TO anon, authenticated
  USING (is_approved = true);

CREATE POLICY "product_reviews read own or admin" ON public.product_reviews
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 2) reviews moderation
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

UPDATE public.reviews SET is_approved = true WHERE is_approved = false;

DROP POLICY IF EXISTS "reviews_public_read" ON public.reviews;
CREATE POLICY "reviews_public_read_approved" ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (is_approved = true);

CREATE POLICY "reviews_read_own_or_admin" ON public.reviews
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "reviews_admin_update" ON public.reviews
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "reviews_admin_delete" ON public.reviews
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 3) notifications: broadcast reads limited to genuine broadcasts
DROP POLICY IF EXISTS "broadcast notifications read" ON public.notifications;
CREATE POLICY "broadcast notifications read" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id IS NULL AND kind = 'عام');

DROP POLICY IF EXISTS "admin notifications insert" ON public.notifications;
CREATE POLICY "admin notifications insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND ((user_id IS NULL AND kind = 'عام') OR (user_id IS NOT NULL AND kind <> 'عام'))
  );