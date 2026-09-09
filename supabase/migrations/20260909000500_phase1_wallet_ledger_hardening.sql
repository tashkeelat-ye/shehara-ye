-- ============================================================
-- SHEHARA / شهارة للتسوق
-- PHASE 1 - WALLET LEDGER HARDENING
--
-- Migration:
-- 20260909000500_phase1_wallet_ledger_hardening.sql
--
-- الهدف:
-- 1. منع تعديل أو حذف الحركات المالية.
-- 2. منع إدخال حركات مالية مباشرة من العميل.
-- 3. إضافة Idempotency للحركات.
-- 4. حماية Top-up.
-- 5. حماية Refund.
-- 6. منع Refund أكبر من المبلغ المدفوع.
-- 7. منع Refund المكرر.
-- 8. تسجيل balance_before / balance_after.
-- 9. ربط كل حركة مالية بمرجع واضح.
-- 10. منع الرصيد السالب.
-- 11. جعل العمليات المالية Atomic + Row Lock.
-- 12. منع التلاعب بالمبالغ القادمة من Frontend.
--
-- IMPORTANT:
-- لا يتم تعديل أي رصيد من Frontend مباشرة.
-- كل العمليات المالية تمر عبر SECURITY DEFINER RPC.
-- ============================================================

BEGIN;


-- ============================================================
-- 1. حماية جدول wallets
-- ============================================================

ALTER TABLE public.wallets
  DROP CONSTRAINT IF EXISTS wallets_balance_non_negative;

ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_balance_non_negative
  CHECK (balance >= 0);


-- ============================================================
-- 2. إضافة العملة إلى payment_requests
-- ============================================================

ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'YER';

ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_currency_check;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_currency_check
  CHECK (currency IN ('YER', 'SAR'));


-- ============================================================
-- 3. إضافة refunded_amount إلى orders
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_amount numeric(14,2)
  NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_refunded_amount_non_negative;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_refunded_amount_non_negative
  CHECK (refunded_amount >= 0);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_refunded_amount_not_above_total;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_refunded_amount_not_above_total
  CHECK (refunded_amount <= total);


-- ============================================================
-- 4. إضافة قيود على wallet_transactions
-- ============================================================

ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_transaction_type_check
  CHECK (
    transaction_type IS NULL
    OR transaction_type IN ('credit', 'debit')
  );


ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_currency_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_currency_check
  CHECK (
    currency IS NULL
    OR currency IN ('YER', 'SAR')
  );


-- ============================================================
-- 5. فهرس Idempotency
--
-- يسمح:
-- order_payment + order_id + debit
-- topup + payment_request_id + credit
-- refund + payment_request_id + credit
--
-- ويمنع تكرار نفس العملية المالية.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
wallet_transactions_idempotency_idx
ON public.wallet_transactions (
  reference_type,
  reference_id,
  transaction_type
)
WHERE
  reference_type IS NOT NULL
  AND reference_id IS NOT NULL
  AND transaction_type IS NOT NULL;


-- ============================================================
-- 6. فهارس مالية
-- ============================================================

