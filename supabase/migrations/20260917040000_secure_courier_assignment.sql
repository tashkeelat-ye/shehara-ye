BEGIN;

CREATE OR REPLACE FUNCTION public.assign_order_courier_secure(
  _order_id uuid,
  _courier_id uuid
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders;
  _courier public.couriers;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بإسناد الطلبات';
  END IF;

  SELECT *
  INTO _order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  IF _courier_id IS NOT NULL THEN
    SELECT *
    INTO _courier
    FROM public.couriers
    WHERE id = _courier_id
      AND is_active = true
      AND account_enabled = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'عامل التوصيل غير موجود أو غير متاح';
    END IF;
  END IF;

  UPDATE public.orders
  SET
    courier_id = _courier_id,
    updated_at = now()
  WHERE id = _order_id
  RETURNING *
  INTO _order;

  RETURN _order;
END;
$$;

REVOKE ALL
ON FUNCTION public.assign_order_courier_secure(uuid, uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.assign_order_courier_secure(uuid, uuid)
TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
