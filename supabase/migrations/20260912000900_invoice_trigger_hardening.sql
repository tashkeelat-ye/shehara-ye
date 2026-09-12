BEGIN;

-- ============================================================
-- SHEHARA / شهارة للتسوق
-- 20260912000900
--
-- FINAL INVOICE TRIGGER HARDENING
--
-- هذا الإصلاح مستقل عن واجهة المستخدم.
--
-- يضمن:
-- 1. إصدار فاتورة لكل طلب جديد.
-- 2. عدم إنشاء فاتورة مكررة.
-- 3. إصلاح الطلبات القديمة التي لا تملك فاتورة.
-- 4. مزامنة orders.invoice_number.
--
-- لا يغير منطق إنشاء الطلب أو الدفع أو المخزون.
-- ============================================================


-- ============================================================
-- 1. التأكد من وجود محرك إصدار الفواتير
-- ============================================================

DO $verify_invoice_function$
DECLARE
  _exists boolean;
BEGIN

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'issue_invoice_for_order'
      AND pg_get_function_identity_arguments(p.oid) = 'uuid'
  )
  INTO _exists;

  IF NOT _exists THEN
    RAISE EXCEPTION
      'الدالة public.issue_invoice_for_order(uuid) غير موجودة. يجب تطبيق نظام الفواتير الأساسي أولاً.';
  END IF;

END;
$verify_invoice_function$;


-- ============================================================
-- 2. إعادة إنشاء دالة إصدار الفاتورة من خلال Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.issue_invoice_after_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $invoice_trigger$
BEGIN

  PERFORM public.issue_invoice_for_order(
    NEW.id
  );

  RETURN NEW;

END;
$invoice_trigger$;


REVOKE ALL
ON FUNCTION public.issue_invoice_after_order_insert()
FROM PUBLIC;


-- ============================================================
-- 3. إزالة أي Triggers قديمة للفواتير
-- ============================================================

DROP TRIGGER IF EXISTS orders_invoice
ON public.orders;

DROP TRIGGER IF EXISTS orders_issue_invoice
ON public.orders;

DROP TRIGGER IF EXISTS orders_issue_invoice_deferred
ON public.orders;


-- ============================================================
-- 4. إنشاء Trigger نهائي لإصدار الفاتورة
-- ============================================================
--
-- يتم التنفيذ بعد INSERT على orders
-- ولكن بشكل DEFERRED عند نهاية Transaction.
--
-- هذا مهم لأن create_secure_order يقوم بإنشاء:
--
-- orders
--      ↓
-- order_items
--
-- ثم يتم إصدار الفاتورة بعد اكتمال العملية.
--
-- إذا كان create_checkout_order يقوم بإصدار الفاتورة
-- بالفعل، فإن issue_invoice_for_order سيكتشف الفاتورة
-- الموجودة ولن ينشئ نسخة ثانية.
-- ============================================================

CREATE CONSTRAINT TRIGGER
orders_issue_invoice_deferred
AFTER INSERT
ON public.orders
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION
public.issue_invoice_after_order_insert();


-- ============================================================
-- 5. إصلاح الطلبات الموجودة بدون فاتورة
-- ============================================================

DO $backfill_missing_invoices$
DECLARE
  _order_id uuid;
BEGIN

  FOR _order_id IN

    SELECT o.id
    FROM public.orders o
    LEFT JOIN public.invoices i
      ON i.order_id = o.id
    WHERE i.id IS NULL
    ORDER BY o.created_at ASC

  LOOP

    BEGIN

      PERFORM public.issue_invoice_for_order(
        _order_id
      );

    EXCEPTION
      WHEN OTHERS THEN

        RAISE WARNING
          'تعذر إصدار الفاتورة للطلب %: %',
          _order_id,
          SQLERRM;

    END;

  END LOOP;

END;
$backfill_missing_invoices$;


-- ============================================================
-- 6. مزامنة رقم الفاتورة داخل orders
-- ============================================================

UPDATE public.orders o
SET
  invoice_number = i.invoice_number,
  updated_at = now()
FROM public.invoices i
WHERE i.order_id = o.id
  AND o.invoice_number IS DISTINCT FROM
      i.invoice_number;


-- ============================================================
-- 7. إعادة تحميل PostgREST
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
