BEGIN;

-- ============================================================
-- SHEHARA
-- Vendor Orders + Supplier Snapshots + Admin Account Management
-- ============================================================


-- ============================================================
-- 1. ربط عناصر الطلب بالمورد
-- ============================================================

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS vendor_id uuid;

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS vendor_name text;

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS vendor_phone text;

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS vendor_city text;

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS vendor_logo_url text;


-- ============================================================
-- 2. ربط vendor_id بالمتجر
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.order_items'::regclass
      AND conname = 'order_items_vendor_id_fkey'
  ) THEN

    ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_vendor_id_fkey
    FOREIGN KEY (vendor_id)
    REFERENCES public.vendors(id)
    ON DELETE SET NULL;

  END IF;
END;
$$;


CREATE INDEX IF NOT EXISTS
order_items_vendor_id_idx
ON public.order_items(vendor_id);

CREATE INDEX IF NOT EXISTS
order_items_vendor_order_idx
ON public.order_items(vendor_id, order_id);


-- ============================================================
-- 3. ملء المورد للطلبات القديمة من المنتجات
-- ============================================================

UPDATE public.order_items oi
SET vendor_id = p.vendor_id
FROM public.products p
WHERE oi.product_id = p.id
  AND oi.vendor_id IS NULL
  AND p.vendor_id IS NOT NULL;


UPDATE public.order_items oi
SET
  vendor_name = v.name,
  vendor_phone = v.phone,
  vendor_city = v.city,
  vendor_logo_url = v.logo_url
FROM public.vendors v
WHERE oi.vendor_id = v.id
  AND (
    oi.vendor_name IS NULL
    OR oi.vendor_phone IS NULL
    OR oi.vendor_city IS NULL
  );


-- ============================================================
-- 4. تحديث create_secure_order
--
-- يتم أخذ المورد من products وليس من المتصفح.
-- ويتم حفظ snapshot للمورد داخل order_items.
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
AS $function$

DECLARE

  _user_id uuid;

  _order public.orders;

  _product public.products;

  _vendor public.vendors;

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

  _initial_status public.order_status;

  _initial_payment_status text;

BEGIN

  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول قبل إتمام الطلب';
  END IF;


  IF _checkout_token IS NULL
     OR length(trim(_checkout_token)) < 16
  THEN
    RAISE EXCEPTION
      'معرّف عملية الطلب غير صالح';
  END IF;


  SELECT *
  INTO _existing
  FROM public.orders
  WHERE checkout_token = _checkout_token
    AND user_id = _user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN _existing;
  END IF;


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


  IF NULLIF(trim(_shipping_name), '') IS NULL THEN
    RAISE EXCEPTION 'اسم المستلم مطلوب';
  END IF;

  IF NULLIF(trim(_shipping_phone), '') IS NULL THEN
    RAISE EXCEPTION 'رقم الهاتف مطلوب';
  END IF;

  IF NULLIF(trim(_shipping_city), '') IS NULL THEN
    RAISE EXCEPTION 'المحافظة/المدينة مطلوبة';
  END IF;

  IF NULLIF(trim(_shipping_district), '') IS NULL THEN
    RAISE EXCEPTION 'المنطقة مطلوبة';
  END IF;

  IF NULLIF(trim(_shipping_details), '') IS NULL THEN
    RAISE EXCEPTION 'تفاصيل العنوان مطلوبة';
  END IF;


  IF _delivery_fee IS NULL
     OR _delivery_fee < 0
  THEN
    RAISE EXCEPTION
      'رسوم التوصيل غير صالحة';
  END IF;


  _delivery_fee_value :=
    round(_delivery_fee, 2);


  IF _items IS NULL
     OR jsonb_typeof(_items) <> 'array'
     OR jsonb_array_length(_items) = 0
  THEN
    RAISE EXCEPTION
      'السلة فارغة';
  END IF;


  -- ==========================================================
  -- التحقق من كل منتج
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


    _product :=
      public.validate_checkout_product(
        _product_id,
        _quantity
      );


    -- --------------------------------------------------------
    -- التأكد من وجود مورد
    -- --------------------------------------------------------

    IF _product.vendor_id IS NOT NULL THEN

      SELECT *
      INTO _vendor
      FROM public.vendors
      WHERE id = _product.vendor_id
        AND is_active = true
        AND account_enabled = true
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION
          'مورد المنتج غير متاح حالياً: %',
          _product.name;
      END IF;

    END IF;


    -- --------------------------------------------------------
    -- المقاس
    -- --------------------------------------------------------

    IF _size IS NOT NULL
       AND cardinality(
         COALESCE(
           _product.sizes,
           ARRAY[]::text[]
         )
       ) > 0
       AND NOT (
         _size = ANY(_product.sizes)
       )
    THEN
      RAISE EXCEPTION
        'المقاس المحدد غير متاح للمنتج: %',
        _product.name;
    END IF;


    -- --------------------------------------------------------
    -- اللون
    -- --------------------------------------------------------

    IF _color IS NOT NULL
       AND cardinality(
         COALESCE(
           _product.colors,
           ARRAY[]::text[]
         )
       ) > 0
       AND NOT (
         _color = ANY(_product.colors)
       )
    THEN
      RAISE EXCEPTION
        'اللون المحدد غير متاح للمنتج: %',
        _product.name;
    END IF;


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

  IF _payment_method.kind = 'wallet_balance'
     OR _payment_method.code = 'wallet_balance'
  THEN

    _initial_status := 'pending';
    _initial_payment_status := 'unpaid';

  ELSE

    IF _payment_method.requires_receipt THEN
      _initial_status := 'awaiting_payment';
    ELSE
      _initial_status := 'pending';
    END IF;

    _initial_payment_status := 'unpaid';

  END IF;


  -- ==========================================================
  -- إنشاء الطلب
  -- ==========================================================

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
    COALESCE(trim(_notes), ''),
    _latitude,
    _longitude
  )
  RETURNING *
  INTO _order;


  -- ==========================================================
  -- عناصر الطلب
  -- ==========================================================

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


    IF _product.vendor_id IS NOT NULL THEN

      SELECT *
      INTO _vendor
      FROM public.vendors
      WHERE id = _product.vendor_id
      LIMIT 1;

    ELSE

      _vendor := NULL;

    END IF;


    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      unit_price,
      quantity,
      size,
      color,
      currency,
      vendor_id,
      vendor_name,
      vendor_phone,
      vendor_city,
      vendor_logo_url
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
      _color,
      'YER',
      _product.vendor_id,
      CASE
        WHEN _vendor.id IS NOT NULL
        THEN _vendor.name
        ELSE NULL
      END,
      CASE
        WHEN _vendor.id IS NOT NULL
        THEN _vendor.phone
        ELSE NULL
      END,
      CASE
        WHEN _vendor.id IS NOT NULL
        THEN _vendor.city
        ELSE NULL
      END,
      CASE
        WHEN _vendor.id IS NOT NULL
        THEN _vendor.logo_url
        ELSE NULL
      END
    );

  END LOOP;


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

