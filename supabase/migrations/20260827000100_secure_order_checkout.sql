-- ============================================================
-- تشكيلات للتسوق
-- Secure Order Checkout
-- المرحلة 3-A
--
-- الهدف:
-- 1. منع إنشاء طلبات بقيم مالية مزورة.
-- 2. منع التلاعب بسعر المنتج.
-- 3. منع إنشاء طلبات مكررة.
-- 4. التحقق من المخزون داخل PostgreSQL.
-- 5. إنشاء الطلب وعناصره داخل Transaction واحدة.
-- 6. تثبيت سعر المنتج وقت الطلب.
-- 7. منع المستخدم من إنشاء طلب confirmed مباشرة.
-- 8. خصم المخزون مرة واحدة فقط عند تأكيد الطلب.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Idempotency Key
--
-- يمنع إنشاء طلبين عند:
-- - الضغط على زر الطلب مرتين.
-- - إعادة إرسال الطلب.
-- - ضعف الاتصال.
-- - إعادة المحاولة من المتصفح.
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS checkout_token text;

CREATE UNIQUE INDEX IF NOT EXISTS
orders_checkout_token_unique_idx
ON public.orders(checkout_token)
WHERE checkout_token IS NOT NULL;


-- ============================================================
-- 2. قيود أساسية على عناصر الطلب
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
-- 3. منع المستخدم من إنشاء طلب مؤكد مباشرة
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


-- ============================================================
-- 4. منع المستخدم من تعديل طلبه مباشرة
--
-- الإدارة فقط هي التي تعدل الطلب.
-- ============================================================

DROP POLICY IF EXISTS orders_own_update
ON public.orders;


-- ============================================================
-- 5. وظيفة التحقق من المنتج
--
-- هذه الوظيفة تستخدم داخل إنشاء الطلب.
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


GRANT EXECUTE
ON FUNCTION public.validate_checkout_product(uuid, integer)
TO authenticated;


-- ============================================================
-- 6. إنشاء الطلب بشكل ذري
--
-- جميع العمليات التالية تتم داخل Transaction واحدة:
--
-- 1. التحقق من المستخدم.
-- 2. التحقق من المنتجات.
-- 3. قفل المنتجات.
-- 4. حساب الأسعار من قاعدة البيانات.
-- 5. إنشاء الطلب.
-- 6. إنشاء order_items.
--
-- العميل لا يرسل السعر النهائي كمصدر موثوق.
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
  -- Token
  -- ==========================================================

  IF _checkout_token IS NULL
     OR length(trim(_checkout_token)) < 16
  THEN
    RAISE EXCEPTION
      'معرّف عملية الطلب غير صالح';
  END IF;


  -- ==========================================================
  -- التحقق من عدم وجود طلب سابق
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
  -- التحقق من البيانات الأساسية
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
  -- التحقق من رسوم التوصيل
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
  -- التحقق من العناصر
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


    -- --------------------------------------------------------
    -- قفل المنتج والتحقق منه
    -- --------------------------------------------------------

    _product :=
      public.validate_checkout_product(
        _product_id,
        _quantity
      );


    -- --------------------------------------------------------
    -- التحقق من المقاسات
    -- --------------------------------------------------------

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


    -- --------------------------------------------------------
    -- التحقق من الألوان
    -- --------------------------------------------------------

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


    -- --------------------------------------------------------
    -- حساب السعر من قاعدة البيانات
    -- --------------------------------------------------------

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
    --
    -- السعر هنا يؤخذ من products وليس من العميل.
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
-- 7. خصم المخزون تلقائياً عند تأكيد الطلب
--
-- الدالة الموجودة deduct_order_stock() جيدة كأساس،
-- لكن نحتاج Trigger يمنع نسيان استدعائها.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_order_stock_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  -- ----------------------------------------------------------
  -- الطلب أصبح confirmed لأول مرة
  -- ----------------------------------------------------------

  IF NEW.status = 'confirmed'
     AND OLD.status IS DISTINCT FROM 'confirmed'
  THEN

    PERFORM public.deduct_order_stock(
      NEW.id
    );

  END IF;


  RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS
orders_stock_confirmation_trigger
ON public.orders;


