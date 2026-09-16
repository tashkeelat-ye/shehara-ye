BEGIN;

-- ============================================================
-- شهارة للتسوق
-- صلاحيات تشغيل عامل التوصيل
--
-- العامل يستطيع فقط:
-- 1. مشاهدة الطلبات المسندة إليه.
-- 2. تحديث الحالات المسموح بها.
--
-- ولا يستطيع:
-- - تعديل طلبات غير مسندة إليه.
-- - تعيين نفسه على طلب.
-- - تغيير بيانات الطلب.
-- - الوصول إلى بيانات عمال آخرين.
-- ============================================================


-- ============================================================
-- 1. دالة التحقق من عامل التوصيل الحالي
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_courier()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.couriers c
    WHERE c.user_id = auth.uid()
      AND c.is_active = true
      AND c.account_enabled = true
  );
$$;


REVOKE ALL
ON FUNCTION public.is_courier()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_courier()
TO authenticated;


-- ============================================================
-- 2. تحديث حالة طلب من عامل التوصيل
-- ============================================================

DROP FUNCTION IF EXISTS
public.update_courier_order_status_secure(
  uuid,
  text
);


CREATE OR REPLACE FUNCTION public.update_courier_order_status_secure(
  _order_id uuid,
  _new_status text
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _courier_id uuid;
  _order public.orders;
  _target_status public.order_status;
BEGIN

  -- ----------------------------------------------------------
  -- يجب تسجيل الدخول
  -- ----------------------------------------------------------

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول';
  END IF;


  -- ----------------------------------------------------------
  -- يجب أن يكون الحساب عامل توصيل نشطاً
  -- ----------------------------------------------------------

  SELECT c.id
  INTO _courier_id
  FROM public.couriers c
  WHERE c.user_id = auth.uid()
    AND c.is_active = true
    AND c.account_enabled = true
  LIMIT 1;


  IF _courier_id IS NULL THEN
    RAISE EXCEPTION
      'غير مصرح لك باستخدام لوحة عامل التوصيل';
  END IF;


  -- ----------------------------------------------------------
  -- تحويل الحالة النصية إلى enum
  -- ----------------------------------------------------------

  BEGIN
    _target_status :=
      _new_status::public.order_status;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION
        'حالة الطلب غير صالحة: %',
        _new_status;
  END;


  -- ----------------------------------------------------------
  -- قفل الطلب والتأكد أنه مسند للعامل الحالي
  -- ----------------------------------------------------------

  SELECT *
  INTO _order
  FROM public.orders
  WHERE id = _order_id
    AND courier_id = _courier_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'الطلب غير موجود أو غير مسند إليك';
  END IF;


  -- ----------------------------------------------------------
  -- لا يسمح للعامل بالرجوع للخلف
  --
  -- confirmed -> processing
  -- processing -> shipped
  -- shipped -> delivered
  -- ----------------------------------------------------------

  IF _order.status = _target_status THEN
    RETURN _order;
  END IF;


  IF _order.status = 'confirmed'
     AND _target_status = 'processing'
  THEN

    NULL;

  ELSIF _order.status = 'processing'
        AND _target_status = 'shipped'
  THEN

    NULL;

  ELSIF _order.status = 'shipped'
        AND _target_status = 'delivered'
  THEN

    NULL;

  ELSE

    RAISE EXCEPTION
      'انتقال الحالة غير مسموح لعامل التوصيل: % -> %',
      _order.status,
      _target_status;

  END IF;


  -- ----------------------------------------------------------
  -- تحديث الحالة
  -- ----------------------------------------------------------

  UPDATE public.orders
  SET
    status = _target_status,
    updated_at = now()
  WHERE id = _order_id
    AND courier_id = _courier_id
  RETURNING *
  INTO _order;


  RETURN _order;

END;
$$;


REVOKE ALL
ON FUNCTION public.update_courier_order_status_secure(
  uuid,
  text
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.update_courier_order_status_secure(
  uuid,
  text
)
TO authenticated;


-- ============================================================
-- 3. RLS للطلبات
--
-- لا نفتح SELECT عاماً.
-- العامل يرى فقط طلباته.
-- ============================================================

ALTER TABLE public.orders
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"couriers_can_view_assigned_orders"
ON public.orders;


CREATE POLICY
"couriers_can_view_assigned_orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  courier_id IN (
    SELECT c.id
    FROM public.couriers c
    WHERE c.user_id = auth.uid()
      AND c.is_active = true
      AND c.account_enabled = true
  )
);


-- ============================================================
-- 4. RLS لعناصر الطلب
-- ============================================================

ALTER TABLE public.order_items
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"couriers_can_view_assigned_order_items"
ON public.order_items;


CREATE POLICY
"couriers_can_view_assigned_order_items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.couriers c
      ON c.id = o.courier_id
    WHERE o.id = order_items.order_id
      AND c.user_id = auth.uid()
      AND c.is_active = true
      AND c.account_enabled = true
  )
);


-- ============================================================
-- 5. Realtime للطلبات
-- ============================================================

DO $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN

    BEGIN
      ALTER PUBLICATION supabase_realtime
        ADD TABLE public.orders;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime
        ADD TABLE public.order_items;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;

  END IF;

END
$$;


NOTIFY pgrst, 'reload schema';

COMMIT;
