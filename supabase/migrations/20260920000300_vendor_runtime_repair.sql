BEGIN;

-- SHEHARA runtime repair:
-- 1) Repair vendor-branding storage and branding RPC.
-- 2) Repair admin account-detail RPCs that referenced columns
--    missing from order_items (vendor_id / created_at).

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS profile_logo_url text,
  ADD COLUMN IF NOT EXISTS cover_image_url text;

INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'vendor-branding',
  'vendor-branding',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS vendor_branding_public_read ON storage.objects;
CREATE POLICY vendor_branding_public_read
ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'vendor-branding');

DROP POLICY IF EXISTS vendor_branding_insert ON storage.objects;
CREATE POLICY vendor_branding_insert
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vendor-branding'
  AND (storage.foldername(name))[1] = 'vendors'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS vendor_branding_update ON storage.objects;
CREATE POLICY vendor_branding_update
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'vendor-branding'
  AND (storage.foldername(name))[1] = 'vendors'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'vendor-branding'
  AND (storage.foldername(name))[1] = 'vendors'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS vendor_branding_delete ON storage.objects;
CREATE POLICY vendor_branding_delete
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'vendor-branding'
  AND (storage.foldername(name))[1] = 'vendors'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.update_vendor_branding(
  p_vendor_id uuid,
  p_field text,
  p_url text
)
RETURNS public.vendors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.vendors;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE v.id = p_vendor_id
      AND v.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'غير مصرح بتعديل هذا المتجر';
  END IF;

  IF p_field NOT IN (
    'logo_url',
    'profile_logo_url',
    'cover_image_url'
  ) THEN
    RAISE EXCEPTION 'حقل الهوية غير مسموح';
  END IF;

  IF NULLIF(trim(COALESCE(p_url, '')), '') IS NULL THEN
    RAISE EXCEPTION 'رابط الصورة مطلوب';
  END IF;

  IF p_field = 'logo_url' THEN
    UPDATE public.vendors
    SET logo_url = trim(p_url)
    WHERE id = p_vendor_id
    RETURNING * INTO result;
  ELSIF p_field = 'profile_logo_url' THEN
    UPDATE public.vendors
    SET profile_logo_url = trim(p_url)
    WHERE id = p_vendor_id
    RETURNING * INTO result;
  ELSE
    UPDATE public.vendors
    SET cover_image_url = trim(p_url)
    WHERE id = p_vendor_id
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL
ON FUNCTION public.update_vendor_branding(uuid, text, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.update_vendor_branding(uuid, text, text)
TO authenticated;


DROP FUNCTION IF EXISTS public.admin_get_user_account_details(uuid);

CREATE OR REPLACE FUNCTION public.admin_get_user_account_details(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'معرّف المستخدم مطلوب';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
  ) THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;

  SELECT jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'id', p.id,
        'full_name', COALESCE(p.full_name, ''),
        'first_name', COALESCE(p.first_name, ''),
        'second_name', COALESCE(p.second_name, ''),
        'last_name', COALESCE(p.last_name, ''),
        'phone', p.phone,
        'contact_email', COALESCE(p.contact_email, u.email),
        'province', COALESCE(p.province, ''),
        'wallet_balance', COALESCE((
          SELECT w.balance
          FROM public.wallets w
          WHERE w.user_id = p.id
            AND w.currency = 'YER'
          LIMIT 1
        ), 0),
        'is_disabled', COALESCE(p.is_disabled, false),
        'accepted_terms', COALESCE(p.accepted_terms, false),
        'created_at', p.created_at
      )
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      WHERE p.id = p_user_id
    ),

    'roles', COALESCE((
      SELECT jsonb_agg(
        ur.role::text
        ORDER BY ur.role::text
      )
      FROM public.user_roles ur
      WHERE ur.user_id = p_user_id
    ), '[]'::jsonb),

    'vendor', (
      SELECT to_jsonb(v)
      FROM public.vendors v
      WHERE v.user_id = p_user_id
      LIMIT 1
    ),

    'wallets', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(w)
        ORDER BY w.currency
      )
      FROM public.wallets w
      WHERE w.user_id = p_user_id
    ), '[]'::jsonb),

    'transactions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', wt.id,
          'wallet_id', wt.wallet_id,
          'user_id', wt.user_id,
          'currency', wt.currency,
          'transaction_type', COALESCE(wt.transaction_type, ''),
          'kind', COALESCE(wt.kind, ''),
          'amount', COALESCE(wt.amount, 0),
          'balance_before', COALESCE(wt.balance_before, 0),
          'balance_after', COALESCE(wt.balance_after, 0),
          'description', COALESCE(wt.description, ''),
          'reason', COALESCE(wt.reason, wt.description, ''),
          'created_at', wt.created_at
        )
        ORDER BY wt.created_at DESC
      )
      FROM public.wallet_transactions wt
      WHERE wt.user_id = p_user_id
    ), '[]'::jsonb),

    'addresses', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(a)
        ORDER BY a.created_at DESC
      )
      FROM public.addresses a
      WHERE a.user_id = p_user_id
    ), '[]'::jsonb),

    'activity', COALESCE((
      SELECT to_jsonb(ua)
      FROM public.user_activity_profiles ua
      WHERE ua.user_id = p_user_id
      LIMIT 1
    ), '{}'::jsonb),

    'wishlist', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', wi.id,
          'product_id', wi.product_id,
          'created_at', wi.created_at,
          'product',
          CASE
            WHEN p.id IS NULL THEN NULL
            ELSE to_jsonb(p)
          END
        )
        ORDER BY wi.created_at DESC
      )
      FROM public.wishlists wi
      LEFT JOIN public.products p
        ON p.id = wi.product_id
      WHERE wi.user_id = p_user_id
    ), '[]'::jsonb),

    'orders', COALESCE((
      SELECT jsonb_agg(
        order_data
        ORDER BY order_created_at DESC
      )
      FROM (
        SELECT
          o.created_at AS order_created_at,
          jsonb_build_object(
            'id', o.id,
            'order_number', o.order_number,
            'invoice_number', o.invoice_number,
            'status', o.status,
            'payment_status', o.payment_status,
            'payment_method_code', o.payment_method_code,
            'subtotal', o.subtotal,
            'delivery_fee', o.delivery_fee,
            'total', o.total,
            'currency', o.currency,
            'shipping_city', o.shipping_city,
            'shipping_district', o.shipping_district,
            'shipping_details', o.shipping_details,
            'created_at', o.created_at,
            'updated_at', o.updated_at,
            'latitude', o.latitude,
            'longitude', o.longitude,

            'items', COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', oi.id,
                  'product_id', oi.product_id,
                  'product_name', oi.product_name,
                  'product_image', oi.product_image,
                  'unit_price', oi.unit_price,
                  'quantity', oi.quantity,
                  'size', oi.size,
                  'color', oi.color,
                  'vendor_id', v.id,
                  'vendor_name', v.name,
                  'vendor_phone', v.phone,
                  'vendor_city', v.city
                )
                ORDER BY oi.id
              )
              FROM public.order_items oi
              LEFT JOIN public.products p
                ON p.id = oi.product_id
              LEFT JOIN public.vendors v
                ON v.id = p.vendor_id
              WHERE oi.order_id = o.id
            ), '[]'::jsonb)
          ) AS order_data
        FROM public.orders o
        WHERE o.user_id = p_user_id
      ) q
    ), '[]'::jsonb),

    'metrics', jsonb_build_object(
      'order_count', (
        SELECT count(*)
        FROM public.orders o
        WHERE o.user_id = p_user_id
      ),
      'total_spent', COALESCE((
        SELECT sum(COALESCE(o.total, 0))
        FROM public.orders o
        WHERE o.user_id = p_user_id
          AND COALESCE(o.status::text, '') <> 'cancelled'
      ), 0),
      'average_order_value', COALESCE((
        SELECT avg(COALESCE(o.total, 0))
        FROM public.orders o
        WHERE o.user_id = p_user_id
          AND COALESCE(o.status::text, '') <> 'cancelled'
      ), 0),
      'delivered_count', (
        SELECT count(*)
        FROM public.orders o
        WHERE o.user_id = p_user_id
          AND o.status::text = 'delivered'
      ),
      'cancelled_count', (
        SELECT count(*)
        FROM public.orders o
        WHERE o.user_id = p_user_id
          AND o.status::text = 'cancelled'
      )
    )
  )
  INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

