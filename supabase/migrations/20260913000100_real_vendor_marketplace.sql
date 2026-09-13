BEGIN;

-- ============================================================
-- SHEHARA
-- REAL VENDOR MARKETPLACE
-- ============================================================

-- ------------------------------------------------------------
-- 1. التاجر يستطيع تعديل بيانات متجره فقط
-- ولا يستطيع تغيير حالة اعتماد المتجر.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS vendors_own_update ON public.vendors;

CREATE POLICY vendors_own_update
ON public.vendors
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
  AND is_active = (
    SELECT v.is_active
    FROM public.vendors v
    WHERE v.id = vendors.id
  )
  AND account_enabled = (
    SELECT v.account_enabled
    FROM public.vendors v
    WHERE v.id = vendors.id
  )
);

-- ------------------------------------------------------------
-- 2. حذف منتجات التاجر نفسه
-- ------------------------------------------------------------

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

-- ------------------------------------------------------------
-- 3. حماية الحقول التي لا يجب أن يتحكم بها التاجر
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_vendor_product_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor_id uuid;
  _active boolean;
BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_vendor()
  THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    v.id,
    (v.is_active AND v.account_enabled)
  INTO
    _vendor_id,
    _active
  FROM public.vendors v
  WHERE v.user_id = auth.uid()
  LIMIT 1;

  IF _vendor_id IS NULL
     OR NOT COALESCE(_active, false)
  THEN
    RAISE EXCEPTION
      'حساب التاجر غير مفعّل';
  END IF;

  -- إنشاء منتج
  IF TG_OP = 'INSERT' THEN

    IF NEW.vendor_id IS DISTINCT FROM _vendor_id THEN
      RAISE EXCEPTION
        'لا يمكن إنشاء منتج خارج متجرك';
    END IF;

    -- الحقول التي تحسبها المنصة
    NEW.rating := 0;
    NEW.reviews_count := 0;
    NEW.sales_count := 0;
    NEW.is_featured := false;
    NEW.featured_sort := 0;

    IF NEW.total_stock < 0
       OR NEW.stock_left < 0
       OR NEW.stock_left > NEW.total_stock
    THEN
      RAISE EXCEPTION
        'قيم المخزون غير صالحة';
    END IF;

    RETURN NEW;
  END IF;

  -- تعديل منتج
  IF OLD.vendor_id IS DISTINCT FROM _vendor_id THEN
    RAISE EXCEPTION
      'المنتج لا يتبع متجرك';
  END IF;

  IF NEW.vendor_id IS DISTINCT FROM OLD.vendor_id THEN
    RAISE EXCEPTION
      'لا يمكن نقل المنتج إلى متجر آخر';
  END IF;

  -- حماية الإحصائيات
  NEW.rating := OLD.rating;
  NEW.reviews_count := OLD.reviews_count;
  NEW.sales_count := OLD.sales_count;
  NEW.is_featured := OLD.is_featured;
  NEW.featured_sort := OLD.featured_sort;

  IF NEW.total_stock < 0
     OR NEW.stock_left < 0
     OR NEW.stock_left > NEW.total_stock
  THEN
    RAISE EXCEPTION
      'قيم المخزون غير صالحة';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_vendor_product_fields
ON public.products;

CREATE TRIGGER protect_vendor_product_fields
BEFORE INSERT OR UPDATE
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.protect_vendor_product_fields();

-- ------------------------------------------------------------
-- 4. تسجيل مخزون التاجر في inventory_movements
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_vendor_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _delta integer;
BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_vendor()
  THEN
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

  _delta :=
    NEW.total_stock -
    OLD.total_stock;

  IF _delta <> 0
     OR NEW.stock_left <> OLD.stock_left
  THEN

    INSERT INTO public.inventory_movements (
      product_id,
      quantity,
      movement_type,
      note,
      created_by
    )
    VALUES (
      NEW.id,

      CASE
        WHEN _delta <> 0
        THEN _delta
        ELSE NEW.stock_left - OLD.stock_left
      END,

      'adjustment',
      'تعديل مخزون من لوحة التاجر',
      auth.uid()
    );

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_vendor_product_stock
ON public.products;

CREATE TRIGGER audit_vendor_product_stock
AFTER INSERT OR UPDATE OF total_stock, stock_left
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.audit_vendor_product_stock();

-- ------------------------------------------------------------
-- 5. صور منتجات التاجر
-- المسار:
-- vendors/<user_id>/...
-- ------------------------------------------------------------

DROP POLICY IF EXISTS vendor_products_storage_insert
ON storage.objects;

CREATE POLICY vendor_products_storage_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products'
  AND (storage.foldername(name))[1] = 'vendors'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_vendor()
);

DROP POLICY IF EXISTS vendor_products_storage_select
ON storage.objects;

CREATE POLICY vendor_products_storage_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'products'
  AND (storage.foldername(name))[1] = 'vendors'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_vendor()
);

DROP POLICY IF EXISTS vendor_products_storage_delete
ON storage.objects;

CREATE POLICY vendor_products_storage_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'products'
  AND (storage.foldername(name))[1] = 'vendors'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND public.is_vendor()
);

NOTIFY pgrst, 'reload schema';

COMMIT;
