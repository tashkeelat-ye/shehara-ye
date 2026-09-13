BEGIN;

-- ============================================================
-- SHEHARA
-- CUSTOMER INVOICE ACCESS
--
-- يسمح للعميل بقراءة فاتورة طلبه فقط.
--
-- لا يسمح:
-- - بإنشاء فاتورة
-- - بتعديل فاتورة
-- - بحذف فاتورة
-- - بقراءة فواتير مستخدمين آخرين
-- ============================================================


-- ------------------------------------------------------------
-- 1. تفعيل RLS
-- ------------------------------------------------------------

ALTER TABLE public.invoices
ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 2. إزالة سياسة العميل القديمة إن وجدت
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
  "Customers can view their own invoices"
ON public.invoices;

DROP POLICY IF EXISTS
  "Users can view their own invoices"
ON public.invoices;

DROP POLICY IF EXISTS
  "invoice_select_own"
ON public.invoices;


-- ------------------------------------------------------------
-- 3. سياسة القراءة للعميل
--
-- الفاتورة مسموح قراءتها فقط إذا كان الطلب المرتبط بها
-- يخص المستخدم الحالي.
-- ------------------------------------------------------------

CREATE POLICY
  "Customers can view their own invoices"

ON public.invoices

FOR SELECT

TO authenticated

USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = invoices.order_id
      AND o.user_id = auth.uid()
  )
);


-- ------------------------------------------------------------
-- 4. لا نعطي العميل صلاحيات كتابة
-- ------------------------------------------------------------

REVOKE INSERT
ON public.invoices
FROM authenticated;

REVOKE UPDATE
ON public.invoices
FROM authenticated;

REVOKE DELETE
ON public.invoices
FROM authenticated;


-- ------------------------------------------------------------
-- 5. تحديث PostgREST
-- ------------------------------------------------------------

NOTIFY pgrst, 'reload schema';


COMMIT;
