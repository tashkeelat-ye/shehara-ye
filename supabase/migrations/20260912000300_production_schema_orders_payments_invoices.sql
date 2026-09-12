BEGIN;

-- ============================================================
-- SHEHARA / شهارة للتسوق
--
-- PRODUCTION SCHEMA REPAIR
--
-- يعالج:
-- 1. orders.currency
-- 2. order_items.currency
-- 3. payment_requests schema
-- 4. RLS الخاصة بطلبات الدفع
-- 5. updated_at لطلبات الدفع
-- 6. invoice issuance
-- 7. deferred invoice trigger
-- 8. invoice backfill
-- 9. invoice/order synchronization
-- 10. PostgREST schema cache
-- ============================================================


-- ============================================================
-- 1. ORDERS
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS currency text;

UPDATE public.orders
SET currency = 'YER'
WHERE currency IS NULL
   OR trim(currency) = '';

ALTER TABLE public.orders
ALTER COLUMN currency SET DEFAULT 'YER';

ALTER TABLE public.orders
ALTER COLUMN currency SET NOT NULL;


-- ============================================================
-- 2. ORDER ITEMS
-- ============================================================

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS currency text;

UPDATE public.order_items
SET currency = 'YER'
WHERE currency IS NULL
   OR trim(currency) = '';

ALTER TABLE public.order_items
ALTER COLUMN currency SET DEFAULT 'YER';

ALTER TABLE public.order_items
ALTER COLUMN currency SET NOT NULL;


-- ============================================================
-- 3. PAYMENT REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  purpose text NOT NULL DEFAULT 'order',

  order_id uuid
    REFERENCES public.orders(id)
    ON DELETE SET NULL,

  method_code text NOT NULL DEFAULT '',

  amount numeric(12,2) NOT NULL DEFAULT 0,

  currency text NOT NULL DEFAULT 'YER',

  sender_name text NOT NULL DEFAULT '',

  sender_phone text NOT NULL DEFAULT '',

  reference text NOT NULL DEFAULT '',

  receipt_path text NOT NULL DEFAULT '',

  status text NOT NULL DEFAULT 'pending',

  admin_note text NOT NULL DEFAULT '',

  reviewed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),

  updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 4. ضمان الأعمدة في جدول payment_requests
-- ============================================================

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS purpose text;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS order_id uuid;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS method_code text;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS amount numeric(12,2);

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS currency text;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS sender_name text;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS sender_phone text;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS reference text;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS receipt_path text;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS admin_note text;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS updated_at timestamptz;


-- ============================================================
-- 5. تنظيف القيم NULL في الأعمدة الأساسية
-- ============================================================

UPDATE public.payment_requests
SET purpose = 'order'
WHERE purpose IS NULL
   OR trim(purpose) = '';

UPDATE public.payment_requests
SET method_code = ''
WHERE method_code IS NULL;

UPDATE public.payment_requests
SET amount = 0
WHERE amount IS NULL;

UPDATE public.payment_requests
SET currency = 'YER'
WHERE currency IS NULL
   OR trim(currency) = '';

UPDATE public.payment_requests
SET sender_name = ''
WHERE sender_name IS NULL;

UPDATE public.payment_requests
SET sender_phone = ''
WHERE sender_phone IS NULL;

UPDATE public.payment_requests
SET reference = ''
WHERE reference IS NULL;

UPDATE public.payment_requests
SET receipt_path = ''
WHERE receipt_path IS NULL;

UPDATE public.payment_requests
SET status = 'pending'
WHERE status IS NULL
   OR trim(status) = '';

UPDATE public.payment_requests
SET admin_note = ''
WHERE admin_note IS NULL;

UPDATE public.payment_requests
SET created_at = now()
WHERE created_at IS NULL;

UPDATE public.payment_requests
SET updated_at = created_at
WHERE updated_at IS NULL;


-- ============================================================
-- 6. Defaults
-- ============================================================

ALTER TABLE public.payment_requests
ALTER COLUMN purpose SET DEFAULT 'order';

ALTER TABLE public.payment_requests
ALTER COLUMN amount SET DEFAULT 0;

ALTER TABLE public.payment_requests
ALTER COLUMN currency SET DEFAULT 'YER';

ALTER TABLE public.payment_requests
ALTER COLUMN sender_name SET DEFAULT '';

