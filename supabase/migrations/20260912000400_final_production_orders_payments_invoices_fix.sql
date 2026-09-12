BEGIN;

-- ============================================================
-- SHEHARA / شهارة للتسوق
-- FINAL PRODUCTION REPAIR
--
-- يعالج بشكل مباشر:
-- 1. orders.currency
-- 2. order_items.currency
-- 3. payment_requests.currency
-- 4. PostgREST schema cache
-- 5. إزالة trigger الفاتورة القديم
-- 6. إنشاء deferred invoice trigger
-- 7. إصلاح إصدار الفواتير القديمة المفقودة
-- 8. مزامنة orders.invoice_number
-- ============================================================


-- ============================================================
-- 1. ORDERS.CURRENCY
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS currency text;

UPDATE public.orders
SET currency = 'YER'
WHERE currency IS NULL
   OR btrim(currency) = '';

ALTER TABLE public.orders
ALTER COLUMN currency SET DEFAULT 'YER';

ALTER TABLE public.orders
ALTER COLUMN currency SET NOT NULL;


-- ============================================================
-- 2. ORDER_ITEMS.CURRENCY
-- ============================================================

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS currency text;

UPDATE public.order_items
SET currency = 'YER'
WHERE currency IS NULL
   OR btrim(currency) = '';

ALTER TABLE public.order_items
ALTER COLUMN currency SET DEFAULT 'YER';

ALTER TABLE public.order_items
ALTER COLUMN currency SET NOT NULL;


-- ============================================================
-- 3. PAYMENT_REQUESTS.CURRENCY
-- ============================================================

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS currency text;

UPDATE public.payment_requests
SET currency = 'YER'
WHERE currency IS NULL
   OR btrim(currency) = '';

ALTER TABLE public.payment_requests
ALTER COLUMN currency SET DEFAULT 'YER';


-- ============================================================
-- 4. PAYMENT_REQUESTS UPDATED_AT
-- ============================================================

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.payment_requests
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.payment_requests
ALTER COLUMN updated_at SET DEFAULT now();


CREATE OR REPLACE FUNCTION public.set_payment_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $payment_updated$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$payment_updated$;


DROP TRIGGER IF EXISTS payment_requests_updated_at
ON public.payment_requests;


CREATE TRIGGER payment_requests_updated_at
BEFORE UPDATE
ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_payment_requests_updated_at();


-- ============================================================
-- 5. PAYMENT REQUESTS INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS payment_requests_currency_idx
ON public.payment_requests(currency);

CREATE INDEX IF NOT EXISTS payment_requests_created_at_idx
ON public.payment_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS payment_requests_order_id_idx
ON public.payment_requests(order_id);


-- ============================================================
-- 6. PAYMENT REQUESTS RLS
-- ============================================================

ALTER TABLE public.payment_requests
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "payment_requests_customer_select"
ON public.payment_requests;

CREATE POLICY "payment_requests_customer_select"
ON public.payment_requests
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);


DROP POLICY IF EXISTS "payment_requests_admin_select"
ON public.payment_requests;

CREATE POLICY "payment_requests_admin_select"
ON public.payment_requests
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);


DROP POLICY IF EXISTS "payment_requests_customer_insert"
ON public.payment_requests;

CREATE POLICY "payment_requests_customer_insert"
ON public.payment_requests
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);


GRANT SELECT, INSERT
ON public.payment_requests
TO authenticated;


-- ============================================================
-- 7. ORDERS.INVOICE_NUMBER
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS invoice_number text;


CREATE UNIQUE INDEX IF NOT EXISTS
orders_invoice_number_unique_idx
ON public.orders(invoice_number)
WHERE invoice_number IS NOT NULL;


-- ============================================================
-- 8. INVOICE SEQUENCE
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS
public.invoice_number_seq
START WITH 1
INCREMENT BY 1;


-- ============================================================
-- 9. INVOICES TABLE
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
-- 10. INVOICES COLUMNS
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


UPDATE public.invoices
SET id = gen_random_uuid()
WHERE id IS NULL;

UPDATE public.invoices
SET issued_at = now()
WHERE issued_at IS NULL;

UPDATE public.invoices
SET snapshot = '{}'::jsonb
WHERE snapshot IS NULL;


ALTER TABLE public.invoices
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.invoices
ALTER COLUMN issued_at SET DEFAULT now();