$function$;


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
-- 5. RPC: طلبات التاجر
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_vendor_orders()
RETURNS TABLE (
  order_id uuid,
  order_number text,
  invoice_number text,
  status text,
  payment_status text,
  payment_method_code text,
  currency text,
  subtotal numeric,
  delivery_fee numeric,
  total numeric,
  created_at timestamptz,
  shipping_name text,
  shipping_phone text,
  shipping_city text,
  shipping_district text,
  shipping_details text,
  latitude numeric,
  longitude numeric,
  items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor_id uuid;
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;


  SELECT id
  INTO _vendor_id
  FROM public.vendors
  WHERE user_id = auth.uid()
    AND is_active = true
    AND account_enabled = true
  LIMIT 1;


  IF _vendor_id IS NULL THEN
    RAISE EXCEPTION
      'حساب التاجر غير مفعّل';
  END IF;


  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.invoice_number,
    o.status::text,
    o.payment_status,
    o.payment_method_code,
    COALESCE(o.currency, 'YER'),
    o.subtotal,
    o.delivery_fee,
    o.total,
    o.created_at,
    o.shipping_name,
    o.shipping_phone,
    o.shipping_city,
    o.shipping_district,
    o.shipping_details,
    o.latitude,
    o.longitude,

    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'product_name', oi.product_name,
          'product_image', oi.product_image,
          'unit_price', oi.unit_price,
          'quantity', oi.quantity,
          'size', oi.size,
          'color', oi.color,
          'currency', oi.currency,
          'vendor_id', oi.vendor_id,
          'vendor_name', oi.vendor_name,
          'vendor_phone', oi.vendor_phone,
          'vendor_city', oi.vendor_city,
          'vendor_logo_url', oi.vendor_logo_url
        )
        ORDER BY oi.id
      )
      FILTER (
        WHERE oi.id IS NOT NULL
      ),
      '[]'::jsonb
    )

  FROM public.orders o

  JOIN public.order_items oi
    ON oi.order_id = o.id

  WHERE oi.vendor_id = _vendor_id

  GROUP BY
    o.id;

END;
$$;


REVOKE ALL
ON FUNCTION public.get_vendor_orders()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_vendor_orders()
TO authenticated;