ALTER TABLE public.payment_requests
ALTER COLUMN sender_phone SET DEFAULT '';

ALTER TABLE public.payment_requests
ALTER COLUMN reference SET DEFAULT '';

ALTER TABLE public.payment_requests
ALTER COLUMN receipt_path SET DEFAULT '';

ALTER TABLE public.payment_requests
ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.payment_requests
ALTER COLUMN admin_note SET DEFAULT '';

ALTER TABLE public.payment_requests
ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.payment_requests
ALTER COLUMN updated_at SET DEFAULT now();


-- ============================================================
-- 7. Foreign Key payment_requests.order_id
-- ============================================================

DO $function$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid =
      'public.payment_requests'::regclass
      AND conname =
        'payment_requests_order_id_fkey'
  ) THEN

    ALTER TABLE public.payment_requests
    ADD CONSTRAINT payment_requests_order_id_fkey
    FOREIGN KEY (order_id)
    REFERENCES public.orders(id)
    ON DELETE SET NULL;

  END IF;

END;
$function$;


-- ============================================================
-- 8. updated_at trigger لطلبات الدفع
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_payment_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN

  NEW.updated_at = now();

  RETURN NEW;

END;
$function$;


DROP TRIGGER IF EXISTS
payment_requests_updated_at
ON public.payment_requests;


CREATE TRIGGER
payment_requests_updated_at
BEFORE UPDATE
ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION
public.set_payment_requests_updated_at();


-- ============================================================
-- 9. فهارس payment_requests
-- ============================================================

CREATE INDEX IF NOT EXISTS
payment_requests_user_created_idx
ON public.payment_requests(
  user_id,
  created_at DESC
);


CREATE INDEX IF NOT EXISTS
payment_requests_status_created_idx
ON public.payment_requests(
  status,
  created_at DESC
);


CREATE INDEX IF NOT EXISTS
payment_requests_order_idx
ON public.payment_requests(order_id);


-- ============================================================
-- 10. RLS payment_requests
-- ============================================================

ALTER TABLE public.payment_requests
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"payment_requests_customer_select"
ON public.payment_requests;


CREATE POLICY
"payment_requests_customer_select"
ON public.payment_requests
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);


DROP POLICY IF EXISTS
"payment_requests_admin_select"
ON public.payment_requests;


CREATE POLICY
"payment_requests_admin_select"
ON public.payment_requests
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);


DROP POLICY IF EXISTS
"payment_requests_customer_insert"
ON public.payment_requests;


CREATE POLICY
"payment_requests_customer_insert"
ON public.payment_requests
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);


DROP POLICY IF EXISTS
"payment_requests_customer_update"
ON public.payment_requests;


DROP POLICY IF EXISTS
"payment_requests_customer_delete"
ON public.payment_requests;


DROP POLICY IF EXISTS
"payment_requests_admin_update"
ON public.payment_requests;


DROP POLICY IF EXISTS
"payment_requests_admin_delete"
ON public.payment_requests;


GRANT SELECT, INSERT
ON public.payment_requests
TO authenticated;


-- ============================================================
-- 11. INVOICE NUMBER SEQUENCE
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS
public.invoice_number_seq
START WITH 1
INCREMENT BY 1;


-- ============================================================
-- 12. orders.invoice_number
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS invoice_number text;


CREATE UNIQUE INDEX IF NOT EXISTS
orders_invoice_number_unique_idx
ON public.orders(invoice_number)
WHERE invoice_number IS NOT NULL;


-- ============================================================
-- 13. invoices
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY
    DEFAULT gen_random_uuid(),

  order_id uuid NOT NULL UNIQUE
    REFERENCES public.orders(id)
    ON DELETE CASCADE,

  invoice_number text NOT NULL UNIQUE,

  issued_at timestamptz NOT NULL
    DEFAULT now(),

  snapshot jsonb NOT NULL
    DEFAULT '{}'::jsonb
);


-- ============================================================
-- 14. ضمان الأعمدة
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
-- 15. Primary Key
-- ============================================================

DO $function$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid =
      'public.invoices'::regclass
      AND contype = 'p'
  ) THEN

    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_pkey
    PRIMARY KEY (id);

  END IF;

END;
$function$;


-- ============================================================
-- 16. Foreign Key
-- ============================================================