ALTER TABLE public.invoices
ALTER COLUMN snapshot SET DEFAULT '{}'::jsonb;


ALTER TABLE public.invoices
ALTER COLUMN id SET NOT NULL;

ALTER TABLE public.invoices
ALTER COLUMN order_id SET NOT NULL;

ALTER TABLE public.invoices
ALTER COLUMN invoice_number SET NOT NULL;

ALTER TABLE public.invoices
ALTER COLUMN issued_at SET NOT NULL;

ALTER TABLE public.invoices
ALTER COLUMN snapshot SET NOT NULL;


-- ============================================================
-- 11. INVOICE INDEXES
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
-- 12. INVOICE RLS
-- ============================================================

ALTER TABLE public.invoices
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "invoices_customer_select"
ON public.invoices;

CREATE POLICY "invoices_customer_select"
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


DROP POLICY IF EXISTS "invoices_admin_select"
ON public.invoices;

CREATE POLICY "invoices_admin_select"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);


REVOKE INSERT, UPDATE, DELETE
ON public.invoices
FROM authenticated;

GRANT SELECT
ON public.invoices
TO authenticated;


-- ============================================================
-- 13. ISSUE INVOICE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.issue_invoice_for_order(
  _order_id uuid
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $issue_invoice$
DECLARE
  _order public.orders;
  _invoice public.invoices;
  _prefix text;
  _invoice_number text;
  _snapshot jsonb;
  _settings jsonb;
BEGIN

  -- Lock the order to prevent duplicate invoice creation.
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


  -- Return existing invoice if already issued.
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


  -- Invoice prefix.
  SELECT
    COALESCE(
      NULLIF(btrim(invoice_prefix), ''),
      'INV'
    )
  INTO _prefix
  FROM public.invoice_settings
  WHERE id = true
  LIMIT 1;

  _prefix :=
    COALESCE(
      NULLIF(btrim(_prefix), ''),
      'INV'
    );


  -- Generate invoice number.
  _invoice_number :=
    _prefix
    || '-'
    || to_char(now(), 'YYYY')
    || '-'
    || lpad(
      nextval(
        'public.invoice_number_seq'
      )::text,
      6,
      '0'
    );


  -- Snapshot current invoice settings.
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


  -- Snapshot order + ALL order items.
  SELECT
    jsonb_build_object(

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


  -- Create invoice.
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


  -- Synchronize order.
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
$issue_invoice$;


REVOKE ALL
ON FUNCTION public.issue_invoice_for_order(uuid)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.issue_invoice_for_order(uuid)
FROM authenticated;


-- ============================================================
-- 14. DEFERRED INVOICE TRIGGER FUNCTION
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
-- 15. REMOVE ALL OLD INVOICE TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS orders_invoice
ON public.orders;

DROP TRIGGER IF EXISTS orders_issue_invoice
ON public.orders;

DROP TRIGGER IF EXISTS orders_issue_invoice_deferred
ON public.orders;


-- ============================================================
-- 16. FINAL DEFERRED TRIGGER
-- ============================================================
--
-- مهم جداً:
--
-- create_secure_order
--       ↓
-- INSERT orders
--       ↓
-- INSERT order_items
--       ↓
-- COMMIT
--       ↓
-- إصدار الفاتورة
--
-- وبالتالي الفاتورة تحتوي على العناصر فعلياً.
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
-- 17. BACKFILL MISSING INVOICES
-- ============================================================

DO $backfill$
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
$backfill$;


-- ============================================================
-- 18. SYNCHRONIZE ORDERS WITH EXISTING INVOICES
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
-- 19. SYNC INVOICE SEQUENCE
-- ============================================================

DO $sequence$
DECLARE
  _max_suffix bigint;
BEGIN

  SELECT
    COALESCE(
      MAX(
        CASE
          WHEN regexp_replace(
            invoice_number,
            '^.*-([0-9]+)$',
            '\1'
          ) ~ '^[0-9]+$'
          THEN
            regexp_replace(
              invoice_number,
              '^.*-([0-9]+)$',
              '\1'
            )::bigint
          ELSE
            0
        END
      ),
      0
    )
  INTO _max_suffix
  FROM public.invoices;


  PERFORM setval(
    'public.invoice_number_seq',
    GREATEST(
      _max_suffix + 1,
      1
    ),
    false
  );

END;
$sequence$;


-- ============================================================
-- 20. POSTGREST SCHEMA CACHE
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
