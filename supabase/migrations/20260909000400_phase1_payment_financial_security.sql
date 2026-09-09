-- ============================================================
-- SHEHARA / شهارة للتسوق
-- PHASE 1 - PAYMENT & FINANCIAL SECURITY
--
-- Migration:
-- 20260909000400_phase1_payment_financial_security.sql
--
-- الهدف:
-- 1. نقل دفع الطلبات من profiles.wallet_balance إلى wallets.
-- 2. جعل خصم المحفظة Atomic + Row Lock.
-- 3. منع التلاعب بالمبلغ أو العملة.
-- 4. جعل مراجعة Payment Requests محصورة بالإدارة.
-- 5. منع اعتماد نفس عملية الدفع مرتين.
-- 6. حماية معاملات المحافظ.
-- 7. حماية الفواتير.
-- 8. الحفاظ على التوافق مع البنية الحالية.
-- ============================================================

BEGIN;


-- ============================================================
-- 1. ضمان وجود نظام العملات في orders
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'YER';

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_currency_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_currency_check
CHECK (currency IN ('YER', 'SAR'));

CREATE INDEX IF NOT EXISTS orders_currency_idx
ON public.orders(currency);


-- ============================================================
-- 2. ضمان وجود currency في order_items
-- ============================================================

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'YER';

ALTER TABLE public.order_items
DROP CONSTRAINT IF EXISTS order_items_currency_check;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_currency_check
CHECK (currency IN ('YER', 'SAR'));

CREATE INDEX IF NOT EXISTS order_items_currency_idx
ON public.order_items(currency);


-- ============================================================
-- 3. ضمان وجود بنية المحافظ الحديثة
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  currency text NOT NULL,

  balance numeric(14,2) NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),

  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT wallets_currency_check
    CHECK (currency IN ('YER', 'SAR')),

  CONSTRAINT wallets_balance_non_negative
    CHECK (balance >= 0),

  CONSTRAINT wallets_user_currency_unique
    UNIQUE (user_id, currency)
);


-- ============================================================
-- 4. ضمان بنية wallet_transactions الحديثة
--
-- هذا الجزء متوافق حتى لو كانت قاعدة البيانات تحتوي
-- على نسخة قديمة من جدول wallet_transactions.
-- ============================================================

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS wallet_id uuid;

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS currency text;

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS transaction_type text;

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS balance_before numeric(14,2);

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS balance_after numeric(14,2);

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS reference_type text;

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS reference_id uuid;

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS created_by uuid;


-- ============================================================
-- 5. تحديث البيانات القديمة
-- ============================================================

UPDATE public.wallet_transactions
SET currency = COALESCE(currency, 'YER')
WHERE currency IS NULL;


UPDATE public.wallet_transactions
SET transaction_type =
  CASE
    WHEN amount < 0 THEN 'debit'
    ELSE 'credit'
  END
WHERE transaction_type IS NULL;


UPDATE public.wallet_transactions
SET description =
  CASE
    WHEN description IS NULL OR description = ''
      THEN COALESCE(kind, 'عملية محفظة')
    ELSE description
  END
WHERE description IS NULL
   OR description = '';


-- ============================================================
-- 6. إنشاء المحافظ المفقودة للمستخدمين
-- ============================================================

INSERT INTO public.wallets (
  user_id,
  currency,
  balance
)
SELECT
  p.id,
  currencies.currency,
  CASE
    WHEN currencies.currency = 'YER'
      THEN GREATEST(
        COALESCE(p.wallet_balance, 0),
        0
      )
    ELSE 0
  END
FROM public.profiles p
CROSS JOIN (
  VALUES
    ('YER'),
    ('SAR')
) AS currencies(currency)
ON CONFLICT (
  user_id,
  currency
)
DO NOTHING;


-- ============================================================
-- 7. مزامنة محافظ YER القديمة
--
-- لا نكتب فوق رصيد wallet الموجود.
-- profiles.wallet_balance أصبح Legacy فقط.
-- ============================================================

COMMENT ON COLUMN public.profiles.wallet_balance IS
'Legacy wallet balance. المصدر الرسمي للرصيد هو public.wallets. لا تستخدمه في العمليات المالية الجديدة.';


