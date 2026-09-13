BEGIN;

-- ============================================================
-- SHEHARA
-- Vendor Marketplace Prerequisites
-- ============================================================

-- ============================================================
-- 1. إنشاء is_vendor إذا لم تكن موجودة
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text = 'vendor'
  );
$$;

REVOKE ALL
ON FUNCTION public.is_vendor()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_vendor()
TO authenticated;


-- ============================================================
-- 2. ضمان وجود unique user_id للتاجر
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
vendors_user_id_unique_idx
ON public.vendors(user_id)
WHERE user_id IS NOT NULL;


-- ============================================================
-- 3. صلاحيات التاجر على متجره
-- ============================================================

DROP POLICY IF EXISTS vendors_own_update
ON public.vendors;

CREATE POLICY vendors_own_update
ON public.vendors
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND public.is_vendor()
)
WITH CHECK (
  user_id = auth.uid()
  AND public.is_vendor()
);


-- ============================================================
-- 4. صلاحيات المنتجات
-- ============================================================

DROP POLICY IF EXISTS products_vendor_insert
ON public.products;

CREATE POLICY products_vendor_insert
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_vendor()
  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.id = products.vendor_id
      AND v.user_id = auth.uid()
      AND v.is_active = true
      AND v.account_enabled = true
  )
);


DROP POLICY IF EXISTS products_vendor_update
ON public.products;

CREATE POLICY products_vendor_update
ON public.products
FOR UPDATE
TO authenticated
USING (
  public.is_vendor()
  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.id = products.vendor_id
      AND v.user_id = auth.uid()
      AND v.is_active = true
      AND v.account_enabled = true
  )
)
WITH CHECK (
  public.is_vendor()
  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.id = products.vendor_id
      AND v.user_id = auth.uid()
      AND v.is_active = true
      AND v.account_enabled = true
  )
);


DROP POLICY IF EXISTS products_vendor_delete
ON public.products;

CREATE POLICY products_vendor_delete
ON public.products
FOR DELETE
TO authenticated
USING (
  public.is_vendor()
  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.id = products.vendor_id
      AND v.user_id = auth.uid()
      AND v.is_active = true
      AND v.account_enabled = true
  )
);


-- ============================================================
-- 5. حماية ملكية المنتج
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_vendor_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor_id uuid;
BEGIN

  IF NOT public.is_vendor() THEN
    RETURN NEW;
  END IF;

  SELECT v.id
  INTO _vendor_id
  FROM public.vendors v
  WHERE v.user_id = auth.uid()
    AND v.is_active = true
    AND v.account_enabled = true
  LIMIT 1;

  IF _vendor_id IS NULL THEN
    RAISE EXCEPTION
      'حساب التاجر غير مفعّل';
  END IF;

  IF TG_OP = 'INSERT' THEN

    IF NEW.vendor_id IS DISTINCT FROM _vendor_id THEN
      RAISE EXCEPTION
        'لا يمكن إضافة المنتج إلى متجر آخر';
    END IF;

  ELSE

    IF OLD.vendor_id IS DISTINCT FROM _vendor_id THEN
      RAISE EXCEPTION
        'هذا المنتج لا يتبع متجرك';
    END IF;

    IF NEW.vendor_id IS DISTINCT FROM OLD.vendor_id THEN
      RAISE EXCEPTION
        'لا يمكن نقل المنتج إلى متجر آخر';
    END IF;

    -- لا يسمح للتاجر بتغيير إحصائيات المنصة
    NEW.rating := OLD.rating;
    NEW.reviews_count := OLD.reviews_count;
    NEW.sales_count := OLD.sales_count;
    NEW.is_featured := OLD.is_featured;
    NEW.featured_sort := OLD.featured_sort;

  END IF;

  IF NEW.total_stock < 0
     OR NEW.stock_left < 0
     OR NEW.stock_left > NEW.total_stock
  THEN
    RAISE EXCEPTION
      'قيم المخزون غير صحيحة';
  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS protect_vendor_product
ON public.products;

CREATE TRIGGER protect_vendor_product
BEFORE INSERT OR UPDATE
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.protect_vendor_product();


-- ============================================================
-- 6. سجل حركة المخزون
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_vendor_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _difference integer;
BEGIN

  IF NOT public.is_vendor() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN

    IF NEW.total_stock > 0 THEN
      INSERT INTO public.inventory_movements (
        product_id,
        quantity,
        movement_type,
        note,
        created_by
      )
      VALUES (
        NEW.id,
        NEW.total_stock,
        'initial',
        'مخزون أولي أضافه التاجر',
        auth.uid()
      );
    END IF;

    RETURN NEW;
  END IF;

  _difference :=
    NEW.total_stock - OLD.total_stock;

  IF _difference <> 0 THEN
    INSERT INTO public.inventory_movements (
      product_id,
      quantity,
      movement_type,
      note,
      created_by
    )
    VALUES (
      NEW.id,
      _difference,
      'adjustment',
      'تعديل مخزون من لوحة التاجر',
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS audit_vendor_stock
ON public.products;

CREATE TRIGGER audit_vendor_stock
AFTER INSERT OR UPDATE OF total_stock
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.audit_vendor_stock();


NOTIFY pgrst, 'reload schema';

COMMIT;
