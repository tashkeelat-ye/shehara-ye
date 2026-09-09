-- ============================================================
-- SHEHARA / شهارة للتسوق
-- PHASE 1 - ORDER INTEGRITY
-- Migration: 20260909000200_phase1_order_integrity.sql
--
-- الهدف:
-- 1. منع العميل من التلاعب برسوم التوصيل.
-- 2. إعادة حساب total داخل PostgreSQL.
-- 3. منع تعديل الحالة مباشرة من العميل.
-- 4. توفير انتقالات آمنة لحالات الطلب.
-- 5. منع الانتقال العشوائي بين حالات الطلب.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Server-side delivery fee
--
-- create_secure_order() الحالية تستقبل delivery_fee من العميل.
-- لا نعتمد على هذه القيمة.
--
-- قبل حفظ الطلب، نأخذ الرسوم الرسمية من site_settings.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _official_delivery_fee numeric(12,2);
BEGIN

  -- ----------------------------------------------------------
  -- رسوم التوصيل الرسمية
  -- ----------------------------------------------------------

  SELECT
    GREATEST(
      COALESCE(delivery_fee, 0),
      0
    )
  INTO _official_delivery_fee
  FROM public.site_settings
  LIMIT 1;

  _official_delivery_fee :=
    COALESCE(
      _official_delivery_fee,
      0
    );

  _official_delivery_fee :=
    round(
      _official_delivery_fee,
      2
    );


  -- ----------------------------------------------------------
  -- منع استخدام قيمة مرسلة من المتصفح
  -- ----------------------------------------------------------

  NEW.delivery_fee :=
    _official_delivery_fee;


  -- ----------------------------------------------------------
  -- إعادة حساب الإجمالي
  -- ----------------------------------------------------------

  NEW.subtotal :=
    round(
      GREATEST(
        COALESCE(NEW.subtotal, 0),
        0
      ),
      2
    );

  NEW.total :=
    round(
      NEW.subtotal +
      NEW.delivery_fee,
      2
    );


  RETURN NEW;

END;
$$;


REVOKE ALL
ON FUNCTION public.enforce_order_totals()
FROM PUBLIC;


-- ============================================================
-- 2. Trigger
-- ============================================================

DROP TRIGGER IF EXISTS
orders_enforce_totals_trigger
ON public.orders;


CREATE TRIGGER
orders_enforce_totals_trigger
BEFORE INSERT OR UPDATE OF subtotal, delivery_fee, total
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION
public.enforce_order_totals();


-- ============================================================
-- 3. حماية تحديث إجمالي الطلب
--
-- حتى لو حاولت جهة أخرى تحديث:
-- subtotal / delivery_fee / total
-- يتم إعادة حسابها من PostgreSQL.
-- ============================================================

