BEGIN;

-- ============================================================
-- SHEHARA / شهارة للتسوق
-- INVOICE TRIGGER HARDENING
--
-- هذا الملف لا ينشئ محرك الفواتير.
-- مهمته فقط إزالة أي Trigger قديم متعارض.
--
-- إنشاء issue_invoice_for_order + Trigger النهائي يتم في
-- migration 20260912001000_restore_invoice_engine.sql
-- ============================================================

DROP TRIGGER IF EXISTS orders_invoice
ON public.orders;

DROP TRIGGER IF EXISTS orders_issue_invoice
ON public.orders;

DROP TRIGGER IF EXISTS orders_issue_invoice_deferred
ON public.orders;

NOTIFY pgrst, 'reload schema';

COMMIT;
