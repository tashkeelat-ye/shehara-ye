-- bottom_nav_items
DROP POLICY IF EXISTS "إدارة العناصر للمسؤولين فقط" ON public.bottom_nav_items;
CREATE POLICY "bottom_nav_items admin manage" ON public.bottom_nav_items
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- brands
DROP POLICY IF EXISTS "Allow admin full access for brands" ON public.brands;
CREATE POLICY "brands admin manage" ON public.brands
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- notifications
DROP POLICY IF EXISTS "Enable insert for authenticated/admin users" ON public.notifications;
DROP POLICY IF EXISTS "Enable read for targeted users or public" ON public.notifications;
CREATE POLICY "broadcast notifications read" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id IS NULL);

-- product_reviews
DROP POLICY IF EXISTS "Enable insert for all users" ON public.product_reviews;
DROP POLICY IF EXISTS "Enable update for all users" ON public.product_reviews;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.product_reviews;
CREATE POLICY "product_reviews insert authenticated" ON public.product_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "product_reviews admin update" ON public.product_reviews
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "product_reviews admin delete" ON public.product_reviews
  FOR DELETE TO authenticated USING (public.is_admin());

-- user_push_subscriptions
DROP POLICY IF EXISTS "المستخدمون يمكنهم إدراج اشتراكهم " ON public.user_push_subscriptions;
CREATE POLICY "push subs insert own" ON public.user_push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push subs select own" ON public.user_push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "push subs update own" ON public.user_push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push subs delete own" ON public.user_push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);