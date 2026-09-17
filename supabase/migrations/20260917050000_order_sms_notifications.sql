BEGIN;

-- ============================================================
-- شهارة للتسوق
-- نظام إشعارات SMS للطلبات
--
-- لا يتم إرسال SMS من React.
-- قاعدة البيانات تطلق INSERT/UPDATE Webhook على orders.
--
-- الحالات الفعلية الحالية:
--
-- pending
-- confirmed
-- processing
-- shipped       = جاري التوصيل / مع المندوب
-- delivered
-- cancelled
-- awaiting_payment
--
-- ============================================================


-- ------------------------------------------------------------
-- 1. التأكد من وجود pg_net
--
-- Supabase Database Webhooks تعتمد عليه.
-- ------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_net
WITH SCHEMA extensions;


-- ------------------------------------------------------------
-- 2. التأكد من أن orders تدخل Realtime
-- ------------------------------------------------------------

DO $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname =
      'supabase_realtime'
  ) THEN

    BEGIN

      ALTER PUBLICATION
        supabase_realtime
      ADD TABLE public.orders;

    EXCEPTION
      WHEN duplicate_object THEN
        NULL;

    END;

  END IF;

END
$$;


-- ------------------------------------------------------------
-- 3. تعليق توضيحي مهم
--
-- لا نضع مفتاح SMS هنا.
--
-- إعداد Webhook يتم من:
--
-- Supabase Dashboard
-- → Database
-- → Webhooks
--
-- ويتم ربط:
--
-- public.orders
-- INSERT + UPDATE
-- →
-- send-order-sms
--
-- ------------------------------------------------------------


NOTIFY pgrst, 'reload schema';

COMMIT;
