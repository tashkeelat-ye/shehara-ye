BEGIN;

-- ============================================================
-- SHEHARA / شهارة للتسوق
-- INVOICE SYSTEM REPAIR
--
-- هذا الملف يعالج:
-- 1. إعدادات الفواتير
-- 2. جدول invoices
-- 3. العلاقات والفهارس
-- 4. RLS
-- 5. أرقام الفواتير
-- 6. الإصدار التلقائي
-- 7. إصدار الفواتير القديمة
-- 8. منع الوصول غير المصرح به
-- 9. PostgREST schema cache
-- ============================================================


-- ============================================================
-- 1. invoice_settings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id boolean PRIMARY KEY DEFAULT true
    CHECK (id = true),

  enabled boolean NOT NULL DEFAULT true,

  invoice_title text NOT NULL DEFAULT 'فاتورة بيع',
  invoice_subtitle text NOT NULL DEFAULT 'فاتورة إلكترونية',

  store_name text NOT NULL DEFAULT 'شهارة للتسوق',
  store_tagline text NOT NULL DEFAULT 'تسوق بلا حدود',
  store_address text NOT NULL DEFAULT '',
  store_phone text NOT NULL DEFAULT '',
  store_email text NOT NULL DEFAULT '',
  commercial_registration text NOT NULL DEFAULT '',
  tax_number text NOT NULL DEFAULT '',

  logo_url text NOT NULL DEFAULT '/logo.png',

  header_note text NOT NULL DEFAULT '',
  footer_note text NOT NULL DEFAULT 'شكراً لتسوقكم معنا',
  thank_you_message text NOT NULL DEFAULT 'نسعد بخدمتكم دائماً',

  primary_color text NOT NULL DEFAULT '#0D3B4D',
  secondary_color text NOT NULL DEFAULT '#0A2A38',
  accent_color text NOT NULL DEFAULT '#E2723A',

  show_invoice_number boolean NOT NULL DEFAULT true,
  show_order_number boolean NOT NULL DEFAULT true,
  show_invoice_date boolean NOT NULL DEFAULT true,

  show_customer_details boolean NOT NULL DEFAULT true,
  show_customer_phone boolean NOT NULL DEFAULT true,
  show_customer_address boolean NOT NULL DEFAULT true,

  show_store_details boolean NOT NULL DEFAULT true,
  show_commercial_registration boolean NOT NULL DEFAULT true,
  show_tax_number boolean NOT NULL DEFAULT true,

  show_product_images boolean NOT NULL DEFAULT true,
  show_product_description boolean NOT NULL DEFAULT true,

  show_payment_method boolean NOT NULL DEFAULT true,
  show_payment_status boolean NOT NULL DEFAULT true,

  show_notes boolean NOT NULL DEFAULT true,
  show_qr_code boolean NOT NULL DEFAULT true,

  show_delivery_fee boolean NOT NULL DEFAULT true,
  show_discount boolean NOT NULL DEFAULT true,

  paper_size text NOT NULL DEFAULT 'A4'
    CHECK (paper_size IN ('A4', 'thermal')),

  invoice_prefix text NOT NULL DEFAULT 'INV',

  invoice_footer_enabled boolean NOT NULL DEFAULT true,

  updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 2. ضمان سجل الإعدادات الرئيسي
-- ============================================================

INSERT INTO public.invoice_settings (
  id
)
VALUES (
  true
)
ON CONFLICT (id)
DO NOTHING;


-- ============================================================
-- 3. updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_invoice_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS
invoice_settings_updated_at
ON public.invoice_settings;


CREATE TRIGGER
invoice_settings_updated_at
BEFORE UPDATE
ON public.invoice_settings
FOR EACH ROW
EXECUTE FUNCTION
public.set_invoice_settings_updated_at();


-- ============================================================
-- 4. صلاحيات invoice_settings
--
-- لا نسمح للمستخدم العادي بقراءة إعدادات الفاتورة.
-- الإدارة فقط تستطيع القراءة والتعديل.
-- ============================================================

ALTER TABLE public.invoice_settings
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"invoice_settings_select_authenticated"
ON public.invoice_settings;


DROP POLICY IF EXISTS
"invoice_settings_admin_select"
ON public.invoice_settings;


