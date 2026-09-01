BEGIN;

-- ============================================================
-- SHEHARA
-- Checkout Compatibility Layer
--
-- الهدف:
-- 1. توحيد اسم دالة Checkout مع الواجهة.
-- 2. استخدام create_secure_order الموجودة فعلياً.
-- 3. أخذ رسوم التوصيل من قاعدة البيانات.
-- 4. عدم الوثوق برسوم يرسلها المتصفح.
-- 5. دعم الدفع من محفظة YER.
-- ============================================================


-- ============================================================
-- 1. create_checkout_order
--
-- هذه الدالة هي الواجهة التي يستدعيها React.
-- لكنها لا تنشئ الطلب بنفسها.
-- بل تستدعي create_secure_order.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_checkout_token text,
  p_payment_method_code text,
  p_shipping_name text,
  p_shipping_phone text,
  p_shipping_city text,
  p_shipping_district text,
  p_shipping_details text,
  p_notes text DEFAULT '',
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_fee numeric(12,2) := 0;
  v_order public.orders;
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول قبل إتمام الطلب';
  END IF;


  -- ----------------------------------------------------------
  -- رسوم التوصيل من قاعدة البيانات
  -- ----------------------------------------------------------

  SELECT
    COALESCE(
      delivery_fee,
      0
    )
  INTO
    v_delivery_fee
  FROM public.site_settings
  LIMIT 1;


  v_delivery_fee :=
    round(
      GREATEST(
        COALESCE(
          v_delivery_fee,
          0
        ),
        0
      ),
      2
    );


  -- ----------------------------------------------------------
  -- إنشاء الطلب عبر الدالة الآمنة الأساسية
  -- ----------------------------------------------------------

  SELECT *
  INTO v_order
  FROM public.create_secure_order(
    p_checkout_token,
    p_payment_method_code,
    p_shipping_name,
    p_shipping_phone,
    p_shipping_city,
    p_shipping_district,
    p_shipping_details,
    COALESCE(
      p_notes,
      ''
    ),
    p_latitude,
    p_longitude,
    v_delivery_fee,
    p_items
  );


  RETURN v_order;

END;
$$;


GRANT EXECUTE
ON FUNCTION public.create_checkout_order(
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
  jsonb
)
TO authenticated;


-- ============================================================
-- 2. الدفع من المحفظة
--
-- العملة الأساسية للطلبات الحالية:
-- YER
--
-- العملية:
-- 1. قفل الطلب.
-- 2. التحقق من مالك الطلب.
-- 3. التحقق من طريقة الدفع.
-- 4. قفل محفظة YER.
-- 5. التحقق من الرصيد.
-- 6. خصم الرصيد.
-- 7. تسجيل حركة مالية.
-- 8. تحويل الطلب إلى مدفوع/مؤكد.
--
-- كل ذلك داخل Transaction واحدة.
-- ============================================================

CREATE OR REPLACE FUNCTION public.pay_order_from_wallet(
  p_order_id uuid
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_order public.orders;
  v_wallet public.wallets;
  v_balance_before numeric(14,2);
BEGIN

  v_user_id := auth.uid();


  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول';
  END IF;


  -- ----------------------------------------------------------
  -- قفل الطلب
  -- ----------------------------------------------------------

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE
    id = p_order_id
    AND user_id = v_user_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'الطلب غير موجود أو غير مصرح لك بالوصول إليه';
  END IF;


  -- ----------------------------------------------------------
  -- إذا كان مدفوعاً بالفعل
  -- لا نخصم مرة أخرى.
  -- ----------------------------------------------------------

  IF v_order.payment_status = 'paid' THEN
    RETURN v_order;
  END IF;


  -- ----------------------------------------------------------
  -- التحقق من طريقة الدفع
  -- ----------------------------------------------------------

  IF NOT (
    v_order.payment_method_code =
      'wallet_balance'
  ) THEN
    RAISE EXCEPTION
      'هذا الطلب لا يستخدم المحفظة للدفع';
  END IF;


  -- ----------------------------------------------------------
  -- الطلب الملغي لا يمكن دفعه.
  -- ----------------------------------------------------------

  IF v_order.status =
    'cancelled'
  THEN
    RAISE EXCEPTION
      'لا يمكن دفع طلب ملغي';
  END IF;


  -- ----------------------------------------------------------
  -- الحصول على محفظة YER وقفلها.
  -- ----------------------------------------------------------

  SELECT *
  INTO v_wallet
  FROM public.wallets
  WHERE
    user_id = v_user_id
    AND currency = 'YER'
  FOR UPDATE;


  IF NOT FOUND THEN

    PERFORM public.create_user_wallets(
      v_user_id
    );


    SELECT *
    INTO v_wallet
    FROM public.wallets
    WHERE
      user_id = v_user_id
      AND currency = 'YER'
    FOR UPDATE;

  END IF;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'محفظة الريال اليمني غير موجودة';
  END IF;


  -- ----------------------------------------------------------
  -- الرصيد
  -- ----------------------------------------------------------

  v_balance_before :=
    COALESCE(
      v_wallet.balance,
      0
    );


  IF v_balance_before <
     v_order.total
  THEN
    RAISE EXCEPTION
      'رصيد المحفظة غير كافٍ';
  END IF;


  -- ----------------------------------------------------------
  -- خصم الرصيد
  -- ----------------------------------------------------------

  UPDATE public.wallets
  SET
    balance =
      v_balance_before -
      v_order.total,
    updated_at =
      now()
  WHERE
    id = v_wallet.id
  RETURNING *
  INTO v_wallet;


  -- ----------------------------------------------------------
  -- تسجيل الحركة المالية
  -- ----------------------------------------------------------

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
    reference_id,
    created_by
  )
  VALUES (
    v_wallet.id,
    v_user_id,
    'YER',
    'debit',
    v_order.total,
    v_balance_before,
    v_wallet.balance,
    'دفع طلب من محفظة شهارة',
    'order',
    v_order.id,
    v_user_id
  );


  -- ----------------------------------------------------------
  -- تأكيد الدفع والطلب
  -- ----------------------------------------------------------

  UPDATE public.orders
  SET
    payment_status = 'paid',
    status = 'confirmed',
    updated_at = now()
  WHERE
    id = v_order.id
  RETURNING *
  INTO v_order;


  RETURN v_order;

END;
$$;


GRANT EXECUTE
ON FUNCTION public.pay_order_from_wallet(
  uuid
)
TO authenticated;


-- ============================================================
-- 3. حماية دالة الدفع
-- ============================================================

REVOKE ALL
ON FUNCTION public.pay_order_from_wallet(uuid)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.pay_order_from_wallet(uuid)
TO authenticated;


-- ============================================================
-- 4. حماية دالة إنشاء الطلب
-- ============================================================

REVOKE ALL
ON FUNCTION public.create_checkout_order(
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
  jsonb
)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.create_checkout_order(
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
  jsonb
)
TO authenticated;


COMMIT;