CREATE TRIGGER
orders_stock_confirmation_trigger
AFTER UPDATE OF status
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION
public.handle_order_stock_confirmation();


-- ============================================================
-- 8. منع خصم المخزون مرتين
--
-- نستخدم inventory_movements كمرجع.
-- ============================================================

CREATE OR REPLACE FUNCTION public.deduct_order_stock(
  _order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  order_item record;

  updated_rows integer;

BEGIN

  -- ----------------------------------------------------------
  -- صلاحية التنفيذ
  -- ----------------------------------------------------------

  IF NOT (
    public.has_role(
      auth.uid(),
      'admin'::public.app_role
    )
    OR EXISTS (
      SELECT 1
      FROM public.orders
      WHERE id = _order_id
        AND user_id = auth.uid()
    )
  )
  THEN

    RAISE EXCEPTION
      'غير مصرح لك بتنفيذ هذه العملية';

  END IF;


  -- ----------------------------------------------------------
  -- منع الخصم المكرر
  -- ----------------------------------------------------------

  IF EXISTS (
    SELECT 1
    FROM public.inventory_movements
    WHERE reference_id = _order_id
      AND movement_type = 'sale'
  )
  THEN

    RETURN;

  END IF;


  -- ----------------------------------------------------------
  -- خصم المنتجات
  -- ----------------------------------------------------------

  FOR order_item IN

    SELECT
      oi.product_id,
      SUM(
        oi.quantity
      )::integer AS quantity

    FROM public.order_items oi

    WHERE oi.order_id = _order_id
      AND oi.product_id IS NOT NULL

    GROUP BY
      oi.product_id

  LOOP

    UPDATE public.products

    SET stock_left =
      stock_left -
      order_item.quantity

    WHERE id =
      order_item.product_id

      AND stock_left >=
        order_item.quantity;


    GET DIAGNOSTICS
      updated_rows = ROW_COUNT;


    IF updated_rows = 0 THEN

      RAISE EXCEPTION
        'المخزون غير كافٍ للمنتج %',
        order_item.product_id;

    END IF;


    INSERT INTO public.inventory_movements (
      product_id,
      quantity,
      movement_type,
      reference_id,
      note,
      created_by
    )
    VALUES (
      order_item.product_id,
      -order_item.quantity,
      'sale',
      _order_id,
      'خصم المخزون عند تأكيد الطلب',
      auth.uid()
    );

  END LOOP;

END;
$$;


GRANT EXECUTE
ON FUNCTION public.deduct_order_stock(uuid)
TO authenticated;


-- ============================================================
-- 9. حماية تحديث حالة الطلب
--
-- الإدارة فقط تستطيع الانتقال إلى حالات المعالجة.
-- ============================================================

DROP POLICY IF EXISTS orders_admin_update
ON public.orders;

CREATE POLICY orders_admin_update
ON public.orders
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);


-- ============================================================
-- 10. منع إدخال order_items مباشرة بسعر مختلف عن المنتج
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _product public.products;
BEGIN

  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;


  SELECT *
  INTO _product
  FROM public.products
  WHERE id = NEW.product_id;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'المنتج غير موجود';
  END IF;


  -- السعر النهائي وقت الطلب
  NEW.unit_price :=
    _product.price;


  -- اسم المنتج snapshot
  NEW.product_name :=
    _product.name;


  -- الصورة snapshot
  IF NEW.product_image IS NULL
     OR trim(NEW.product_image) = ''
  THEN

    NEW.product_image :=
      COALESCE(
        _product.images[1],
        ''
      );

  END IF;


  RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS
validate_order_item_price_trigger
ON public.order_items;


CREATE TRIGGER
validate_order_item_price_trigger
BEFORE INSERT
ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION
public.validate_order_item_price();


-- ============================================================
-- 11. فهارس الأداء
-- ============================================================

CREATE INDEX IF NOT EXISTS
orders_user_created_idx
ON public.orders(
  user_id,
  created_at DESC
);


CREATE INDEX IF NOT EXISTS
order_items_order_idx
ON public.order_items(
  order_id
);


CREATE INDEX IF NOT EXISTS
orders_status_idx
ON public.orders(
  status
);


CREATE INDEX IF NOT EXISTS
orders_payment_status_idx
ON public.orders(
  payment_status
);


COMMIT;
