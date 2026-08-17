-- =========================================================
-- تشكيلات للتسوق
-- نظام القصص Stories
-- =========================================================

-- ---------------------------------------------------------
-- 1. جدول القصص
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  title text NOT NULL DEFAULT '',

  image_url text NOT NULL,

  link_url text NULL,

  duration integer NOT NULL DEFAULT 5,

  sort_order integer NOT NULL DEFAULT 0,

  is_active boolean NOT NULL DEFAULT true,

  starts_at timestamptz NULL,

  expires_at timestamptz NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT stories_duration_check
    CHECK (duration >= 1 AND duration <= 60),

  CONSTRAINT stories_sort_order_check
    CHECK (sort_order >= 0)
);

-- ---------------------------------------------------------
-- 2. الفهارس
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS stories_active_order_idx
ON public.stories (
  is_active,
  sort_order,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS stories_schedule_idx
ON public.stories (
  starts_at,
  expires_at
);

-- ---------------------------------------------------------
-- 3. الصلاحيات
-- ---------------------------------------------------------

GRANT SELECT
ON public.stories
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.stories
TO authenticated;

GRANT ALL
ON public.stories
TO service_role;

-- ---------------------------------------------------------
-- 4. تفعيل RLS
-- ---------------------------------------------------------

ALTER TABLE public.stories
ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 5. القراءة العامة
-- ---------------------------------------------------------

DROP POLICY IF EXISTS stories_public_read
ON public.stories;

CREATE POLICY stories_public_read
ON public.stories
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND (
    starts_at IS NULL
    OR starts_at <= now()
  )
  AND (
    expires_at IS NULL
    OR expires_at > now()
  )
);

-- ---------------------------------------------------------
-- 6. قراءة الإدارة لجميع القصص
-- ---------------------------------------------------------

DROP POLICY IF EXISTS stories_admin_read
ON public.stories;

CREATE POLICY stories_admin_read
ON public.stories
FOR SELECT
TO authenticated
USING (
  public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
);

-- ---------------------------------------------------------
-- 7. إضافة القصص من الإدارة
-- ---------------------------------------------------------

DROP POLICY IF EXISTS stories_admin_insert
ON public.stories;

CREATE POLICY stories_admin_insert
ON public.stories
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
);

-- ---------------------------------------------------------
-- 8. تعديل القصص من الإدارة
-- ---------------------------------------------------------

DROP POLICY IF EXISTS stories_admin_update
ON public.stories;

CREATE POLICY stories_admin_update
ON public.stories
FOR UPDATE
TO authenticated
USING (
  public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
)
WITH CHECK (
  public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
);

-- ---------------------------------------------------------
-- 9. حذف القصص من الإدارة
-- ---------------------------------------------------------

DROP POLICY IF EXISTS stories_admin_delete
ON public.stories;

CREATE POLICY stories_admin_delete
ON public.stories
FOR DELETE
TO authenticated
USING (
  public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
);

-- =========================================================
-- Storage
-- =========================================================

-- ---------------------------------------------------------
-- 10. إنشاء Bucket القصص
-- ---------------------------------------------------------

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'stories',
  'stories',
  true,
  8388608,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id)
DO UPDATE SET
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

-- ---------------------------------------------------------
-- 11. القراءة العامة لصور القصص
-- ---------------------------------------------------------

DROP POLICY IF EXISTS stories_storage_public_read
ON storage.objects;

CREATE POLICY stories_storage_public_read
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'stories'
);

-- ---------------------------------------------------------
-- 12. رفع صور القصص للإدارة
-- ---------------------------------------------------------

DROP POLICY IF EXISTS stories_storage_admin_insert
ON storage.objects;

CREATE POLICY stories_storage_admin_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stories'
  AND public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
);

-- ---------------------------------------------------------
-- 13. تعديل صور القصص للإدارة
-- ---------------------------------------------------------

DROP POLICY IF EXISTS stories_storage_admin_update
ON storage.objects;

CREATE POLICY stories_storage_admin_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stories'
  AND public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
)
WITH CHECK (
  bucket_id = 'stories'
  AND public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
);

-- ---------------------------------------------------------
-- 14. حذف صور القصص للإدارة
-- ---------------------------------------------------------

DROP POLICY IF EXISTS stories_storage_admin_delete
ON storage.objects;

CREATE POLICY stories_storage_admin_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'stories'
  AND public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
);
