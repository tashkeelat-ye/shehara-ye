BEGIN;

-- ============================================================
-- SHEHARA PHASE 2
-- VENDOR ORDER ROUTING + ADMIN WALLET LEDGER
-- ============================================================

-- ============================================================
-- 1. ربط كل عنصر طلب بالمورد الحقيقي للمنتج
-- ============================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS vendor_id uuid
    REFERENCES public.vendors(id)
    ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS vendor_name text
    NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS vendor_phone text
    NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS vendor_city text
    NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS order_items_vendor_id_idx
  ON public.order_items(vendor_id);

CREATE INDEX IF NOT EXISTS order_items_order_vendor_idx
  ON public.order_items(order_id, vendor_id);


-- ============================================================
-- 2. ربط الطلب بالمورد تلقائياً من المنتج
-- ============================================================

CREATE OR REPLACE FUNCTION public.attach_order_item_vendor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor public.vendors;
BEGIN

  IF NEW.product_id IS NULL THEN
    NEW.vendor_id := NULL;
    NEW.vendor_name := '';
    NEW.vendor_phone := '';
    NEW.vendor_city := '';

    RETURN NEW;
  END IF;

  SELECT v.*
  INTO _vendor
  FROM public.products p
  JOIN public.vendors v
    ON v.id = p.vendor_id
  WHERE p.id = NEW.product_id
  LIMIT 1;

  IF _vendor.id IS NULL THEN
    NEW.vendor_id := NULL;
    NEW.vendor_name := '';
    NEW.vendor_phone := '';
    NEW.vendor_city := '';
  ELSE
    NEW.vendor_id := _vendor.id;
    NEW.vendor_name := COALESCE(_vendor.name, '');
    NEW.vendor_phone := COALESCE(_vendor.phone, '');
    NEW.vendor_city := COALESCE(_vendor.city, '');
  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS attach_order_item_vendor
ON public.order_items;

CREATE TRIGGER attach_order_item_vendor
BEFORE INSERT OR UPDATE OF product_id
ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.attach_order_item_vendor();


-- ============================================================
-- 3. تحديث الطلبات القديمة
-- ============================================================

UPDATE public.order_items oi
SET
  vendor_id = v.id,
  vendor_name = COALESCE(v.name, ''),
  vendor_phone = COALESCE(v.phone, ''),
  vendor_city = COALESCE(v.city, '')
FROM public.products p
JOIN public.vendors v
  ON v.id = p.vendor_id
WHERE oi.product_id = p.id;


-- ============================================================
-- 4. حالات طلب المورد
-- ============================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'vendor_order_status'
  ) THEN

    CREATE TYPE public.vendor_order_status AS ENUM (
      'new',
      'accepted',
      'processing',
      'ready',
      'shipped',
      'delivered',
      'cancelled'
    );

  END IF;

END
$$;


ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS vendor_status
    public.vendor_order_status
    NOT NULL DEFAULT 'new',

  ADD COLUMN IF NOT EXISTS vendor_note
    text
    NOT NULL DEFAULT '',

  ADD COLUMN IF NOT EXISTS vendor_updated_at
    timestamptz
    NOT NULL DEFAULT now();


-- ============================================================
-- 5. صلاحية المورد لرؤية طلباته فقط
-- ============================================================

DROP POLICY IF EXISTS order_items_vendor_read
ON public.order_items;

CREATE POLICY order_items_vendor_read
ON public.order_items
FOR SELECT
TO authenticated
USING (

  public.has_role(
    auth.uid(),
    'vendor'
  )

  AND vendor_id IN (

    SELECT v.id
    FROM public.vendors v
    WHERE v.user_id = auth.uid()
      AND v.is_active = true
      AND v.account_enabled = true

  )

);


-- ============================================================
-- 6. المورد يستطيع رؤية بيانات الشحن للطلبات التي تخصه
-- ============================================================

DROP POLICY IF EXISTS orders_vendor_read
ON public.orders;

CREATE POLICY orders_vendor_read
ON public.orders
FOR SELECT
TO authenticated
USING (

  public.has_role(
    auth.uid(),
    'vendor'
  )

  AND EXISTS (

    SELECT 1
    FROM public.order_items oi

    JOIN public.vendors v
      ON v.id = oi.vendor_id

    WHERE oi.order_id = orders.id

      AND v.user_id = auth.uid()

      AND v.is_active = true
      AND v.account_enabled = true

  )

);


