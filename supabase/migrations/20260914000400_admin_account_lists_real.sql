BEGIN;

-- ============================================================
-- SHEHARA
-- REAL ADMIN ACCOUNT LISTS
-- USERS + VENDORS
-- ============================================================

-- ============================================================
-- 1. قائمة المستخدمين للإدارة
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_user_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'full_name', COALESCE(p.full_name, ''),
        'first_name', COALESCE(p.first_name, ''),
        'second_name', COALESCE(p.second_name, ''),
        'last_name', COALESCE(p.last_name, ''),
        'phone', p.phone,
        'contact_email', p.contact_email,
        'province', COALESCE(p.province, ''),
        'wallet_balance', COALESCE(p.wallet_balance, 0),
        'is_disabled', COALESCE(p.is_disabled, false),
        'created_at', p.created_at,

        'roles',
        COALESCE(
          (
            SELECT jsonb_agg(ur.role ORDER BY ur.role)
            FROM public.user_roles ur
            WHERE ur.user_id = p.id
          ),
          '[]'::jsonb
        ),

        'vendor',
        (
          SELECT jsonb_build_object(
            'id', v.id,
            'user_id', v.user_id,
            'name', v.name,
            'city', v.city,
            'phone', v.phone,
            'logo_url', v.logo_url,
            'description', COALESCE(v.description, ''),
            'is_active', COALESCE(v.is_active, false),
            'account_enabled', COALESCE(v.account_enabled, true),
            'created_at', v.created_at
          )
          FROM public.vendors v
          WHERE v.user_id = p.id
          LIMIT 1
        )
      )
      ORDER BY p.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO _result
  FROM public.profiles p;

  RETURN _result;
END;
$$;


REVOKE ALL
ON FUNCTION public.admin_list_user_accounts()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_list_user_accounts()
TO authenticated;


-- ============================================================
-- 2. قائمة التجار للإدارة
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_vendor_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'user_id', v.user_id,
        'name', COALESCE(v.name, ''),
        'city', COALESCE(v.city, ''),
        'phone', COALESCE(v.phone, ''),
        'logo_url', v.logo_url,
        'description', COALESCE(v.description, ''),
        'is_active', COALESCE(v.is_active, false),
        'account_enabled', COALESCE(v.account_enabled, true),
        'created_at', v.created_at,

        'owner',
        (
          SELECT jsonb_build_object(
            'id', p.id,
            'full_name', COALESCE(p.full_name, ''),
            'phone', p.phone,
            'contact_email', p.contact_email,
            'province', COALESCE(p.province, ''),
            'is_disabled', COALESCE(p.is_disabled, false),
            'created_at', p.created_at
          )
          FROM public.profiles p
          WHERE p.id = v.user_id
          LIMIT 1
        ),

        'product_count',
        (
          SELECT COUNT(*)
          FROM public.products pr
          WHERE pr.vendor_id = v.id
        )
      )
      ORDER BY v.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO _result
  FROM public.vendors v;

  RETURN _result;
END;
$$;


REVOKE ALL
ON FUNCTION public.admin_list_vendor_accounts()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_list_vendor_accounts()
TO authenticated;


-- ============================================================
-- 3. إجبار PostgREST على إعادة تحميل الدوال
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
