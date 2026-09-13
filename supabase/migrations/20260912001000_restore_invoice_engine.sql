BEGIN;

-- ============================================================
-- SHEHARA / شهارة للتسوق
-- RESTORE PRODUCTION INVOICE ENGINE
--
-- يعيد محرك إصدار الفواتير فقط.
-- لا يغير Checkout أو الدفع أو المخزون.
-- ============================================================


-- ============================================================
-- 1. REQUIRED INVOICE SEQUENCE
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq
  START WITH 1
  INCREMENT BY 1;


-- ============================================================
-- 2. INVOICES TABLE
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
-- 3. ENSURE REQUIRED COLUMNS EXIST
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
-- 4. INVOICE INDEXES
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
-- 5. ORDERS.INVOICE_NUMBER
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS invoice_number text;


CREATE UNIQUE INDEX IF NOT EXISTS
orders_invoice_number_unique_idx
ON public.orders(invoice_number)
WHERE invoice_number IS NOT NULL;


-- ============================================================
-- 6. RESTORE ISSUE_INVOICE_FOR_ORDER
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

  -- ----------------------------------------------------------
  -- Lock order
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
  -- Idempotency
  -- ----------------------------------------------------------
  -- إذا كانت الفاتورة موجودة بالفعل، لا ننشئ فاتورة ثانية.
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
  -- Invoice prefix
  -- ----------------------------------------------------------

  SELECT
    COALESCE(
      NULLIF(
        btrim(invoice_prefix),
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
        btrim(_prefix),
        ''
      ),
      'INV'
    );


  -- ----------------------------------------------------------
  -- Generate invoice number
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
  -- Snapshot invoice settings
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
  -- Snapshot order + order items
  -- ----------------------------------------------------------

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
          SELECT
            jsonb_agg(
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
  -- Create invoice
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
  -- Synchronize order
  -- ----------------------------------------------------------

  UPDATE public.orders
  SET
    invoice_number = _invoice_number,
    updated_at = now()
  WHERE id = _order_id;


  RETURN _invoice;


EXCEPTION
  WHEN unique_violation THEN

    -- إذا حصل Race Condition وأصدرت عملية أخرى الفاتورة،
    -- نعيد الفاتورة الموجودة بدلاً من الفشل.

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


-- لا يسمح للعميل باستدعاء محرك الفاتورة مباشرة.
REVOKE ALL
ON FUNCTION public.issue_invoice_for_order(uuid)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.issue_invoice_for_order(uuid)
FROM authenticated;


-- ============================================================
-- 7. DEFERRED INVOICE TRIGGER FUNCTION
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
-- 8. REMOVE ONLY OLD INVOICE TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS orders_invoice
ON public.orders;

DROP TRIGGER IF EXISTS orders_issue_invoice
ON public.orders;

DROP TRIGGER IF EXISTS orders_issue_invoice_deferred
ON public.orders;


-- ============================================================
-- 9. FINAL DEFERRED TRIGGER
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
-- 10. BACKFILL MISSING INVOICES
-- ============================================================

DO $backfill$
DECLARE
  _order_id uuid;
BEGIN

  FOR _order_id IN

    SELECT
      o.id

    FROM public.orders o

    LEFT JOIN public.invoices i
      ON i.order_id = o.id

    WHERE i.id IS NULL

    ORDER BY o.created_at ASC

  LOOP

    BEGIN

      PERFORM
        public.issue_invoice_for_order(
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
-- 11. SYNCHRONIZE EXISTING ORDERS
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
-- 12. SYNCHRONIZE INVOICE SEQUENCE
-- ============================================================

DO $sequence_sync$
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
$sequence_sync$;


-- ============================================================
-- 13. POSTGREST
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
