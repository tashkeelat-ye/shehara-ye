-- ============================================================
-- SHEHARA / شهارة للتسوق
-- PHASE 1 - SECURITY HARDENING
-- Migration: 20260909000100_phase1_security_hardening.sql
--
-- الهدف:
-- 1. تفعيل RLS على الجداول الحساسة.
-- 2. منع المستخدم من الوصول إلى بيانات مستخدم آخر.
-- 3. عزل التاجر عن بقية التجار.
-- 4. عزل عامل التوصيل عن الطلبات غير المسندة إليه.
-- 5. منع تعديل الأدوار من جهة العميل.
-- 6. حماية بيانات الطلبات والفواتير والمخزون.
-- 7. السماح للعميل بإنشاء الطلب فقط عبر secure checkout.
--
-- ملاحظة:
-- هذه Migration جديدة ولا تعدل الـ migrations السابقة.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(
  _user_id uuid,
  _role text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  );
$$;

REVOKE ALL
ON FUNCTION public.has_role(uuid, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.has_role(uuid, text)
TO authenticated;


CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

REVOKE ALL
ON FUNCTION public.is_admin()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_admin()
TO authenticated;


CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'vendor');
$$;

REVOKE ALL
ON FUNCTION public.is_vendor()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_vendor()
TO authenticated;


CREATE OR REPLACE FUNCTION public.is_courier()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'courier');
$$;

REVOKE ALL
ON FUNCTION public.is_courier()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_courier()
TO authenticated;


-- ============================================================
-- 2. Enable RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. Remove existing policies on protected tables
--
-- We intentionally replace policies on these tables so that an
-- old permissive policy cannot accidentally bypass the new rules.
-- ============================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'user_roles',
        'addresses',
        'orders',
        'order_items',
        'products',
        'vendors',
        'couriers',
        'inventory_movements',
        'invoices',
        'cart_items',
        'notifications',
        'notification_preferences'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );
  END LOOP;
END
$$;


-- ============================================================
-- 4. PROFILES
-- ============================================================

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY profiles_admin_all
ON public.profiles
FOR ALL
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);


-- ============================================================
-- 5. USER ROLES
--
-- المستخدم العادي لا يستطيع:
-- INSERT role
-- UPDATE role
-- DELETE role
-- ============================================================

CREATE POLICY user_roles_select_own
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY user_roles_admin_all
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);


-- ============================================================
-- 6. ADDRESSES
-- ============================================================

CREATE POLICY addresses_select_own
ON public.addresses
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY addresses_insert_own
ON public.addresses
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY addresses_update_own
ON public.addresses
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY addresses_delete_own
ON public.addresses
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
);


-- ============================================================
-- 7. ORDERS
--
-- القراءة:
-- العميل يرى طلباته.
-- التاجر يرى الطلبات التي تحتوي منتجاته.
-- المندوب يرى الطلبات المسندة إليه.
-- الإدارة ترى كل الطلبات.
--
-- الكتابة:
-- إنشاء الطلب يتم من create_secure_order().
-- لا نسمح للعميل بتعديل order بعد الإنشاء.
-- ============================================================

CREATE POLICY orders_select_customer
ON public.orders
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY orders_select_admin
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

CREATE POLICY orders_select_vendor
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.is_vendor()
  AND EXISTS (
    SELECT 1
    FROM public.order_items oi
    INNER JOIN public.products p
      ON p.id = oi.product_id
    INNER JOIN public.vendors v
      ON v.id = p.vendor_id
    WHERE oi.order_id = orders.id
      AND v.user_id = auth.uid()
  )
);

CREATE POLICY orders_select_courier
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.is_courier()
  AND EXISTS (
    SELECT 1
    FROM public.couriers c
    WHERE c.id = orders.courier_id
      AND c.user_id = auth.uid()
  )
);


-- ============================================================
-- 8. ORDER ITEMS
-- ============================================================

CREATE POLICY order_items_select_customer
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
  )
);

CREATE POLICY order_items_select_admin
ON public.order_items
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

CREATE POLICY order_items_select_vendor
ON public.order_items
FOR SELECT
TO authenticated
USING (
  public.is_vendor()
  AND EXISTS (
    SELECT 1
    FROM public.products p
    INNER JOIN public.vendors v
      ON v.id = p.vendor_id
    WHERE p.id = order_items.product_id
      AND v.user_id = auth.uid()
  )
);

CREATE POLICY order_items_select_courier
ON public.order_items
FOR SELECT
TO authenticated
USING (
  public.is_courier()
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    INNER JOIN public.couriers c
      ON c.id = o.courier_id
    WHERE o.id = order_items.order_id
      AND c.user_id = auth.uid()
  )
);


-- ============================================================
-- 9. PRODUCTS
--
-- المنتجات النشطة متاحة للمتجر.
-- التاجر لا يستطيع تعديل منتجات تاجر آخر.
-- الإدارة لديها تحكم كامل.
-- ============================================================

CREATE POLICY products_select_public
ON public.products
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
);

CREATE POLICY products_select_vendor
ON public.products
FOR SELECT
TO authenticated
USING (
  public.is_vendor()
  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.id = products.vendor_id
      AND v.user_id = auth.uid()
  )
);

CREATE POLICY products_admin_all
ON public.products
FOR ALL
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