CREATE POLICY
"invoice_settings_admin_select"
ON public.invoice_settings
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);


DROP POLICY IF EXISTS
"invoice_settings_admin_update"
ON public.invoice_settings;


CREATE POLICY
"invoice_settings_admin_update"
ON public.invoice_settings
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);


DROP POLICY IF EXISTS
"invoice_settings_admin_insert"
ON public.invoice_settings;


CREATE POLICY
"invoice_settings_admin_insert"
ON public.invoice_settings
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);


GRANT SELECT, INSERT, UPDATE
ON public.invoice_settings
TO authenticated;


-- ============================================================
-- 5. إصلاح RPC القديمة
--
-- نحتفظ بها للتوافق مع أي جزء قديم من النظام.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_invoice_settings()
RETURNS public.invoice_settings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.invoice_settings;
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'غير مصرح لك بالوصول إلى إعدادات الفاتورة';
  END IF;


  SELECT *
  INTO result
  FROM public.invoice_settings
  WHERE id = true
  LIMIT 1;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'إعدادات الفاتورة غير موجودة';
  END IF;


  RETURN result;

END;
$$;


CREATE OR REPLACE FUNCTION public.update_invoice_settings(
  _settings jsonb
)
RETURNS public.invoice_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.invoice_settings;
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'غير مصرح لك بتعديل إعدادات الفاتورة';
  END IF;


  UPDATE public.invoice_settings
  SET

    enabled =
      COALESCE(
        (_settings ->> 'enabled')::boolean,
        enabled
      ),

    invoice_title =
      COALESCE(
        NULLIF(
          trim(
            _settings ->> 'invoice_title'
          ),
          ''
        ),
        invoice_title
      ),

    invoice_subtitle =
      COALESCE(
        NULLIF(
          trim(
            _settings ->> 'invoice_subtitle'
          ),
          ''
        ),
        invoice_subtitle
      ),

    store_name =
      COALESCE(
        NULLIF(
          trim(
            _settings ->> 'store_name'
          ),
          ''
        ),
        store_name
      ),

    store_tagline =
      COALESCE(
        _settings ->> 'store_tagline',
        store_tagline
      ),

    store_address =
      COALESCE(
        _settings ->> 'store_address',
        store_address
      ),

    store_phone =
      COALESCE(
        _settings ->> 'store_phone',
        store_phone
      ),

    store_email =
      COALESCE(
        _settings ->> 'store_email',
        store_email
      ),

    commercial_registration =
      COALESCE(
        _settings ->> 'commercial_registration',
        commercial_registration
      ),

    tax_number =
      COALESCE(
        _settings ->> 'tax_number',
        tax_number
      ),

    logo_url =
      COALESCE(
        _settings ->> 'logo_url',
        logo_url
      ),

    header_note =
      COALESCE(
        _settings ->> 'header_note',
        header_note
      ),

    footer_note =
      COALESCE(
        _settings ->> 'footer_note',
        footer_note
      ),

    thank_you_message =
      COALESCE(
        _settings ->> 'thank_you_message',
        thank_you_message
      ),

    primary_color =
      COALESCE(
        _settings ->> 'primary_color',
        primary_color
      ),

    secondary_color =
      COALESCE(
        _settings ->> 'secondary_color',
        secondary_color
      ),

    accent_color =
      COALESCE(
        _settings ->> 'accent_color',
        accent_color
      ),

    show_invoice_number =
      COALESCE(
        (_settings ->> 'show_invoice_number')::boolean,
        show_invoice_number
      ),

    show_order_number =
      COALESCE(
        (_settings ->> 'show_order_number')::boolean,
        show_order_number
      ),

    show_invoice_date =
      COALESCE(
        (_settings ->> 'show_invoice_date')::boolean,
        show_invoice_date
      ),

    show_customer_details =
      COALESCE(
        (_settings ->> 'show_customer_details')::boolean,
        show_customer_details
      ),

    show_customer_phone =
      COALESCE(
        (_settings ->> 'show_customer_phone')::boolean,
        show_customer_phone
      ),

    show_customer_address =
      COALESCE(
        (_settings ->> 'show_customer_address')::boolean,
        show_customer_address
      ),

    show_store_details =
      COALESCE(
        (_settings ->> 'show_store_details')::boolean,
        show_store_details
      ),

    show_commercial_registration =
      COALESCE(
        (_settings ->> 'show_commercial_registration')::boolean,
        show_commercial_registration
      ),

    show_tax_number =
      COALESCE(
        (_settings ->> 'show_tax_number')::boolean,
        show_tax_number
      ),

    show_product_images =
      COALESCE(
        (_settings ->> 'show_product_images')::boolean,
        show_product_images
      ),

    show_product_description =
      COALESCE(
        (_settings ->> 'show_product_description')::boolean,
        show_product_description
      ),

    show_payment_method =
      COALESCE(
        (_settings ->> 'show_payment_method')::boolean,
        show_payment_method
      ),

    show_payment_status =
      COALESCE(
        (_settings ->> 'show_payment_status')::boolean,
        show_payment_status
      ),

    show_notes =
      COALESCE(
        (_settings ->> 'show_notes')::boolean,
        show_notes
      ),

    show_qr_code =
      COALESCE(
        (_settings ->> 'show_qr_code')::boolean,
        show_qr_code
      ),

    show_delivery_fee =
      COALESCE(
        (_settings ->> 'show_delivery_fee')::boolean,
        show_delivery_fee
      ),

    show_discount =
      COALESCE(
        (_settings ->> 'show_discount')::boolean,
        show_discount
      ),

    paper_size =
      CASE
        WHEN _settings ->> 'paper_size'
          IN ('A4', 'thermal')
        THEN _settings ->> 'paper_size'
        ELSE paper_size
      END,

    invoice_prefix =
      COALESCE(
        NULLIF(
          trim(
            _settings ->> 'invoice_prefix'
          ),
          ''
        ),
        invoice_prefix
      ),

    invoice_footer_enabled =
      COALESCE(
        (_settings ->> 'invoice_footer_enabled')::boolean,
        invoice_footer_enabled
      )

  WHERE id = true

  RETURNING *
  INTO result;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'تعذر تحديث إعدادات الفاتورة';
  END IF;


  RETURN result;

