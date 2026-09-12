BEGIN;

-- ============================================================
-- SHEHARA / شهارة للتسوق
-- PRODUCTION INVOICE ISSUANCE
--
-- الهدف:
-- 1. ضمان وجود جدول invoices.
-- 2. إنشاء رقم فاتورة حقيقي وفريد.
-- 3. إصدار فاتورة تلقائياً عند إنشاء الطلب.
-- 4. حفظ Snapshot غير قابل للتأثر بتغييرات الطلب اللاحقة.
-- 5. ربط invoice بالorder بعلاقة 1:1.
-- 6. مزامنة orders.invoice_number.
-- 7. حماية الفواتير بواسطة RLS.
-- 8. إصدار الفواتير المفقودة للطلبات القديمة.
-- ============================================================


-- ============================================================
-- 1. تسلسل أرقام الفواتير
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq
START WITH 1
INCREMENT BY 1;


-- ============================================================
-- 2. التأكد من وجود invoice_number داخل orders
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS invoice_number text;


CREATE UNIQUE INDEX IF NOT EXISTS
orders_invoice_number_unique_idx
ON public.orders(invoice_number)
WHERE invoice_number IS NOT NULL;


-- ============================================================
-- 3. إنشاء جدول invoices إذا لم يكن موجوداً
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id uuid NOT NULL UNIQUE
    REFERENCES public.orders(id)
    ON DELETE CASCADE,

  invoice_number text NOT NULL UNIQUE,

  issued_at timestamptz NOT NULL DEFAULT now(),

  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
);


-- ============================================================
-- 4. في حالة أن الجدول موجود مسبقاً ولكن بعض الأعمدة ناقصة
-- ============================================================

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS id uuid;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS order_id uuid;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS invoice_number text;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS issued_at timestamptz;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS snapshot jsonb;


ALTER TABLE public.invoices
ALTER COLUMN issued_at
SET DEFAULT now();


ALTER TABLE public.invoices
ALTER COLUMN snapshot
SET DEFAULT '{}'::jsonb;


-- ============================================================
-- 5. ضمان العلاقة الفريدة بين الطلب والفاتورة
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
invoices_order_id_unique_idx
ON public.invoices(order_id);


CREATE UNIQUE INDEX IF NOT EXISTS
invoices_invoice_number_unique_idx
ON public.invoices(invoice_number);


CREATE INDEX IF NOT EXISTS
invoices_issued_at_idx
ON public.invoices(issued_at DESC);


-- ============================================================
-- 6. إضافة Foreign Key إذا لم تكن موجودة
-- ============================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoices_order_id_fkey'
      AND conrelid = 'public.invoices'::regclass
  ) THEN

    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_order_id_fkey
    FOREIGN KEY (order_id)
    REFERENCES public.orders(id)
    ON DELETE CASCADE;

  END IF;

END;
$$;


-- ============================================================
-- 7. RLS
-- ============================================================

ALTER TABLE public.invoices
ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- العميل يرى فواتيره المرتبطة بطلباته فقط
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
"invoices_customer_select"
ON public.invoices;


CREATE POLICY
"invoices_customer_select"
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
-- الإدارة ترى جميع الفواتير
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
"invoices_admin_select"
ON public.invoices;


CREATE POLICY
"invoices_admin_select"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);


-- ------------------------------------------------------------
-- لا يوجد INSERT مباشر من العميل
-- لا يوجد UPDATE مباشر
-- لا يوجد DELETE مباشر
--
-- إصدار الفاتورة يتم فقط عبر SECURITY DEFINER.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS
"invoices_customer_insert"
ON public.invoices;

DROP POLICY IF EXISTS
"invoices_customer_update"
ON public.invoices;

DROP POLICY IF EXISTS
"invoices_customer_delete"
ON public.invoices;

DROP POLICY IF EXISTS
"invoices_admin_insert"
ON public.invoices;

DROP POLICY IF EXISTS
"invoices_admin_update"
ON public.invoices;

DROP POLICY IF EXISTS
"invoices_admin_delete"
ON public.invoices;


REVOKE INSERT, UPDATE, DELETE
ON public.invoices
FROM authenticated;


GRANT SELECT
ON public.invoices
TO authenticated;


-- ============================================================
-- 8. دالة إصدار فاتورة لطلب محدد
-- ============================================================

