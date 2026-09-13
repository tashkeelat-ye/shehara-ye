BEGIN;

-- ============================================================
-- SHEHARA
-- Vendor Orders + Supplier Snapshots + Admin Wallet Management
-- ============================================================


-- ============================================================
-- 1. ربط عناصر الطلب بالمورد
-- ============================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS vendor_id uuid;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS vendor_name text NOT NULL DEFAULT '';

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS vendor_phone text NOT NULL DEFAULT '';

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS vendor_city text NOT NULL DEFAULT '';

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS vendor_logo_url text;


-- ============================================================
-- 2. Foreign Key
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.order_items'::regclass
      AND conname = 'order_items_vendor_id_fkey'
  ) THEN

    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_vendor_id_fkey
      FOREIGN KEY (vendor_id)
      REFERENCES public.vendors(id)
      ON DELETE SET NULL;

  END IF;
END
$$;


CREATE INDEX IF NOT EXISTS
order_items_vendor_idx
ON public.order_items(vendor_id);

CREATE INDEX IF NOT EXISTS
order_items_order_vendor_idx
ON public.order_items(order_id, vendor_id);


-- ============================================================
-- 3. تعبئة المورد تلقائياً من المنتج
--
-- لا نثق أبداً في vendor_id القادم من Frontend.
-- المصدر الحقيقي هو products.vendor_id.
-- ============================================================

CREATE OR REPLACE FUNCTION public.populate_order_item_vendor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor public.vendors%ROWTYPE;
BEGIN

  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;


  SELECT v.*
  INTO _vendor
  FROM public.products p
  LEFT JOIN public.vendors v
    ON v.id = p.vendor_id
  WHERE p.id = NEW.product_id
  LIMIT 1;


  IF _vendor.id IS NULL THEN

    NEW.vendor_id := NULL;
    NEW.vendor_name := '';
    NEW.vendor_phone := '';
    NEW.vendor_city := '';
    NEW.vendor_logo_url := NULL;

    RETURN NEW;

  END IF;


  NEW.vendor_id := _vendor.id;
  NEW.vendor_name := COALESCE(_vendor.name, '');
  NEW.vendor_phone := COALESCE(_vendor.phone, '');
  NEW.vendor_city := COALESCE(_vendor.city, '');
  NEW.vendor_logo_url := _vendor.logo_url;


  RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS
populate_order_item_vendor
ON public.order_items;


CREATE TRIGGER
populate_order_item_vendor
BEFORE INSERT OR UPDATE OF product_id
ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.populate_order_item_vendor();


-- ============================================================
-- 4. إصلاح عناصر الطلبات القديمة
-- ============================================================

UPDATE public.order_items oi
SET
  vendor_id = p.vendor_id,
  vendor_name = COALESCE(v.name, ''),
  vendor_phone = COALESCE(v.phone, ''),
  vendor_city = COALESCE(v.city, ''),
  vendor_logo_url = v.logo_url
FROM public.products p
LEFT JOIN public.vendors v
  ON v.id = p.vendor_id
WHERE oi.product_id = p.id;


-- ============================================================
-- 5. View جاهز لطلبات الموردين
-- ============================================================

CREATE OR REPLACE VIEW public.vendor_order_items
WITH (security_invoker = true)
AS
SELECT
  oi.id,
  oi.order_id,
  oi.product_id,
  oi.product_name,
  oi.product_image,
  oi.unit_price,
  oi.quantity,
  oi.size,
  oi.color,
  oi.currency,

  oi.vendor_id,
  oi.vendor_name,
  oi.vendor_phone,
  oi.vendor_city,
  oi.vendor_logo_url,

  o.order_number,
  o.invoice_number,
  o.status,
  o.payment_status,
  o.payment_method_code,
  o.subtotal,
  o.delivery_fee,
  o.total,
  o.currency AS order_currency,

  o.user_id,
  o.shipping_name,
  o.shipping_phone,
  o.shipping_city,
  o.shipping_district,
  o.shipping_details,
  o.shipping_landmark,
  o.latitude,
  o.longitude,
  o.notes,

  o.created_at AS order_created_at