CREATE POLICY products_vendor_insert
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_vendor()
  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.id = vendor_id
      AND v.user_id = auth.uid()
      AND v.is_active = true
      AND v.account_enabled = true
  )
);

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
  )
)
WITH CHECK (
  public.is_vendor()
  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.id = products.vendor_id
      AND v.user_id = auth.uid()
  )
);


-- ============================================================
-- 10. VENDORS
-- ============================================================

CREATE POLICY vendors_select_own
ON public.vendors
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY vendors_admin_all
ON public.vendors
FOR ALL
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);


-- ============================================================
-- 11. COURIERS
-- ============================================================

CREATE POLICY couriers_select_own
ON public.couriers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY couriers_admin_all
ON public.couriers
FOR ALL
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);


-- ============================================================
-- 12. INVENTORY MOVEMENTS
--
-- المخزون من البيانات الحساسة.
-- العميل لا يستطيع القراءة أو الكتابة.
-- التاجر يستطيع رؤية حركة مخزون منتجاته فقط.
-- الإدارة لديها تحكم كامل.
-- ============================================================

CREATE POLICY inventory_movements_admin_all
ON public.inventory_movements
FOR ALL
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

CREATE POLICY inventory_movements_vendor_select
ON public.inventory_movements
FOR SELECT
TO authenticated
USING (
  public.is_vendor()
  AND EXISTS (
    SELECT 1
    FROM public.products p
    INNER JOIN public.vendors v
      ON v.id = p.vendor_id
    WHERE p.id = inventory_movements.product_id
      AND v.user_id = auth.uid()
  )
);


-- ============================================================
-- 13. INVOICES
-- ============================================================

CREATE POLICY invoices_select_customer
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

CREATE POLICY invoices_select_admin
ON public.invoices
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

CREATE POLICY invoices_select_vendor
ON public.invoices
FOR SELECT
TO authenticated
USING (
  public.is_vendor()
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    INNER JOIN public.order_items oi
      ON oi.order_id = o.id
    INNER JOIN public.products p
      ON p.id = oi.product_id
    INNER JOIN public.vendors v
      ON v.id = p.vendor_id
    WHERE o.id = invoices.order_id
      AND v.user_id = auth.uid()
  )
);


-- ============================================================
-- 14. CART ITEMS
-- ============================================================

CREATE POLICY cart_items_select_own
ON public.cart_items
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY cart_items_insert_own
ON public.cart_items
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY cart_items_update_own
ON public.cart_items
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY cart_items_delete_own
ON public.cart_items
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);


-- ============================================================
-- 15. NOTIFICATIONS
-- ============================================================

CREATE POLICY notifications_select_own
ON public.notifications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY notifications_update_own
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY notifications_admin_insert
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);


-- ============================================================
-- 16. NOTIFICATION PREFERENCES
-- ============================================================

CREATE POLICY notification_preferences_select_own
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

CREATE POLICY notification_preferences_insert_own
ON public.notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY notification_preferences_update_own
ON public.notification_preferences
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);


-- ============================================================
-- 17. Harden secure checkout function
--
-- لا نسمح باستدعاء الدالة بشكل مجهول.
-- ============================================================

REVOKE ALL
ON FUNCTION public.create_secure_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  jsonb
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.create_secure_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  jsonb
)
TO authenticated;


REVOKE ALL
ON FUNCTION public.validate_checkout_product(
  uuid,
  integer
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.validate_checkout_product(
  uuid,
  integer
)
TO authenticated;


-- ============================================================
-- 18. Prevent anonymous access to sensitive tables
-- ============================================================

REVOKE ALL
ON TABLE public.profiles
FROM anon;

REVOKE ALL
ON TABLE public.user_roles
FROM anon;

REVOKE ALL
ON TABLE public.addresses
FROM anon;

REVOKE ALL
ON TABLE public.orders
FROM anon;

REVOKE ALL
ON TABLE public.order_items
FROM anon;

REVOKE ALL
ON TABLE public.vendors
FROM anon;

REVOKE ALL
ON TABLE public.couriers
FROM anon;

REVOKE ALL
ON TABLE public.inventory_movements
FROM anon;

REVOKE ALL
ON TABLE public.invoices
FROM anon;

REVOKE ALL
ON TABLE public.cart_items
FROM anon;

REVOKE ALL
ON TABLE public.notifications
FROM anon;

REVOKE ALL
ON TABLE public.notification_preferences
FROM anon;


-- ============================================================
-- 19. Grants required by RLS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.addresses
TO authenticated;

GRANT SELECT
ON public.profiles
TO authenticated;

GRANT UPDATE
ON public.profiles
TO authenticated;

GRANT SELECT
ON public.user_roles
TO authenticated;

GRANT SELECT
ON public.orders
TO authenticated;

GRANT SELECT
ON public.order_items
TO authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.products
TO authenticated;

GRANT SELECT
ON public.products
TO anon;

GRANT SELECT
ON public.vendors
TO authenticated;

GRANT SELECT
ON public.couriers
TO authenticated;

GRANT SELECT
ON public.inventory_movements
TO authenticated;

GRANT SELECT
ON public.invoices
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.cart_items
TO authenticated;

GRANT SELECT, UPDATE
ON public.notifications
TO authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.notification_preferences
TO authenticated;


COMMIT;