DO $function$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid =
      'public.invoices'::regclass
      AND conname =
        'invoices_order_id_fkey'
  ) THEN

    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_order_id_fkey
    FOREIGN KEY (order_id)
    REFERENCES public.orders(id)
    ON DELETE CASCADE;

  END IF;

END;
$function$;


-- ============================================================
-- 17. Invoice indexes
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
-- 18. مزامنة sequence
-- ============================================================

DO $function$
DECLARE
  max_suffix bigint;
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
  INTO max_suffix
  FROM public.invoices;


  PERFORM setval(
    'public.invoice_number_seq',
    GREATEST(max_suffix + 1, 1),
    false
  );

END;
$function$;


-- ============================================================
-- 19. RLS invoices
-- ============================================================

ALTER TABLE public.invoices
ENABLE ROW LEVEL SECURITY;


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


REVOKE INSERT, UPDATE, DELETE
ON public.invoices
FROM authenticated;


GRANT SELECT
ON public.invoices
TO authenticated;


-- ============================================================
-- 20. دالة إصدار الفاتورة
-- ============================================================

CREATE OR REPLACE FUNCTION public.issue_invoice_for_order(
  _order_id uuid
)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$

DECLARE

  _order public.orders;

  _invoice public.invoices;

  _prefix text;

  _invoice_number text;

  _snapshot jsonb;

  _settings jsonb;

BEGIN

  -- ----------------------------------------------------------
  -- الطلب
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
  -- منع التكرار
  -- ----------------------------------------------------------

  SELECT *
  INTO _invoice
  FROM public.invoices
  WHERE order_id = _order_id
  LIMIT 1;


  IF FOUND THEN

    IF _order.invoice_number
       IS DISTINCT FROM
       _invoice.invoice_number
    THEN

      UPDATE public.orders
      SET
        invoice_number =
          _invoice.invoice_number,
        updated_at = now()
      WHERE id = _order_id;

    END IF;


    RETURN _invoice;

  END IF;


  -- ----------------------------------------------------------
  -- إعدادات الفاتورة
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
  -- Snapshot settings
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
  -- Snapshot الطلب + العناصر
  --
  -- مهم:
  -- هذه الدالة ستعمل الآن بعد اكتمال Transaction
  -- لذلك order_items ستكون موجودة.
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
  -- مزامنة orders
  -- ----------------------------------------------------------

  UPDATE public.orders
  SET
    invoice_number =
      _invoice_number,
    updated_at =
      now()
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
        invoice_number =
          _invoice.invoice_number,
        updated_at =
          now()
      WHERE id = _order_id
        AND invoice_number IS DISTINCT FROM
            _invoice.invoice_number;


      RETURN _invoice;

    END IF;


    RAISE;

END;

$function$;


-- ============================================================
-- 21. حماية RPC
-- ============================================================

REVOKE ALL
ON FUNCTION public.issue_invoice_for_order(uuid)
FROM PUBLIC;


REVOKE EXECUTE
ON FUNCTION public.issue_invoice_for_order(uuid)
FROM authenticated;


-- ============================================================
-- 22. Trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.issue_invoice_after_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN

  PERFORM public.issue_invoice_for_order(
    NEW.id
  );

  RETURN NEW;

END;
$function$;


REVOKE ALL
ON FUNCTION public.issue_invoice_after_order_insert()
FROM PUBLIC;


-- ============================================================
-- 23. حذف Trigger القديم
-- ============================================================

DROP TRIGGER IF EXISTS
orders_issue_invoice
ON public.orders;


DROP TRIGGER IF EXISTS
orders_issue_invoice_deferred
ON public.orders;


-- ============================================================
-- 24. Trigger مؤجل
--
-- الفاتورة لا تصدر مباشرة بعد INSERT orders.
--
-- تنتظر نهاية Transaction حتى تكون:
--
-- orders
-- +
-- order_items
--
-- مكتملة.
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
-- 25. إصدار الفواتير المفقودة للطلبات القديمة
-- ============================================================

DO $function$
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
$function$;


-- ============================================================
-- 26. مزامنة orders.invoice_number
-- ============================================================

UPDATE public.orders o
SET
  invoice_number =
    i.invoice_number,
  updated_at =
    now()
FROM public.invoices i
WHERE i.order_id = o.id
  AND (
    o.invoice_number IS NULL
    OR o.invoice_number IS DISTINCT FROM
       i.invoice_number
  );


-- ============================================================
-- 27. Schema Cache
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
