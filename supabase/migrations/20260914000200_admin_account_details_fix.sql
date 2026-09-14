BEGIN;

-- ============================================================
-- SHEHARA PHASE 2
-- ADMIN ACCOUNT DETAILS FINAL FIX
-- ============================================================


-- ============================================================
-- 1. ضمان وجود أعمدة سجل المحفظة
-- ============================================================

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS balance_before numeric(12,2),
  ADD COLUMN IF NOT EXISTS balance_after numeric(12,2),
  ADD COLUMN IF NOT EXISTS transaction_type text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS created_by uuid
    REFERENCES auth.users(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz
    NOT NULL DEFAULT now();


-- ============================================================
-- 2. معالجة السجلات القديمة التي لا تحتوي على الرصيد
-- ============================================================

UPDATE public.wallet_transactions wt
SET
  balance_before = COALESCE(wt.balance_before, 0),
  balance_after = COALESCE(wt.balance_after, 0)
WHERE
  wt.balance_before IS NULL
  OR wt.balance_after IS NULL;


ALTER TABLE public.wallet_transactions
  ALTER COLUMN balance_before SET DEFAULT 0,
  ALTER COLUMN balance_after SET DEFAULT 0;


ALTER TABLE public.wallet_transactions
  ALTER COLUMN balance_before SET NOT NULL,
  ALTER COLUMN balance_after SET NOT NULL;


-- ============================================================
-- 3. ضمان RLS
-- ============================================================

ALTER TABLE public.wallet_transactions
ENABLE ROW LEVEL SECURITY;


GRANT SELECT
ON public.wallet_transactions
TO authenticated;


GRANT ALL
ON public.wallet_transactions
TO service_role;


-- ============================================================
-- 4. دالة الإدارة لجلب تفاصيل الحساب
-- ============================================================
-- ملاحظة:
-- لا نفترض أسماء أعمدة إضافية في addresses.
-- نعيد الصف كاملًا بواسطة to_jsonb حتى لا يحدث
-- فشل بسبب اختلاف بنية جدول العناوين.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_get_user_account_details(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
  _addresses jsonb;
  _transactions jsonb;
BEGIN

  -- ----------------------------------------------------------
  -- التحقق من المدير
  -- ----------------------------------------------------------

  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'admin'
     )
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  -- ----------------------------------------------------------
  -- التحقق من معرف المستخدم
  -- ----------------------------------------------------------

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'معرّف المستخدم مطلوب';
  END IF;


  -- ----------------------------------------------------------
  -- التحقق من وجود المستخدم
  -- ----------------------------------------------------------

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
  ) THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;


  -- ----------------------------------------------------------
  -- عناوين المستخدم
  -- ----------------------------------------------------------
  -- استخدام to_jsonb(a) يجعل الدالة متوافقة مع البنية
  -- الحالية لجدول addresses.
  -- ----------------------------------------------------------

  SELECT
    COALESCE(
      jsonb_agg(
        to_jsonb(a)
      ),
      '[]'::jsonb
    )
  INTO _addresses
  FROM public.addresses a
  WHERE a.user_id = p_user_id;


  -- ----------------------------------------------------------
  -- معاملات المحفظة
  -- ----------------------------------------------------------

  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',
          wt.id,

          'amount',
          COALESCE(
            wt.amount,
            0
          ),

          'balance_before',
          COALESCE(
            wt.balance_before,
            0
          ),

          'balance_after',
          COALESCE(
            wt.balance_after,
            0
          ),

          'transaction_type',
          COALESCE(
            wt.transaction_type,
            ''
          ),

          'reason',
          COALESCE(
            wt.reason,
            ''
          ),

          'created_at',
          wt.created_at
        )
        ORDER BY
          wt.created_at DESC
      ),
      '[]'::jsonb
    )
  INTO _transactions
  FROM public.wallet_transactions wt
  WHERE wt.user_id = p_user_id;


  -- ----------------------------------------------------------
  -- النتيجة النهائية
  -- ----------------------------------------------------------

  _result :=
    jsonb_build_object(
      'addresses',
      COALESCE(
        _addresses,
        '[]'::jsonb
      ),

      'transactions',
      COALESCE(
        _transactions,
        '[]'::jsonb
      )
    );


  RETURN _result;

END;
$$;


-- ============================================================
-- 5. صلاحيات الدالة
-- ============================================================

REVOKE ALL
ON FUNCTION public.admin_get_user_account_details(uuid)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_get_user_account_details(uuid)
TO authenticated;


-- ============================================================
-- 6. إعادة إنشاء صلاحية قراءة المحفظة للإدارة
-- ============================================================

DROP POLICY IF EXISTS
wallet_transactions_admin_read
ON public.wallet_transactions;


CREATE POLICY
wallet_transactions_admin_read

ON public.wallet_transactions

FOR SELECT

TO authenticated

USING (
  public.has_role(
    auth.uid(),
    'admin'
  )
);


-- ============================================================
-- 7. تحديث PostgREST
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
