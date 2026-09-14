BEGIN;

-- ============================================================
-- SHEHARA PHASE 2 HOTFIX
-- ADMIN ACCOUNT DETAILS + VENDOR PRODUCT IMAGE UPLOAD
-- ============================================================


-- ============================================================
-- 1. جلب تفاصيل حساب المستخدم بواسطة الإدارة
-- ============================================================
-- نستخدم SECURITY DEFINER حتى لا تتأثر عملية عرض التفاصيل
-- بسياسات RLS الخاصة بالجداول الفرعية.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_get_user_account_details(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN

  -- التحقق من أن المستخدم الحالي مدير
  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'admin'
     )
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  -- التحقق من معرف المستخدم المطلوب
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'معرّف المستخدم مطلوب';
  END IF;


  -- التحقق من وجود الحساب
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
  ) THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;


  SELECT jsonb_build_object(

    'addresses',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'label', COALESCE(a.label, ''),
            'recipient_name', COALESCE(a.recipient_name, ''),
            'phone', COALESCE(a.phone, ''),
            'city', COALESCE(a.city, ''),
            'district', COALESCE(a.district, ''),
            'details', COALESCE(a.details, ''),
            'is_default', COALESCE(a.is_default, false)
          )
          ORDER BY
            COALESCE(a.is_default, false) DESC,
            a.created_at DESC
        )
        FROM public.addresses a
        WHERE a.user_id = p_user_id
      ),
      '[]'::jsonb
    ),

    'transactions',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', wt.id,
            'amount', wt.amount,
            'balance_before', wt.balance_before,
            'balance_after', wt.balance_after,
            'transaction_type', wt.transaction_type,
            'reason', COALESCE(wt.reason, ''),
            'created_at', wt.created_at
          )
          ORDER BY wt.created_at DESC
        )
        FROM public.wallet_transactions wt
        WHERE wt.user_id = p_user_id
      ),
      '[]'::jsonb
    )

  )
  INTO _result;


  RETURN COALESCE(
    _result,
    '{}'::jsonb
  );

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_get_user_account_details(uuid)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_get_user_account_details(uuid)
TO authenticated;


-- ============================================================
-- 2. إصلاح صلاحيات Storage لصور منتجات التجار
-- ============================================================

DROP POLICY IF EXISTS vendor_products_storage_insert
ON storage.objects;

CREATE POLICY vendor_products_storage_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (

  bucket_id = 'products'

  AND (storage.foldername(name))[1] = 'vendors'

  AND (storage.foldername(name))[2] = auth.uid()::text

  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.user_id = auth.uid()
      AND v.is_active = true
      AND v.account_enabled = true
  )

);


-- ============================================================
-- 3. السماح للتاجر بقراءة صوره
-- ============================================================

DROP POLICY IF EXISTS vendor_products_storage_select
ON storage.objects;

CREATE POLICY vendor_products_storage_select
ON storage.objects
FOR SELECT
TO authenticated
USING (

  bucket_id = 'products'

  AND (storage.foldername(name))[1] = 'vendors'

  AND (storage.foldername(name))[2] = auth.uid()::text

  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.user_id = auth.uid()
      AND v.is_active = true
      AND v.account_enabled = true
  )

);


-- ============================================================
-- 4. السماح للتاجر بحذف صوره
-- ============================================================

DROP POLICY IF EXISTS vendor_products_storage_delete
ON storage.objects;

CREATE POLICY vendor_products_storage_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (

  bucket_id = 'products'

  AND (storage.foldername(name))[1] = 'vendors'

  AND (storage.foldername(name))[2] = auth.uid()::text

  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.user_id = auth.uid()
      AND v.is_active = true
      AND v.account_enabled = true
  )

);


-- ============================================================
-- 5. صلاحيات الإدارة على صور المنتجات
-- ============================================================
-- لوحة الإدارة تستخدم المسار:
-- admin/<filename>
-- ============================================================

DROP POLICY IF EXISTS admin_products_storage_insert
ON storage.objects;

CREATE POLICY admin_products_storage_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (

  bucket_id = 'products'

  AND (storage.foldername(name))[1] = 'admin'

  AND public.has_role(
    auth.uid(),
    'admin'
  )

);


DROP POLICY IF EXISTS admin_products_storage_select
ON storage.objects;

CREATE POLICY admin_products_storage_select
ON storage.objects
FOR SELECT
TO authenticated
USING (

  bucket_id = 'products'

  AND (storage.foldername(name))[1] = 'admin'

  AND public.has_role(
    auth.uid(),
    'admin'
  )

);


DROP POLICY IF EXISTS admin_products_storage_delete
ON storage.objects;

CREATE POLICY admin_products_storage_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (

  bucket_id = 'products'

  AND (storage.foldername(name))[1] = 'admin'

  AND public.has_role(
    auth.uid(),
    'admin'
  )

);


-- ============================================================
-- تحديث PostgREST
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
