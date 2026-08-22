-- ============================================================
-- تشكيلات للتسوق
-- المرحلة الرابعة: نظام المحافظ والعملات المتعددة
-- YER = الريال اليمني
-- SAR = الريال السعودي
-- ============================================================

BEGIN;

-- ============================================================
-- 1. العملات
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

COMMENT ON TABLE public.wallets IS
'محافظ المستخدمين متعددة العملات في متجر تشكيلات';

COMMENT ON COLUMN public.wallets.currency IS
'YER = الريال اليمني، SAR = الريال السعودي';

COMMENT ON COLUMN public.wallets.balance IS
'الرصيد الحالي للمحفظة';

-- ============================================================
-- 2. معاملات المحافظ
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  wallet_id uuid NOT NULL
    REFERENCES public.wallets(id)
    ON DELETE CASCADE,

  user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  currency text NOT NULL,

  transaction_type text NOT NULL,

  amount numeric(14,2) NOT NULL,

  balance_before numeric(14,2) NOT NULL,

  balance_after numeric(14,2) NOT NULL,

  description text NOT NULL DEFAULT '',

  reference_type text,

  reference_id uuid,

  created_by uuid
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT wallet_transactions_currency_check
    CHECK (currency IN ('YER', 'SAR')),

  CONSTRAINT wallet_transactions_type_check
    CHECK (
      transaction_type IN (
        'credit',
        'debit',
        'refund',
        'adjustment'
      )
    ),

  CONSTRAINT wallet_transactions_amount_positive
    CHECK (amount > 0),

  CONSTRAINT wallet_transactions_balance_before_valid
    CHECK (balance_before >= 0),

  CONSTRAINT wallet_transactions_balance_after_valid
    CHECK (balance_after >= 0)
);

COMMENT ON TABLE public.wallet_transactions IS
'كشف حساب جميع عمليات محافظ تشكيلات';

-- ============================================================
-- 3. الفهارس
-- ============================================================

CREATE INDEX IF NOT EXISTS wallets_user_idx
ON public.wallets(user_id);

CREATE INDEX IF NOT EXISTS wallets_currency_idx
ON public.wallets(currency);

CREATE INDEX IF NOT EXISTS wallet_transactions_user_idx
ON public.wallet_transactions(user_id);

CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_idx
ON public.wallet_transactions(wallet_id);

CREATE INDEX IF NOT EXISTS wallet_transactions_created_at_idx
ON public.wallet_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS wallet_transactions_reference_idx
ON public.wallet_transactions(reference_id);

