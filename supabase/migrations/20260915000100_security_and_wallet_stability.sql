BEGIN;

-- ============================================================
-- SHEHARA STABILITY + SECURITY HARDENING
-- ============================================================


-- ============================================================
-- 1. WALLET RPC
-- ============================================================

-- إزالة التوقيع القديم حتى لا يحدث تضارب في PostgREST
DROP FUNCTION IF EXISTS public.admin_update_wallet_balance(
  uuid,
  text,
  numeric,
  text,
  text
);


CREATE OR REPLACE FUNCTION public.admin_update_wallet_balance(
  p_amount numeric,
  p_currency text,
  p_mode text DEFAULT 'delta',
  p_reason text DEFAULT '',
  p_user_id uuid DEFAULT NULL
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.wallets%ROWTYPE;

  currency_code text :=
    upper(trim(coalesce(p_currency, 'YER')));

  mode_code text :=
    lower(trim(coalesce(p_mode, 'delta')));

  before_balance numeric(14,2);
  after_balance numeric(14,2);
  delta_amount numeric(14,2);

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'معرّف المستخدم مطلوب';
  END IF;


  IF currency_code NOT IN ('YER','SAR') THEN
    RAISE EXCEPTION 'العملة غير مدعومة';
  END IF;


  IF p_amount IS NULL
     OR p_amount = 'NaN'::numeric
  THEN
    RAISE EXCEPTION 'قيمة الرصيد غير صالحة';
  END IF;


  IF mode_code NOT IN ('delta','set') THEN
    RAISE EXCEPTION 'وضع تعديل الرصيد غير صالح';
  END IF;


  PERFORM public.ensure_wallet(
    p_user_id,
    currency_code
  );


  SELECT *
  INTO w
  FROM public.wallets
  WHERE user_id = p_user_id
    AND currency = currency_code
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'تعذر الوصول إلى المحفظة';
  END IF;


  before_balance :=
    round(coalesce(w.balance, 0), 2);


  IF mode_code = 'set' THEN

    after_balance :=
      round(p_amount, 2);

    delta_amount :=
      after_balance - before_balance;

  ELSE

    delta_amount :=
      round(p_amount, 2);

    after_balance :=
      before_balance + delta_amount;

  END IF;


  IF after_balance < 0 THEN
    RAISE EXCEPTION
      'لا يمكن أن يصبح رصيد المحفظة سالباً';
  END IF;


  UPDATE public.wallets
  SET
    balance = after_balance,
    updated_at = now()
  WHERE id = w.id
  RETURNING *
  INTO w;


  IF delta_amount <> 0 THEN

    INSERT INTO public.wallet_transactions(
      wallet_id,
      user_id,
      currency,
      transaction_type,
      kind,
      amount,
      balance_before,
      balance_after,
      description,
      reference_type,
      reference_id,
      created_by,
      created_at
    )

    VALUES(
      w.id,
      p_user_id,
      currency_code,

      CASE
        WHEN delta_amount > 0
        THEN 'credit'
        ELSE 'debit'
      END,

      CASE
        WHEN delta_amount > 0
        THEN 'credit'
        ELSE 'debit'
      END,

      abs(delta_amount),

      before_balance,
      after_balance,

      left(
        coalesce(
          nullif(trim(p_reason), ''),
          'تعديل رصيد من الإدارة'
        ),
        500
      ),

      'admin_adjustment',

      gen_random_uuid(),

      auth.uid(),

      now()
    );

  END IF;


  RETURN w;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_update_wallet_balance(
  numeric,
  text,
  text,
  text,
  uuid
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_update_wallet_balance(
  numeric,
  text,
  text,
  text,
  uuid
)
TO authenticated;



-- ============================================================
-- 2. منع التلاعب بسعر المنتج داخل الطلب
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_order_item_product_values()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE
  p public.products%ROWTYPE;

BEGIN

  IF NEW.quantity IS NULL
     OR NEW.quantity < 1
  THEN
    RAISE EXCEPTION
      'كمية المنتج يجب أن تكون أكبر من صفر';
  END IF;


  IF NEW.product_id IS NULL THEN

    IF NEW.unit_price IS NULL
       OR NEW.unit_price < 0
    THEN
      RAISE EXCEPTION
        'سعر المنتج غير صالح';
    END IF;

    RETURN NEW;

  END IF;


  SELECT *
  INTO p
  FROM public.products
  WHERE id = NEW.product_id
  FOR SHARE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'المنتج غير موجود';
  END IF;


  IF NOT p.is_active THEN
    RAISE EXCEPTION
      'المنتج غير متاح حالياً';
  END IF;


  -- البيانات الحقيقية تأتي من المنتج وليس من العميل
  NEW.product_name :=
    p.name;

  NEW.unit_price :=
    round(p.price, 2);

  NEW.product_image :=
    coalesce(p.images[1], '');


  RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS enforce_order_item_product_values
ON public.order_items;


CREATE TRIGGER enforce_order_item_product_values

BEFORE INSERT OR UPDATE OF
  product_id,
  unit_price,
  quantity,
  product_name,
  product_image

ON public.order_items

FOR EACH ROW

EXECUTE FUNCTION
public.enforce_order_item_product_values();



-- ============================================================
-- 3. إعادة حساب subtotal / total من order_items
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalculate_order_financials(
  p_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE

  subtotal_value numeric(12,2);

  delivery_value numeric(12,2) := 0;

  has_subtotal boolean;

  has_delivery_fee boolean;

BEGIN

  IF p_order_id IS NULL THEN
    RETURN;
  END IF;


  SELECT
    round(
      coalesce(
        sum(
          oi.unit_price * oi.quantity
        ),
        0
      ),
      2
    )

  INTO subtotal_value

  FROM public.order_items oi

  WHERE oi.order_id = p_order_id;



  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'subtotal'
  )

  INTO has_subtotal;



  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'delivery_fee'
  )

  INTO has_delivery_fee;



  IF has_delivery_fee THEN

    EXECUTE
      'SELECT coalesce(delivery_fee, 0)
       FROM public.orders
       WHERE id = $1'

    INTO delivery_value

    USING p_order_id;

  END IF;



  IF has_subtotal
     AND has_delivery_fee
  THEN

    EXECUTE
      'UPDATE public.orders
       SET
         subtotal = $1,
         total = $1 + coalesce(delivery_fee, 0),
         updated_at = now()
       WHERE id = $2'

    USING
      subtotal_value,
      p_order_id;


  ELSIF has_subtotal THEN

    EXECUTE
      'UPDATE public.orders
       SET
         subtotal = $1,
         total = $1,
         updated_at = now()
       WHERE id = $2'

    USING
      subtotal_value,
      p_order_id;


  ELSE

    UPDATE public.orders

    SET
      total =
        subtotal_value + delivery_value,
      updated_at = now()

    WHERE id = p_order_id;

  END IF;

END;
$$;



CREATE OR REPLACE FUNCTION
public.recalculate_order_financials_from_items()

RETURNS trigger

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

BEGIN

  IF TG_OP = 'DELETE' THEN

    PERFORM
      public.recalculate_order_financials(
        OLD.order_id
      );

    RETURN OLD;

  END IF;


  PERFORM
    public.recalculate_order_financials(
      NEW.order_id
    );


  IF TG_OP = 'UPDATE'
     AND OLD.order_id IS DISTINCT FROM NEW.order_id
  THEN

    PERFORM
      public.recalculate_order_financials(
        OLD.order_id
      );

  END IF;


  RETURN NEW;

END;
$$;



DROP TRIGGER IF EXISTS
recalculate_order_financials_from_items

ON public.order_items;


CREATE TRIGGER
recalculate_order_financials_from_items

AFTER INSERT
OR UPDATE OF order_id, unit_price, quantity
OR DELETE

ON public.order_items

FOR EACH ROW

EXECUTE FUNCTION
public.recalculate_order_financials_from_items();



-- ============================================================
-- 4. منع تعديل total مباشرة
-- ============================================================

CREATE OR REPLACE FUNCTION
public.recalculate_order_financials_from_order()

RETURNS trigger

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

BEGIN

  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;


  PERFORM
    public.recalculate_order_financials(
      NEW.id
    );


  RETURN NEW;

END;
$$;



DROP TRIGGER IF EXISTS
recalculate_order_financials_from_order

ON public.orders;


CREATE TRIGGER
recalculate_order_financials_from_order

AFTER INSERT
OR UPDATE OF total

ON public.orders

FOR EACH ROW

EXECUTE FUNCTION
public.recalculate_order_financials_from_order();



-- ============================================================
-- 5. تحديث PostgREST Schema Cache
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