CREATE OR REPLACE FUNCTION public.issue_invoice_for_order(
  _order_id uuid
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _order public.orders;

  _invoice public.invoices;

  _prefix text;

  _invoice_number text;

  _snapshot jsonb;

  _settings jsonb;

BEGIN

  -- ----------------------------------------------------------
  -- التحقق من الطلب
  -- ----------------------------------------------------------

  SELECT *
  INTO _order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'الطلب غير موجود: %',
      _order_id;
  END IF;


  -- ----------------------------------------------------------
  -- إذا كانت الفاتورة موجودة بالفعل
  -- نعيدها ولا ننشئ فاتورة ثانية.
  -- ----------------------------------------------------------

  SELECT *
  INTO _invoice
  FROM public.invoices
  WHERE order_id = _order_id
  LIMIT 1;


  IF FOUND THEN

    IF _order.invoice_number IS DISTINCT FROM
       _invoice.invoice_number
    THEN

      UPDATE public.orders
      SET
        invoice_number = _invoice.invoice_number,
        updated_at = now()
      WHERE id = _order_id;

    END IF;


    RETURN _invoice;

  END IF;


  -- ----------------------------------------------------------
  -- بادئة الفاتورة
  -- ----------------------------------------------------------

  SELECT
    COALESCE(
      NULLIF(
        trim(invoice_prefix),
        ''
      ),
      'INV'
    )
  INTO _prefix
  FROM public.invoice_settings
  WHERE id = true
  LIMIT 1;


  _prefix :=
    COALESCE(
      NULLIF(
        trim(_prefix),
        ''
      ),
      'INV'
    );


  -- ----------------------------------------------------------
  -- رقم الفاتورة
  --
  -- مثال:
  -- INV-2026-000001
  -- ----------------------------------------------------------

  _invoice_number :=
    _prefix
    || '-'
    || to_char(
      now(),
      'YYYY'
    )
    || '-'
    || lpad(
      nextval(
        'public.invoice_number_seq'
      )::text,
      6,
      '0'
    );


  -- ----------------------------------------------------------
  -- إعدادات الفاتورة الحالية
  -- ----------------------------------------------------------

  SELECT
    COALESCE(
      to_jsonb(s),
      '{}'::jsonb
    )
  INTO _settings
  FROM public.invoice_settings s
  WHERE s.id = true
  LIMIT 1;


  _settings :=
    COALESCE(
      _settings,
      '{}'::jsonb
    );


  -- ----------------------------------------------------------
  -- Snapshot كامل للطلب وقت إصدار الفاتورة
  -- ----------------------------------------------------------

  SELECT jsonb_build_object(

    'invoice_number',
    _invoice_number,

    'issued_at',
    now(),

    'order',
    to_jsonb(o),

    'items',
    COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(oi)
          ORDER BY oi.id
        )
        FROM public.order_items oi
        WHERE oi.order_id = o.id
      ),
      '[]'::jsonb
    ),

    'invoice_settings',
    _settings

  )
  INTO _snapshot
  FROM public.orders o
  WHERE o.id = _order_id;


  -- ----------------------------------------------------------
  -- إنشاء الفاتورة
  -- ----------------------------------------------------------

  INSERT INTO public.invoices (
    order_id,
    invoice_number,
    issued_at,
    snapshot
  )
  VALUES (
    _order_id,
    _invoice_number,
    now(),
    _snapshot
  )
  RETURNING *
  INTO _invoice;


  -- ----------------------------------------------------------
  -- مزامنة رقم الفاتورة مع الطلب
  -- ----------------------------------------------------------

  UPDATE public.orders
  SET
    invoice_number = _invoice_number,
    updated_at = now()
  WHERE id = _order_id;


  RETURN _invoice;


EXCEPTION

  WHEN unique_violation THEN

    SELECT *
    INTO _invoice
    FROM public.invoices
    WHERE order_id = _order_id
    LIMIT 1;


    IF FOUND THEN

      UPDATE public.orders
      SET
        invoice_number = _invoice.invoice_number,
        updated_at = now()
      WHERE id = _order_id
        AND invoice_number IS DISTINCT FROM
            _invoice.invoice_number;


      RETURN _invoice;

    END IF;


    RAISE;

END;
$$;


-- ============================================================
-- 9. صلاحيات RPC
-- ============================================================

REVOKE ALL
ON FUNCTION public.issue_invoice_for_order(uuid)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.issue_invoice_for_order(uuid)
TO authenticated;


-- ============================================================
-- 10. Trigger إصدار الفاتورة تلقائياً
-- ============================================================

CREATE OR REPLACE FUNCTION public.issue_invoice_after_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  PERFORM public.issue_invoice_for_order(
    NEW.id
  );

  RETURN NEW;

END;
$$;


REVOKE ALL
ON FUNCTION public.issue_invoice_after_order_insert()
FROM PUBLIC;


DROP TRIGGER IF EXISTS
orders_issue_invoice
ON public.orders;


CREATE TRIGGER
orders_issue_invoice
AFTER INSERT
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION
public.issue_invoice_after_order_insert();


-- ============================================================
-- 11. إصدار الفواتير للطلبات القديمة
--
-- أي طلب موجود بدون فاتورة سيحصل على فاتورة.
-- ============================================================

DO $$
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
          'تعذر إصدار فاتورة للطلب %: %',
          _order_id,
          SQLERRM;

    END;

  END LOOP;

END;
$$;


-- ============================================================
-- 12. مزامنة الطلبات التي لديها invoices بالفعل
-- ============================================================

UPDATE public.orders o
SET
  invoice_number = i.invoice_number,
  updated_at = now()
FROM public.invoices i
WHERE i.order_id = o.id
  AND (
    o.invoice_number IS NULL
    OR o.invoice_number IS DISTINCT FROM
       i.invoice_number
  );


-- ============================================================
-- 13. تحديث Schema Cache
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