FROM public.order_items oi
JOIN public.orders o
  ON o.id = oi.order_id;


GRANT SELECT
ON public.vendor_order_items
TO authenticated;


-- ============================================================
-- 6. إشعار التاجر عند وصول طلب
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_vendor_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor_user_id uuid;
  _order_number text;
  _items_count integer;
  _vendor_total numeric;
BEGIN

  SELECT
    v.user_id,
    o.order_number
  INTO
    _vendor_user_id,
    _order_number
  FROM public.order_items oi
  JOIN public.vendors v
    ON v.id = oi.vendor_id
  JOIN public.orders o
    ON o.id = oi.order_id
  WHERE oi.order_id = NEW.order_id
    AND oi.vendor_id IS NOT NULL
    AND v.user_id IS NOT NULL
  LIMIT 1;


  IF _vendor_user_id IS NULL THEN
    RETURN NEW;
  END IF;


  SELECT
    count(*),
    COALESCE(
      SUM(oi.unit_price * oi.quantity),
      0
    )
  INTO
    _items_count,
    _vendor_total
  FROM public.order_items oi
  WHERE oi.order_id = NEW.order_id
    AND oi.vendor_id = NEW.vendor_id;


  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    link_url,
    kind
  )
  VALUES (
    _vendor_user_id,
    'طلب جديد من شهارة',
    'وصل طلب جديد رقم '
      || _order_number
      || ' يحتوي على '
      || _items_count
      || ' منتج بقيمة '
      || _vendor_total
      || ' ر.ي',
    '/merchant',
    'vendor_order'
  );


  RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS
notify_vendor_order_created
ON public.order_items;


CREATE TRIGGER
notify_vendor_order_created
AFTER INSERT
ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_vendor_order_created();


-- ============================================================
-- 7. صلاحيات الإدارة لقراءة المحافظ
-- ============================================================

ALTER TABLE public.wallets
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
wallets_admin_select
ON public.wallets;

CREATE POLICY
wallets_admin_select
ON public.wallets
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);


-- ============================================================
-- 8. صلاحيات الإدارة لقراءة Ledger
-- ============================================================

ALTER TABLE public.wallet_transactions
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
wallet_transactions_admin_select
ON public.wallet_transactions;

CREATE POLICY
wallet_transactions_admin_select
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);


