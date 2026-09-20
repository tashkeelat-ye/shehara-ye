BEGIN;

-- SHEHARA — Vendor public branding
-- Image roles:
-- logo_url          : الصورة الرئيسية للعلامة في «أبرز التجار» (800x800)
-- profile_logo_url  : شعار صفحة التاجر (600x600)
-- cover_image_url   : غلاف صفحة التاجر (1600x700)

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS profile_logo_url text,
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Keep existing logo_url as the main brand image shown in Top Vendors.
-- Existing vendors continue to work without any manual migration.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'vendor-branding',
  'vendor-branding',
  true,
  5242880,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]
)
ON CONFLICT (id)
DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS vendor_branding_insert
ON storage.objects;

CREATE POLICY vendor_branding_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vendor-branding'
  AND (storage.foldername(name))[1] = 'vendors'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_vendor()
);

DROP POLICY IF EXISTS vendor_branding_update
ON storage.objects;

CREATE POLICY vendor_branding_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vendor-branding'
  AND (storage.foldername(name))[1] = 'vendors'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_vendor()
)
WITH CHECK (
  bucket_id = 'vendor-branding'
  AND (storage.foldername(name))[1] = 'vendors'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_vendor()
);

DROP POLICY IF EXISTS vendor_branding_delete
ON storage.objects;

CREATE POLICY vendor_branding_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'vendor-branding'
  AND (storage.foldername(name))[1] = 'vendors'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_vendor()
);


-- Securely update only the three public branding URLs owned by the vendor.
CREATE OR REPLACE FUNCTION public.update_vendor_branding(
  p_vendor_id uuid,
  p_field text,
  p_url text
)
RETURNS public.vendors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.vendors;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.id = p_vendor_id
      AND v.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'غير مصرح بتعديل هذا المتجر';
  END IF;

  IF p_field NOT IN (
    'logo_url',
    'profile_logo_url',
    'cover_image_url'
  ) THEN
    RAISE EXCEPTION 'حقل الهوية غير مسموح';
  END IF;

  IF NULLIF(trim(COALESCE(p_url, '')), '') IS NULL THEN
    RAISE EXCEPTION 'رابط الصورة مطلوب';
  END IF;

  IF p_field = 'logo_url' THEN
    UPDATE public.vendors
    SET logo_url = trim(p_url)
    WHERE id = p_vendor_id
    RETURNING * INTO result;

  ELSIF p_field = 'profile_logo_url' THEN
    UPDATE public.vendors
    SET profile_logo_url = trim(p_url)
    WHERE id = p_vendor_id
    RETURNING * INTO result;

  ELSE
    UPDATE public.vendors
    SET cover_image_url = trim(p_url)
    WHERE id = p_vendor_id
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL
ON FUNCTION public.update_vendor_branding(uuid, text, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.update_vendor_branding(uuid, text, text)
TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