REVOKE ALL
ON FUNCTION public.admin_get_user_account_details(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_get_user_account_details(uuid)
TO authenticated;


DROP FUNCTION IF EXISTS public.admin_get_vendor_account_details(uuid);

CREATE OR REPLACE FUNCTION public.admin_get_vendor_account_details(
  p_vendor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  IF p_vendor_id IS NULL THEN
    RAISE EXCEPTION 'معرّف المتجر مطلوب';
  END IF;

  SELECT jsonb_build_object(
    'vendor', to_jsonb(v),

    'profile', (
      SELECT jsonb_build_object(
        'id', p.id,
        'full_name', COALESCE(p.full_name, ''),
        'phone', p.phone,
        'contact_email', COALESCE(p.contact_email, u.email),
        'province', COALESCE(p.province, ''),
        'is_disabled', COALESCE(p.is_disabled, false),
        'created_at', p.created_at
      )
      FROM public.profiles p
      LEFT JOIN auth.users u
        ON u.id = p.id
      WHERE p.id = v.user_id
    ),

    'wallets', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(w)
        ORDER BY w.currency
      )
      FROM public.wallets w
      WHERE w.user_id = v.user_id
    ), '[]'::jsonb),

    'transactions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', wt.id,
          'wallet_id', wt.wallet_id,
          'user_id', wt.user_id,
          'currency', wt.currency,
          'transaction_type', COALESCE(wt.transaction_type, ''),
          'kind', COALESCE(wt.kind, ''),
          'amount', COALESCE(wt.amount, 0),
          'balance_before', COALESCE(wt.balance_before, 0),
          'balance_after', COALESCE(wt.balance_after, 0),
          'description', COALESCE(wt.description, ''),
          'reason', COALESCE(wt.reason, wt.description, ''),
          'created_at', wt.created_at
        )
        ORDER BY wt.created_at DESC
      )
      FROM public.wallet_transactions wt
      WHERE wt.user_id = v.user_id
    ), '[]'::jsonb),

    'activity', COALESCE((
      SELECT to_jsonb(ua)
      FROM public.user_activity_profiles ua
      WHERE ua.user_id = v.user_id
      LIMIT 1
    ), '{}'::jsonb),

    'products', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(p)
        ORDER BY p.created_at DESC
      )
      FROM public.products p
      WHERE p.vendor_id = v.id
    ), '[]'::jsonb),

    'metrics', jsonb_build_object(
      'product_count', (
        SELECT count(*)
        FROM public.products p
        WHERE p.vendor_id = v.id
      ),

      'order_item_count', (
        SELECT count(*)
        FROM public.order_items oi
        JOIN public.products p
          ON p.id = oi.product_id
        WHERE p.vendor_id = v.id
      ),

      'units_sold', COALESCE((
        SELECT sum(COALESCE(oi.quantity, 0))
        FROM public.order_items oi
        JOIN public.products p
          ON p.id = oi.product_id
        WHERE p.vendor_id = v.id
      ), 0),

      'sales_value', COALESCE((
        SELECT sum(
          COALESCE(oi.unit_price, 0) *
          COALESCE(oi.quantity, 0)
        )
        FROM public.order_items oi
        JOIN public.products p
          ON p.id = oi.product_id
        WHERE p.vendor_id = v.id
      ), 0),

      'distinct_orders', (
        SELECT count(DISTINCT oi.order_id)
        FROM public.order_items oi
        JOIN public.products p
          ON p.id = oi.product_id
        WHERE p.vendor_id = v.id
      )
    )
  )
  INTO result
  FROM public.vendors v
  WHERE v.id = p_vendor_id;

  IF result IS NULL THEN
    RAISE EXCEPTION 'المتجر غير موجود';
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL
ON FUNCTION public.admin_get_vendor_account_details(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_get_vendor_account_details(uuid)
TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
