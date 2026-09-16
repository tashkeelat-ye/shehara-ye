BEGIN;

-- =========================================================
-- SHEHARA
-- توحيد وتأمين أقسام الصفحة الرئيسية
-- =========================================================

-- إنشاء نوع القسم إذا لم يكن موجوداً بالفعل
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'home_sections_section_type_check'
  ) THEN
    ALTER TABLE public.home_sections
      ADD CONSTRAINT home_sections_section_type_check
      CHECK (
        section_type IN (
          'banner_sub',
          'banner_main_copy',
          'best_sellers',
          'new_products',
          'popular_categories'
        )
      );
  END IF;
END
$$;

-- ضمان عدم وجود ترتيب سلبي
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'home_sections_sort_order_non_negative'
  ) THEN
    ALTER TABLE public.home_sections
      ADD CONSTRAINT home_sections_sort_order_non_negative
      CHECK (sort_order >= 0);
  END IF;
END
$$;

-- فهرس للتحميل السريع حسب الترتيب والحالة
CREATE INDEX IF NOT EXISTS
  idx_home_sections_active_sort
ON public.home_sections (
  is_active,
  sort_order
);

-- فهرس إضافي لنوع القسم
CREATE INDEX IF NOT EXISTS
  idx_home_sections_type
ON public.home_sections (
  section_type
);

-- =========================================================
-- Realtime
-- =========================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'home_sections'
  ) THEN

    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.home_sections;

  END IF;
END
$$;

-- =========================================================
-- تنظيف القيم غير الصحيحة إن وجدت
-- =========================================================

UPDATE public.home_sections
SET sort_order = 0
WHERE sort_order IS NULL
   OR sort_order < 0;

UPDATE public.home_sections
SET title = section_key
WHERE title IS NULL
   OR btrim(title) = '';

UPDATE public.home_sections
SET is_active = true
WHERE is_active IS NULL;

COMMIT;
