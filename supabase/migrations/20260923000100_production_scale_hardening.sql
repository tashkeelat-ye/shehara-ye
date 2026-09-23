-- SHEHARA | Production hardening foundation
-- Migration: 20260923000100_production_scale_hardening.sql
--
-- الهدف:
-- 1) تقليل حالات Race Condition في سلة المشتريات.
-- 2) منع تكرار سطور السلة لنفس المنتج/الخيارات.
-- 3) توفير عمليات ذرية للسلة بدلاً من read -> modify -> write.
-- 4) إضافة فهارس تشغيلية للطلبات/العناصر/الدعم/المنتجات.
-- 5) تحسين الأداء عند تعدد المستخدمين والطلبات.
--
-- هذه migration لا تحذف بيانات ولا تعطل المسارات الحالية.

BEGIN;

-- ============================================================
-- 1. CART: منع تكرار نفس السطر
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_variant_uidx
ON public.cart_items (
  user_id,
  product_id,
  COALESCE(size, ''),
  COALESCE(color, '')
);

CREATE INDEX IF NOT EXISTS cart_items_user_created_idx
ON public.cart_items (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS cart_items_product_idx
ON public.cart_items (product_id);

-- ============================================================
-- 2. CART: عملية ذرية لإضافة كمية
-- ============================================================

CREATE OR REPLACE FUNCTION public.cart_add_item_atomic(
  p_product_id uuid,
  p_quantity integer DEFAULT 1,
  p_size text DEFAULT NULL,
  p_color text DEFAULT NULL
)
RETURNS public.cart_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.cart_items;
  v_quantity integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  v_quantity := COALESCE(p_quantity, 1);

  IF p_product_id IS NULL OR v_quantity < 1 OR v_quantity > 999 THEN
    RAISE EXCEPTION 'بيانات السلة غير صالحة';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = p_product_id
      AND p.is_active = true
  ) THEN
    RAISE EXCEPTION 'المنتج غير متاح حالياً';
  END IF;

  INSERT INTO public.cart_items (
    user_id, product_id, quantity, size, color
  )
  VALUES (
    v_user_id,
    p_product_id,
    v_quantity,
    NULLIF(trim(COALESCE(p_size, '')), ''),
    NULLIF(trim(COALESCE(p_color, '')), '')
  )
  ON CONFLICT (
    user_id,
    product_id,
    COALESCE(size, ''),
    COALESCE(color, '')
  )
  DO UPDATE SET
    quantity = LEAST(
      999,
      public.cart_items.quantity + EXCLUDED.quantity
    )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL
ON FUNCTION public.cart_add_item_atomic(uuid, integer, text, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.cart_add_item_atomic(uuid, integer, text, text)
TO authenticated;

-- ============================================================
-- 3. CART: ضبط كمية بشكل آمن
-- ============================================================

CREATE OR REPLACE FUNCTION public.cart_set_quantity(
  p_line_id uuid,
  p_quantity integer
)
RETURNS public.cart_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.cart_items;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF p_line_id IS NULL THEN
    RAISE EXCEPTION 'معرّف السطر مطلوب';
  END IF;

  IF p_quantity < 1 OR p_quantity > 999 THEN
    RAISE EXCEPTION 'الكمية يجب أن تكون بين 1 و999';
  END IF;

  UPDATE public.cart_items
  SET quantity = p_quantity
  WHERE id = p_line_id
    AND user_id = v_user_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'عنصر السلة غير موجود';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL
ON FUNCTION public.cart_set_quantity(uuid, integer)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.cart_set_quantity(uuid, integer)
TO authenticated;

-- ============================================================
-- 4. CART: حذف عنصر مملوك للمستخدم
-- ============================================================

CREATE OR REPLACE FUNCTION public.cart_remove_item(
  p_line_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deleted integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  DELETE FROM public.cart_items
  WHERE id = p_line_id
    AND user_id = v_user_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted = 1;
END;
$$;

REVOKE ALL
ON FUNCTION public.cart_remove_item(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.cart_remove_item(uuid)
TO authenticated;

-- ============================================================
-- 5. CART: تنظيف سلة المستخدم بالكامل
-- ============================================================

CREATE OR REPLACE FUNCTION public.cart_clear()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deleted integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  DELETE FROM public.cart_items
  WHERE user_id = v_user_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL
ON FUNCTION public.cart_clear()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.cart_clear()
TO authenticated;

-- ============================================================
-- 6. ORDERS / ORDER ITEMS: فهارس تشغيلية
-- ============================================================

CREATE INDEX IF NOT EXISTS orders_user_created_idx
ON public.orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_status_created_idx
ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_payment_status_created_idx
ON public.orders (payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_vendor_created_idx
ON public.orders (vendor_id, created_at DESC)
WHERE vendor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS order_items_order_idx
ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS order_items_product_idx
ON public.order_items (product_id);

CREATE INDEX IF NOT EXISTS products_vendor_active_created_idx
ON public.products (vendor_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS products_active_created_idx
ON public.products (is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS products_active_category_idx
ON public.products (category_id, is_active)
WHERE category_id IS NOT NULL;

-- ============================================================
-- 7. PAYMENT / WALLET: فهارس مالية
-- ============================================================

CREATE INDEX IF NOT EXISTS payment_requests_order_created_idx
ON public.payment_requests (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_requests_status_created_idx
ON public.payment_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS wallet_transactions_user_created_idx
ON public.wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_created_idx
ON public.wallet_transactions (wallet_id, created_at DESC);

-- ============================================================
-- 8. SUPPORT: فهارس للمحادثات
-- ============================================================

CREATE INDEX IF NOT EXISTS support_threads_user_last_message_idx
ON public.support_threads (user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS support_threads_status_last_message_idx
ON public.support_threads (status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS support_messages_thread_created_idx
ON public.support_messages (thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS support_messages_thread_unread_idx
ON public.support_messages (thread_id, is_read, created_at ASC);

-- ============================================================
-- 9. تحديث مخطط PostgREST
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