-- ============================================================
-- 7. تحديث حالة طلب المورد بشكل آمن
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_vendor_order_item_status(
  p_order_item_id uuid,
  p_status public.vendor_order_status,
  p_note text DEFAULT ''
)
RETURNS public.order_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE
  _item public.order_items;

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'vendor'
     )
  THEN

    RAISE EXCEPTION
      'غير مصرح';

  END IF;


  UPDATE public.order_items oi

  SET
    vendor_status = p_status,
    vendor_note =
      LEFT(
        COALESCE(
          p_note,
          ''
        ),
        1000
      ),
    vendor_updated_at = now()

  WHERE oi.id = p_order_item_id

    AND oi.vendor_id IN (

      SELECT v.id
      FROM public.vendors v

      WHERE v.user_id = auth.uid()
        AND v.is_active = true
        AND v.account_enabled = true

    )

  RETURNING oi.*
  INTO _item;


  IF _item.id IS NULL THEN

    RAISE EXCEPTION
      'الطلب غير موجود أو لا يتبع متجرك';

  END IF;


  RETURN _item;

END;
$$;


REVOKE ALL
ON FUNCTION public.update_vendor_order_item_status(
  uuid,
  public.vendor_order_status,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.update_vendor_order_item_status(
  uuid,
  public.vendor_order_status,
  text
)
TO authenticated;


-- ============================================================
-- 8. سجل معاملات المحافظ
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallet_transactions (

  id uuid
    PRIMARY KEY
    DEFAULT gen_random_uuid(),

  user_id uuid
    NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  amount numeric(12,2)
    NOT NULL,

  balance_before numeric(12,2)
    DEFAULT 0,

  balance_after numeric(12,2)
    DEFAULT 0,

  transaction_type text
    NOT NULL,

  reason text
    NOT NULL DEFAULT '',

  created_by uuid
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  created_at timestamptz
    NOT NULL DEFAULT now()

);


-- ============================================================
-- 8.1 إصلاح الجداول الموجودة مسبقاً
-- ============================================================
-- مهم:
-- CREATE TABLE IF NOT EXISTS لا يضيف الأعمدة إلى جدول موجود.
-- لذلك نضيف الأعمدة المطلوبة بشكل صريح.

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS balance_before numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_after numeric(12,2) DEFAULT 0;


CREATE INDEX IF NOT EXISTS
wallet_transactions_user_created_idx

ON public.wallet_transactions(
  user_id,
  created_at DESC
);


ALTER TABLE public.wallet_transactions
ENABLE ROW LEVEL SECURITY;


GRANT SELECT
ON public.wallet_transactions
TO authenticated;


GRANT ALL
ON public.wallet_transactions
TO service_role;


DROP POLICY IF EXISTS
wallet_transactions_own_read
ON public.wallet_transactions;


CREATE POLICY
wallet_transactions_own_read

ON public.wallet_transactions

FOR SELECT

TO authenticated

USING (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS
wallet_transactions_admin_read
ON public.wallet_transactions;


CREATE POLICY
wallet_transactions_admin_read

ON public.wallet_transactions

FOR SELECT

TO authenticated

USING (
  public.has_role(
    auth.uid(),
    'admin'
  )
);


-- ============================================================
-- 9. تسجيل الأرصدة الحالية كسجل افتتاحي
-- ============================================================

INSERT INTO public.wallet_transactions(
  user_id,
  amount,
  balance_before,
  balance_after,
  transaction_type,
  reason,
  created_by
)

SELECT
  p.id,
  p.wallet_balance,
  0,
  p.wallet_balance,
  'opening_balance',
  'الرصيد الافتتاحي عند تفعيل سجل المحفظة',
  NULL

FROM public.profiles p

WHERE COALESCE(p.wallet_balance, 0) <> 0

  AND NOT EXISTS (

    SELECT 1
    FROM public.wallet_transactions wt

    WHERE wt.user_id = p.id

  );


-- ============================================================
-- 10. تعديل رصيد المستخدم بواسطة الإدارة
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_adjust_user_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_reason text DEFAULT '',
  p_mode text DEFAULT 'delta'
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE

  _profile public.profiles;

  _before numeric(12,2);

  _after numeric(12,2);

  _delta numeric(12,2);

  _mode text :=
    lower(
      trim(
        COALESCE(
          p_mode,
          'delta'
        )
      )
    );

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'admin'
     )
  THEN

    RAISE EXCEPTION
      'غير مصرح';

  END IF;


  IF p_user_id IS NULL THEN

    RAISE EXCEPTION
      'معرّف المستخدم مطلوب';

  END IF;


  IF p_amount IS NULL
     OR NOT isfinite(p_amount)
  THEN

    RAISE EXCEPTION
      'قيمة الرصيد غير صالحة';

  END IF;


  IF _mode NOT IN (
    'delta',
    'set'
  )
  THEN

    RAISE EXCEPTION
      'وضع تعديل الرصيد غير صالح';

  END IF;


  SELECT *
  INTO _profile

  FROM public.profiles

  WHERE id = p_user_id

  FOR UPDATE;


  IF _profile.id IS NULL THEN

    RAISE EXCEPTION
      'المستخدم غير موجود';

  END IF;


  _before :=
    COALESCE(
      _profile.wallet_balance,
      0
    );


  IF _mode = 'set' THEN

    _after :=
      round(
        p_amount,
        2
      );

    _delta :=
      _after - _before;

  ELSE

    _delta :=
      round(
        p_amount,
        2
      );

    _after :=
      _before + _delta;

  END IF;


  IF _after < 0 THEN

    RAISE EXCEPTION
      'لا يمكن أن يصبح رصيد المحفظة سالباً';

  END IF;


  UPDATE public.profiles

  SET
    wallet_balance = _after,
    updated_at = now()

  WHERE id = p_user_id

  RETURNING *
  INTO _profile;


  IF _delta <> 0 THEN

    INSERT INTO public.wallet_transactions(
      user_id,
      amount,
      balance_before,
      balance_after,
      transaction_type,
      reason,
      created_by
    )

    VALUES(
      p_user_id,
      _delta,
      _before,
      _after,

      CASE
        WHEN _delta >= 0
        THEN 'admin_credit'
        ELSE 'admin_debit'
      END,

      LEFT(
        COALESCE(
          p_reason,
          ''
        ),
        500
      ),

      auth.uid()
    );

  END IF;


  RETURN _profile;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_adjust_user_wallet(
  uuid,
  numeric,
  text,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_adjust_user_wallet(
  uuid,
  numeric,
  text,
  text
)
TO authenticated;


-- ============================================================
-- 11. صلاحيات الإدارة للقراءة
-- ============================================================

DROP POLICY IF EXISTS
profiles_admin_read
ON public.profiles;


CREATE POLICY
profiles_admin_read

ON public.profiles

FOR SELECT

TO authenticated

USING (
  public.has_role(
    auth.uid(),
    'admin'
  )
);


DROP POLICY IF EXISTS
vendors_admin_read
ON public.vendors;


CREATE POLICY
vendors_admin_read

ON public.vendors

FOR SELECT

TO authenticated

USING (
  public.has_role(
    auth.uid(),
    'admin'
  )
);


DROP POLICY IF EXISTS
addresses_admin_read
ON public.addresses;


CREATE POLICY
addresses_admin_read

ON public.addresses

FOR SELECT

TO authenticated

USING (
  public.has_role(
    auth.uid(),
    'admin'
  )
);


DROP POLICY IF EXISTS
order_items_admin_read
ON public.order_items;


CREATE POLICY
order_items_admin_read

ON public.order_items

FOR SELECT

TO authenticated

USING (
  public.has_role(
    auth.uid(),
    'admin'
  )
);


DROP POLICY IF EXISTS
orders_admin_read
ON public.orders;


CREATE POLICY
orders_admin_read

ON public.orders

FOR SELECT

TO authenticated

USING (
  public.has_role(
    auth.uid(),
    'admin'
  )
  OR auth.uid() = user_id
);


-- ============================================================
-- 12. تعطيل / تفعيل حساب المستخدم بواسطة الإدارة
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_user_disabled(
  p_user_id uuid,
  p_disabled boolean
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile public.profiles;
BEGIN

  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'admin'
     )
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'معرّف المستخدم مطلوب';
  END IF;


  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'لا يمكنك تعطيل حساب الإدارة الحالي';
  END IF;


  UPDATE public.profiles

  SET
    is_disabled = COALESCE(
      p_disabled,
      false
    ),
    updated_at = now()

  WHERE id = p_user_id

  RETURNING *
  INTO _profile;


  IF _profile.id IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;


  RETURN _profile;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_set_user_disabled(
  uuid,
  boolean
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_set_user_disabled(
  uuid,
  boolean
)
TO authenticated;


-- ============================================================
-- تحديث PostgREST schema
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
