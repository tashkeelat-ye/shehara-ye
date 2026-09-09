-- ============================================================
-- SHEHARA / شهارة للتسوق
-- PHASE 1 - SECURE TOP-UP + FINANCIAL RPC HARDENING
--
-- Migration:
-- 20260909000600_phase1_secure_topup_and_financial_rpc.sql
--
-- الهدف:
-- 1. إصلاح حماية wallets من ملف 005.
-- 2. منع أي تعديل مباشر على الأرصدة.
-- 3. إنشاء Top-up فقط عبر SECURITY DEFINER RPC.
-- 4. التحقق من طريقة الدفع من الخادم.
-- 5. التحقق من العملة والمبلغ من الخادم.
-- 6. منع Top-up المكرر.
-- 7. تسجيل balance_before / balance_after.
-- 8. جعل Ledger immutable.
-- 9. فصل Top-up عن Refund.
-- 10. منع تعديل Payment Requests مباشرة.
-- 11. الحفاظ على العمليات المالية Atomic.
-- ============================================================

BEGIN;


-- ============================================================
-- 1. إصلاح مشكلة Trigger wallets من Migration 005
--
-- مهم:
-- SECURITY DEFINER functions تنفذ بصلاحيات مالك الدالة،
-- ولكن auth.uid() يبقى هو المستخدم الأصلي.
--
-- لذلك لا يجوز استخدام auth.uid()/is_admin()
-- داخل Trigger لمنع UPDATE على wallets،
-- لأن ذلك قد يمنع pay_order_from_wallet الشرعي.
--
-- الحماية الحقيقية هنا تعتمد على:
-- - REVOKE UPDATE من API roles
-- - SECURITY DEFINER functions فقط للعمليات المالية
-- - CHECK constraints لمنع الرصيد السالب
-- ============================================================

DROP TRIGGER IF EXISTS protect_wallet_balance
ON public.wallets;

DROP FUNCTION IF EXISTS public.protect_wallet_balance();


-- ============================================================
-- 2. التأكد من قيود wallets
-- ============================================================

ALTER TABLE public.wallets
  DROP CONSTRAINT IF EXISTS wallets_balance_non_negative;

ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_balance_non_negative
  CHECK (balance >= 0);


ALTER TABLE public.wallets
  DROP CONSTRAINT IF EXISTS wallets_currency_check;

ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_currency_check
  CHECK (currency IN ('YER', 'SAR'));


-- ============================================================
-- 3. منع الوصول المباشر إلى wallets
-- ============================================================

REVOKE INSERT, UPDATE, DELETE
ON public.wallets
FROM anon;

REVOKE INSERT, UPDATE, DELETE
ON public.wallets
FROM authenticated;

GRANT SELECT
ON public.wallets
TO authenticated;


-- ============================================================
-- 4. منع تعديل Payment Requests مباشرة
--
-- جميع التغييرات المالية تتم عبر RPC.
-- ============================================================

DROP TRIGGER IF EXISTS
payment_requests_financial_fields_protection
ON public.payment_requests;

DROP TRIGGER IF EXISTS
prevent_processed_payment_request_delete
ON public.payment_requests;

DROP FUNCTION IF EXISTS
public.protect_payment_request_financial_fields();

DROP FUNCTION IF EXISTS
public.prevent_processed_payment_request_delete();


ALTER TABLE public.payment_requests
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS payment_requests_own_select
ON public.payment_requests;

CREATE POLICY payment_requests_own_select
ON public.payment_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS payment_requests_admin_select
ON public.payment_requests;

CREATE POLICY payment_requests_admin_select
ON public.payment_requests
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);


DROP POLICY IF EXISTS payment_requests_own_insert
ON public.payment_requests;

DROP POLICY IF EXISTS payment_requests_customer_insert
ON public.payment_requests;

DROP POLICY IF EXISTS payment_requests_own_update
ON public.payment_requests;

DROP POLICY IF EXISTS payment_requests_customer_update
ON public.payment_requests;

DROP POLICY IF EXISTS payment_requests_own_delete
ON public.payment_requests;

DROP POLICY IF EXISTS payment_requests_customer_delete
ON public.payment_requests;


REVOKE INSERT, UPDATE, DELETE
ON public.payment_requests
FROM anon;

REVOKE INSERT, UPDATE, DELETE
ON public.payment_requests
FROM authenticated;

