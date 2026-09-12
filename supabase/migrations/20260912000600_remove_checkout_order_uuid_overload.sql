BEGIN;

-- ============================================================
-- SHEHARA / شهارة للتسوق
-- 20260912000600
--
-- FIX:
-- إزالة النسخة المكررة من create_checkout_order()
-- التي تستقبل _checkout_token من النوع uuid.
--
-- السبب:
-- وجود نسختين:
--   create_checkout_order(text, ...)
--   create_checkout_order(uuid, ...)
--
-- يجعل PostgREST غير قادر على اختيار الدالة الصحيحة
-- عندما يكون checkout token عبارة عن UUID صالح.
--
-- النسخة الصحيحة للنظام هي:
--   create_checkout_order(text, ...)
-- ============================================================


-- ============================================================
-- 1. حذف overload الخاطئ الذي يبدأ بـ uuid
-- ============================================================

DROP FUNCTION IF EXISTS public.create_checkout_order(
  uuid,
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
);


-- ============================================================
-- 2. التأكد من أن النسخة الصحيحة قابلة للاستدعاء
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


-- ============================================================
-- 3. حماية النسخة الصحيحة
-- ============================================================

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


-- ============================================================
-- 4. إعادة تحميل PostgREST Schema Cache
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
