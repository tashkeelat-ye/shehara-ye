CREATE POLICY receipts_own_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY receipts_own_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY receipts_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND public.is_admin());

CREATE POLICY products_read_all ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'products');
CREATE POLICY products_admin_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products' AND public.is_admin());
CREATE POLICY products_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'products' AND public.is_admin()) WITH CHECK (bucket_id = 'products' AND public.is_admin());
CREATE POLICY products_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'products' AND public.is_admin());