GRANT SELECT
ON public.payment_requests
TO authenticated;


-- ============================================================
-- 5. حماية wallet_transactions
-- ============================================================

ALTER TABLE public.wallet_transactions
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS wallet_transactions_customer_insert
ON public.wallet_transactions;

DROP POLICY IF EXISTS wallet_transactions_customer_update
ON public.wallet_transactions;

DROP POLICY IF EXISTS wallet_transactions_customer_delete
ON public.wallet_transactions;


REVOKE INSERT, UPDATE, DELETE
ON public.wallet_transactions
FROM anon;

REVOKE INSERT, UPDATE, DELETE
ON public.wallet_transactions
FROM authenticated;

GRANT SELECT
ON public.wallet_transactions
TO authenticated;


-- ============================================================
-- 6. التأكد من أن Ledger immutable
-- ============================================================

CREATE OR REPLACE FUNCTION
public.prevent_wallet_transaction_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  RAISE EXCEPTION
    'حركات المحفظة المالية غير قابلة للتعديل أو الحذف';

END;
$$;


DROP TRIGGER IF EXISTS
wallet_transactions_immutable
ON public.wallet_transactions;


CREATE TRIGGER
wallet_transactions_immutable
BEFORE UPDATE OR DELETE
ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION
public.prevent_wallet_transaction_mutation();


-- ============================================================
-- 7. دالة إنشاء Top-up
--
-- العميل يرسل:
-- - المبلغ
-- - طريقة التحويل
-- - بيانات المرسل
-- - المرجع
-- - الإيصال
-- - العملة
--
-- الخادم يتحقق من:
-- - المستخدم
-- - المبلغ
-- - العملة
-- - طريقة الدفع
-- - أنها فعالة
-- - أنها تسمح بإرفاق إيصال
--
-- لا يتم تعديل wallet هنا.
-- فقط إنشاء Payment Request.
-- ============================================================

CREATE OR REPLACE FUNCTION public.request_wallet_topup(
  _amount numeric,
  _method_code text,
  _currency text DEFAULT 'YER',
  _sender_name text DEFAULT '',
  _sender_phone text DEFAULT '',
  _reference text DEFAULT '',
  _receipt_path text DEFAULT ''
)
RETURNS public.payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _user_id uuid;
  _request public.payment_requests%ROWTYPE;
  _method public.payment_methods%ROWTYPE;
  _requested_amount numeric(14,2);
  _normalized_currency text;

BEGIN

  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول';
  END IF;


  -- ==========================================================
  -- المبلغ
  -- ==========================================================

  _requested_amount :=
    ROUND(
      COALESCE(_amount, 0),
      2
    );


  IF _requested_amount <= 0 THEN
    RAISE EXCEPTION
      'مبلغ الشحن غير صالح';
  END IF;


  -- ==========================================================
  -- العملة
  -- ==========================================================

  _normalized_currency :=
    UPPER(
      COALESCE(
        NULLIF(TRIM(_currency), ''),
        'YER'
      )
    );


  IF _normalized_currency NOT IN ('YER', 'SAR') THEN
    RAISE EXCEPTION
      'العملة غير مدعومة';
  END IF;


  -- ==========================================================
  -- طريقة الدفع
  -- ==========================================================

  IF NULLIF(TRIM(_method_code), '') IS NULL THEN
    RAISE EXCEPTION
      'طريقة الدفع غير محددة';
  END IF;


  SELECT *
  INTO _method
  FROM public.payment_methods
  WHERE code = TRIM(_method_code)
    AND is_active = true
  LIMIT 1;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'طريقة الدفع غير متاحة حالياً';
  END IF;


  -- ==========================================================
  -- Top-up عبر التحويل البنكي/النقدي يحتاج إيصالاً
  -- ==========================================================

  IF _method.requires_receipt = true
     AND NULLIF(TRIM(_receipt_path), '') IS NULL
  THEN
    RAISE EXCEPTION
      'يجب إرفاق إيصال التحويل';
  END IF;


  -- ==========================================================
  -- منع وجود Top-up pending مكرر
  --
  -- لا نسمح للمستخدم بإنشاء عدة طلبات معلقة
  -- لنفس المبلغ والطريقة والمرجع.
  -- ==========================================================

  IF NULLIF(TRIM(_reference), '') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.payment_requests
       WHERE user_id = _user_id
         AND purpose = 'topup'
         AND status = 'pending'
         AND reference = TRIM(_reference)
     )
  THEN

    RAISE EXCEPTION
      'يوجد طلب شحن قيد المراجعة بنفس رقم العملية';

  END IF;


  -- ==========================================================
  -- إنشاء الطلب
  -- ==========================================================

  INSERT INTO public.payment_requests (
    user_id,
    purpose,
    order_id,
    method_code,
    amount,
    currency,
    sender_name,
    sender_phone,
    reference,
    receipt_path,
    status,
    admin_note
  )
  VALUES (
    _user_id,
    'topup',
    NULL,
    _method.code,
    _requested_amount,
    _normalized_currency,
    LEFT(COALESCE(TRIM(_sender_name), ''), 100),
    LEFT(COALESCE(TRIM(_sender_phone), ''), 30),
    LEFT(COALESCE(TRIM(_reference), ''), 100),
    LEFT(COALESCE(TRIM(_receipt_path), ''), 500),
    'pending',
    ''
  )
  RETURNING *
  INTO _request;


  RETURN _request;

