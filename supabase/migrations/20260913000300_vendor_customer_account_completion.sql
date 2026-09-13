BEGIN;

-- ============================================================
-- SHEHARA
-- CUSTOMER / VENDOR ACCOUNT COMPLETION
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS second_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS province text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text;

-- ------------------------------------------------------------
-- تعبئة الحقول الجديدة للحسابات القديمة
-- ------------------------------------------------------------

UPDATE public.profiles
SET
  first_name = CASE
    WHEN NULLIF(trim(first_name), '') IS NOT NULL
      THEN first_name
    ELSE split_part(trim(full_name), ' ', 1)
  END,

  second_name = CASE
    WHEN NULLIF(trim(second_name), '') IS NOT NULL
      THEN second_name
    ELSE CASE
      WHEN array_length(
        regexp_split_to_array(trim(full_name), '\s+'),
        1
      ) >= 2
      THEN split_part(trim(full_name), ' ', 2)
      ELSE ''
    END
  END,

  last_name = CASE
    WHEN NULLIF(trim(last_name), '') IS NOT NULL
      THEN last_name
    ELSE CASE
      WHEN array_length(
        regexp_split_to_array(trim(full_name), '\s+'),
        1
      ) >= 3
      THEN (
        regexp_split_to_array(
          trim(full_name),
          '\s+'
        )
      )[
        array_length(
          regexp_split_to_array(
            trim(full_name),
            '\s+'
          ),
          1
        )
      ]
      ELSE ''
    END
  END
WHERE full_name IS NOT NULL;

-- ============================================================
-- تسجيل حساب التاجر الحقيقي
-- ============================================================

CREATE OR REPLACE FUNCTION public.register_vendor_account(
  p_store_name text,
  p_city text,
  p_phone text,
  p_description text DEFAULT '',
  p_first_name text DEFAULT '',
  p_second_name text DEFAULT '',
  p_last_name text DEFAULT '',
  p_province text DEFAULT '',
  p_contact_email text DEFAULT NULL,
  p_accepted_terms boolean DEFAULT false
)
RETURNS public.vendors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _vendor public.vendors;
  _full_name text;
BEGIN

  IF _user_id IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول قبل إنشاء حساب تاجر';
  END IF;

  IF NOT COALESCE(
    p_accepted_terms,
    false
  ) THEN
    RAISE EXCEPTION
      'يجب الموافقة على الشروط والأحكام';
  END IF;

  IF NULLIF(trim(p_first_name), '') IS NULL
     OR NULLIF(trim(p_second_name), '') IS NULL
     OR NULLIF(trim(p_last_name), '') IS NULL
  THEN
    RAISE EXCEPTION
      'بيانات الاسم الثلاثي مطلوبة';
  END IF;

  IF NULLIF(trim(p_store_name), '') IS NULL THEN
    RAISE EXCEPTION
      'اسم المتجر مطلوب';
  END IF;

  IF NULLIF(trim(p_city), '') IS NULL THEN
    RAISE EXCEPTION
      'المحافظة/المدينة مطلوبة';
  END IF;

  IF NULLIF(trim(p_phone), '') IS NULL THEN
    RAISE EXCEPTION
      'رقم الهاتف مطلوب';
  END IF;

  _full_name := concat_ws(
    ' ',
    trim(p_first_name),
    trim(p_second_name),
    trim(p_last_name)
  );

  -- تحديث الملف الشخصي
  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    first_name,
    second_name,
    last_name,
    province,
    contact_email,
    accepted_terms
  )
  VALUES (
    _user_id,
    _full_name,
    trim(p_phone),
    trim(p_first_name),
    trim(p_second_name),
    trim(p_last_name),
    trim(p_province),
    NULLIF(trim(p_contact_email), ''),
    true
  )
  ON CONFLICT (id)
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    first_name = EXCLUDED.first_name,
    second_name = EXCLUDED.second_name,
    last_name = EXCLUDED.last_name,
    province = EXCLUDED.province,
    contact_email = EXCLUDED.contact_email,
    accepted_terms = true,
    updated_at = now();

  -- ==========================================================
  -- منح الدور الحقيقي للتاجر
  -- ==========================================================

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'vendor'
  ) THEN

    INSERT INTO public.user_roles (
      user_id,
      role
    )
    VALUES (
      _user_id,
      'vendor'
    );

  END IF;

  -- ==========================================================
  -- إنشاء / تحديث متجر التاجر
  -- ==========================================================

  INSERT INTO public.vendors (
    user_id,
    name,
    city,
    phone,
    description,
    is_active,
    account_enabled
  )
  VALUES (
    _user_id,
    trim(p_store_name),
    trim(p_city),
    trim(p_phone),
    trim(COALESCE(p_description, '')),
    true,
    true
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    name = EXCLUDED.name,
    city = EXCLUDED.city,
    phone = EXCLUDED.phone,
    description = EXCLUDED.description,
    is_active = true,
    account_enabled = true;

  SELECT *
  INTO _vendor
  FROM public.vendors
  WHERE user_id = _user_id
  LIMIT 1;

  RETURN _vendor;

END;
$$;

REVOKE ALL
ON FUNCTION public.register_vendor_account(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.register_vendor_account(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
)
TO authenticated;

-- ============================================================
-- إصلاح التجار الموجودين مسبقاً
-- ============================================================

INSERT INTO public.user_roles (
  user_id,
  role
)
SELECT
  v.user_id,
  'vendor'::public.app_role
FROM public.vendors v
WHERE v.user_id IS NOT NULL
  AND v.is_active = true
  AND v.account_enabled = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v.user_id
      AND ur.role = 'vendor'
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
