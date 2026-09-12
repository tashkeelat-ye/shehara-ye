-- ============================================================
-- Shehara
-- FINAL SECURE CHECKOUT REPAIR
-- Migration: 20260912000800
--
-- الهدف:
-- 1. إصلاح checkout_token إلى TEXT.
-- 2. إعادة إنشاء validate_checkout_product.
-- 3. إعادة إنشاء create_secure_order.
-- 4. إصلاح صلاحيات تنفيذ وظائف Checkout.
-- 5. ضمان توافق Checkout مع create_checkout_order(text,...).
-- 6. إعادة تحميل PostgREST.
--
-- هذا الملف مستقل ولا يعتمد على أي Migration سابقة
-- لاستعادة create_secure_order أو validate_checkout_product.
-- ============================================================

BEGIN;


-- ============================================================
-- 1. إصلاح checkout_token
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS checkout_token text;


-- نحذف الفهرس القديم إن وجد حتى نضمن توافقه
-- مع نوع العمود الجديد.

DROP INDEX IF EXISTS
public.orders_checkout_token_unique_idx;


-- إذا كان العمود موجوداً أصلاً بنوع UUID أو أي نوع آخر،
-- يتم تحويله إلى TEXT.

DO $repair_checkout_token$
DECLARE
  _data_type text;
BEGIN

  SELECT
    format_type(a.atttypid, a.atttypmod)
  INTO _data_type
  FROM pg_attribute a
  JOIN pg_class c
    ON c.oid = a.attrelid
  JOIN pg_namespace n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'orders'
    AND a.attname = 'checkout_token'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF _data_type IS NULL THEN
    RAISE EXCEPTION
      'لم يتم العثور على public.orders.checkout_token';
  END IF;

  IF _data_type <> 'text' THEN

    EXECUTE
      'ALTER TABLE public.orders
       ALTER COLUMN checkout_token TYPE text
       USING checkout_token::text';

  END IF;

END;
$repair_checkout_token$;


-- إعادة إنشاء الفهرس الفريد.

CREATE UNIQUE INDEX
IF NOT EXISTS orders_checkout_token_unique_idx
ON public.orders(checkout_token)
WHERE checkout_token IS NOT NULL;


-- ============================================================
-- 2. قيود Checkout الأساسية
-- ============================================================

ALTER TABLE public.order_items
DROP CONSTRAINT IF EXISTS order_items_quantity_positive;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_quantity_positive
CHECK (quantity > 0);


ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_total_non_negative;

ALTER TABLE public.orders
ADD CONSTRAINT orders_total_non_negative
CHECK (total >= 0);


ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_subtotal_non_negative;

ALTER TABLE public.orders
ADD CONSTRAINT orders_subtotal_non_negative
CHECK (subtotal >= 0);


ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_delivery_fee_non_negative;

ALTER TABLE public.orders
ADD CONSTRAINT orders_delivery_fee_non_negative
CHECK (delivery_fee >= 0);


-- ============================================================
-- 3. سياسة إنشاء الطلب
-- ============================================================

DROP POLICY IF EXISTS orders_own_insert
ON public.orders;


CREATE POLICY orders_own_insert
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status IN (
    'pending',
    'awaiting_payment'
  )
);


-- العميل لا يعدل الطلب مباشرة.

DROP POLICY IF EXISTS orders_own_update
ON public.orders;


