BEGIN;

-- ============================================================
-- SHEHARA / شهارة للتسوق
-- 20260912000600
--
-- RESTORE MISSING SECURE CHECKOUT FUNCTIONS
--
-- الدوال التي يجب أن تكون موجودة:
-- 1. validate_checkout_product(uuid, integer)
-- 2. create_secure_order(text, text, text, text, text, text,
--    text, text, numeric, numeric, numeric, jsonb)
--
-- السبب:
-- create_checkout_order() تعتمد عليها، لكنها غير موجودة
-- حالياً في قاعدة البيانات الإنتاجية.
-- ============================================================


-- ============================================================
-- 1. التحقق الآمن من المنتج
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
    RAISE EXCEPTION 'معرّف المنتج غير صالح';
  END IF;

  IF _quantity IS NULL OR _quantity <= 0 THEN
    RAISE EXCEPTION 'كمية المنتج يجب أن تكون أكبر من صفر';
  END IF;

  SELECT *
  INTO _product
  FROM public.products
  WHERE id = _product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المنتج غير موجود';
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


-- ============================================================
-- صلاحيات validate_checkout_product
-- ============================================================

REVOKE ALL
ON FUNCTION public.validate_checkout_product(uuid, integer)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.validate_checkout_product(uuid, integer)
TO authenticated;


-- ============================================================
-- 2. إنشاء الطلب بشكل آمن وذري
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

  _delivery_fee numeric(12,2) := 0;

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
  -- منع الطلب المكرر
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
  -- التحقق من طريقة الدفع
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
  -- البيانات الأساسية
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

  _delivery_fee :=
    round(_delivery_fee, 2);


  -- ==========================================================
  -- التحقق من السلة
  -- ==========================================================

  IF _items IS NULL
     OR jsonb_typeof(_items) <> 'array'
     OR jsonb_array_length(_items) = 0
  THEN
    RAISE EXCEPTION
      'السلة فارغة';
  END IF;


  -- ==========================================================
  -- حساب الإجمالي من قاعدة البيانات
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


    -- ========================================================
    -- قفل المنتج والتحقق منه
    -- ========================================================

    _product :=
      public.validate_checkout_product(
        _product_id,
        _quantity
      );


    -- ========================================================
    -- التحقق من المقاس
    -- ========================================================

    IF _size IS NOT NULL
       AND NOT (
         _size = ANY(_product.sizes)
       )
       AND cardinality(_product.sizes) > 0
    THEN

      RAISE EXCEPTION
        'المقاس المحدد غير متاح للمنتج: %',
        _product.name;

    END IF;


    -- ========================================================
    -- التحقق من اللون
    -- ========================================================

    IF _color IS NOT NULL
       AND NOT (
         _color = ANY(_product.colors)
       )
       AND cardinality(_product.colors) > 0
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
      _delivery_fee,
      2
    );


  -- ==========================================================
  -- تحديد حالة الطلب
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
      _delivery_fee,
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
-- صلاحيات create_secure_order
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


-- ============================================================
-- إعادة تحميل PostgREST
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