CREATE INDEX IF NOT EXISTS
wallet_transactions_wallet_idx
ON public.wallet_transactions(wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS
wallet_transactions_user_idx
ON public.wallet_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS
wallet_transactions_reference_idx
ON public.wallet_transactions(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS
payment_requests_order_idx
ON public.payment_requests(order_id);

CREATE INDEX IF NOT EXISTS
payment_requests_status_idx
ON public.payment_requests(status, created_at DESC);


-- ============================================================
-- 7. منع تعديل أو حذف Ledger
--
-- لا توجد UPDATE أو DELETE للحركات المالية.
--
-- حتى SECURITY DEFINER functions يجب ألا تعدل حركة قديمة.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_wallet_transaction_mutation()
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
EXECUTE FUNCTION public.prevent_wallet_transaction_mutation();


-- ============================================================
-- 8. منع إدخال حركات مالية من العميل
--
-- الإدخال مسموح فقط من SECURITY DEFINER functions.
-- RLS + GRANT يمنعان الاستخدام المباشر.
-- ============================================================

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
wallet_transactions_customer_insert
ON public.wallet_transactions;

DROP POLICY IF EXISTS
wallet_transactions_customer_update
ON public.wallet_transactions;

DROP POLICY IF EXISTS
wallet_transactions_customer_delete
ON public.wallet_transactions;


REVOKE INSERT, UPDATE, DELETE
ON public.wallet_transactions
FROM authenticated;


REVOKE INSERT, UPDATE, DELETE
ON public.wallet_transactions
FROM anon;


GRANT SELECT
ON public.wallet_transactions
TO authenticated;


-- ============================================================
-- 9. منع العميل من تعديل wallets مباشرة
-- ============================================================

REVOKE INSERT, UPDATE, DELETE
ON public.wallets
FROM authenticated;

REVOKE INSERT, UPDATE, DELETE
ON public.wallets
FROM anon;


GRANT SELECT
ON public.wallets
TO authenticated;


-- ============================================================
-- 10. دالة داخلية لإنشاء محفظة
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_wallet(
  _user_id uuid,
  _currency text
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet public.wallets%ROWTYPE;
BEGIN

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير صالح';
  END IF;

  IF _currency NOT IN ('YER', 'SAR') THEN
    RAISE EXCEPTION 'العملة غير مدعومة';
  END IF;

  INSERT INTO public.wallets (
    user_id,
    currency,
    balance
  )
  VALUES (
    _user_id,
    _currency,
    0
  )
  ON CONFLICT (user_id, currency)
  DO NOTHING;

  SELECT *
  INTO _wallet
  FROM public.wallets
  WHERE user_id = _user_id
    AND currency = _currency
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'تعذر إنشاء المحفظة';
  END IF;

  RETURN _wallet;

END;
$$;


REVOKE ALL
ON FUNCTION public.ensure_wallet(uuid, text)
FROM PUBLIC;


-- ============================================================
-- 11. طلب Refund من العميل
--
-- العميل لا يحدد:
-- - قيمة refund النهائية
-- - الرصيد
-- - الحركة المالية
--
-- الخادم يتحقق من كل شيء.
-- ============================================================

CREATE OR REPLACE FUNCTION public.request_wallet_refund(
  _order_id uuid,
  _amount numeric,
  _note text DEFAULT ''
)
RETURNS public.payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _user_id uuid;
  _order public.orders%ROWTYPE;
  _request public.payment_requests%ROWTYPE;
  _requested_amount numeric(14,2);
  _remaining_amount numeric(14,2);

BEGIN

  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;


  _requested_amount :=
    ROUND(
      COALESCE(_amount, 0),
      2
    );


  IF _requested_amount <= 0 THEN
    RAISE EXCEPTION 'قيمة الاسترجاع غير صالحة';
  END IF;


  -- قفل الطلب
  SELECT *
  INTO _order
  FROM public.orders
  WHERE id = _order_id
    AND user_id = _user_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود أو غير مملوك للمستخدم';
  END IF;


  -- يجب أن يكون الطلب مدفوعًا
  IF _order.payment_status <> 'paid' THEN
    RAISE EXCEPTION
      'لا يمكن طلب استرجاع لطلب غير مدفوع';
  END IF;


  -- يجب أن يكون الطلب في حالة تسمح بالاسترجاع
  IF _order.status NOT IN (
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  ) THEN
    RAISE EXCEPTION
      'حالة الطلب لا تسمح بطلب الاسترجاع';
  END IF;


  -- حساب المتبقي القابل للاسترجاع
  _remaining_amount :=
    ROUND(
      COALESCE(_order.total, 0)
      -
      COALESCE(_order.refunded_amount, 0),
      2
    );


  IF _requested_amount > _remaining_amount THEN
    RAISE EXCEPTION
      'قيمة الاسترجاع أكبر من المبلغ المتبقي القابل للاسترجاع';
  END IF;


  -- منع وجود Refund pending لنفس الطلب والمستخدم
  IF EXISTS (
    SELECT 1
    FROM public.payment_requests
    WHERE order_id = _order_id
      AND user_id = _user_id
      AND purpose = 'refund'
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION
      'يوجد طلب استرجاع قيد المراجعة لهذا الطلب';
  END IF;


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
    'refund',
    _order_id,
    'wallet',
    _requested_amount,
    COALESCE(_order.currency, 'YER'),
    '',
    '',
    '',
    '',
    'pending',
    COALESCE(_note, '')
  )
  RETURNING *
  INTO _request;


  RETURN _request;

END;
$$;


REVOKE ALL
ON FUNCTION public.request_wallet_refund(uuid, numeric, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.request_wallet_refund(uuid, numeric, text)
TO authenticated;


-- ============================================================
-- 12. اعتماد Refund بواسطة الإدارة
--
-- هذه العملية:
-- 1. تقفل Payment Request.
-- 2. تقفل Order.
-- 3. تتحقق من المبلغ.
-- 4. تقفل Wallet.
-- 5. تزيد الرصيد.
-- 6. تسجل Ledger Entry.
-- 7. تزيد refunded_amount.
-- 8. تعتمد الطلب.
--
-- كل ذلك داخل Transaction واحدة.
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_wallet_refund(
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
  _order public.orders%ROWTYPE;
  _wallet public.wallets%ROWTYPE;

  _old_balance numeric(14,2);
  _refund_amount numeric(14,2);
  _remaining_amount numeric(14,2);
  _currency text;

BEGIN

  _admin_id := auth.uid();

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  -- ==========================================================
  -- قفل طلب الاسترجاع
  -- ==========================================================

  SELECT *
  INTO _request
  FROM public.payment_requests
  WHERE id = _payment_request_id
    AND purpose = 'refund'
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'طلب الاسترجاع غير موجود';
  END IF;


  IF _request.status <> 'pending' THEN
    RAISE EXCEPTION
      'طلب الاسترجاع تمت معالجته مسبقاً';
  END IF;


  IF _request.order_id IS NULL THEN
    RAISE EXCEPTION
      'طلب الاسترجاع غير مرتبط بطلب';
  END IF;


  _refund_amount :=
    ROUND(
      COALESCE(_request.amount, 0),
      2
    );


  IF _refund_amount <= 0 THEN
    RAISE EXCEPTION
      'قيمة الاسترجاع غير صالحة';
  END IF;


  _currency :=
    COALESCE(
      NULLIF(_request.currency, ''),
      'YER'
    );


  IF _currency NOT IN ('YER', 'SAR') THEN
    RAISE EXCEPTION
      'عملة الاسترجاع غير صالحة';
  END IF;


  -- ==========================================================
  -- قفل الطلب
  -- ==========================================================

  SELECT *
  INTO _order
  FROM public.orders
  WHERE id = _request.order_id
    AND user_id = _request.user_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'الطلب غير موجود';
  END IF;


  IF _order.payment_status <> 'paid' THEN
    RAISE EXCEPTION
      'لا يمكن استرجاع طلب غير مدفوع';
  END IF;


  -- ==========================================================
  -- التحقق من العملة
  -- ==========================================================

  IF COALESCE(_order.currency, 'YER') <> _currency THEN
    RAISE EXCEPTION
      'عملة الاسترجاع لا تطابق عملة الطلب';
  END IF;


  -- ==========================================================
  -- حساب المبلغ المتبقي
  -- ==========================================================

  _remaining_amount :=
    ROUND(
      COALESCE(_order.total, 0)
      -
      COALESCE(_order.refunded_amount, 0),
      2
    );


  IF _refund_amount > _remaining_amount THEN
    RAISE EXCEPTION
      'قيمة الاسترجاع تتجاوز المبلغ المتبقي';
  END IF;


  -- ==========================================================
  -- منع Refund مكرر
  --
  -- كل Payment Request له حركة مالية واحدة.
  -- ==========================================================

  IF EXISTS (
    SELECT 1
    FROM public.wallet_transactions
    WHERE reference_type = 'refund'
      AND reference_id = _request.id
      AND transaction_type = 'credit'
  ) THEN

    UPDATE public.payment_requests
    SET
      status = 'approved',
      admin_note =
        CASE
          WHEN COALESCE(_note, '') <> ''
            THEN _note
          ELSE admin_note
        END,
      reviewed_at = COALESCE(reviewed_at, now()),
      updated_at = now()
    WHERE id = _request.id
    RETURNING *
    INTO _request;

    RETURN _request;

  END IF;


  -- ==========================================================
  -- الحصول على المحفظة + Row Lock
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
  ON CONFLICT (
    user_id,
    currency
  )
  DO NOTHING;


  SELECT *
  INTO _wallet
  FROM public.wallets
  WHERE user_id = _request.user_id
    AND currency = _currency
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'محفظة المستخدم غير موجودة';
  END IF;


  _old_balance := _wallet.balance;


  -- ==========================================================
  -- إضافة الرصيد
  -- ==========================================================

  UPDATE public.wallets
  SET
    balance = balance + _refund_amount,
    updated_at = now()
  WHERE id = _wallet.id
  RETURNING *
  INTO _wallet;


  -- ==========================================================
  -- تسجيل الحركة
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
    _refund_amount,
    _old_balance,
    _wallet.balance,
    'استرجاع قيمة الطلب ' || _order.order_number,
    'refund',
    _request.id,
    _admin_id
  );


  -- ==========================================================
  -- تحديث إجمالي الاسترجاع للطلب
  -- ==========================================================

  UPDATE public.orders
  SET
    refunded_amount =
      ROUND(
        COALESCE(refunded_amount, 0)
        +
        _refund_amount,
        2
      ),
    updated_at = now()
  WHERE id = _order.id;


  -- ==========================================================
  -- اعتماد Refund Request
  -- ==========================================================

  UPDATE public.payment_requests
  SET
    status = 'approved',
    admin_note =
      CASE
        WHEN COALESCE(_note, '') <> ''
          THEN _note
        ELSE admin_note
      END,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = _request.id
  RETURNING *
  INTO _request;


  RETURN _request;

END;
$$;


REVOKE ALL
ON FUNCTION public.approve_wallet_refund(uuid, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.approve_wallet_refund(uuid, text)
TO authenticated;


-- ============================================================
-- 13. رفض Refund
-- ============================================================

CREATE OR REPLACE FUNCTION public.reject_wallet_refund(
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
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  SELECT *
  INTO _request
  FROM public.payment_requests
  WHERE id = _payment_request_id
    AND purpose = 'refund'
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'طلب الاسترجاع غير موجود';
  END IF;


  IF _request.status <> 'pending' THEN
    RAISE EXCEPTION
      'طلب الاسترجاع تمت معالجته مسبقاً';
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
ON FUNCTION public.reject_wallet_refund(uuid, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.reject_wallet_refund(uuid, text)
TO authenticated;


-- ============================================================
-- 14. تأمين approve_wallet_refund
-- ============================================================

REVOKE ALL
ON FUNCTION public.approve_wallet_refund(uuid, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.approve_wallet_refund(uuid, text)
TO authenticated;


-- ============================================================
-- 15. منع العميل من إنشاء Payment Requests مباشرة
-- ============================================================

REVOKE INSERT, UPDATE, DELETE
ON public.payment_requests
FROM authenticated;

REVOKE INSERT, UPDATE, DELETE
ON public.payment_requests
FROM anon;

GRANT SELECT
ON public.payment_requests
TO authenticated;


-- ============================================================
-- 16. حماية payment_requests من حذف الطلبات المعالجة
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_processed_payment_request_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION
      'لا يمكن حذف طلب دفع تمت معالجته';
  END IF;

  RAISE EXCEPTION
    'لا يسمح بحذف Payment Requests مباشرة';

END;
$$;


DROP TRIGGER IF EXISTS
payment_requests_no_delete
ON public.payment_requests;


CREATE TRIGGER
payment_requests_no_delete
BEFORE DELETE
ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.prevent_processed_payment_request_delete();


-- ============================================================
-- 17. منع تعديل الحقول المالية الحساسة في Payment Request
--
-- العميل لا يستطيع التعديل مباشرة بسبب GRANT.
-- هذا Trigger يمثل طبقة دفاع إضافية.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_payment_request_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF OLD.amount IS DISTINCT FROM NEW.amount
     OR OLD.currency IS DISTINCT FROM NEW.currency
     OR OLD.user_id IS DISTINCT FROM NEW.user_id
     OR OLD.order_id IS DISTINCT FROM NEW.order_id
     OR OLD.purpose IS DISTINCT FROM NEW.purpose
     OR OLD.status IS DISTINCT FROM NEW.status
  THEN

    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
      RAISE EXCEPTION
        'لا يمكن تعديل الحقول المالية لطلب الدفع';
    END IF;

  END IF;


  RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS
payment_requests_financial_protection
ON public.payment_requests;


CREATE TRIGGER
payment_requests_financial_protection
BEFORE UPDATE
ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.protect_payment_request_financial_fields();


-- ============================================================
-- 18. حماية wallets من الرصيد السالب
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_wallet_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF NEW.balance < 0 THEN
    RAISE EXCEPTION
      'لا يمكن أن يكون رصيد المحفظة سالباً';
  END IF;


  IF NEW.currency NOT IN ('YER', 'SAR') THEN
    RAISE EXCEPTION
      'العملة غير مدعومة';
  END IF;


  IF NEW.balance IS DISTINCT FROM OLD.balance THEN

    -- يسمح بتغيير الرصيد فقط من داخل transaction آمنة.
    -- لا يسمح للمستخدم العادي بتغيير الرصيد.
    IF auth.uid() IS NOT NULL
       AND NOT public.is_admin()
    THEN
      RAISE EXCEPTION
        'لا يمكن تعديل رصيد المحفظة مباشرة';
    END IF;

  END IF;


  RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS
wallet_balance_protection
ON public.wallets;


CREATE TRIGGER
wallet_balance_protection
BEFORE UPDATE
ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.protect_wallet_balance();


-- ============================================================
-- 19. حماية إنشاء wallets
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_wallet_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF NEW.currency NOT IN ('YER', 'SAR') THEN
    RAISE EXCEPTION 'العملة غير مدعومة';
  END IF;


  IF NEW.balance < 0 THEN
    RAISE EXCEPTION 'الرصيد لا يمكن أن يكون سالباً';
  END IF;


  RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS
wallet_identity_protection
ON public.wallets;


CREATE TRIGGER
wallet_identity_protection
BEFORE INSERT OR UPDATE
ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.protect_wallet_identity();


-- ============================================================
-- 20. حماية تنفيذ الدوال
-- ============================================================

REVOKE ALL
ON FUNCTION public.request_wallet_refund(uuid, numeric, text)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.approve_wallet_refund(uuid, text)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.reject_wallet_refund(uuid, text)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.ensure_wallet(uuid, text)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.request_wallet_refund(uuid, numeric, text)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.approve_wallet_refund(uuid, text)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.reject_wallet_refund(uuid, text)
TO authenticated;


-- ============================================================
-- 21. حماية sequence الخاصة بالفواتير
-- ============================================================

DO $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relkind = 'S'
      AND relname = 'invoice_number_seq'
      AND relnamespace = 'public'::regnamespace
  ) THEN

    REVOKE ALL
    ON SEQUENCE public.invoice_number_seq
    FROM authenticated;

    REVOKE ALL
    ON SEQUENCE public.invoice_number_seq
    FROM anon;

  END IF;

END;
$$;


-- ============================================================
-- 22. تعليق توثيقي على الجداول
-- ============================================================

COMMENT ON TABLE public.wallets IS
'Official wallet balances. Direct client balance mutation is forbidden. Financial mutations must use secure SECURITY DEFINER functions.';


COMMENT ON TABLE public.wallet_transactions IS
'Immutable financial ledger. Rows must never be updated or deleted.';


COMMENT ON COLUMN public.orders.refunded_amount IS
'Total amount already refunded to the customer. Updated only by secure refund transaction.';


COMMENT ON COLUMN public.payment_requests.currency IS
'Currency of the payment/refund request. Must match the related financial operation.';


-- ============================================================
-- 23. حماية search_path للدوال المالية القديمة
-- ============================================================

DO $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'pay_order_from_wallet'
  ) THEN

    EXECUTE
      'ALTER FUNCTION public.pay_order_from_wallet(uuid) SET search_path = public';

  END IF;


  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'review_payment_request'
  ) THEN

    EXECUTE
      'ALTER FUNCTION public.review_payment_request(uuid,boolean,text) SET search_path = public';

  END IF;


  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_wallet'
  ) THEN

    EXECUTE
      'ALTER FUNCTION public.get_wallet(text) SET search_path = public';

  END IF;

END;
$$;


-- ============================================================
-- 24. التأكد من صلاحيات الدوال الأساسية
-- ============================================================

DO $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'pay_order_from_wallet'
  ) THEN

    REVOKE ALL
    ON FUNCTION public.pay_order_from_wallet(uuid)
    FROM PUBLIC;

    GRANT EXECUTE
    ON FUNCTION public.pay_order_from_wallet(uuid)
    TO authenticated;

  END IF;


  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_wallet'
  ) THEN

    REVOKE ALL
    ON FUNCTION public.get_wallet(text)
    FROM PUBLIC;

    GRANT EXECUTE
    ON FUNCTION public.get_wallet(text)
    TO authenticated;

  END IF;

END;
$$;


-- ============================================================
-- FINISH
-- ============================================================

COMMIT;


-- ============================================================
-- SECURITY NOTES
--
-- 1. wallet_transactions immutable.
-- 2. direct wallet mutation blocked.
-- 3. direct payment_request mutation blocked.
-- 4. refund is server validated.
-- 5. refund uses row locks.
-- 6. refund uses immutable ledger.
-- 7. refund uses idempotency key.
-- 8. refund cannot exceed order total.
-- 9. refund cannot be processed twice.
-- 10. wallet cannot become negative.
-- ============================================================
