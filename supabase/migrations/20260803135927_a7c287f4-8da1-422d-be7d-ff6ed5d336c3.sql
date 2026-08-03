DROP POLICY IF EXISTS media_public_read ON storage.objects;
CREATE POLICY media_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('products','banners'));

DROP POLICY IF EXISTS media_admin_insert ON storage.objects;
CREATE POLICY media_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('products','banners') AND public.is_admin());

DROP POLICY IF EXISTS media_admin_update ON storage.objects;
CREATE POLICY media_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('products','banners') AND public.is_admin())
  WITH CHECK (bucket_id IN ('products','banners') AND public.is_admin());

DROP POLICY IF EXISTS media_admin_delete ON storage.objects;
CREATE POLICY media_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('products','banners') AND public.is_admin());