END;
$$;


REVOKE ALL
ON FUNCTION public.request_wallet_topup(
  numeric,
  text,
  text,
  text,
  text,
  text,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.request_wallet_topup(
  numeric,
  text,
  text,
  text,
  text,
  text,
  text
)
TO authenticated;


-- ============================================================
-- 8. اعتماد Top-up بشكل آمن
--
-- لا نعتمد على مبلغ قادم من Frontend.
-- المبلغ الموجود في Payment Request هو المبلغ
-- الذي تم تسجيله عند إنشاء الطلب.
--
-- العملية:
-- 1. قفل Payment Request.
-- 2. التأكد أنها pending.
-- 3. التأكد أنها Top-up.
-- 4. قفل Wallet.
-- 5. فحص Idempotency.
-- 6. إضافة الرصيد.
-- 7. تسجيل Ledger.
-- 8. اعتماد Payment Request.
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_wallet_topup(
  _payment_request_id uuid,
  _note text DEFAULT ''
)
RETURNS public.payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _admin_id uuid;
  _request public.payment_requests%ROWTYPE;
  _wallet public.wallets%ROWTYPE;

  _currency text;
  _amount numeric(14,2);
  _old_balance numeric(14,2);

BEGIN

  _admin_id := auth.uid();

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  -- ==========================================================
  -- قفل Payment Request
  -- ==========================================================

  SELECT *
  INTO _request
  FROM public.payment_requests
  WHERE id = _payment_request_id
    AND purpose = 'topup'
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'طلب الشحن غير موجود';
  END IF;


  IF _request.status <> 'pending' THEN
    RAISE EXCEPTION
      'طلب الشحن تمت معالجته مسبقاً';
  END IF;


  -- ==========================================================
  -- العملة
  -- ==========================================================

  _currency :=
    COALESCE(
      NULLIF(_request.currency, ''),
      'YER'
    );


  IF _currency NOT IN ('YER', 'SAR') THEN
    RAISE EXCEPTION
      'عملة المحفظة غير صالحة';
  END IF;


  -- ==========================================================
  -- المبلغ
  -- ==========================================================

  _amount :=
    ROUND(
      COALESCE(_request.amount, 0),
      2
    );


  IF _amount <= 0 THEN
    RAISE EXCEPTION
      'مبلغ الشحن غير صالح';
  END IF;


  -- ==========================================================
  -- Idempotency
  -- ==========================================================

  IF EXISTS (
    SELECT 1
    FROM public.wallet_transactions
    WHERE reference_type = 'payment_request'
      AND reference_id = _request.id
      AND transaction_type = 'credit'
  ) THEN

    UPDATE public.payment_requests
    SET
      status = 'approved',
      admin_note = COALESCE(_note, ''),
      reviewed_at = COALESCE(reviewed_at, now()),
      updated_at = now()
    WHERE id = _request.id
    RETURNING *
    INTO _request;

    RETURN _request;

  END IF;


  -- ==========================================================
  -- إنشاء/قفل المحفظة
  -- ==========================================================

  INSERT INTO public.wallets (
    user_id,
    currency,
    balance
  )
  VALUES (
    _request.user_id,
    _currency,
    0
  )
  ON CONFLICT (user_id, currency)
  DO NOTHING;


  SELECT *
  INTO _wallet
  FROM public.wallets
  WHERE user_id = _request.user_id
    AND currency = _currency
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'تعذر الوصول إلى محفظة المستخدم';
  END IF;


  _old_balance :=
    ROUND(
      COALESCE(_wallet.balance, 0),
      2
    );


  -- ==========================================================
  -- إضافة الرصيد
  -- ==========================================================

  UPDATE public.wallets
  SET
    balance = balance + _amount,
    updated_at = now()
  WHERE id = _wallet.id
  RETURNING *
  INTO _wallet;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'تعذر تحديث رصيد المحفظة';
  END IF;


  -- ==========================================================
  -- Ledger
  -- ==========================================================

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
    _wallet.id,
    _request.user_id,
    _currency,
    'credit',
    _amount,
    _old_balance,
    _wallet.balance,
    'شحن محفظة عبر ' || _request.method_code,
    'payment_request',
    _request.id,
    _admin_id
  );


  -- ==========================================================
  -- اعتماد الطلب
  -- ==========================================================

  UPDATE public.payment_requests
  SET
    status = 'approved',
    admin_note = COALESCE(_note, ''),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = _request.id
  RETURNING *
  INTO _request;


  RETURN _request;