-- ============================================================
-- 4. التحقق من المنتج
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_checkout_product(
  _product_id uuid,
  _quantity integer
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _product public.products;
BEGIN

  IF _product_id IS NULL THEN
    RAISE EXCEPTION
      'معرّف المنتج غير صالح';
  END IF;


  IF _quantity IS NULL
     OR _quantity <= 0
  THEN
    RAISE EXCEPTION
      'كمية المنتج يجب أن تكون أكبر من صفر';
  END IF;


  SELECT *
  INTO _product
  FROM public.products
  WHERE id = _product_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'المنتج غير موجود';
  END IF;


  IF NOT _product.is_active THEN
    RAISE EXCEPTION
      'المنتج غير متاح حالياً: %',
      _product.name;
  END IF;


  IF _product.stock_left < _quantity THEN
    RAISE EXCEPTION
      'المخزون غير كافٍ للمنتج: %. المتاح: %',
      _product.name,
      _product.stock_left;
  END IF;


  RETURN _product;

END;
$$;


GRANT EXECUTE
ON FUNCTION public.validate_checkout_product(
  uuid,
  integer
)
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.validate_checkout_product(
  uuid,
  integer
)
FROM PUBLIC;


-- ============================================================
-- 5. إنشاء الطلب الآمن
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_secure_order(
  _checkout_token text,
  _payment_method_code text,
  _shipping_name text,
  _shipping_phone text,
  _shipping_city text,
  _shipping_district text,
  _shipping_details text,
  _notes text DEFAULT '',
  _latitude numeric DEFAULT NULL,
  _longitude numeric DEFAULT NULL,
  _delivery_fee numeric DEFAULT 0,
  _items jsonb DEFAULT '[]'::jsonb
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _user_id uuid;

  _order public.orders;

  _product public.products;

  _item jsonb;

  _product_id uuid;

  _quantity integer;

  _size text;

  _color text;

  _subtotal numeric(12,2) := 0;

  _delivery_fee_value numeric(12,2) := 0;

  _total numeric(12,2) := 0;

  _payment_method public.payment_methods;

  _existing public.orders;

BEGIN

  -- ==========================================================
  -- المستخدم
  -- ==========================================================

  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول قبل إتمام الطلب';
  END IF;


  -- ==========================================================
  -- Checkout Token
  -- ==========================================================

  IF _checkout_token IS NULL
     OR length(trim(_checkout_token)) < 16
  THEN
    RAISE EXCEPTION
      'معرّف عملية الطلب غير صالح';
  END IF;


  -- ==========================================================
  -- منع تكرار الطلب
  -- ==========================================================

  SELECT *
  INTO _existing
  FROM public.orders
  WHERE checkout_token = _checkout_token
    AND user_id = _user_id
  LIMIT 1;


  IF FOUND THEN
    RETURN _existing;
  END IF;


  -- ==========================================================
  -- طريقة الدفع
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
  WHERE code = _payment_method_code
    AND is_active = true
  LIMIT 1;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'طريقة الدفع غير متاحة حالياً';
  END IF;


  -- ==========================================================
  -- بيانات الشحن
  -- ==========================================================

  IF _shipping_name IS NULL
     OR trim(_shipping_name) = ''
  THEN
    RAISE EXCEPTION
      'اسم المستلم مطلوب';
  END IF;


  IF _shipping_phone IS NULL
     OR trim(_shipping_phone) = ''
  THEN
    RAISE EXCEPTION
      'رقم الهاتف مطلوب';
  END IF;


  IF _shipping_city IS NULL
     OR trim(_shipping_city) = ''
  THEN
    RAISE EXCEPTION
      'المحافظة/المدينة مطلوبة';
  END IF;


  IF _shipping_district IS NULL
     OR trim(_shipping_district) = ''
  THEN
    RAISE EXCEPTION
      'المنطقة مطلوبة';
  END IF;


  IF _shipping_details IS NULL
     OR trim(_shipping_details) = ''
  THEN
    RAISE EXCEPTION
      'تفاصيل العنوان مطلوبة';
  END IF;


  -- ==========================================================
  -- رسوم التوصيل
  -- ==========================================================

  IF _delivery_fee IS NULL
     OR _delivery_fee < 0
  THEN
    RAISE EXCEPTION
      'رسوم التوصيل غير صالحة';
  END IF;


  _delivery_fee_value :=
    round(_delivery_fee, 2);


  -- ==========================================================
  -- السلة
  -- ==========================================================

  IF _items IS NULL
     OR jsonb_typeof(_items) <> 'array'
     OR jsonb_array_length(_items) = 0
  THEN
    RAISE EXCEPTION
      'السلة فارغة';
  END IF;


  -- ==========================================================
  -- التحقق من المنتجات وحساب السعر الحقيقي
  -- ==========================================================

  FOR _item IN
    SELECT value
    FROM jsonb_array_elements(_items)
  LOOP

    BEGIN

      _product_id :=
        (_item ->> 'product_id')::uuid;

    EXCEPTION
      WHEN invalid_text_representation THEN

        RAISE EXCEPTION
          'معرّف منتج غير صالح';

    END;


    _quantity :=
      COALESCE(
        (_item ->> 'quantity')::integer,
        0
      );


    _size :=
      NULLIF(
        trim(
          COALESCE(
            _item ->> 'size',
            ''
          )
        ),
        ''
      );


    _color :=
      NULLIF(
        trim(
          COALESCE(
            _item ->> 'color',
            ''
          )
        ),
        ''
      );


    -- التحقق من المنتج والمخزون

    _product :=
      public.validate_checkout_product(
        _product_id,
        _quantity
      );


    -- ========================================================
    -- التحقق من المقاس
    -- ========================================================

    IF _size IS NOT NULL
       AND cardinality(
         COALESCE(_product.sizes, ARRAY[]::text[])
       ) > 0
       AND NOT (
         _size = ANY(_product.sizes)
       )
    THEN

      RAISE EXCEPTION
        'المقاس المحدد غير متاح للمنتج: %',
        _product.name;

    END IF;


    -- ========================================================
    -- التحقق من اللون
    -- ========================================================

    IF _color IS NOT NULL
       AND cardinality(
         COALESCE(_product.colors, ARRAY[]::text[])
       ) > 0
       AND NOT (
         _color = ANY(_product.colors)
       )
    THEN

      RAISE EXCEPTION
        'اللون المحدد غير متاح للمنتج: %',
        _product.name;

    END IF;


    -- ========================================================
    -- حساب السعر من قاعدة البيانات
    -- ========================================================

    _subtotal :=
      _subtotal +
      (
        _product.price *
        _quantity
      );

  END LOOP;


  _subtotal :=
    round(_subtotal, 2);


  _total :=
    round(
      _subtotal +
      _delivery_fee_value,
      2
    );


  -- ==========================================================
  -- حالة الطلب
  -- ==========================================================

  DECLARE

    _initial_status public.order_status;

    _initial_payment_status text;

  BEGIN

    IF _payment_method.kind = 'wallet_balance'
       OR _payment_method.code = 'wallet_balance'
    THEN

      _initial_status :=
        'pending';

      _initial_payment_status :=
        'unpaid';

    ELSE

      IF _payment_method.requires_receipt THEN

        _initial_status :=
          'awaiting_payment';

      ELSE

        _initial_status :=
          'pending';

      END IF;


      _initial_payment_status :=
        'unpaid';

    END IF;


    -- ========================================================
    -- إنشاء الطلب
    -- ========================================================

    INSERT INTO public.orders (
      user_id,
      checkout_token,
      status,
      payment_status,
      payment_method_code,
      subtotal,
      delivery_fee,
      total,
      shipping_name,
      shipping_phone,
      shipping_city,
      shipping_district,
      shipping_details,
      notes,
      latitude,
      longitude
    )
    VALUES (
      _user_id,
      _checkout_token,
      _initial_status,
      _initial_payment_status,
      _payment_method.code,
      _subtotal,
      _delivery_fee_value,
      _total,
      trim(_shipping_name),
      trim(_shipping_phone),
      trim(_shipping_city),
      trim(_shipping_district),
      trim(_shipping_details),
      COALESCE(
        trim(_notes),
        ''
      ),
      _latitude,
      _longitude
    )
    RETURNING *
    INTO _order;


    -- ========================================================
    -- إنشاء عناصر الطلب
    -- ========================================================

    FOR _item IN
      SELECT value
      FROM jsonb_array_elements(_items)
    LOOP

      _product_id :=
        (_item ->> 'product_id')::uuid;


      _quantity :=
        (_item ->> 'quantity')::integer;


      _size :=
        NULLIF(
          trim(
            COALESCE(
              _item ->> 'size',
              ''
            )
          ),
          ''
        );


      _color :=
        NULLIF(
          trim(
            COALESCE(
              _item ->> 'color',
              ''
            )
          ),
          ''
        );


      SELECT *
      INTO _product
      FROM public.products
      WHERE id = _product_id;


      INSERT INTO public.order_items (
        order_id,
        product_id,
        product_name,
        product_image,
        unit_price,
        quantity,
        size,
        color
      )
      VALUES (
        _order.id,
        _product.id,
        _product.name,
        COALESCE(
          _product.images[1],
          ''
        ),
        _product.price,
        _quantity,
        _size,
        _color
      );

    END LOOP;

  END;


  RETURN _order;


EXCEPTION

  WHEN unique_violation THEN

    SELECT *
    INTO _existing
    FROM public.orders
    WHERE checkout_token = _checkout_token
      AND user_id = _user_id
    LIMIT 1;


    IF FOUND THEN
      RETURN _existing;
    END IF;


    RAISE;

END;
$$;


-- ============================================================
-- 6. صلاحيات create_secure_order
-- ============================================================

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


REVOKE EXECUTE
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


-- ============================================================
-- 7. إزالة نسخة create_checkout_order القديمة التي تستخدم UUID
-- ============================================================

DROP FUNCTION IF EXISTS public.create_checkout_order(
  uuid,
  jsonb,
  numeric,
  numeric,
  numeric,
  public.order_status,
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
  boolean,
  text,
  text,
  text,
  text
);


-- ============================================================
-- 8. التأكد من صلاحيات create_checkout_order النصية
-- ============================================================

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


REVOKE EXECUTE
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


-- ============================================================
-- 9. إعادة تحميل PostgREST
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