-- ============================================================
-- 9. تعديل رصيد المستخدم بطريقة آمنة
--
-- لا يسمح بتعديل wallets مباشرة.
-- كل تعديل يسجل في wallet_transactions.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_wallet_balance(
  _user_id uuid,
  _currency text,
  _new_balance numeric,
  _description text DEFAULT 'تعديل رصيد من الإدارة'
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _wallet public.wallets%ROWTYPE;

  _old_balance numeric(14,2);

  _new numeric(14,2);

  _difference numeric(14,2);

BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول';
  END IF;


  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  IF _user_id IS NULL THEN
    RAISE EXCEPTION
      'المستخدم غير صالح';
  END IF;


  IF UPPER(TRIM(_currency))
     NOT IN ('YER', 'SAR')
  THEN
    RAISE EXCEPTION
      'العملة غير مدعومة';
  END IF;


  _new := ROUND(
    GREATEST(
      COALESCE(_new_balance, 0),
      0
    ),
    2
  );


  PERFORM public.ensure_wallet(
    _user_id,
    UPPER(TRIM(_currency))
  );


  SELECT *
  INTO _wallet
  FROM public.wallets
  WHERE user_id = _user_id
    AND currency = UPPER(TRIM(_currency))
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'تعذر الوصول إلى المحفظة';
  END IF;


  _old_balance :=
    COALESCE(_wallet.balance, 0);


  _difference :=
    _new - _old_balance;


  IF _difference = 0 THEN
    RETURN _wallet;
  END IF;


  UPDATE public.wallets
  SET
    balance = _new,
    updated_at = now()
  WHERE id = _wallet.id
  RETURNING *
  INTO _wallet;


  INSERT INTO public.wallet_transactions (
    wallet_id,
    user_id,
    currency,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    reference_type,
    reference_id,
    created_by
  )
  VALUES (
    _wallet.id,
    _user_id,
    _wallet.currency,

    CASE
      WHEN _difference > 0
      THEN 'credit'
      ELSE 'debit'
    END,

    ABS(_difference),

    _old_balance,
    _new,

    COALESCE(
      NULLIF(
        TRIM(_description),
        ''
      ),
      'تعديل رصيد من الإدارة'
    ),

    'admin_adjustment',

    gen_random_uuid(),

    auth.uid()
  );


  RETURN _wallet;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_set_wallet_balance(
  uuid,
  text,
  numeric,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_set_wallet_balance(
  uuid,
  text,
  numeric,
  text
)
TO authenticated;


-- ============================================================
-- 10. إضافة رصيد للمستخدم
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_add_wallet_balance(
  _user_id uuid,
  _currency text,
  _amount numeric,
  _description text DEFAULT 'إضافة رصيد من الإدارة'
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _wallet public.wallets%ROWTYPE;

  _amount_value numeric(14,2);

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  _amount_value := ROUND(
    COALESCE(_amount, 0),
    2
  );


  IF _amount_value <= 0 THEN
    RAISE EXCEPTION
      'مبلغ الإضافة يجب أن يكون أكبر من صفر';
  END IF;


  PERFORM public.ensure_wallet(
    _user_id,
    UPPER(TRIM(_currency))
  );


  SELECT *
  INTO _wallet
  FROM public.wallets
  WHERE user_id = _user_id
    AND currency = UPPER(TRIM(_currency))
  FOR UPDATE;


  UPDATE public.wallets
  SET
    balance =
      balance + _amount_value,
    updated_at = now()
  WHERE id = _wallet.id
  RETURNING *
  INTO _wallet;


  INSERT INTO public.wallet_transactions (
    wallet_id,
    user_id,
    currency,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    reference_type,
    reference_id,
    created_by
  )
  VALUES (
    _wallet.id,
    _user_id,
    _wallet.currency,
    'credit',
    _amount_value,
    _wallet.balance - _amount_value,
    _wallet.balance,
    COALESCE(
      NULLIF(
        TRIM(_description),
        ''
      ),
      'إضافة رصيد من الإدارة'
    ),
    'admin_topup',
    gen_random_uuid(),
    auth.uid()
  );


  RETURN _wallet;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_add_wallet_balance(
  uuid,
  text,
  numeric,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_add_wallet_balance(
  uuid,
  text,
  numeric,
  text
)
TO authenticated;


-- ============================================================
-- 11. View تفصيل المورد
-- ============================================================

CREATE OR REPLACE VIEW public.vendor_product_summary
WITH (security_invoker = true)
AS
SELECT
  v.id AS vendor_id,
  v.user_id,
  v.name AS vendor_name,
  v.city AS vendor_city,
  v.phone AS vendor_phone,
  v.logo_url,
  v.description AS vendor_description,
  v.is_active,
  v.account_enabled,

  p.id AS product_id,
  p.name AS product_name,
  p.price,
  p.old_price,
  p.images,
  p.stock_left,
  p.total_stock,
  p.is_active AS product_active,
  p.created_at AS product_created_at

FROM public.vendors v
LEFT JOIN public.products p
  ON p.vendor_id = v.id;


GRANT SELECT
ON public.vendor_product_summary
TO authenticated;


-- ============================================================
-- 12. تحديث Schema Cache
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