END;
$$;


REVOKE ALL
ON FUNCTION public.get_invoice_settings()
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.get_invoice_settings()
TO authenticated;


REVOKE ALL
ON FUNCTION public.update_invoice_settings(jsonb)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.update_invoice_settings(jsonb)
TO authenticated;


-- ============================================================
-- 6. invoice_number في orders
-- ============================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS invoice_number text;


CREATE UNIQUE INDEX IF NOT EXISTS
orders_invoice_number_unique_idx
ON public.orders(invoice_number)
WHERE invoice_number IS NOT NULL;


-- ============================================================
-- 7. sequence أرقام الفواتير
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS
public.invoice_number_seq
START WITH 1
INCREMENT BY 1;


-- ============================================================
-- 8. جدول invoices
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
-- 9. التأكد من الأعمدة في حالة وجود جدول قديم
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
ALTER COLUMN id
SET DEFAULT gen_random_uuid();


ALTER TABLE public.invoices
ALTER COLUMN issued_at
SET DEFAULT now();


ALTER TABLE public.invoices
ALTER COLUMN snapshot
SET DEFAULT '{}'::jsonb;


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
ALTER COLUMN id
SET NOT NULL;


ALTER TABLE public.invoices
ALTER COLUMN order_id
SET NOT NULL;


ALTER TABLE public.invoices
ALTER COLUMN invoice_number
SET NOT NULL;


ALTER TABLE public.invoices
ALTER COLUMN issued_at
SET NOT NULL;


ALTER TABLE public.invoices
ALTER COLUMN snapshot
SET NOT NULL;


-- ============================================================
-- 10. Primary Key في حالة كان الجدول القديم بلا PK
-- ============================================================

DO $$
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
$$;


-- ============================================================
-- 11. Foreign Key order_id
-- ============================================================

DO $$
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
    ADD CONSTRAINT
      invoices_order_id_fkey
    FOREIGN KEY (order_id)
    REFERENCES public.orders(id)
    ON DELETE CASCADE;

  END IF;

END;
$$;