-- ============================================================
-- 4. Secure order status transitions
--
-- الحالات الحالية في المشروع:
--
-- pending
-- awaiting_payment
-- confirmed
-- processing
-- shipped
-- delivered
-- cancelled
--
-- لا يسمح بالانتقال العشوائي.
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_transition_order_status(
  _from public.order_status,
  _to public.order_status
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE

      -- نفس الحالة
      WHEN _from = _to THEN true

      -- طلب بانتظار تأكيد الدفع
      WHEN _from = 'awaiting_payment'
       AND _to IN (
         'pending',
         'cancelled'
       )
      THEN true

      -- طلب بانتظار التأكيد
      WHEN _from = 'pending'
       AND _to IN (
         'confirmed',
         'cancelled'
       )
      THEN true

      -- تم تأكيد الطلب
      WHEN _from = 'confirmed'
       AND _to IN (
         'processing',
         'cancelled'
       )
      THEN true

      -- قيد التجهيز
      WHEN _from = 'processing'
       AND _to IN (
         'shipped',
         'cancelled'
       )
      THEN true

      -- تم الشحن
      WHEN _from = 'shipped'
       AND _to = 'delivered'
      THEN true

      -- الحالات النهائية
      WHEN _from IN (
        'delivered',
        'cancelled'
      )
      THEN false

      ELSE false

    END;
$$;


REVOKE ALL
ON FUNCTION public.can_transition_order_status(
  public.order_status,
  public.order_status
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.can_transition_order_status(
  public.order_status,
  public.order_status
)
TO authenticated;


-- ============================================================
-- 5. دالة آمنة لتغيير حالة الطلب
--
-- لا نعطي العميل UPDATE مباشر.
-- الإدارة تستخدم هذه الدالة.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_order_status_secure(
  _order_id uuid,
  _new_status public.order_status
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders;
BEGIN

  -- ----------------------------------------------------------
  -- التحقق من تسجيل الدخول
  -- ----------------------------------------------------------

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول';
  END IF;


  -- ----------------------------------------------------------
  -- الإدارة فقط حالياً
  -- ----------------------------------------------------------

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'غير مصرح لك بتغيير حالة الطلب';
  END IF;


  -- ----------------------------------------------------------
  -- قفل الطلب
  -- ----------------------------------------------------------

  SELECT *
  INTO _order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'الطلب غير موجود';
  END IF;


  -- ----------------------------------------------------------
  -- التحقق من الانتقال
  -- ----------------------------------------------------------

  IF NOT public.can_transition_order_status(
    _order.status,
    _new_status
  )
  THEN
    RAISE EXCEPTION
      'انتقال حالة الطلب غير مسموح: % -> %',
      _order.status,
      _new_status;
  END IF;


  -- ----------------------------------------------------------
  -- تحديث الحالة
  -- ----------------------------------------------------------

  UPDATE public.orders
  SET
    status = _new_status,
    updated_at = now()
  WHERE id = _order_id
  RETURNING *
  INTO _order;


  RETURN _order;

END;
$$;


REVOKE ALL
ON FUNCTION public.update_order_status_secure(
  uuid,
  public.order_status
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.update_order_status_secure(
  uuid,
  public.order_status
)
TO authenticated;


-- ============================================================
-- 6. منع UPDATE المباشر للحالة حتى للإدارة
--
-- الإدارة تستخدم update_order_status_secure().
-- هذا يمنع تجاوز state machine من الواجهة.
-- ============================================================

DROP POLICY IF EXISTS orders_admin_update
ON public.orders;


-- ------------------------------------------------------------
-- الإدارة تستطيع قراءة كل الطلبات.
-- لا نعطيها UPDATE مباشر هنا.
-- ------------------------------------------------------------

CREATE POLICY orders_admin_select
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);


-- ============================================================
-- 7. منع العميل من إنشاء order_items مباشرة
--
-- order_items يجب أن تنشأ داخل create_secure_order().
-- ============================================================

DROP POLICY IF EXISTS order_items_customer_insert
ON public.order_items;


DROP POLICY IF EXISTS order_items_vendor_insert
ON public.order_items;


DROP POLICY IF EXISTS order_items_courier_insert
ON public.order_items;


DROP POLICY IF EXISTS order_items_admin_insert
ON public.order_items;


-- لا يوجد INSERT policy للمستخدمين.
-- SECURITY DEFINER checkout هو المسار الرسمي.


-- ============================================================
-- 8. منع العميل من حذف عناصر الطلب
-- ============================================================

DROP POLICY IF EXISTS order_items_customer_delete
ON public.order_items;


DROP POLICY IF EXISTS order_items_vendor_delete
ON public.order_items;


DROP POLICY IF EXISTS order_items_courier_delete
ON public.order_items;


-- لا يسمح بحذف order_items عبر authenticated.


-- ============================================================
-- 9. حماية دوال النظام
-- ============================================================

REVOKE ALL
ON FUNCTION public.deduct_order_stock(uuid)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.deduct_order_stock(uuid)
TO authenticated;


REVOKE ALL
ON FUNCTION public.validate_checkout_product(uuid, integer)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.validate_checkout_product(uuid, integer)
TO authenticated;


REVOKE ALL
ON FUNCTION public.create_secure_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  jsonb
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.create_secure_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  jsonb
)
TO authenticated;


COMMIT;
