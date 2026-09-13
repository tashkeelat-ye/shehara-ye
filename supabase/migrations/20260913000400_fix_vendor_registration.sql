BEGIN;

-- ============================================================
-- SHEHARA
-- FIX REAL VENDOR REGISTRATION
-- ============================================================
-- الهدف:
-- 1. إصلاح تسجيل حسابات التجار.
-- 2. عدم استخدام ON CONFLICT(user_id) على vendors.
-- 3. إنشاء vendor role بشكل مؤكد.
-- 4. تفعيل المتجر بعد التسجيل.
-- 5. إصلاح الحسابات القديمة التي أُنشئت بدون vendor role.
-- ============================================================


-- ============================================================
-- 1. دالة تسجيل التاجر
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
  _user_id uuid;
  _vendor public.vendors;
  _full_name text;
BEGIN

  -- ----------------------------------------------------------
  -- المستخدم الحالي
  -- ----------------------------------------------------------

  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول قبل إنشاء حساب تاجر';
  END IF;


  -- ----------------------------------------------------------
  -- الشروط والأحكام
  -- ----------------------------------------------------------

  IF NOT COALESCE(
    p_accepted_terms,
    false
  ) THEN
    RAISE EXCEPTION
      'يجب الموافقة على الشروط والأحكام';
  END IF;


  -- ----------------------------------------------------------
  -- الاسم
  -- ----------------------------------------------------------

  IF NULLIF(
    trim(COALESCE(p_first_name, '')),
    ''
  ) IS NULL
  OR NULLIF(
    trim(COALESCE(p_second_name, '')),
    ''
  ) IS NULL
  OR NULLIF(
    trim(COALESCE(p_last_name, '')),
    ''
  ) IS NULL
  THEN
    RAISE EXCEPTION
      'بيانات الاسم الثلاثي مطلوبة';
  END IF;


  -- ----------------------------------------------------------
  -- اسم المتجر
  -- ----------------------------------------------------------

  IF NULLIF(
    trim(COALESCE(p_store_name, '')),
    ''
  ) IS NULL
  THEN
    RAISE EXCEPTION
      'اسم المتجر مطلوب';
  END IF;


  -- ----------------------------------------------------------
  -- المدينة
  -- ----------------------------------------------------------

  IF NULLIF(
    trim(COALESCE(p_city, '')),
    ''
  ) IS NULL
  THEN
    RAISE EXCEPTION
      'مدينة المتجر مطلوبة';
  END IF;


  -- ----------------------------------------------------------
  -- رقم الهاتف
  -- ----------------------------------------------------------

  IF NULLIF(
    trim(COALESCE(p_phone, '')),
    ''
  ) IS NULL
  THEN
    RAISE EXCEPTION
      'رقم الهاتف مطلوب';
  END IF;


  -- ----------------------------------------------------------
  -- الاسم الكامل
  -- ----------------------------------------------------------

  _full_name := concat_ws(
    ' ',
    trim(p_first_name),
    trim(p_second_name),
    trim(p_last_name)
  );


  -- ==========================================================
  -- 2. تحديث ملف المستخدم
  -- ==========================================================

  UPDATE public.profiles
  SET
    full_name = _full_name,
    phone = trim(p_phone),
    first_name = trim(p_first_name),
    second_name = trim(p_second_name),
    last_name = trim(p_last_name),
    province = trim(COALESCE(p_province, '')),
    contact_email =
      NULLIF(trim(COALESCE(p_contact_email, '')), ''),
    accepted_terms = true,
    updated_at = now()
  WHERE id = _user_id;


  -- ----------------------------------------------------------
  -- في حالة عدم وجود profile
  -- ----------------------------------------------------------

  IF NOT FOUND THEN

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
      trim(COALESCE(p_province, '')),
      NULLIF(
        trim(COALESCE(p_contact_email, '')),
        ''
      ),
      true
    );

  END IF;


  -- ==========================================================
  -- 3. إعطاء المستخدم دور vendor
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
      'vendor'::public.app_role
    );

  END IF;


  -- ==========================================================
  -- 4. البحث عن متجر موجود لهذا المستخدم
  --
  -- لا نستخدم:
  --
  -- ON CONFLICT (user_id)
  --
  -- لأن vendors.user_id ليس عليه Unique Constraint.
  -- ==========================================================

  SELECT *
  INTO _vendor
  FROM public.vendors
  WHERE user_id = _user_id
  ORDER BY id
  LIMIT 1;


  -- ==========================================================
  -- 5. تحديث متجر موجود
  -- ==========================================================

  IF _vendor.id IS NOT NULL THEN

    UPDATE public.vendors
    SET
      name = trim(p_store_name),
      city = trim(p_city),
      phone = trim(p_phone),
      description =
        trim(COALESCE(p_description, '')),
      is_active = true,
      account_enabled = true
    WHERE id = _vendor.id
    RETURNING *
    INTO _vendor;


  -- ==========================================================
  -- 6. أو إنشاء متجر جديد
  -- ==========================================================

  ELSE

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
    RETURNING *
    INTO _vendor;

  END IF;


  -- ==========================================================
  -- 7. إرجاع بيانات المتجر
  -- ==========================================================

  RETURN _vendor;

END;
$$;


-- ============================================================
-- 8. حماية دالة التسجيل
-- ============================================================

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
-- 9. إصلاح حسابات التجار الموجودة مسبقاً
--
-- أي vendor لديه user_id يحصل على vendor role.
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
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v.user_id
      AND ur.role = 'vendor'::public.app_role
  );


-- ============================================================
-- 10. تفعيل المتاجر المرتبطة بمستخدم
--
-- لا نلمس المتاجر غير المرتبطة بمستخدم.
-- ============================================================

UPDATE public.vendors
SET
  is_active = true,
  account_enabled = true
WHERE user_id IS NOT NULL
  AND (
    is_active IS DISTINCT FROM true
    OR account_enabled IS DISTINCT FROM true
  );


-- ============================================================
-- 11. إعادة تحميل PostgREST
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