-- ============================================================
-- 12. الفهارس
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
-- 13. مزامنة sequence مع الفواتير الموجودة
-- ============================================================

DO $$
DECLARE
  max_suffix bigint;
  sequence_last bigint;
  sequence_called boolean;
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


  SELECT
    last_value,
    is_called
  INTO
    sequence_last,
    sequence_called
  FROM public.invoice_number_seq;


  IF NOT sequence_called
     OR max_suffix >= sequence_last
  THEN

    PERFORM setval(
      'public.invoice_number_seq',
      GREATEST(
        max_suffix + 1,
        CASE
          WHEN sequence_called
          THEN sequence_last + 1
          ELSE sequence_last
        END
      ),
      false
    );

  END IF;

END;
$$;


-- ============================================================
-- 14. RLS على invoices
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
-- 15. دالة إصدار الفاتورة
--
-- هذه الدالة:
-- - تمنع الفاتورة المكررة.
-- - تولد رقم فاتورة فريد.
-- - تحفظ Snapshot كامل.
-- - تزامن orders.invoice_number.
-- ============================================================

CREATE OR REPLACE FUNCTION
public.issue_invoice_for_order(
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
  -- قفل الطلب أثناء إصدار الفاتورة
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
  -- Snapshot لإعدادات الفاتورة
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
  -- Snapshot الطلب
  --
  -- مهم:
  -- هذه الدالة ستعمل بواسطة Deferred Trigger،
  -- لذلك order_items تكون موجودة بالفعل.
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
  -- مزامنة رقم الفاتورة مع الطلب
  -- ----------------------------------------------------------

  UPDATE public.orders
  SET
    invoice_number =
      _invoice_number,
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
        invoice_number =
          _invoice.invoice_number,
        updated_at = now()
      WHERE id = _order_id
        AND invoice_number
            IS DISTINCT FROM
            _invoice.invoice_number;


      RETURN _invoice;

    END IF;


    RAISE;

END;
$$;


-- ============================================================
-- 16. حماية دالة إصدار الفواتير
--
-- لا يستطيع العميل استدعاء الدالة مباشرة.
-- الـ Trigger فقط هو الذي يستخدمها.
-- ============================================================

REVOKE ALL
ON FUNCTION
public.issue_invoice_for_order(uuid)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION
public.issue_invoice_for_order(uuid)
FROM authenticated;


-- ============================================================
-- 17. Trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION
public.issue_invoice_after_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  PERFORM
    public.issue_invoice_for_order(
      NEW.id
    );

  RETURN NEW;

END;
$$;


REVOKE ALL
ON FUNCTION
public.issue_invoice_after_order_insert()
FROM PUBLIC;


REVOKE ALL
ON FUNCTION
public.issue_invoice_after_order_insert()
FROM authenticated;


-- ============================================================
-- 18. حذف الـ Trigger القديم
--
-- كان AFTER INSERT عادياً.
-- وهذا قد يصدر الفاتورة قبل إنشاء order_items.
-- ============================================================

DROP TRIGGER IF EXISTS
orders_issue_invoice
ON public.orders;


-- ============================================================
-- 19. Trigger مؤجل
--
-- INITIALLY DEFERRED
--
-- يعني أن الفاتورة لا تصدر لحظة INSERT الطلب،
-- بل في نهاية Transaction.
--
-- وبالتالي:
--
-- orders
--   ↓
-- order_items
--   ↓
-- invoice
--
-- وليس:
--
-- orders
--   ↓
-- invoice
--   ↓
-- order_items
-- ============================================================

CREATE CONSTRAINT TRIGGER
orders_issue_invoice
AFTER INSERT
ON public.orders
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION
public.issue_invoice_after_order_insert();


-- ============================================================
-- 20. إصدار الفواتير المفقودة للطلبات القديمة
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
$$;


-- ============================================================
-- 21. مزامنة invoice_number
-- ============================================================

UPDATE public.orders o
SET
  invoice_number =
    i.invoice_number,
  updated_at = now()
FROM public.invoices i
WHERE i.order_id = o.id
  AND (
    o.invoice_number IS NULL
    OR o.invoice_number
       IS DISTINCT FROM
       i.invoice_number
  );


-- ============================================================
-- 22. PostgREST Schema Cache
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
