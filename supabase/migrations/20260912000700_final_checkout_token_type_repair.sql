BEGIN;

-- ============================================================
-- SHEHARA / شهارة للتسوق
-- 20260912000700
--
-- FINAL CHECKOUT TOKEN TYPE REPAIR
--
-- السبب:
-- orders.checkout_token قد يكون موجوداً في قاعدة البيانات
-- من نسخة قديمة بنوع UUID بينما وظائف Checkout الحالية
-- تستخدم TEXT.
--
-- الخطأ الناتج:
-- operator does not exist: uuid = text
--
-- الحل:
-- توحيد checkout_token إلى TEXT بشكل نهائي.
-- ============================================================


-- ============================================================
-- 1. التأكد من وجود checkout_token
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS checkout_token text;


-- ============================================================
-- 2. تحويل checkout_token إلى TEXT
--
-- إذا كان العمود UUID:
--   يتم تحويل UUID إلى نص.
--
-- إذا كان بالفعل TEXT:
--   لن تكون هناك مشكلة في التصميم النهائي.
-- ============================================================

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


-- ============================================================
-- 3. إعادة إنشاء Unique Index
-- ============================================================

DROP INDEX IF EXISTS
public.orders_checkout_token_unique_idx;


CREATE UNIQUE INDEX
IF NOT EXISTS orders_checkout_token_unique_idx
ON public.orders(checkout_token)
WHERE checkout_token IS NOT NULL;


-- ============================================================
-- 4. التأكد من أن create_secure_order تستخدم TEXT
-- ============================================================
--
-- لا نعيد بناء منطق الدالة هنا.
-- فقط نتأكد من وجود النسخة الصحيحة ذات checkout_token TEXT.
--
-- إذا كانت الدالة غير موجودة لأي سبب، فهذا يعني أن migration
-- 006 لم تُطبق، وعندها يجب تطبيق migration 006 أولاً.
-- ============================================================

DO $verify_secure_checkout$
DECLARE
  _function_exists boolean;
BEGIN

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_secure_order'
      AND pg_get_function_identity_arguments(p.oid)
        =
        'text, text, text, text, text, text, text, text, numeric, numeric, numeric, jsonb'
  )
  INTO _function_exists;


  IF NOT _function_exists THEN

    RAISE EXCEPTION
      'الدالة create_secure_order(text,...) غير موجودة. يجب تطبيق migration 20260912000600_restore_secure_checkout_functions.sql أولاً.';

  END IF;

END;
$verify_secure_checkout$;


-- ============================================================
-- 5. التأكد من create_checkout_order الصحيحة
-- ============================================================

DO $verify_checkout$
DECLARE
  _function_exists boolean;
BEGIN

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_checkout_order'
      AND pg_get_function_identity_arguments(p.oid)
        =
        'text, jsonb, numeric, numeric, numeric, text, text, public.order_status, text, text, text, text, text, text, text, numeric, numeric, boolean, text, text, text, text'
  )
  INTO _function_exists;


  IF NOT _function_exists THEN

    RAISE EXCEPTION
      'الدالة create_checkout_order(text,...) غير موجودة.';

  END IF;

END;
$verify_checkout$;


-- ============================================================
-- 6. حذف أي overload قديم يستقبل UUID
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
-- 7. الصلاحيات
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
-- 8. إعادة تحميل PostgREST
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