-- ============================================================
-- 8. دالة الحصول على محفظة المستخدم
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_wallet(
  requested_currency text
)
RETURNS TABLE (
  id uuid,
  currency text,
  balance numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF requested_currency NOT IN ('YER', 'SAR') THEN
    RAISE EXCEPTION 'العملة غير مدعومة';
  END IF;

  RETURN QUERY
  SELECT
    w.id,
    w.currency,
    w.balance,
    w.created_at,
    w.updated_at
  FROM public.wallets w
  WHERE w.user_id = auth.uid()
    AND w.currency = requested_currency;

END;
$$;


-- ============================================================
-- 9. دالة دفع الطلب من المحفظة
--
-- هذه هي أهم عملية مالية في هذه المرحلة.
--
-- الخصائص:
-- - تعتمد على auth.uid()
-- - لا تستقبل مبلغًا من العميل
-- - تقرأ total من orders
-- - تقرأ currency من orders
-- - تقفل الطلب
-- - تقفل المحفظة
-- - تمنع الخصم المكرر
-- - تسجل الحركة
-- - تحدث حالة الدفع
-- - تحدث حالة الطلب
-- ============================================================

CREATE OR REPLACE FUNCTION public.pay_order_from_wallet(
  _order_id uuid
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _user_id uuid;

  _order public.orders%ROWTYPE;

  _wallet public.wallets%ROWTYPE;

  _old_balance numeric(14,2);

  _amount numeric(14,2);

  _currency text;

BEGIN

  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;


  -- ==========================================================
  -- قفل الطلب لمنع تنفيذ العملية مرتين بالتوازي
  -- ==========================================================

  SELECT *
  INTO _order
  FROM public.orders
  WHERE id = _order_id
    AND user_id = _user_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود أو غير مملوك للمستخدم';
  END IF;


  -- ==========================================================
  -- إذا كان مدفوعًا بالفعل:
  -- لا نخصم مرة ثانية.
  -- ==========================================================

  IF _order.payment_status = 'paid' THEN
    RETURN _order;
  END IF;


  -- ==========================================================
  -- تحديد العملة من الخادم
  -- ==========================================================

  _currency :=
    COALESCE(
      NULLIF(
        _order.currency,
        ''
      ),
      'YER'
    );


  IF _currency NOT IN ('YER', 'SAR') THEN
    RAISE EXCEPTION 'عملة الطلب غير صالحة';
  END IF;


  -- ==========================================================
  -- المبلغ الرسمي من الطلب
  -- وليس من المتصفح
  -- ==========================================================

  _amount :=
    ROUND(
      COALESCE(
        _order.total,
        0
      ),
      2
    );


  IF _amount <= 0 THEN
    RAISE EXCEPTION 'قيمة الطلب غير صالحة';
  END IF;


  -- ==========================================================
  -- التأكد من وجود المحفظة
  -- ==========================================================

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
  ON CONFLICT (
    user_id,
    currency
  )
  DO NOTHING;


  -- ==========================================================
  -- قفل المحفظة
  -- ==========================================================

  SELECT *
  INTO _wallet
  FROM public.wallets
  WHERE user_id = _user_id
    AND currency = _currency
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'المحفظة غير موجودة';
  END IF;


  _old_balance :=
    _wallet.balance;


  -- ==========================================================
  -- التحقق من الرصيد
  -- ==========================================================

  IF _old_balance < _amount THEN
    RAISE EXCEPTION 'رصيد المحفظة غير كافٍ';
  END IF;


  -- ==========================================================
  -- منع الخصم المكرر
  --
  -- نتحقق من وجود حركة مرتبطة بالطلب.
  -- ==========================================================

  IF EXISTS (
    SELECT 1
    FROM public.wallet_transactions wt
    WHERE wt.reference_id = _order_id
      AND wt.reference_type = 'order_payment'
      AND wt.transaction_type = 'debit'
  ) THEN

    UPDATE public.orders
    SET
      payment_status = 'paid',
      status = 'confirmed',
      updated_at = now()
    WHERE id = _order_id
    RETURNING *
    INTO _order;

    RETURN _order;

  END IF;


  -- ==========================================================
  -- خصم الرصيد
  -- ==========================================================

  UPDATE public.wallets
  SET
    balance = balance - _amount,
    updated_at = now()
  WHERE id = _wallet.id
    AND balance >= _amount
  RETURNING *
  INTO _wallet;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'تعذر خصم الرصيد بسبب تغير الرصيد';
  END IF;


  -- ==========================================================
  -- تسجيل الحركة المالية
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
    _user_id,
    _currency,
    'debit',
    _amount,
    _old_balance,
    _wallet.balance,
    'دفع الطلب ' || _order.order_number,
    'order_payment',
    _order.id,
    _user_id
  );


  -- ==========================================================
  -- اعتماد الدفع والطلب
  --
  -- تأكيد الطلب هنا يؤدي إلى تشغيل آلية المخزون الموجودة.
  -- ==========================================================

  UPDATE public.orders
  SET
    payment_status = 'paid',
    status = 'confirmed',
    updated_at = now()
  WHERE id = _order.id
  RETURNING *
  INTO _order;


  RETURN _order;

END;
$$;


-- ============================================================
-- 10. حماية pay_order_from_wallet
-- ============================================================

REVOKE ALL
ON FUNCTION public.pay_order_from_wallet(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.pay_order_from_wallet(uuid)
TO authenticated;


-- ============================================================
-- 11. دالة الإدارة لمراجعة Payment Request
--
-- لا يستطيع العميل:
-- - اعتماد العملية
-- - رفض العملية
-- - تغيير المبلغ
-- - تغيير حالة الطلب
--
-- الإدارة فقط.
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

  _wallet public.wallets%ROWTYPE;

  _old_balance numeric(14,2);

BEGIN

  -- ==========================================================
  -- التحقق من المدير
  -- ==========================================================

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  -- ==========================================================
  -- قفل Payment Request
  -- ==========================================================

  SELECT *
  INTO _request
  FROM public.payment_requests
  WHERE id = _id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'طلب الدفع غير موجود';
  END IF;


  -- ==========================================================
  -- منع معالجة العملية مرتين
  -- ==========================================================

  IF _request.status <> 'pending' THEN
    RAISE EXCEPTION
      'طلب الدفع تمت معالجته مسبقاً';
  END IF;


  -- ==========================================================
  -- APPROVE
  -- ==========================================================

  IF _approve = true THEN


    -- ========================================================
    -- TOP UP
    -- ========================================================

    IF _request.purpose = 'topup' THEN

      -- العملة الافتراضية للإيداعات القديمة هي YER.
      INSERT INTO public.wallets (
        user_id,
        currency,
        balance
      )
      VALUES (
        _request.user_id,
        'YER',
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
        AND currency = 'YER'
      FOR UPDATE;


      IF NOT FOUND THEN
        RAISE EXCEPTION 'محفظة المستخدم غير موجودة';
      END IF;


      _old_balance :=
        _wallet.balance;


      IF _request.amount <= 0 THEN
        RAISE EXCEPTION 'مبلغ الشحن غير صالح';
      END IF;


      UPDATE public.wallets
      SET
        balance =
          balance + _request.amount,
        updated_at = now()
      WHERE id = _wallet.id
      RETURNING *
      INTO _wallet;


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
        'YER',
        'credit',
        _request.amount,
        _old_balance,
        _wallet.balance,
        'شحن محفظة عبر ' ||
          _request.method_code,
        'payment_request',
        _request.id,
        auth.uid()
      );


    -- ========================================================
    -- ORDER PAYMENT
    -- ========================================================

    ELSIF _request.purpose = 'order' THEN

      IF _request.order_id IS NULL THEN
        RAISE EXCEPTION
          'طلب الدفع لا يحتوي على طلب مرتبط';
      END IF;


      -- قفل الطلب
      SELECT *
      INTO _order
      FROM public.orders
      WHERE id = _request.order_id
      FOR UPDATE;


      IF NOT FOUND THEN
        RAISE EXCEPTION
          'الطلب المرتبط غير موجود';
      END IF;


      -- ======================================================
      -- المبلغ الموجود في Payment Request
      -- يجب أن يساوي إجمالي الطلب المحسوب خادميًا.
      -- ======================================================

      IF ROUND(_request.amount, 2)
         <> ROUND(_order.total, 2)
      THEN
        RAISE EXCEPTION
          'مبلغ الدفع لا يطابق إجمالي الطلب';
      END IF;


      -- ======================================================
      -- اعتماد الدفع
      -- ======================================================

      UPDATE public.orders
      SET
        payment_status = 'paid',
        status = 'confirmed',
        updated_at = now()
      WHERE id = _order.id;


    ELSE

      RAISE EXCEPTION
        'نوع Payment Request غير مدعوم';

    END IF;


    -- ========================================================
    -- تحديث Payment Request
    -- ========================================================

    UPDATE public.payment_requests
    SET
      status = 'approved',
      admin_note = COALESCE(_note, ''),
      reviewed_at = now(),
      updated_at = now()
    WHERE id = _request.id
    RETURNING *
    INTO _request;


  -- ==========================================================
  -- REJECT
  -- ==========================================================

  ELSE

    IF _request.purpose = 'order'
       AND _request.order_id IS NOT NULL
    THEN

      UPDATE public.orders
      SET
        payment_status = 'rejected',
        updated_at = now()
      WHERE id = _request.order_id
        AND payment_status <> 'paid';

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

  END IF;


  RETURN _request;

END;
$$;


-- ============================================================
-- 12. حماية review_payment_request
-- ============================================================

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
-- 13. حماية Payment Requests
-- ============================================================

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


-- لا INSERT مباشر
DROP POLICY IF EXISTS payment_requests_own_insert
ON public.payment_requests;

DROP POLICY IF EXISTS payment_requests_customer_insert
ON public.payment_requests;


-- لا UPDATE مباشر
DROP POLICY IF EXISTS payment_requests_own_update
ON public.payment_requests;

DROP POLICY IF EXISTS payment_requests_customer_update
ON public.payment_requests;


-- لا DELETE مباشر
DROP POLICY IF EXISTS payment_requests_own_delete
ON public.payment_requests;

DROP POLICY IF EXISTS payment_requests_customer_delete
ON public.payment_requests;


REVOKE INSERT, UPDATE, DELETE
ON public.payment_requests
FROM authenticated;

GRANT SELECT
ON public.payment_requests
TO authenticated;


-- ============================================================
-- 14. حماية المحافظ
-- ============================================================

ALTER TABLE public.wallets
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS wallets_own_read
ON public.wallets;

CREATE POLICY wallets_own_read
ON public.wallets
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


REVOKE INSERT, UPDATE, DELETE
ON public.wallets
FROM authenticated;

GRANT SELECT
ON public.wallets
TO authenticated;


-- ============================================================
-- 15. حماية معاملات المحافظ
-- ============================================================

ALTER TABLE public.wallet_transactions
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS wallet_transactions_own_read
ON public.wallet_transactions;

CREATE POLICY wallet_transactions_own_read
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


REVOKE INSERT, UPDATE, DELETE
ON public.wallet_transactions
FROM authenticated;

GRANT SELECT
ON public.wallet_transactions
TO authenticated;


-- ============================================================
-- 16. منع العميل من تعديل الفواتير
-- ============================================================

ALTER TABLE public.invoices
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS invoices_read
ON public.invoices;

CREATE POLICY invoices_read
ON public.invoices
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = invoices.order_id
      AND o.user_id = auth.uid()
  )
);


