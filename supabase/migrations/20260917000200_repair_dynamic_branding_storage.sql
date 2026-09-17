BEGIN;

-- ============================================================
-- SHEHARA
-- Repair Dynamic Branding / Storage
-- ============================================================


-- ============================================================
-- 1. Ensure branding columns exist
-- ============================================================

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS pwa_icon_url
    text NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS pwa_icon_192_url
    text NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS pwa_icon_512_url
    text NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS splash_logo_url
    text NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS splash_background_url
    text NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS header_logo_url
    text NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS sidebar_logo_url
    text NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS auth_logo_url
    text NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS app_background_url
    text NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS seo_name
    text NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS seo_description
    text NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS seo_icon_url
    text NOT NULL DEFAULT '';


-- ============================================================
-- 2. Ensure the single settings row exists
-- ============================================================

INSERT INTO public.site_settings (
  id
)
VALUES (
  true
)
ON CONFLICT (id)
DO NOTHING;


-- ============================================================
-- 3. Safe defaults for branding
-- ============================================================

UPDATE public.site_settings
SET
  pwa_icon_url =
    CASE
      WHEN COALESCE(pwa_icon_url, '') = ''
        THEN COALESCE(
          NULLIF(logo_url, ''),
          '/icon-192.png'
        )
      ELSE pwa_icon_url
    END,

  pwa_icon_192_url =
    CASE
      WHEN COALESCE(pwa_icon_192_url, '') = ''
        THEN '/icon-192.png'
      ELSE pwa_icon_192_url
    END,

  pwa_icon_512_url =
    CASE
      WHEN COALESCE(pwa_icon_512_url, '') = ''
        THEN '/icon-512.png'
      ELSE pwa_icon_512_url
    END,

  splash_logo_url =
    CASE
      WHEN COALESCE(splash_logo_url, '') = ''
        THEN COALESCE(
          NULLIF(logo_url, ''),
          '/logo.png'
        )
      ELSE splash_logo_url
    END,

  splash_background_url =
    CASE
      WHEN COALESCE(splash_background_url, '') = ''
        THEN '/splash-background.png'
      ELSE splash_background_url
    END,

  header_logo_url =
    CASE
      WHEN COALESCE(header_logo_url, '') = ''
        THEN COALESCE(
          NULLIF(logo_url, ''),
          '/logo.png'
        )
      ELSE header_logo_url
    END,

  sidebar_logo_url =
    CASE
      WHEN COALESCE(sidebar_logo_url, '') = ''
        THEN COALESCE(
          NULLIF(logo_url, ''),
          '/logo.png'
        )
      ELSE sidebar_logo_url
    END,

  auth_logo_url =
    CASE
      WHEN COALESCE(auth_logo_url, '') = ''
        THEN COALESCE(
          NULLIF(logo_url, ''),
          '/logo.png'
        )
      ELSE auth_logo_url
    END,

  seo_icon_url =
    CASE
      WHEN COALESCE(seo_icon_url, '') = ''
        THEN COALESCE(
          NULLIF(pwa_icon_192_url, ''),
          '/icon-192.png'
        )
      ELSE seo_icon_url
    END,

  seo_name =
    CASE
      WHEN COALESCE(seo_name, '') = ''
        THEN COALESCE(
          NULLIF(store_name, ''),
          'شهارة للتسوق'
        )
      ELSE seo_name
    END,

  seo_description =
    CASE
      WHEN COALESCE(seo_description, '') = ''
        THEN COALESCE(
          NULLIF(tagline, ''),
          'شهارة | SHEHARA — متجر إلكتروني يمني للتسوق بسهولة وأمان.'
        )
      ELSE seo_description
    END

WHERE id = true;


-- ============================================================
-- 4. Create / repair the branding Storage bucket
-- ============================================================

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'branding',
  'branding',
  true,
  10485760,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/avif'
  ]
)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types =
    EXCLUDED.allowed_mime_types;


-- ============================================================
-- 5. Remove only old branding policies
-- ============================================================

DROP POLICY IF EXISTS
  "branding_public_read"
ON storage.objects;

DROP POLICY IF EXISTS
  "branding_admin_insert"
ON storage.objects;

DROP POLICY IF EXISTS
  "branding_admin_update"
ON storage.objects;

DROP POLICY IF EXISTS
  "branding_admin_delete"
ON storage.objects;

DROP POLICY IF EXISTS
  branding_public_read
ON storage.objects;

DROP POLICY IF EXISTS
  branding_admin_insert
ON storage.objects;

DROP POLICY IF EXISTS
  branding_admin_update
ON storage.objects;

DROP POLICY IF EXISTS
  branding_admin_delete
ON storage.objects;


-- ============================================================
-- 6. Public read access
-- ============================================================

CREATE POLICY branding_public_read
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'branding'
);


-- ============================================================
-- 7. Admin upload
-- ============================================================

CREATE POLICY branding_admin_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding'
  AND public.has_role(
    auth.uid(),
    'admin'
  )
);


-- ============================================================
-- 8. Admin update
-- ============================================================

CREATE POLICY branding_admin_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding'
  AND public.has_role(
    auth.uid(),
    'admin'
  )
)
WITH CHECK (
  bucket_id = 'branding'
  AND public.has_role(
    auth.uid(),
    'admin'
  )
);


-- ============================================================
-- 9. Admin delete
-- ============================================================

CREATE POLICY branding_admin_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding'
  AND public.has_role(
    auth.uid(),
    'admin'
  )
);


-- ============================================================
-- 10. Refresh PostgREST schema
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