END;
$$;


REVOKE ALL
ON FUNCTION public.approve_wallet_topup(uuid, text)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.approve_wallet_topup(uuid, text)
TO authenticated;


-- ============================================================
-- 9. رفض Top-up
-- ============================================================

CREATE OR REPLACE FUNCTION public.reject_wallet_topup(
  _payment_request_id uuid,
  _note text DEFAULT ''
)
RETURNS public.payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _request public.payment_requests%ROWTYPE;

BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  SELECT *
  INTO _request
  FROM public.payment_requests
  WHERE id = _payment_request_id
    AND purpose = 'topup'
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'طلب الشحن غير موجود';
  END IF;


  IF _request.status <> 'pending' THEN
    RAISE EXCEPTION
      'طلب الشحن تمت معالجته مسبقاً';
  END IF;


  UPDATE public.payment_requests
  SET
    status = 'rejected',
    admin_note = COALESCE(_note, ''),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = _request.id
  RETURNING *
  INTO _request;


  RETURN _request;

END;
$$;


REVOKE ALL
ON FUNCTION public.reject_wallet_topup(uuid, text)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.reject_wallet_topup(uuid, text)
TO authenticated;


-- ============================================================
-- 10. إعادة بناء review_payment_request
--
-- هذه الدالة تبقى للتوافق مع النظام الحالي،
-- ولكن العمليات المالية الفعلية تمر الآن عبر
-- الدوال الآمنة الجديدة.
--
-- Top-up:
--    approve_wallet_topup / reject_wallet_topup
--
-- Refund:
--    approve_wallet_refund / reject_wallet_refund
--
-- Order:
--    معالجة الدفع الإداري.
-- ============================================================

CREATE OR REPLACE FUNCTION public.review_payment_request(
  _id uuid,
  _approve boolean,
  _note text DEFAULT ''
)
RETURNS public.payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _request public.payment_requests%ROWTYPE;
  _order public.orders%ROWTYPE;

BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  SELECT *
  INTO _request
  FROM public.payment_requests
  WHERE id = _id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'طلب الدفع غير موجود';
  END IF;


  -- ==========================================================
  -- TOP-UP
  -- ==========================================================

  IF _request.purpose = 'topup' THEN

    IF _approve THEN

      RETURN public.approve_wallet_topup(
        _id,
        _note
      );

    ELSE

      RETURN public.reject_wallet_topup(
        _id,
        _note
      );

    END IF;

  END IF;


  -- ==========================================================
  -- REFUND
  -- ==========================================================

  IF _request.purpose = 'refund' THEN

    IF _approve THEN

      RETURN public.approve_wallet_refund(
        _id,
        _note
      );

    ELSE

      RETURN public.reject_wallet_refund(
        _id,
        _note
      );

    END IF;

  END IF;


  -- ==========================================================
  -- ORDER PAYMENT
  -- ==========================================================

  IF _request.purpose = 'order' THEN

    IF _request.order_id IS NULL THEN
      RAISE EXCEPTION
        'طلب الدفع لا يحتوي على طلب مرتبط';
    END IF;


    SELECT *
    INTO _order
    FROM public.orders
    WHERE id = _request.order_id
    FOR UPDATE;


    IF NOT FOUND THEN
      RAISE EXCEPTION
        'الطلب المرتبط غير موجود';
    END IF;


    IF _request.status <> 'pending' THEN
      RAISE EXCEPTION
        'طلب الدفع تمت معالجته مسبقاً';
    END IF;


    IF _approve THEN

      IF ROUND(
        COALESCE(_request.amount, 0),
        2
      )
      <>
      ROUND(
        COALESCE(_order.total, 0),
        2
      )
      THEN
        RAISE EXCEPTION
          'مبلغ الدفع لا يطابق إجمالي الطلب';
      END IF;


      UPDATE public.orders
      SET
        payment_status = 'paid',
        status = 'confirmed',
        updated_at = now()
      WHERE id = _order.id;


      UPDATE public.payment_requests
      SET
        status = 'approved',
        admin_note = COALESCE(_note, ''),
        reviewed_at = now(),
        updated_at = now()
      WHERE id = _request.id
      RETURNING *
      INTO _request;


      RETURN _request;

    ELSE

      UPDATE public.orders
      SET
        payment_status = 'rejected',
        updated_at = now()
      WHERE id = _order.id
        AND payment_status <> 'paid';


      UPDATE public.payment_requests
      SET
        status = 'rejected',
        admin_note = COALESCE(_note, ''),
        reviewed_at = now(),
        updated_at = now()
      WHERE id = _request.id
      RETURNING *
      INTO _request;


      RETURN _request;

    END IF;

  END IF;


  RAISE EXCEPTION
    'نوع Payment Request غير مدعوم';

END;
$$;


REVOKE ALL
ON FUNCTION public.review_payment_request(
  uuid,
  boolean,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.review_payment_request(
  uuid,
  boolean,
  text
)
TO authenticated;


-- ============================================================
-- 11. حماية الدوال القديمة
-- ============================================================

REVOKE ALL
ON FUNCTION public.pay_order_from_wallet(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.pay_order_from_wallet(uuid)
TO authenticated;


REVOKE ALL
ON FUNCTION public.approve_wallet_refund(uuid, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.approve_wallet_refund(uuid, text)
TO authenticated;


REVOKE ALL
ON FUNCTION public.reject_wallet_refund(uuid, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.reject_wallet_refund(uuid, text)
TO authenticated;


-- ============================================================
-- 12. Harden search_path للدوال المالية
-- ============================================================

ALTER FUNCTION public.pay_order_from_wallet(uuid)
SET search_path = public;


ALTER FUNCTION public.approve_wallet_refund(uuid, text)
SET search_path = public;


ALTER FUNCTION public.reject_wallet_refund(uuid, text)
SET search_path = public;


ALTER FUNCTION public.request_wallet_refund(uuid, numeric, text)
SET search_path = public;


ALTER FUNCTION public.get_wallet(text)
SET search_path = public;


-- ============================================================
-- 13. فهارس Top-up
-- ============================================================

CREATE INDEX IF NOT EXISTS
payment_requests_user_purpose_status_idx
ON public.payment_requests(
  user_id,
  purpose,
  status,
  created_at DESC
);


CREATE INDEX IF NOT EXISTS
payment_requests_currency_idx
ON public.payment_requests(currency);


-- ============================================================
-- 14. تعليقات توثيقية
-- ============================================================

COMMENT ON FUNCTION public.request_wallet_topup(
  numeric,
  text,
  text,
  text,
  text,
  text,
  text
)
IS
'إنشاء طلب شحن محفظة آمن. لا يتم تعديل الرصيد حتى تعتمد الإدارة الطلب.';


COMMENT ON FUNCTION public.approve_wallet_topup(uuid, text)
IS
'اعتماد Top-up ذري Atomic مع قفل المحفظة وLedger وIdempotency.';


COMMENT ON FUNCTION public.reject_wallet_topup(uuid, text)
IS
'رفض طلب Top-up بواسطة الإدارة.';


COMMENT ON FUNCTION public.approve_wallet_refund(uuid, text)
IS
'اعتماد Refund إلى المحفظة مع منع التكرار والتحقق من المبلغ والعملة.';


COMMENT ON FUNCTION public.reject_wallet_refund(uuid, text)
IS
'رفض Refund بواسطة الإدارة.';


COMMIT;
