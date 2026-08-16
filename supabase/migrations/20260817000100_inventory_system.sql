-- =========================================================
-- تشكيلات للتسوق
-- نظام المخزون الأساسي
-- =========================================================

-- ---------------------------------------------------------
-- 1. حقول المخزون في المنتجات
-- ---------------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS total_stock integer
    NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_left integer
    NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer
    NOT NULL DEFAULT 5;

-- ---------------------------------------------------------
-- 2. حماية قيم المخزون
-- ---------------------------------------------------------

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_stock_non_negative;

ALTER TABLE public.products
  ADD CONSTRAINT products_stock_non_negative
  CHECK (
    total_stock >= 0
    AND stock_left >= 0
    AND stock_left <= total_stock
    AND low_stock_threshold >= 0
  );

CREATE INDEX IF NOT EXISTS products_stock_idx
  ON public.products(stock_left);

-- ---------------------------------------------------------
-- 3. سجل حركات المخزون
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id uuid NOT NULL
    REFERENCES public.products(id)
    ON DELETE CASCADE,

  quantity integer NOT NULL,

  movement_type text NOT NULL,

  reference_id uuid NULL,

  note text NOT NULL DEFAULT '',

  created_by uuid NULL
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  created_at timestamptz
    NOT NULL DEFAULT now(),

  CONSTRAINT inventory_movements_type_check
  CHECK (
    movement_type IN (
      'initial',
      'purchase',
      'sale',
      'return',
      'adjustment',
      'damage',
      'reservation_cancel'
    )
  )
);

CREATE INDEX IF NOT EXISTS
  inventory_movements_product_idx
ON public.inventory_movements(
  product_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  inventory_movements_reference_idx
ON public.inventory_movements(
  reference_id
);

GRANT SELECT
ON public.inventory_movements
TO authenticated;

GRANT INSERT
ON public.inventory_movements
TO authenticated;

ALTER TABLE public.inventory_movements
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
  inventory_movements_admin_read
ON public.inventory_movements;

CREATE POLICY
  inventory_movements_admin_read
ON public.inventory_movements
FOR SELECT
TO authenticated
USING (
  public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
);

DROP POLICY IF EXISTS
  inventory_movements_admin_insert
ON public.inventory_movements;

CREATE POLICY
  inventory_movements_admin_insert
ON public.inventory_movements
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(
    auth.uid(),
    'admin'::public.app_role
  )
);

-- ---------------------------------------------------------
-- 4. تحديث المخزون من لوحة الإدارة
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION
public.set_product_stock(
  _product_id uuid,
  _total_stock integer
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_product public.products;
  stock_difference integer;
BEGIN

  IF NOT public.has_role(
    auth.uid(),
    'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION
      'غير مصرح لك بتعديل المخزون';
  END IF;

  IF _total_stock < 0 THEN
    RAISE EXCEPTION
      'المخزون لا يمكن أن يكون سالباً';
  END IF;

  SELECT *
  INTO current_product
  FROM public.products
  WHERE id = _product_id
  FOR UPDATE;

  IF current_product.id IS NULL THEN
    RAISE EXCEPTION
      'المنتج غير موجود';
  END IF;

  stock_difference =
    _total_stock -
    current_product.total_stock;

  UPDATE public.products
  SET
    total_stock = _total_stock,
    stock_left = LEAST(
      GREATEST(
        stock_left + stock_difference,
        0
      ),
      _total_stock
    )
  WHERE id = _product_id
  RETURNING *
  INTO current_product;

  INSERT INTO public.inventory_movements (
    product_id,
    quantity,
    movement_type,
    note,
    created_by
  )
  VALUES (
    _product_id,
    stock_difference,
    'adjustment',
    'تعديل المخزون من لوحة التحكم',
    auth.uid()
  );

  RETURN current_product;
END;
$$;

GRANT EXECUTE
ON FUNCTION public.set_product_stock(
  uuid,
  integer
)
TO authenticated;

-- ---------------------------------------------------------
-- 5. خصم المخزون بشكل ذري
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION
public.deduct_order_stock(
  _order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_item record;
  updated_rows integer;
BEGIN

  IF NOT (
    public.has_role(
      auth.uid(),
      'admin'::public.app_role
    )
    OR EXISTS (
      SELECT 1
      FROM public.orders
      WHERE id = _order_id
        AND user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION
      'غير مصرح لك بتنفيذ هذه العملية';
  END IF;

  FOR order_item IN
    SELECT
      oi.product_id,
      SUM(oi.quantity)::integer AS quantity
    FROM public.order_items oi
    WHERE oi.order_id = _order_id
      AND oi.product_id IS NOT NULL
    GROUP BY oi.product_id
  LOOP

    UPDATE public.products
    SET stock_left =
      stock_left -
      order_item.quantity
    WHERE id = order_item.product_id
      AND stock_left >= order_item.quantity;

    GET DIAGNOSTICS
      updated_rows = ROW_COUNT;

    IF updated_rows = 0 THEN
      RAISE EXCEPTION
        'المخزون غير كافٍ للمنتج %',
        order_item.product_id;
    END IF;

    INSERT INTO public.inventory_movements (
      product_id,
      quantity,
      movement_type,
      reference_id,
      note,
      created_by
    )
    VALUES (
      order_item.product_id,
      -order_item.quantity,
      'sale',
      _order_id,
      'خصم المخزون بسبب تأكيد الطلب',
      auth.uid()
    );

  END LOOP;

END;
$$;

GRANT EXECUTE
ON FUNCTION public.deduct_order_stock(uuid)
TO authenticated;

-- ---------------------------------------------------------
-- 6. إعادة المخزون عند إلغاء الطلب
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION
public.restore_order_stock(
  _order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_item record;
BEGIN

  IF NOT (
    public.has_role(
      auth.uid(),
      'admin'::public.app_role
    )
    OR EXISTS (
      SELECT 1
      FROM public.orders
      WHERE id = _order_id
        AND user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION
      'غير مصرح لك بتنفيذ هذه العملية';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.inventory_movements
    WHERE reference_id = _order_id
      AND movement_type =
        'reservation_cancel'
  ) THEN
    RETURN;
  END IF;

  FOR order_item IN
    SELECT
      oi.product_id,
      SUM(oi.quantity)::integer AS quantity
    FROM public.order_items oi
    WHERE oi.order_id = _order_id
      AND oi.product_id IS NOT NULL
    GROUP BY oi.product_id
  LOOP

    UPDATE public.products
    SET stock_left =
      LEAST(
        total_stock,
        stock_left +
        order_item.quantity
      )
    WHERE id =
      order_item.product_id;

    INSERT INTO public.inventory_movements (
      product_id,
      quantity,
      movement_type,
      reference_id,
      note,
      created_by
    )
    VALUES (
      order_item.product_id,
      order_item.quantity,
      'reservation_cancel',
      _order_id,
      'إعادة المخزون بسبب إلغاء الطلب',
      auth.uid()
    );

  END LOOP;

END;
$$;

GRANT EXECUTE
ON FUNCTION public.restore_order_stock(uuid)
TO authenticated;
