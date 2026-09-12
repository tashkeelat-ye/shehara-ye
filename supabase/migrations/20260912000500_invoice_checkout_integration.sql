BEGIN;

-- ============================================================
-- SHEHARA / شهارة للتسوق
-- 20260912000500
--
-- FINAL INVOICE CHECKOUT INTEGRATION
--
-- الهدف:
-- جعل إصدار الفاتورة جزءاً حقيقياً من create_checkout_order()
-- بعد اكتمال إنشاء order + order_items + payment_request.
--
-- النتيجة:
--
-- create_checkout_order()
--        ↓
-- create_secure_order()
--        ↓
-- orders
--        ↓
-- order_items
--        ↓
-- payment_request (إن لزم)
--        ↓
-- issue_invoice_for_order()
--        ↓
-- invoices
--        ↓
-- orders.invoice_number
--
-- الـ trigger الموجود يبقى كطبقة حماية إضافية.
-- ============================================================


-- ============================================================
-- 1. إعادة بناء create_checkout_order
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
AS $checkout$
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
  -- 2. التحقق من Checkout Token
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
  -- 4. إنشاء الطلب عبر المسار الآمن
  --
  -- الأسعار القادمة من المتصفح ليست مصدر الحقيقة.
  --
  -- create_secure_order():
  -- - يتحقق من المنتجات
  -- - يتحقق من المخزون
  -- - يقرأ الأسعار الحقيقية
  -- - يحسب subtotal
  -- - يحسب total
  -- - ينشئ order_items
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
        currency,
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
        COALESCE(_order.currency, 'YER'),
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
  -- 7. إصدار الفاتورة
  --
  -- هذه هي الإضافة الأساسية.
  --
  -- create_secure_order() انتهت بالفعل هنا، وبالتالي:
  --
  -- orders       موجود
  -- order_items  موجودة
  -- payment      تم إنشاؤه إن لزم
  --
  -- الآن فقط نصدر الفاتورة.
  -- ==========================================================

  PERFORM public.issue_invoice_for_order(
    _order.id
  );


  -- ==========================================================
  -- 8. إعادة قراءة الطلب بعد إصدار الفاتورة
  --
  -- حتى ترجع الواجهة invoice_number الحقيقي.
  -- ==========================================================

  SELECT *
  INTO _order
  FROM public.orders
  WHERE id = _order.id;


  RETURN _order;


EXCEPTION

  WHEN unique_violation THEN

    -- ========================================================
    -- حماية من إعادة إرسال Checkout
    -- ========================================================

    SELECT *
    INTO _order
    FROM public.orders
    WHERE checkout_token = _checkout_token
      AND user_id = _user_id
    LIMIT 1;


    IF FOUND THEN

      -- إذا كان الطلب موجوداً لكن الفاتورة مفقودة،
      -- نحاول إصدارها أيضاً.
      PERFORM public.issue_invoice_for_order(
        _order.id
      );

      SELECT *
      INTO _order
      FROM public.orders
      WHERE id = _order.id;

      RETURN _order;

    END IF;


    RAISE;

END;
$checkout$;


-- ============================================================
-- 9. الصلاحيات
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
-- 10. ضمان صلاحية دالة إصدار الفاتورة
-- ============================================================

REVOKE ALL
ON FUNCTION public.issue_invoice_for_order(uuid)
FROM PUBLIC;


REVOKE EXECUTE
ON FUNCTION public.issue_invoice_for_order(uuid)
FROM authenticated;


-- ============================================================
-- 11. تحديث PostgREST Schema Cache
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
