-- ============================================================
-- SHEHARA / شهارة للتسوق
-- PHASE 1 - SECURE CHECKOUT BRIDGE
--
-- Migration:
-- 20260909000300_phase1_secure_checkout_bridge.sql
--
-- الهدف:
-- 1. إبقاء واجهة Checkout الحالية متوافقة.
-- 2. تحويل create_checkout_order إلى المسار الآمن.
-- 3. عدم الوثوق بالسعر أو الإجمالي المرسل من المتصفح.
-- 4. إنشاء Payment Request من الخادم فقط.
-- 5. الحفاظ على Idempotency.
-- 6. منع المستخدم من إنشاء طلبات مباشرة خارج المسار الآمن.
-- ============================================================

BEGIN;


-- ============================================================
-- 1. حذف النسخة القديمة إن وجدت
--
-- التوقيع مطابق للاستدعاء الموجود حالياً في checkout.tsx.
-- ============================================================

DROP FUNCTION IF EXISTS public.create_checkout_order(
  text,
  jsonb,
  numeric,
  numeric,
  numeric,
  text,
  text,
  public.order_status,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  boolean,
  text,
  text,
  text,
  text
);


-- ============================================================
-- 2. الدالة الآمنة الجديدة
--
-- ملاحظة مهمة:
--
-- القيم التالية القادمة من المتصفح:
--
-- _subtotal
-- _delivery_fee
-- _total
-- _payment_status
-- _status
--
-- لا يتم الاعتماد عليها.
--
-- يتم تمرير المنتجات إلى create_secure_order()
-- التي تعيد حساب الأسعار من قاعدة البيانات.
--
-- كما أن Trigger:
-- enforce_order_totals()
--
-- يعيد حساب رسوم التوصيل والإجمالي داخل PostgreSQL.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_checkout_order(
  _checkout_token text,
  _items jsonb,
  _subtotal numeric,
  _delivery_fee numeric,
  _total numeric,
  _payment_method_code text,
  _payment_status text,
  _status public.order_status,
  _shipping_name text,
  _shipping_phone text,
  _shipping_city text,
  _shipping_district text,
  _shipping_details text,
  _shipping_landmark text,
  _notes text,
  _latitude numeric DEFAULT NULL,
  _longitude numeric DEFAULT NULL,
  _needs_payment_request boolean DEFAULT false,
  _sender_name text DEFAULT '',
  _sender_phone text DEFAULT '',
  _reference text DEFAULT '',
  _receipt_path text DEFAULT ''
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _user_id uuid;

  _order public.orders;

  _existing_request public.payment_requests;

  _payment_method public.payment_methods;

BEGIN

  -- ==========================================================
  -- 1. المستخدم
  -- ==========================================================

  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول قبل إتمام الطلب';
  END IF;


  -- ==========================================================
  -- 2. التحقق من Token
  -- ==========================================================

  IF _checkout_token IS NULL
     OR length(trim(_checkout_token)) < 16
  THEN
    RAISE EXCEPTION
      'معرّف عملية الطلب غير صالح';
  END IF;


  -- ==========================================================
  -- 3. التحقق من طريقة الدفع
  -- ==========================================================

  IF _payment_method_code IS NULL
     OR trim(_payment_method_code) = ''
  THEN
    RAISE EXCEPTION
      'يجب اختيار طريقة الدفع';
  END IF;


  SELECT *
  INTO _payment_method
  FROM public.payment_methods
  WHERE code = trim(_payment_method_code)
    AND is_active = true
  LIMIT 1;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'طريقة الدفع غير متاحة حالياً';
  END IF;


  -- ==========================================================
  -- 4. إنشاء الطلب عبر الدالة الآمنة
  --
  -- الأسعار القادمة من المتصفح لا تعتبر مصدر ثقة.
  --
  -- create_secure_order():
  -- - يتحقق من المنتجات
  -- - يقفل المنتجات
  -- - يتحقق من المخزون
  -- - يقرأ السعر من products
  -- - يحسب subtotal
  -- - يحسب total
  -- - يمنع الطلبات المكررة
  -- ==========================================================

  SELECT *
  INTO _order
  FROM public.create_secure_order(
    _checkout_token,
    trim(_payment_method_code),
    trim(_shipping_name),
    trim(_shipping_phone),
    trim(_shipping_city),
    trim(_shipping_district),
    trim(_shipping_details),
    COALESCE(trim(_notes), ''),
    _latitude,
    _longitude,
    GREATEST(
      COALESCE(_delivery_fee, 0),
      0
    ),
    COALESCE(_items, '[]'::jsonb)
  );


  -- ==========================================================
  -- 5. تحديث معلم العنوان
  --
  -- create_secure_order الحالية لا تستقبل landmark.
  -- لذلك نضيفه بعد إنشاء الطلب.
  --
  -- هذا التعديل يتم داخل نفس Transaction.
  -- ==========================================================

  IF _order.shipping_landmark IS DISTINCT FROM
     COALESCE(trim(_shipping_landmark), '')
  THEN

    UPDATE public.orders
    SET
      shipping_landmark =
        COALESCE(
          trim(_shipping_landmark),
          ''
        ),
      updated_at = now()
    WHERE id = _order.id
    RETURNING *
    INTO _order;

  END IF;


  -- ==========================================================
  -- 6. إنشاء Payment Request
  --
  -- فقط عندما تكون طريقة الدفع تحتاج إثبات تحويل.
  --
  -- لا نعتمد على amount القادم من المتصفح.
  -- نستخدم _order.total المحسوب من قاعدة البيانات.
  -- ==========================================================

  IF _needs_payment_request = true THEN

    SELECT *
    INTO _existing_request
    FROM public.payment_requests
    WHERE order_id = _order.id
    ORDER BY created_at ASC
    LIMIT 1;


    IF NOT FOUND THEN

      INSERT INTO public.payment_requests (
        user_id,
        order_id,
        purpose,
        method_code,
        amount,
        sender_name,
        sender_phone,
        reference,
        receipt_path,
        status
      )
      VALUES (
        _user_id,
        _order.id,
        'order',
        _payment_method.code,
        _order.total,
        COALESCE(
          NULLIF(
            trim(_sender_name),
            ''
          ),
          trim(_shipping_name)
        ),
        COALESCE(
          NULLIF(
            trim(_sender_phone),
            ''
          ),
          trim(_shipping_phone)
        ),
        COALESCE(
          trim(_reference),
          ''
        ),
        COALESCE(
          trim(_receipt_path),
          ''
        ),
        'pending'
      );

    END IF;

  END IF;


  -- ==========================================================
  -- 7. إعادة الطلب النهائي
  --
  -- مهم:
  -- القيمة التي تعود للواجهة هي القيمة المحفوظة فعلياً.
  -- ==========================================================

  SELECT *
  INTO _order
  FROM public.orders
  WHERE id = _order.id;


  RETURN _order;


EXCEPTION
  WHEN unique_violation THEN

    -- ========================================================
    -- حماية إضافية من الضغط المزدوج / إعادة الإرسال
    -- ========================================================

    SELECT *
    INTO _order
    FROM public.orders
    WHERE checkout_token = _checkout_token
      AND user_id = _user_id
    LIMIT 1;


    IF FOUND THEN
      RETURN _order;
    END IF;


    RAISE;

END;
$$;


-- ============================================================
-- 8. حماية الدالة
-- ============================================================

REVOKE ALL
ON FUNCTION public.create_checkout_order(
  text,
  jsonb,
  numeric,
  numeric,
  numeric,
  text,
  text,
  public.order_status,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  boolean,
  text,
  text,
  text,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.create_checkout_order(
  text,
  jsonb,
  numeric,
  numeric,
  numeric,
  text,
  text,
  public.order_status,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  boolean,
  text,
  text,
  text,
  text
)
TO authenticated;


-- ============================================================
-- 9. حماية Payment Requests
--
-- المستخدم يستطيع إنشاء طلب دفع لنفسه فقط.
-- لكنه لا يستطيع تغيير:
-- - المبلغ
-- - الحالة
-- - المستخدم
-- - الطلب
--
-- الإنشاء الفعلي يتم من create_checkout_order().
-- ============================================================

ALTER TABLE public.payment_requests
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
payment_requests_own_select
ON public.payment_requests;


CREATE POLICY
payment_requests_own_select
ON public.payment_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS
payment_requests_admin_select
ON public.payment_requests;


CREATE POLICY
payment_requests_admin_select
ON public.payment_requests
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);


-- ============================================================
-- منع INSERT مباشر من المتصفح
-- ============================================================

DROP POLICY IF EXISTS
payment_requests_own_insert
ON public.payment_requests;


DROP POLICY IF EXISTS
payment_requests_customer_insert
ON public.payment_requests;


-- لا يوجد INSERT policy للمستخدم.
--
-- إنشاء Payment Request يتم حصراً بواسطة:
--
-- create_checkout_order()
--
-- وهي SECURITY DEFINER.


-- ============================================================
-- منع العميل من تعديل Payment Request
-- ============================================================

DROP POLICY IF EXISTS
payment_requests_own_update
ON public.payment_requests;


DROP POLICY IF EXISTS
payment_requests_customer_update
ON public.payment_requests;


-- ============================================================
-- منع العميل من حذف Payment Request
-- ============================================================

DROP POLICY IF EXISTS
payment_requests_own_delete
ON public.payment_requests;


DROP POLICY IF EXISTS
payment_requests_customer_delete
ON public.payment_requests;


-- ============================================================
-- 10. صلاحيات الجدول
-- ============================================================

REVOKE INSERT, UPDATE, DELETE
ON public.payment_requests
FROM authenticated;


GRANT SELECT
ON public.payment_requests
TO authenticated;


-- ============================================================
-- 11. حماية Payment Methods
-- ============================================================

REVOKE INSERT, UPDATE, DELETE
ON public.payment_methods
FROM authenticated;


GRANT SELECT
ON public.payment_methods
TO authenticated;


-- ============================================================
-- 12. منع إنشاء الطلبات مباشرة
--
-- checkout الرسمي يجب أن يكون:
--
-- create_checkout_order()
--        ↓
-- create_secure_order()
--        ↓
-- order + order_items
--
-- وليس INSERT مباشر من المتصفح.
-- ============================================================

DROP POLICY IF EXISTS
orders_own_insert
ON public.orders;


-- لا يوجد INSERT policy للمستخدم.
--
-- إنشاء الطلب يتم من SECURITY DEFINER RPC.


-- ============================================================
-- 13. حماية order_items
-- ============================================================

DROP POLICY IF EXISTS
order_items_own_insert
ON public.order_items;


DROP POLICY IF EXISTS
order_items_customer_insert
ON public.order_items;


DROP POLICY IF EXISTS
order_items_vendor_insert
ON public.order_items;


DROP POLICY IF EXISTS
order_items_courier_insert
ON public.order_items;


DROP POLICY IF EXISTS
order_items_admin_insert
ON public.order_items;


-- لا يوجد INSERT مباشر.
--
-- order_items يتم إنشاؤها من create_secure_order().


-- ============================================================
-- 14. منع DELETE على order_items
-- ============================================================

DROP POLICY IF EXISTS
order_items_own_delete
ON public.order_items;


DROP POLICY IF EXISTS
order_items_customer_delete
ON public.order_items;


DROP POLICY IF EXISTS
order_items_vendor_delete
ON public.order_items;


DROP POLICY IF EXISTS
order_items_courier_delete
ON public.order_items;


DROP POLICY IF EXISTS
order_items_admin_delete
ON public.order_items;


-- ============================================================
-- 15. منع UPDATE على order_items
-- ============================================================

DROP POLICY IF EXISTS
order_items_own_update
ON public.order_items;


DROP POLICY IF EXISTS
order_items_customer_update
ON public.order_items;


DROP POLICY IF EXISTS
order_items_vendor_update
ON public.order_items;


DROP POLICY IF EXISTS
order_items_courier_update
ON public.order_items;


DROP POLICY IF EXISTS
order_items_admin_update
ON public.order_items;


-- ============================================================
-- 16. حماية الدالة الأساسية
-- ============================================================

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