REVOKE INSERT, UPDATE, DELETE
ON public.invoices
FROM authenticated;

GRANT SELECT
ON public.invoices
TO authenticated;


-- ============================================================
-- 17. حماية أرقام الفواتير
-- ============================================================

REVOKE USAGE
ON SEQUENCE public.invoice_number_seq
FROM authenticated;


-- ============================================================
-- 18. حماية دوال الإدارة المالية
-- ============================================================

REVOKE ALL
ON FUNCTION public.admin_credit_wallet(
  uuid,
  text,
  numeric,
  text
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_credit_wallet(
  uuid,
  text,
  numeric,
  text
)
TO authenticated;


REVOKE ALL
ON FUNCTION public.admin_debit_wallet(
  uuid,
  text,
  numeric,
  text
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_debit_wallet(
  uuid,
  text,
  numeric,
  text
)
TO authenticated;


-- ============================================================
-- 19. حماية create_user_wallets
-- ============================================================

REVOKE ALL
ON FUNCTION public.create_user_wallets(uuid)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.create_user_wallets(uuid)
FROM authenticated;

GRANT EXECUTE
ON FUNCTION public.create_user_wallets(uuid)
TO service_role;


-- ============================================================
-- 20. منع تنفيذ الدوال المالية كـ PUBLIC
-- ============================================================

REVOKE ALL
ON FUNCTION public.get_wallet(text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_wallet(text)
TO authenticated;


-- ============================================================
-- 21. فهارس إضافية لمنع العمليات المكررة
-- ============================================================

CREATE INDEX IF NOT EXISTS
wallet_transactions_order_payment_idx
ON public.wallet_transactions(
  reference_id,
  reference_type,
  transaction_type
);


CREATE INDEX IF NOT EXISTS
payment_requests_order_idx
ON public.payment_requests(order_id);


CREATE INDEX IF NOT EXISTS
payment_requests_status_idx
ON public.payment_requests(status);


-- ============================================================
-- 22. تحديث updated_at للمحافظ
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_wallet_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  NEW.updated_at = now();

  RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS wallets_updated_at
ON public.wallets;


CREATE TRIGGER wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_wallet_updated_at();


-- ============================================================
-- 23. حماية payment_methods
-- ============================================================

REVOKE INSERT, UPDATE, DELETE
ON public.payment_methods
FROM authenticated;

GRANT SELECT
ON public.payment_methods
TO authenticated;


-- ============================================================
-- 24. إنهاء Migration
-- ============================================================

COMMIT;
