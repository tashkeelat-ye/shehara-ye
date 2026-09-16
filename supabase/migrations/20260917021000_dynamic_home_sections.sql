BEGIN;

-- ============================================================
-- شهارة للتسوق
-- الأقسام الديناميكية للصفحة الرئيسية
-- ============================================================

ALTER TABLE public.home_sections
ADD COLUMN IF NOT EXISTS section_type text;


-- ============================================================
-- الأنواع المسموحة
--
-- banner_sub
-- banner_main_copy
-- best_sellers
-- new_products
-- popular_categories
-- ============================================================

UPDATE public.home_sections
SET section_type =
  CASE
    WHEN section_key IN (
      'banners'
    )
      THEN 'banner_sub'

    WHEN section_key IN (
      'hero'
    )
      THEN 'banner_main_copy'

    WHEN section_key IN (
      'best_sellers'
    )
      THEN 'best_sellers'

    WHEN section_key IN (
      'new_arrivals'
    )
      THEN 'new_products'

    WHEN section_key IN (
      'popular_categories'
    )
      THEN 'popular_categories'

    ELSE 'best_sellers'
  END
WHERE section_type IS NULL
   OR trim(section_type) = '';


-- ============================================================
-- التحقق من النوع
-- ============================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'home_sections_section_type_check'
  ) THEN

    ALTER TABLE public.home_sections
    ADD CONSTRAINT
      home_sections_section_type_check
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


CREATE INDEX IF NOT EXISTS
home_sections_sort_order_idx
ON public.home_sections(
  sort_order
);


CREATE INDEX IF NOT EXISTS
home_sections_active_type_idx
ON public.home_sections(
  is_active,
  section_type,
  sort_order
);


-- ============================================================
-- Realtime
-- ============================================================

DO $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname =
      'supabase_realtime'
  ) THEN

    BEGIN

      ALTER PUBLICATION
        supabase_realtime
      ADD TABLE
        public.home_sections;

    EXCEPTION
      WHEN duplicate_object THEN
        NULL;

    END;

  END IF;

END
$$;


NOTIFY pgrst, 'reload schema';

COMMIT;