-- ============================================================
-- 4. تحديث updated_at
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
-- 5. إنشاء محافظ المستخدم تلقائيًا
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_user_wallets(
  target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  INSERT INTO public.wallets (
    user_id,
    currency,
    balance
  )
  VALUES
    (
      target_user_id,
      'YER',
      0
    ),
    (
      target_user_id,
      'SAR',
      0
    )
  ON CONFLICT (
    user_id,
    currency
  )
  DO NOTHING;

END;
$$;

-- ============================================================
-- 6. ترحيل الرصيد القديم
--
-- profiles.wallet_balance كان نظام المحفظة القديم.
-- سيتم نقله إلى محفظة YER فقط.
-- ============================================================

INSERT INTO public.wallets (
  user_id,
  currency,
  balance
)
SELECT
  p.id,
  'YER',
  GREATEST(
    COALESCE(p.wallet_balance, 0),
    0
  )
FROM public.profiles p
ON CONFLICT (
  user_id,
  currency
)
DO UPDATE SET
  balance = GREATEST(
    public.wallets.balance,
    EXCLUDED.balance
  ),
  updated_at = now();

-- إنشاء محافظ SAR للمستخدمين الحاليين
INSERT INTO public.wallets (
  user_id,
  currency,
  balance
)
SELECT
  p.id,
  'SAR',
  0
FROM public.profiles p
ON CONFLICT (
  user_id,
  currency
)
DO NOTHING;

-- ============================================================
-- 7. تسجيل عملية ترحيل الأرصدة القديمة
-- ============================================================

INSERT INTO public.wallet_transactions (
  wallet_id,
  user_id,
  currency,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  description
)
SELECT
  w.id,
  w.user_id,
  'YER',
  'adjustment',
  w.balance,
  0,
  w.balance,
  'ترحيل الرصيد من نظام المحفظة القديم'
FROM public.wallets w
JOIN public.profiles p
  ON p.id = w.user_id
WHERE
  w.currency = 'YER'
  AND COALESCE(p.wallet_balance, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.wallet_transactions wt
    WHERE wt.wallet_id = w.id
      AND wt.description =
        'ترحيل الرصيد من نظام المحفظة القديم'
  );

-- ============================================================
-- 8. إنشاء محافظ المستخدم الجديد تلقائيًا
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_wallets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  PERFORM public.create_user_wallets(
    NEW.id
  );

  RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_wallets_created
ON auth.users;

CREATE TRIGGER on_auth_user_wallets_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_wallets();

-- ============================================================
-- 9. دالة الحصول على المحفظة
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
  WHERE
    w.user_id = auth.uid()
    AND w.currency = requested_currency;

END;
$$;

-- ============================================================
-- 10. دالة الحصول على جميع محافظ المستخدم
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_wallets()
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

  RETURN QUERY
  SELECT
    w.id,
    w.currency,
    w.balance,
    w.created_at,
    w.updated_at
  FROM public.wallets w
  WHERE w.user_id = auth.uid()
  ORDER BY
    CASE
      WHEN w.currency = 'YER' THEN 1
      WHEN w.currency = 'SAR' THEN 2
      ELSE 3
    END;

END;
$$;

-- ============================================================
-- 11. كشف حساب المستخدم
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_wallet_transactions(
  requested_currency text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  currency text,
  transaction_type text,
  amount numeric,
  balance_before numeric,
  balance_after numeric,
  description text,
  reference_type text,
  reference_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF requested_currency IS NOT NULL
     AND requested_currency NOT IN ('YER', 'SAR')
  THEN
    RAISE EXCEPTION 'العملة غير مدعومة';
  END IF;

  RETURN QUERY
  SELECT
    wt.id,
    wt.currency,
    wt.transaction_type,
    wt.amount,
    wt.balance_before,
    wt.balance_after,
    wt.description,
    wt.reference_type,
    wt.reference_id,
    wt.created_at
  FROM public.wallet_transactions wt
  WHERE
    wt.user_id = auth.uid()
    AND (
      requested_currency IS NULL
      OR wt.currency = requested_currency
    )
  ORDER BY wt.created_at DESC;

END;
$$;

-- ============================================================
-- 12. دالة الإدارة لإضافة رصيد
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_credit_wallet(
  target_user_id uuid,
  target_currency text,
  credit_amount numeric,
  transaction_description text DEFAULT 'إضافة رصيد من الإدارة'
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  target_wallet public.wallets%ROWTYPE;

  old_balance numeric;

BEGIN

  -- التحقق من تسجيل الدخول
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  -- التحقق من الصلاحية
  IF NOT public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
  THEN
    RAISE EXCEPTION 'ليس لديك صلاحية إدارة المحافظ';
  END IF;

  -- التحقق من العملة
  IF target_currency NOT IN ('YER', 'SAR') THEN
    RAISE EXCEPTION 'العملة غير مدعومة';
  END IF;

  -- التحقق من المبلغ
  IF credit_amount <= 0 THEN
    RAISE EXCEPTION 'قيمة الإضافة يجب أن تكون أكبر من صفر';
  END IF;

  -- التأكد من وجود المحافظ
  PERFORM public.create_user_wallets(
    target_user_id
  );

  -- قفل المحفظة أثناء العملية
  SELECT *
  INTO target_wallet
  FROM public.wallets
  WHERE
    user_id = target_user_id
    AND currency = target_currency
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المحفظة غير موجودة';
  END IF;

  old_balance :=
    target_wallet.balance;

  UPDATE public.wallets
  SET
    balance =
      target_wallet.balance
      + credit_amount,
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
    'credit',
    credit_amount,
    old_balance,
    target_wallet.balance,
    transaction_description,
    'admin_adjustment',
    auth.uid()
  );

  RETURN target_wallet;

END;
$$;

-- ============================================================
-- 13. دالة الإدارة لخصم رصيد
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_debit_wallet(
  target_user_id uuid,
  target_currency text,
  debit_amount numeric,
  transaction_description text DEFAULT 'خصم رصيد من الإدارة'
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  target_wallet public.wallets%ROWTYPE;

  old_balance numeric;

BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF NOT public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
  THEN
    RAISE EXCEPTION 'ليس لديك صلاحية إدارة المحافظ';
  END IF;

  IF target_currency NOT IN ('YER', 'SAR') THEN
    RAISE EXCEPTION 'العملة غير مدعومة';
  END IF;

  IF debit_amount <= 0 THEN
    RAISE EXCEPTION 'قيمة الخصم يجب أن تكون أكبر من صفر';
  END IF;

  PERFORM public.create_user_wallets(
    target_user_id
  );

  SELECT *
  INTO target_wallet
  FROM public.wallets
  WHERE
    user_id = target_user_id
    AND currency = target_currency
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المحفظة غير موجودة';
  END IF;

  old_balance :=
    target_wallet.balance;

  IF old_balance < debit_amount THEN
    RAISE EXCEPTION 'الرصيد غير كافٍ';
  END IF;

  UPDATE public.wallets
  SET
    balance =
      target_wallet.balance
      - debit_amount,
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
    'debit',
    debit_amount,
    old_balance,
    target_wallet.balance,
    transaction_description,
    'admin_adjustment',
    auth.uid()
  );

  RETURN target_wallet;

END;
$$;

-- ============================================================
-- 14. RLS
-- ============================================================

ALTER TABLE public.wallets
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallet_transactions
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallets_own_read"
ON public.wallets;

CREATE POLICY "wallets_own_read"
ON public.wallets
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "wallet_transactions_own_read"
ON public.wallet_transactions;

CREATE POLICY "wallet_transactions_own_read"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- لا نسمح للمستخدم بإضافة أو تعديل أو حذف
-- أرصدته مباشرة من خلال الجداول.

DROP POLICY IF EXISTS "wallets_no_direct_insert"
ON public.wallets;

DROP POLICY IF EXISTS "wallets_no_direct_update"
ON public.wallets;

DROP POLICY IF EXISTS "wallets_no_direct_delete"
ON public.wallets;

DROP POLICY IF EXISTS "wallet_transactions_no_direct_insert"
ON public.wallet_transactions;

DROP POLICY IF EXISTS "wallet_transactions_no_direct_update"
ON public.wallet_transactions;

DROP POLICY IF EXISTS "wallet_transactions_no_direct_delete"
ON public.wallet_transactions;

-- ============================================================
-- 15. الصلاحيات
-- ============================================================

GRANT SELECT
ON public.wallets
TO authenticated;

GRANT SELECT
ON public.wallet_transactions
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.get_wallet(text)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.get_my_wallets()
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.get_my_wallet_transactions(text)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_credit_wallet(
  uuid,
  text,
  numeric,
  text
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_debit_wallet(
  uuid,
  text,
  numeric,
  text
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.create_user_wallets(uuid)
TO service_role;

-- ============================================================
-- 16. إضافة العملة إلى الطلبات
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS currency text
NOT NULL DEFAULT 'YER';

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_currency_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_currency_check
CHECK (
  currency IN ('YER', 'SAR')
);

CREATE INDEX IF NOT EXISTS orders_currency_idx
ON public.orders(currency);

COMMENT ON COLUMN public.orders.currency IS
'العملة التي تم إنشاء الطلب بها';

-- ============================================================
-- 17. إضافة العملة إلى عناصر الطلب
-- ============================================================

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS currency text
NOT NULL DEFAULT 'YER';

ALTER TABLE public.order_items
DROP CONSTRAINT IF EXISTS order_items_currency_check;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_currency_check
CHECK (
  currency IN ('YER', 'SAR')
);

CREATE INDEX IF NOT EXISTS order_items_currency_idx
ON public.order_items(currency);

COMMENT ON COLUMN public.order_items.currency IS
'عملة سعر المنتج وقت إنشاء الطلب';

-- ============================================================
-- 18. دالة التحقق من ملكية الطلب
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_owns_order(
  target_order_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE
      id = target_order_id
      AND user_id = auth.uid()
  );
$$;

-- ============================================================
-- 19. تحديث بيانات الطلبات القديمة
-- ============================================================

UPDATE public.orders
SET currency = 'YER'
WHERE currency IS NULL;

UPDATE public.order_items
SET currency = 'YER'
WHERE currency IS NULL;

-- ============================================================
-- 20. ضمان محافظ المستخدمين الموجودين
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
-- 21. حماية الرصيد القديم
--
-- لا نحذفه في هذه المرحلة حتى نتأكد أن التطبيق الجديد
-- يعمل بالكامل على wallets.
-- ============================================================

COMMENT ON COLUMN public.profiles.wallet_balance IS
'حقل قديم للتوافق مع النسخ السابقة. مصدر الرصيد الجديد هو public.wallets. لا تستخدمه للعمليات الجديدة.';

COMMIT;
