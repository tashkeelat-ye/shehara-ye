DROP POLICY IF EXISTS banners_public_read ON public.banners;
CREATE POLICY banners_public_read ON public.banners
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY banners_admin_read ON public.banners
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS faqs_public_read ON public.faqs;
CREATE POLICY faqs_public_read ON public.faqs
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY faqs_admin_read ON public.faqs
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS pages_public_read ON public.pages;
CREATE POLICY pages_public_read ON public.pages
  FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY pages_admin_read ON public.pages
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS pm_public_read ON public.payment_methods;
CREATE POLICY pm_public_read ON public.payment_methods
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY pm_admin_read ON public.payment_methods
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
  FOR SELECT TO anon, authenticated USING (is_active);