BEGIN;

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS manager_name text,
  ADD COLUMN IF NOT EXISTS manager_phone text,
  ADD COLUMN IF NOT EXISTS store_phone text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'YER',
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS payout_account_number text,
  ADD COLUMN IF NOT EXISTS address_details text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_default_currency_check;
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_default_currency_check
  CHECK (default_currency IS NULL OR default_currency IN ('YER', 'SAR'));

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_payout_method_check;
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_payout_method_check
  CHECK (payout_method IS NULL OR payout_method IN ('kuraimi', 'jeeb', 'onecash'));

-- Replace the legacy signature to avoid PostgREST ambiguity between overloads.
DROP FUNCTION IF EXISTS public.register_vendor_account(
  text, text, text, text, text, text, text, text, text, boolean
);

CREATE OR REPLACE FUNCTION public.register_vendor_account(
  p_store_name text,
  p_city text,
  p_phone text,
  p_description text,
  p_first_name text,
  p_second_name text,
  p_last_name text,
  p_province text,
  p_contact_email text,
  p_accepted_terms boolean,
  p_owner_name text,
  p_manager_name text,
  p_manager_phone text,
  p_store_phone text,
  p_district text,
  p_default_currency text,
  p_payout_method text,
  p_payout_account_number text,
  p_address_details text,
  p_latitude double precision,
  p_longitude double precision,
  p_logo_url text
)
RETURNS public.vendors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _vendor public.vendors;
  _full_name text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول قبل إنشاء حساب تاجر';
  END IF;

  IF COALESCE(p_accepted_terms, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'يجب الموافقة على الشروط والأحكام';
  END IF;

  IF NULLIF(trim(COALESCE(p_store_name, '')), '') IS NULL
     OR NULLIF(trim(COALESCE(p_first_name, '')), '') IS NULL
     OR NULLIF(trim(COALESCE(p_second_name, '')), '') IS NULL
     OR NULLIF(trim(COALESCE(p_last_name, '')), '') IS NULL
     OR NULLIF(trim(COALESCE(p_manager_name, '')), '') IS NULL
     OR NULLIF(trim(COALESCE(p_manager_phone, '')), '') IS NULL
     OR NULLIF(trim(COALESCE(p_store_phone, '')), '') IS NULL
     OR NULLIF(trim(COALESCE(p_province, '')), '') IS NULL
     OR NULLIF(trim(COALESCE(p_city, '')), '') IS NULL THEN
    RAISE EXCEPTION 'يرجى استكمال حقول الحساب والمتجر المطلوبة';
  END IF;

  IF COALESCE(p_default_currency, 'YER') NOT IN ('YER', 'SAR') THEN
    RAISE EXCEPTION 'العملة الافتراضية غير صحيحة';
  END IF;

  IF p_payout_method IS NOT NULL
     AND p_payout_method NOT IN ('kuraimi', 'jeeb', 'onecash') THEN
    RAISE EXCEPTION 'طريقة استلام الأرباح غير صحيحة';
  END IF;

  IF (p_latitude IS NULL) <> (p_longitude IS NULL) THEN
    RAISE EXCEPTION 'يجب إرسال خط العرض وخط الطول معاً';
  END IF;

  IF p_latitude IS NOT NULL AND (p_latitude < -90 OR p_latitude > 90) THEN
    RAISE EXCEPTION 'خط العرض غير صالح';
  END IF;

  IF p_longitude IS NOT NULL AND (p_longitude < -180 OR p_longitude > 180) THEN
    RAISE EXCEPTION 'خط الطول غير صالح';
  END IF;

  _full_name := concat_ws(' ', trim(p_first_name), trim(p_second_name), trim(p_last_name));

  INSERT INTO public.profiles (
    id, full_name, phone, first_name, second_name, last_name,
    province, contact_email, accepted_terms
  )
  VALUES (
    _uid, _full_name, trim(p_manager_phone), trim(p_first_name),
    trim(p_second_name), trim(p_last_name), trim(p_province),
    NULLIF(trim(COALESCE(p_contact_email, '')), ''), true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    first_name = EXCLUDED.first_name,
    second_name = EXCLUDED.second_name,
    last_name = EXCLUDED.last_name,
    province = EXCLUDED.province,
    contact_email = EXCLUDED.contact_email,
    accepted_terms = true,
    updated_at = now();

  -- Grant the role only inside this trusted SECURITY DEFINER function.
  INSERT INTO public.user_roles (user_id, role)
  SELECT _uid, 'vendor'::public.app_role
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role = 'vendor'::public.app_role
  );

  SELECT * INTO _vendor
  FROM public.vendors
  WHERE user_id = _uid
  ORDER BY id
  LIMIT 1;

  IF _vendor.id IS NULL THEN
    INSERT INTO public.vendors (
      user_id, name, city, phone, description, is_active, account_enabled,
      owner_name, manager_name, manager_phone, store_phone, district,
      default_currency, payout_method, payout_account_number, address_details,
      latitude, longitude, profile_logo_url, logo_url
    ) VALUES (
      _uid, trim(p_store_name), trim(p_city), trim(p_store_phone),
      trim(COALESCE(p_description, '')), true, true,
      NULLIF(trim(COALESCE(p_owner_name, '')), ''),
      trim(p_manager_name), trim(p_manager_phone), trim(p_store_phone),
      NULLIF(trim(COALESCE(p_district, '')), ''),
      COALESCE(p_default_currency, 'YER'), p_payout_method,
      NULLIF(trim(COALESCE(p_payout_account_number, '')), ''),
      NULLIF(trim(COALESCE(p_address_details, '')), ''),
      p_latitude, p_longitude, NULLIF(trim(COALESCE(p_logo_url, '')), ''),
      NULLIF(trim(COALESCE(p_logo_url, '')), '')
    )
    RETURNING * INTO _vendor;
  ELSE
    UPDATE public.vendors SET
      name = trim(p_store_name),
      city = trim(p_city),
      phone = trim(p_store_phone),
      description = trim(COALESCE(p_description, '')),
      is_active = true,
      account_enabled = true,
      owner_name = NULLIF(trim(COALESCE(p_owner_name, '')), ''),
      manager_name = trim(p_manager_name),
      manager_phone = trim(p_manager_phone),
      store_phone = trim(p_store_phone),
      district = NULLIF(trim(COALESCE(p_district, '')), ''),
      default_currency = COALESCE(p_default_currency, 'YER'),
      payout_method = p_payout_method,
      payout_account_number = NULLIF(trim(COALESCE(p_payout_account_number, '')), ''),
      address_details = NULLIF(trim(COALESCE(p_address_details, '')), ''),
      latitude = p_latitude,
      longitude = p_longitude,
      profile_logo_url = COALESCE(NULLIF(trim(COALESCE(p_logo_url, '')), ''), profile_logo_url),
      logo_url = COALESCE(NULLIF(trim(COALESCE(p_logo_url, '')), ''), logo_url)
    WHERE id = _vendor.id
    RETURNING * INTO _vendor;
  END IF;

  RETURN _vendor;
END;
$$;

REVOKE ALL ON FUNCTION public.register_vendor_account(
  text, text, text, text, text, text, text, text, text, boolean,
  text, text, text, text, text, text, text, text, text,
  double precision, double precision, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.register_vendor_account(
  text, text, text, text, text, text, text, text, text, boolean,
  text, text, text, text, text, text, text, text, text,
  double precision, double precision, text
) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