-- ============================================================
-- 6. صلاحية قراءة عناصر طلبات التاجر
-- ============================================================

DROP POLICY IF EXISTS
order_items_vendor_select
ON public.order_items;

CREATE POLICY
order_items_vendor_select
ON public.order_items
FOR SELECT
TO authenticated
USING (
  public.is_vendor()
  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.id = order_items.vendor_id
      AND v.user_id = auth.uid()
      AND v.is_active = true
      AND v.account_enabled = true
  )
);


-- ============================================================
-- 7. دالة ضبط الرصيد مباشرة من الإدارة
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_wallet_balance(
  target_user_id uuid,
  target_currency text,
  new_balance numeric,
  transaction_description text DEFAULT 'تعديل الرصيد من الإدارة'
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_wallet public.wallets%ROWTYPE;
  old_balance numeric;
  difference numeric;
  transaction_type_value text;
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'ليس لديك صلاحية إدارة المحافظ';
  END IF;


  IF target_currency NOT IN ('YER', 'SAR') THEN
    RAISE EXCEPTION
      'العملة غير مدعومة';
  END IF;


  IF new_balance < 0 THEN
    RAISE EXCEPTION
      'الرصيد لا يمكن أن يكون سالباً';
  END IF;


  PERFORM public.create_user_wallets(
    target_user_id
  );


  SELECT *
  INTO target_wallet
  FROM public.wallets
  WHERE user_id = target_user_id
    AND currency = target_currency
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'المحفظة غير موجودة';
  END IF;


  old_balance :=
    target_wallet.balance;


  difference :=
    new_balance -
    old_balance;


  IF difference = 0 THEN
    RETURN target_wallet;
  END IF;


  IF difference > 0 THEN
    transaction_type_value := 'adjustment';
  ELSE
    transaction_type_value := 'adjustment';
  END IF;


  UPDATE public.wallets
  SET
    balance = new_balance,
    updated_at = now()
  WHERE id = target_wallet.id
  RETURNING *
  INTO target_wallet;


  INSERT INTO public.wallet_transactions (
    wallet_id,
    user_id,
    currency,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    reference_type,
    created_by
  )
  VALUES (
    target_wallet.id,
    target_user_id,
    target_currency,
    transaction_type_value,
    abs(difference),
    old_balance,
    new_balance,
    COALESCE(
      NULLIF(
        trim(transaction_description),
        ''
      ),
      'تعديل الرصيد من الإدارة'
    ),
    'admin_balance_adjustment',
    auth.uid()
  );


  RETURN target_wallet;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_set_wallet_balance(
  uuid,
  text,
  numeric,
  text
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_set_wallet_balance(
  uuid,
  text,
  numeric,
  text
)
TO authenticated;


-- ============================================================
-- 8. بيانات حساب مستخدم للإدارة
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_get_user_account(
  target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  SELECT jsonb_build_object(

    'profile',
    (
      SELECT to_jsonb(p)
      FROM public.profiles p
      WHERE p.id = target_user_id
    ),

    'roles',
    COALESCE(
      (
        SELECT jsonb_agg(
          ur.role::text
          ORDER BY ur.role::text
        )
        FROM public.user_roles ur
        WHERE ur.user_id = target_user_id
      ),
      '[]'::jsonb
    ),

    'vendor',
    (
      SELECT to_jsonb(v)
      FROM public.vendors v
      WHERE v.user_id = target_user_id
      ORDER BY v.id
      LIMIT 1
    ),

    'wallets',
    COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(w)
          ORDER BY
            CASE
              WHEN w.currency = 'YER'
              THEN 1
              WHEN w.currency = 'SAR'
              THEN 2
              ELSE 3
            END
        )
        FROM public.wallets w
        WHERE w.user_id = target_user_id
      ),
      '[]'::jsonb
    ),

    'transactions',
    COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(wt)
          ORDER BY wt.created_at DESC
        )
        FROM public.wallet_transactions wt
        WHERE wt.user_id = target_user_id
      ),
      '[]'::jsonb
    )

  )
  INTO result;


  RETURN COALESCE(
    result,
    '{}'::jsonb
  );

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_get_user_account(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_get_user_account(uuid)
TO authenticated;


-- ============================================================
-- 9. منتجات تاجر محدد للإدارة
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_get_vendor_products(
  target_vendor_id uuid
)
RETURNS SETOF public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  RETURN QUERY
  SELECT p.*
  FROM public.products p
  WHERE p.vendor_id = target_vendor_id
  ORDER BY p.created_at DESC;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_get_vendor_products(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_get_vendor_products(uuid)
TO authenticated;


-- ============================================================
-- 10. تحديث بيانات PostgREST
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
