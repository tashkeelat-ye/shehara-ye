BEGIN;

-- =========================================================
-- Phase 1 - Secure Order Admin Actions
-- =========================================================
-- الهدف:
-- 1) منع تعديل courier_id مباشرة من الواجهة.
-- 2) السماح للإدارة فقط بتعيين/إلغاء عامل التوصيل.
-- 3) إبقاء تغيير حالة الطلب عبر update_order_status_secure.
-- 4) تنفيذ العمليات الحساسة داخل SECURITY DEFINER RPC.
-- =========================================================


-- =========================================================
-- 1. Secure courier assignment
-- =========================================================

CREATE OR REPLACE FUNCTION public.assign_order_courier_secure(
  _order_id uuid,
  _courier_id uuid DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders%ROWTYPE;
  _courier public.couriers%ROWTYPE;
BEGIN
  -- Authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  -- Admin only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  -- Validate order
  SELECT *
  INTO _order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;


  -- NULL means remove courier assignment.
  IF _courier_id IS NOT NULL THEN

    SELECT *
    INTO _courier
    FROM public.couriers
    WHERE id = _courier_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'عامل التوصيل غير موجود';
    END IF;

    -- Do not assign inactive couriers.
    IF COALESCE(_courier.is_active, false) = false THEN
      RAISE EXCEPTION 'لا يمكن تعيين عامل توصيل غير نشط';
    END IF;

  END IF;


  UPDATE public.orders
  SET
    courier_id = _courier_id,
    updated_at = now()
  WHERE id = _order_id
  RETURNING *
  INTO _order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'تعذر تحديث الطلب';
  END IF;

  RETURN _order;
END;
$$;


-- Remove any public/default execution.
REVOKE ALL
ON FUNCTION public.assign_order_courier_secure(uuid, uuid)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.assign_order_courier_secure(uuid, uuid)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.assign_order_courier_secure(uuid, uuid)
TO authenticated;


COMMENT ON FUNCTION public.assign_order_courier_secure(uuid, uuid)
IS 'تعيين أو إلغاء عامل التوصيل للطلب بواسطة الإدارة فقط بشكل آمن.';


-- =========================================================
-- 2. Harden existing secure status function
-- =========================================================

ALTER FUNCTION public.update_order_status_secure(uuid, text)
SET search_path = public;


REVOKE ALL
ON FUNCTION public.update_order_status_secure(uuid, text)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.update_order_status_secure(uuid, text)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.update_order_status_secure(uuid, text)
TO authenticated;


-- =========================================================
-- 3. Useful index for courier assignment / order loading
-- =========================================================

CREATE INDEX IF NOT EXISTS orders_courier_id_idx
ON public.orders(courier_id);

CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
ON public.orders(status, created_at DESC);


COMMIT;
